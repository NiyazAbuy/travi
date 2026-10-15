import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  bundleSchemas,
  manifestSchema,
  SCHEMA_VERSION,
  type ContentBundle,
  type Dictionaries,
  type Herb,
  type Manifest,
  type ManifestFile,
  type Photo,
  type PhotoRef,
} from '@travy/shared';
import { checkContent } from './check';
import { ContentValidationError } from './errors';
import { sha256 } from './hash';

export interface BuildOptions {
  contentDir: string;
  distDir: string;
  now?: Date;
}

export interface BuildResult {
  manifest: Manifest;
  herbCount: number;
  recipeCount: number;
  photoCount: number;
}

/** contentVersion = YYYYMMDDHHmm по UTC (спецификация §5.7). */
export function formatContentVersion(date: Date): number {
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number(
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
      `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`,
  );
}

// Простое сравнение строк, не localeCompare: порядок не должен зависеть от локали машины.
const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byId = <T extends { id: string }>(a: T, b: T) => compareStrings(a.id, b.id);

function sortDictionaries(d: Dictionaries): Dictionaries {
  return Object.fromEntries(Object.entries(d).map(([key, list]) => [key, [...list].sort(byId)])) as Dictionaries;
}

export async function buildContent({ contentDir, distDir, now = new Date() }: BuildOptions): Promise<BuildResult> {
  const { content, errors } = await checkContent(contentDir);
  if (errors.length > 0) throw new ContentValidationError(errors);

  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, 'photos'), { recursive: true });

  const photoFiles = new Map<string, ManifestFile>();
  async function resolvePhoto(herbId: string, ref: PhotoRef): Promise<Photo> {
    const bytes = await readFile(path.join(contentDir, 'photos', herbId, ref.file));
    const hash = sha256(bytes);
    const photoPath = `photos/${hash}.webp`;
    if (!photoFiles.has(photoPath)) {
      await writeFile(path.join(distDir, photoPath), bytes);
      photoFiles.set(photoPath, { path: photoPath, sha256: hash, size: bytes.length });
    }
    const meta = content.photoMeta[herbId]![ref.file]!; // наличие гарантирует validateContent
    return {
      path: photoPath,
      kind: ref.kind,
      caption: ref.caption,
      author: meta.author,
      license: meta.license,
      source_url: meta.source_url,
    };
  }

  const herbs: Herb[] = [];
  for (const h of [...content.herbs].sort(byId)) {
    const photos: Photo[] = [];
    for (const p of h.photos) photos.push(await resolvePhoto(h.id, p));
    const lookalikes: Herb['lookalikes'] = [];
    for (const l of h.lookalikes) {
      lookalikes.push({ ...l, photo: l.photo ? await resolvePhoto(h.id, l.photo) : undefined });
    }
    herbs.push({ ...h, photos, lookalikes });
  }

  const contentVersion = formatContentVersion(now);
  const bundle: ContentBundle = bundleSchemas.contentBundle.parse({
    schemaVersion: SCHEMA_VERSION,
    contentVersion,
    herbs,
    recipes: [...content.recipes].sort(byId),
    dictionaries: sortDictionaries(content.dictionaries),
    sources: [...content.sources].sort(byId),
  });
  const contentJson = JSON.stringify(bundle);
  await writeFile(path.join(distDir, 'content.json'), contentJson);

  const manifest: Manifest = manifestSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    contentVersion,
    publishedAt: now.toISOString(),
    content: { path: 'content.json', sha256: sha256(contentJson), size: Buffer.byteLength(contentJson) },
    photos: [...photoFiles.values()].sort((a, b) => compareStrings(a.path, b.path)),
  });
  await writeFile(path.join(distDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  return { manifest, herbCount: herbs.length, recipeCount: bundle.recipes.length, photoCount: photoFiles.size };
}
