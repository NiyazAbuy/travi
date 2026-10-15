import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { Document, parseDocument } from 'yaml';
import type { PhotoMeta } from '@travy/shared';

/** Добавляет или заменяет запись о фото в photos.yaml, сохраняя остальные записи и комментарии. */
export async function upsertPhotoMeta(metaFile: string, photoFile: string, meta: PhotoMeta): Promise<void> {
  const doc = existsSync(metaFile) ? parseDocument(await readFile(metaFile, 'utf8')) : new Document({});
  doc.set(photoFile, meta);
  await writeFile(metaFile, String(doc));
}
