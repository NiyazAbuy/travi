import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { DICTIONARY_FILES, inputSchemas, type DictionaryKey } from '@travy/shared';
import type { LoadedContent } from '../src/load';
import {
  sampleDictionaries,
  sampleHerb,
  samplePhotoMeta,
  sampleRecipe,
  sampleSources,
} from '../../shared/test/sample';

const tempDirs: string[] = [];

export async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'travy-'));
  tempDirs.push(dir);
  return dir;
}

export async function cleanupTempDirs(): Promise<void> {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
}

type PhotoDir = { meta: Record<string, unknown>; files: Record<string, string> };

export function sampleTree() {
  return {
    herbs: [
      sampleHerb('plantago-major', 'Подорожник большой'),
      sampleHerb('althaea-officinalis', 'Алтей лекарственный', 'malvaceae'),
    ],
    recipes: [sampleRecipe()],
    dictionaries: sampleDictionaries(),
    sources: sampleSources(),
    photos: {
      'plantago-major': { meta: samplePhotoMeta(), files: { 'plant.webp': 'fake-webp:plantago-major' } },
      'althaea-officinalis': { meta: samplePhotoMeta(), files: { 'plant.webp': 'fake-webp:althaea-officinalis' } },
    } as Record<string, PhotoDir>,
  };
}

export type ContentTree = ReturnType<typeof sampleTree>;

export function emptyTree(): ContentTree {
  return {
    herbs: [],
    recipes: [],
    dictionaries: {
      indications: [],
      organSystems: [],
      substances: [],
      substanceClasses: [],
      actions: [],
      plantParts: [],
      habitats: [],
      families: [],
    },
    sources: [],
    photos: {},
  };
}

/** Записывает дерево content/ во временную папку и возвращает её путь. */
export async function writeContentTree(tree: ContentTree): Promise<string> {
  const dir = await makeTempDir();
  for (const sub of ['herbs', 'recipes', 'dictionaries', 'photos']) {
    await mkdir(path.join(dir, sub), { recursive: true });
  }
  for (const herb of tree.herbs) {
    await writeFile(path.join(dir, 'herbs', `${herb.id}.yaml`), stringify(herb));
  }
  for (const recipe of tree.recipes) {
    await writeFile(path.join(dir, 'recipes', `${recipe.id}.yaml`), stringify(recipe));
  }
  await writeFile(path.join(dir, 'sources.yaml'), stringify(tree.sources));
  for (const [key, file] of Object.entries(DICTIONARY_FILES)) {
    await writeFile(path.join(dir, 'dictionaries', file), stringify(tree.dictionaries[key as DictionaryKey]));
  }
  for (const [herbId, { meta, files }] of Object.entries(tree.photos)) {
    const herbDir = path.join(dir, 'photos', herbId);
    await mkdir(herbDir, { recursive: true });
    await writeFile(path.join(herbDir, 'photos.yaml'), stringify(meta));
    for (const [name, data] of Object.entries(files)) {
      await writeFile(path.join(herbDir, name), data);
    }
  }
  return dir;
}

/** То же дерево, но сразу в виде LoadedContent — для тестов валидатора без файловой системы. */
export function parseTree(tree: ContentTree): LoadedContent {
  return {
    herbs: tree.herbs.map((h) => inputSchemas.herbInput.parse(h)),
    recipes: tree.recipes.map((r) => inputSchemas.recipe.parse(r)),
    dictionaries: inputSchemas.dictionaries.parse(tree.dictionaries),
    sources: tree.sources.map((s) => inputSchemas.source.parse(s)),
    photoMeta: Object.fromEntries(
      Object.entries(tree.photos).map(([id, p]) => [id, inputSchemas.photoMetaFile.parse(p.meta)]),
    ),
  };
}
