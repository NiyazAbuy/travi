import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { leafSvg, writeAppIcons } from '../src/app-icons';
import { cleanupTempDirs, makeTempDir } from './helpers';

afterEach(cleanupTempDirs);

async function cornerAlpha(file: string): Promise<number> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(4);
  return data[3]!;
}

describe('leafSvg', () => {
  it('рисует лист одним path и фон только по запросу', () => {
    const withBg = leafSvg({ size: 100, background: '#0B120E', leaf: '#9BD49B', scale: 0.5 });
    expect(withBg).toContain('width="100"');
    expect(withBg).toContain('<rect');
    expect(withBg).toContain('#9BD49B');
    const noBg = leafSvg({ size: 100, background: null, leaf: '#FFFFFF', scale: 0.5 });
    expect(noBg).not.toContain('<rect');
  });
});

describe('writeAppIcons', () => {
  it('создаёт 6 файлов нужных размеров', async () => {
    const dir = await makeTempDir();
    const names = await writeAppIcons(dir);
    expect([...names].sort()).toEqual(
      [
        'android-icon-background.png',
        'android-icon-foreground.png',
        'android-icon-monochrome.png',
        'favicon.png',
        'icon.png',
        'splash-icon.png',
      ].sort(),
    );
    const sizes: Record<string, number> = {
      'icon.png': 1024,
      'android-icon-foreground.png': 1024,
      'android-icon-background.png': 1024,
      'android-icon-monochrome.png': 1024,
      'splash-icon.png': 512,
      'favicon.png': 48,
    };
    for (const [name, size] of Object.entries(sizes)) {
      const meta = await sharp(await readFile(path.join(dir, name))).metadata();
      expect([name, meta.width, meta.height]).toEqual([name, size, size]);
    }
  });

  it('передний план и монохром прозрачны в углу, иконка и фон — нет', async () => {
    const dir = await makeTempDir();
    await writeAppIcons(dir);
    expect(await cornerAlpha(path.join(dir, 'android-icon-foreground.png'))).toBe(0);
    expect(await cornerAlpha(path.join(dir, 'android-icon-monochrome.png'))).toBe(0);
    expect(await cornerAlpha(path.join(dir, 'splash-icon.png'))).toBe(0);
    expect(await cornerAlpha(path.join(dir, 'icon.png'))).toBe(255);
    expect(await cornerAlpha(path.join(dir, 'android-icon-background.png'))).toBe(255);
  });
});
