import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, YAMLError } from 'yaml';
import { z } from 'zod';
import {
  DICTIONARY_FILES,
  inputSchemas,
  type Dictionaries,
  type DictionaryKey,
  type HerbInput,
  type PhotoMetaFile,
  type Recipe,
  type Source,
} from '@travy/shared';
import type { ContentError } from './errors';

// Встроенные сообщения zod (опечатка в ключе, неверный вариант, нет поля) — на русском, как и наши.
z.config(z.locales.ru());

export interface LoadedContent {
  herbs: HerbInput[];
  recipes: Recipe[];
  dictionaries: Dictionaries;
  sources: Source[];
  /** Метаданные фото по id травы — содержимое content/photos/<id>/photos.yaml */
  photoMeta: Record<string, PhotoMetaFile>;
}

export interface LoadResult {
  content: LoadedContent;
  errors: ContentError[];
}

type ReadResult = { ok: true; value: unknown } | { ok: false };

async function readYaml(contentDir: string, rel: string, errors: ContentError[]): Promise<ReadResult> {
  try {
    // BOM от Блокнота Windows: yaml спотыкается о него перед списком ("- id: …")
    const text = (await readFile(path.join(contentDir, rel), 'utf8')).replace(/^\uFEFF/, '');
    return { ok: true, value: parse(text) ?? null };
  } catch (e) {
    const message =
      e instanceof YAMLError ? `ошибка YAML: ${e.message}` : `не удалось прочитать файл: ${(e as Error).message}`;
    errors.push({ file: rel, message });
    return { ok: false };
  }
}

function parseWith<T>(
  schema: z.ZodType<T>,
  value: unknown,
  file: string,
  errors: ContentError[],
  pathPrefix?: string,
): T | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const fieldPath = [pathPrefix, ...issue.path.map(String)].filter(Boolean).join('.');
    errors.push(fieldPath ? { file, path: fieldPath, message: issue.message } : { file, message: issue.message });
  }
  return undefined;
}

async function loadList<T>(
  contentDir: string,
  rel: string,
  schema: z.ZodType<T>,
  errors: ContentError[],
): Promise<T[]> {
  if (!existsSync(path.join(contentDir, rel))) {
    errors.push({ file: rel, message: 'файл не найден' });
    return [];
  }
  const raw = await readYaml(contentDir, rel, errors);
  if (!raw.ok || raw.value === null) return [];
  if (!Array.isArray(raw.value)) {
    errors.push({ file: rel, message: 'ожидался список (каждый элемент начинается с "- ")' });
    return [];
  }
  const items: T[] = [];
  raw.value.forEach((item: unknown, index: number) => {
    const id =
      typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string' ? item.id : undefined;
    const parsed = parseWith(schema, item, rel, errors, id ? `${index} (${id})` : String(index));
    if (parsed !== undefined) items.push(parsed);
  });
  return items;
}

/** Файлы .yaml папки; остальные (кроме скрытых, вроде .gitkeep) — ошибка, чтобы трава не пропала молча. */
async function listYamlFiles(contentDir: string, dir: string, errors: ContentError[]): Promise<string[]> {
  const fullDir = path.join(contentDir, dir);
  if (!existsSync(fullDir)) return [];
  const names = (await readdir(fullDir)).sort();
  for (const name of names) {
    if (!name.startsWith('.') && !name.endsWith('.yaml')) {
      errors.push({
        file: `${dir}/${name}`,
        message: 'файл пропущен: ожидается расширение .yaml (например, matricaria-chamomilla.yaml)',
      });
    }
  }
  return names.filter((name) => name.endsWith('.yaml'));
}

async function loadEntities<T extends { id: string }>(
  contentDir: string,
  dir: 'herbs' | 'recipes',
  schema: z.ZodType<T>,
  errors: ContentError[],
): Promise<T[]> {
  const result: T[] = [];
  for (const name of await listYamlFiles(contentDir, dir, errors)) {
    const rel = `${dir}/${name}`;
    const raw = await readYaml(contentDir, rel, errors);
    if (!raw.ok) continue;
    const entity = parseWith(schema, raw.value, rel, errors);
    if (!entity) continue;
    const expectedId = name.slice(0, -'.yaml'.length);
    if (entity.id !== expectedId) {
      errors.push({
        file: rel,
        path: 'id',
        message: `id "${entity.id}" не совпадает с именем файла — назовите файл ${entity.id}.yaml (только латиница) или исправьте id`,
      });
      continue;
    }
    result.push(entity);
  }
  return result;
}

async function loadDictionaries(contentDir: string, errors: ContentError[]): Promise<Dictionaries> {
  const dictionaries = {} as Record<DictionaryKey, unknown[]>;
  for (const key of Object.keys(DICTIONARY_FILES) as DictionaryKey[]) {
    dictionaries[key] = await loadList<unknown>(
      contentDir,
      `dictionaries/${DICTIONARY_FILES[key]}`,
      inputSchemas.dictionaryItems[key],
      errors,
    );
  }
  return dictionaries as Dictionaries;
}

async function loadPhotoMeta(contentDir: string, errors: ContentError[]): Promise<Record<string, PhotoMetaFile>> {
  const photosDir = path.join(contentDir, 'photos');
  if (!existsSync(photosDir)) return {};
  const result: Record<string, PhotoMetaFile> = {};
  const herbDirs = (await readdir(photosDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const herbId of herbDirs) {
    const rel = `photos/${herbId}/photos.yaml`;
    if (!existsSync(path.join(contentDir, rel))) continue;
    const raw = await readYaml(contentDir, rel, errors);
    if (!raw.ok) continue;
    const meta = parseWith(inputSchemas.photoMetaFile, raw.value ?? {}, rel, errors);
    if (meta) result[herbId] = meta;
  }
  return result;
}

export async function loadContent(contentDir: string): Promise<LoadResult> {
  const errors: ContentError[] = [];
  const sources = await loadList(contentDir, 'sources.yaml', inputSchemas.source, errors);
  const dictionaries = await loadDictionaries(contentDir, errors);
  const herbs = await loadEntities(contentDir, 'herbs', inputSchemas.herbInput, errors);
  const recipes = await loadEntities(contentDir, 'recipes', inputSchemas.recipe, errors);
  const photoMeta = await loadPhotoMeta(contentDir, errors);
  return { content: { herbs, recipes, dictionaries, sources, photoMeta }, errors };
}

export function photoExistsIn(contentDir: string): (herbId: string, file: string) => boolean {
  return (herbId, file) => existsSync(path.join(contentDir, 'photos', herbId, file));
}
