import sharp from 'sharp';

export const MAX_SIDE = 1080;
export const TARGET_BYTES = 150 * 1024;
const QUALITIES = [75, 60, 50];

/** WebP, длинная сторона ≤ 1080 px; качество снижается, пока файл больше 150 КБ (спецификация §5.5). */
export async function compressToWebp(input: Buffer): Promise<Buffer> {
  let out = Buffer.alloc(0);
  for (const quality of QUALITIES) {
    out = await sharp(input)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.length <= TARGET_BYTES) break;
  }
  return out;
}
