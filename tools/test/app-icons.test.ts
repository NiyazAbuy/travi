import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { writeAppIcons } from '../src/app-icons';
import { cleanupTempDirs, makeTempDir } from './helpers';

afterEach(cleanupTempDirs);

const CREAM = [0xf5, 0xf0, 0xe8];

interface Raw {
  data: Buffer;
  width: number;
  height: number;
}

async function decode(file: string): Promise<Raw> {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(4);
  return { data, width: info.width, height: info.height };
}

function pixel(img: Raw, x: number, y: number): number[] {
  const i = (y * img.width + x) * 4;
  return [...img.data.subarray(i, i + 4)];
}

/** Перебирает все пиксели: (x, y, [r, g, b, a]). */
function* pixels(img: Raw): Generator<[number, number, number[]]> {
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) yield [x, y, pixel(img, x, y)];
  }
}

function isCream(px: number[]): boolean {
  return px[3] === 255 && CREAM.every((v, c) => Math.abs(px[c]! - v) <= 2);
}

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

  it('веточка шалфея на кремовом фоне: углы иконки кремовые, в центре есть зелёный', async () => {
    const dir = await makeTempDir();
    await writeAppIcons(dir);
    const icon = await decode(path.join(dir, 'icon.png'));
    expect(isCream(pixel(icon, 0, 0))).toBe(true);
    expect(isCream(pixel(icon, 1023, 1023))).toBe(true);
    let green = 0;
    for (const [x, y, [r, g, b]] of pixels(icon)) {
      const central = Math.abs(x - 512) < 200 && Math.abs(y - 512) < 200;
      if (central && g! - r! > 10 && g! - b! > 10) green++;
    }
    expect(green).toBeGreaterThan(1000);

    expect(isCream(pixel(await decode(path.join(dir, 'favicon.png')), 0, 0))).toBe(true);
    const background = await decode(path.join(dir, 'android-icon-background.png'));
    let notCream = 0;
    for (const [, , px] of pixels(background)) if (!isCream(px)) notCream++;
    expect(notCream).toBe(0);
  });

  it('передний план, монохром и сплэш прозрачны в углу; веточка — в безопасной зоне', async () => {
    const dir = await makeTempDir();
    await writeAppIcons(dir);
    for (const name of ['android-icon-foreground.png', 'android-icon-monochrome.png', 'splash-icon.png']) {
      expect([name, pixel(await decode(path.join(dir, name)), 0, 0)[3]]).toEqual([name, 0]);
    }
    // безопасная зона адаптивной иконки — круг диаметром 66/108 стороны по центру
    const foreground = await decode(path.join(dir, 'android-icon-foreground.png'));
    const safeRadius = (1024 * 66) / 108 / 2;
    let visible = 0;
    let outside = 0;
    for (const [x, y, [, , , a]] of pixels(foreground)) {
      if (a! <= 16) continue;
      visible++;
      if (Math.hypot(x + 0.5 - 512, y + 0.5 - 512) > safeRadius) outside++;
    }
    expect(visible).toBeGreaterThan(10000);
    expect(outside).toBe(0);
  });

  it('монохромная иконка — белый силуэт на прозрачном', async () => {
    const dir = await makeTempDir();
    await writeAppIcons(dir);
    const mono = await decode(path.join(dir, 'android-icon-monochrome.png'));
    let opaque = 0;
    let notWhite = 0;
    for (const [, , [r, g, b, a]] of pixels(mono)) {
      if (a === 0) continue;
      if (r !== 255 || g !== 255 || b !== 255) notWhite++;
      if (a! > 200) opaque++;
    }
    expect(notWhite).toBe(0);
    expect(opaque).toBeGreaterThan(10000);
    // силуэт повторяет форму веточки переднего плана
    const foreground = await decode(path.join(dir, 'android-icon-foreground.png'));
    let both = 0;
    let either = 0;
    for (let i = 3; i < mono.data.length; i += 4) {
      const inMono = mono.data[i]! > 128;
      const inForeground = foreground.data[i]! > 16;
      if (inMono && inForeground) both++;
      if (inMono || inForeground) either++;
    }
    expect(both / either).toBeGreaterThan(0.8);
  });
});
