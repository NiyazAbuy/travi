import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { manifestSchema } from '@travy/shared';

/** Модуль с таблицей require() для фото: Metro подключает ресурсы только статически. */
export function bundledPhotosModule(photoPaths: string[]): string {
  const header =
    '// Сгенерировано командой `npm run content:app` — не редактировать вручную.\n' +
    'export const BUNDLED_PHOTOS: Record<string, number> = ';
  if (photoPaths.length === 0) return `${header}{};\n`;
  const lines = [...photoPaths]
    .sort()
    .map((p) => `  '${p}': require('../../assets/content/${p}'),`);
  return `${header}{\n${lines.join('\n')}\n};\n`;
}

export interface SyncAppContentOptions {
  distDir: string;
  appDir: string;
}

/** Копирует собранную базу (dist/) в app/assets/content и генерирует app/src/content/bundled-photos.ts. */
export async function syncAppContent({ distDir, appDir }: SyncAppContentOptions) {
  const manifestFile = path.join(distDir, 'manifest.json');
  if (!existsSync(manifestFile)) {
    throw new Error(`Не найден ${manifestFile} — сначала соберите базу: npm run content:build`);
  }
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')));

  const target = path.join(appDir, 'assets', 'content');
  await rm(target, { recursive: true, force: true });
  await mkdir(path.join(target, 'photos'), { recursive: true });
  await copyFile(path.join(distDir, manifest.content.path), path.join(target, 'content.json'));
  for (const photo of manifest.photos) {
    await copyFile(path.join(distDir, photo.path), path.join(target, photo.path));
  }

  const moduleDir = path.join(appDir, 'src', 'content');
  await mkdir(moduleDir, { recursive: true });
  await writeFile(
    path.join(moduleDir, 'bundled-photos.ts'),
    bundledPhotosModule(manifest.photos.map((p) => p.path)),
  );
  return { photoCount: manifest.photos.length, contentVersion: manifest.contentVersion };
}
