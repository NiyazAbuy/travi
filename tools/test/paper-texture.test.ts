import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { PAPER_MAX_DARK, PAPER_MAX_LIGHT, paperTexture } from '../src/paper-texture';

describe('paperTexture', () => {
  it('плитка заданного размера с альфа-каналом', async () => {
    const png = await paperTexture({ size: 64 });
    const meta = await sharp(png).metadata();
    expect(meta.format).toBe('png');
    expect(meta.width).toBe(64);
    expect(meta.height).toBe(64);
    expect(meta.hasAlpha).toBe(true);
  });

  it('воспроизводима: тот же seed — те же байты, другой — другая плитка', async () => {
    const a = await paperTexture({ size: 64, seed: 7 });
    expect((await paperTexture({ size: 64, seed: 7 })).equals(a)).toBe(true);
    expect((await paperTexture({ size: 64, seed: 8 })).equals(a)).toBe(false);
  });

  it('полупрозрачная и бледная: не мешает читать', async () => {
    const { data } = await sharp(await paperTexture({ size: 128 }))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let max = 0;
    let sum = 0;
    for (let i = 3; i < data.length; i += 4) {
      max = Math.max(max, data[i]!);
      sum += data[i]!;
    }
    const mean = sum / (data.length / 4);
    // палитра может чуть сдвинуть значения — запас в пару единиц
    expect(max).toBeLessThanOrEqual(Math.round(Math.max(PAPER_MAX_DARK, PAPER_MAX_LIGHT) * 255) + 3);
    expect(mean).toBeGreaterThan(1);
    expect(mean).toBeLessThan(20);
  });
});
