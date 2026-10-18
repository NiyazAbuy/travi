import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bundleSchemas, manifestSchema } from '@travy/shared';
import { buildContent, formatContentVersion } from '../src/build';
import { ContentValidationError } from '../src/errors';
import { sha256 } from '../src/hash';
import { cleanupTempDirs, emptyTree, makeTempDir, sampleTree, writeContentTree, type ContentTree } from './helpers';

afterEach(cleanupTempDirs);

const NOW = new Date('2026-10-15T18:30:00Z');

async function build(tree: ContentTree) {
  const contentDir = await writeContentTree(tree);
  const distDir = path.join(await makeTempDir(), 'dist');
  const result = await buildContent({ contentDir, distDir, now: NOW });
  const contentJson = await readFile(path.join(distDir, 'content.json'), 'utf8');
  const manifestJson = await readFile(path.join(distDir, 'manifest.json'), 'utf8');
  return { distDir, result, contentJson, bundle: JSON.parse(contentJson), manifest: JSON.parse(manifestJson) };
}

describe('formatContentVersion', () => {
  it('YYYYMMDDHHmm по UTC', () => {
    expect(formatContentVersion(NOW)).toBe(202610151830);
    expect(formatContentVersion(new Date('2026-01-02T03:04:59Z'))).toBe(202601020304);
  });
});

describe('buildContent', () => {
  it('собирает корректную базу и манифест', async () => {
    const { distDir, result, contentJson, bundle, manifest } = await build(sampleTree());

    expect(bundleSchemas.contentBundle.safeParse(bundle).success).toBe(true);
    expect(manifestSchema.safeParse(manifest).success).toBe(true);
    expect(bundle.contentVersion).toBe(202610151830);
    expect(bundle.herbs.map((h: { id: string }) => h.id)).toEqual(['althaea-officinalis', 'plantago-major']);

    const plantagoHash = sha256('fake-webp:plantago-major');
    expect(bundle.herbs[1].photos[0]).toEqual({
      path: `photos/${plantagoHash}.webp`,
      kind: 'plant',
      author: 'Test Author',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    });
    expect(await readFile(path.join(distDir, 'photos', `${plantagoHash}.webp`), 'utf8')).toBe('fake-webp:plantago-major');

    expect(manifest.publishedAt).toBe('2026-10-15T18:30:00.000Z');
    expect(manifest.content).toEqual({
      path: 'content.json',
      sha256: sha256(contentJson),
      size: Buffer.byteLength(contentJson),
    });
    expect(manifest.photos).toHaveLength(2);
    expect(result).toMatchObject({ herbCount: 2, recipeCount: 1, photoCount: 2 });
  });

  it('одинаковое фото у двух трав попадает в dist один раз', async () => {
    const tree = sampleTree();
    tree.photos['althaea-officinalis']!.files['plant.webp'] = 'fake-webp:plantago-major';
    const { distDir, bundle, manifest } = await build(tree);
    expect(await readdir(path.join(distDir, 'photos'))).toHaveLength(1);
    expect(manifest.photos).toHaveLength(1);
    expect(bundle.herbs[0].photos[0].path).toBe(bundle.herbs[1].photos[0].path);
  });

  describe('illustration', () => {
    const META = { author: 'Köhler', license: 'PD', source_url: 'https://commons.wikimedia.org/wiki/File:K.jpg' };
    function treeWithIllustration(bytes = 'fake-webp:illustration'): ContentTree {
      const tree = sampleTree();
      Object.assign(tree.herbs[0]!, { illustration: { file: 'illustration.webp', kind: 'plant' } });
      const photos = tree.photos['plantago-major']!;
      photos.meta = { ...photos.meta, 'illustration.webp': META };
      photos.files['illustration.webp'] = bytes;
      return tree;
    }

    it('кладёт рисунок в content.json с путём photos/<sha256>.webp и авторством', async () => {
      const { distDir, bundle, manifest, result } = await build(treeWithIllustration());
      const hash = sha256('fake-webp:illustration');
      expect(bundleSchemas.contentBundle.safeParse(bundle).success).toBe(true);
      expect(bundle.herbs[1].illustration).toEqual({ path: `photos/${hash}.webp`, kind: 'plant', ...META });
      expect(await readFile(path.join(distDir, 'photos', `${hash}.webp`), 'utf8')).toBe('fake-webp:illustration');
      expect(manifest.photos.map((p: { path: string }) => p.path)).toContain(`photos/${hash}.webp`);
      expect(result.photoCount).toBe(3);
    });

    it('у травы без рисунка поля illustration в content.json нет', async () => {
      const { bundle } = await build(treeWithIllustration());
      expect(bundle.herbs[0]).not.toHaveProperty('illustration');
    });

    it('рисунок с теми же байтами, что и фото, не дублируется в dist', async () => {
      const { distDir, bundle } = await build(treeWithIllustration('fake-webp:plantago-major'));
      expect(bundle.herbs[1].illustration.path).toBe(bundle.herbs[1].photos[0].path);
      expect(await readdir(path.join(distDir, 'photos'))).toHaveLength(2);
    });
  });

  it('пустая база собирается', async () => {
    const { result, manifest } = await build(emptyTree());
    expect(result.herbCount).toBe(0);
    expect(manifest.photos).toEqual([]);
  });

  it('при ошибках не трогает прежний dist', async () => {
    const tree = sampleTree();
    tree.herbs[0]!.family = 'no-such-family';
    const contentDir = await writeContentTree(tree);
    const distDir = path.join(await makeTempDir(), 'dist');
    await mkdir(distDir, { recursive: true });
    await writeFile(path.join(distDir, 'marker.txt'), 'previous build');

    await expect(buildContent({ contentDir, distDir, now: NOW })).rejects.toBeInstanceOf(ContentValidationError);
    expect(existsSync(path.join(distDir, 'marker.txt'))).toBe(true);
  });

  it('повторная сборка тех же данных даёт тот же content.json', async () => {
    const tree = sampleTree();
    const first = await build(tree);
    const second = await build(tree);
    expect(second.contentJson).toBe(first.contentJson);
  });

  it('явно заданная contentVersion попадает в манифест и content.json', async () => {
    const contentDir = await writeContentTree(sampleTree());
    const distDir = path.join(await makeTempDir(), 'dist');
    await buildContent({ contentDir, distDir, now: NOW, contentVersion: 202601010000 });
    const manifest = JSON.parse(await readFile(path.join(distDir, 'manifest.json'), 'utf8'));
    const bundle = JSON.parse(await readFile(path.join(distDir, 'content.json'), 'utf8'));
    expect(manifest.contentVersion).toBe(202601010000);
    expect(bundle.contentVersion).toBe(202601010000);
  });

  it('удаляет устаревшие файлы прежней сборки', async () => {
    const contentDir = await writeContentTree(sampleTree());
    const distDir = path.join(await makeTempDir(), 'dist');
    await mkdir(path.join(distDir, 'photos'), { recursive: true });
    await writeFile(path.join(distDir, 'photos', 'stale.webp'), 'old');
    await buildContent({ contentDir, distDir, now: NOW });
    expect(existsSync(path.join(distDir, 'photos', 'stale.webp'))).toBe(false);
  });
});
