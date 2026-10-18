import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bundledPhotosModule, syncAppContent } from '../src/app-content';
import { buildContent } from '../src/build';
import { cleanupTempDirs, makeTempDir, sampleTree, writeContentTree } from './helpers';

afterEach(cleanupTempDirs);

const A = `photos/${'a'.repeat(64)}.webp`;
const B = `photos/${'b'.repeat(64)}.webp`;

describe('bundledPhotosModule', () => {
  it('генерирует отсортированную таблицу require с прямыми слэшами', () => {
    const code = bundledPhotosModule([B, A]);
    expect(code).toContain('export const BUNDLED_PHOTOS: Record<string, number> = {');
    expect(code.indexOf(A)).toBeLessThan(code.indexOf(B));
    expect(code).toContain(`  '${A}': require('../../assets/content/${A}'),`);
    expect(code).not.toContain('\\');
  });

  it('пустой список — пустая таблица', () => {
    expect(bundledPhotosModule([])).toContain('export const BUNDLED_PHOTOS: Record<string, number> = {};');
  });
});

describe('syncAppContent', () => {
  async function prepare() {
    const contentDir = await writeContentTree(sampleTree());
    const distDir = path.join(await makeTempDir(), 'dist');
    await buildContent({ contentDir, distDir, now: new Date('2026-10-18T10:00:00Z') });
    const appDir = await makeTempDir();
    return { distDir, appDir };
  }

  it('копирует базу и фото и пишет модуль фото', async () => {
    const { distDir, appDir } = await prepare();
    const result = await syncAppContent({ distDir, appDir });

    expect(result).toEqual({ photoCount: 2, contentVersion: 202610181000 });
    const copied = await readFile(path.join(appDir, 'assets', 'content', 'content.json'), 'utf8');
    expect(copied).toBe(await readFile(path.join(distDir, 'content.json'), 'utf8'));
    expect(await readdir(path.join(appDir, 'assets', 'content', 'photos'))).toHaveLength(2);
    const module = await readFile(path.join(appDir, 'src', 'content', 'bundled-photos.ts'), 'utf8');
    expect(module.match(/require\(/g)).toHaveLength(2);
  });

  it('удаляет устаревшие файлы прежней синхронизации', async () => {
    const { distDir, appDir } = await prepare();
    const stale = path.join(appDir, 'assets', 'content', 'photos', 'stale.webp');
    await mkdir(path.dirname(stale), { recursive: true });
    await writeFile(stale, 'old');
    await syncAppContent({ distDir, appDir });
    expect(existsSync(stale)).toBe(false);
  });

  it('без собранной базы — понятная ошибка', async () => {
    const appDir = await makeTempDir();
    await expect(syncAppContent({ distDir: path.join(appDir, 'no-dist'), appDir })).rejects.toThrow(
      /сначала соберите базу/,
    );
  });
});
