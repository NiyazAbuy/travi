import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { keepMainFigure, paperToAlpha, trimTransparent } from '../src/paper';

const PAPER = { r: 0xe8, g: 0xdc, b: 0xc0 };
const GREEN = { r: 0x2e, g: 0x5a, b: 0x2e };

interface Raw {
  data: Buffer;
  width: number;
  height: number;
}

async function decode(input: Buffer): Promise<Raw> {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  expect(info.channels).toBe(4);
  return { data, width: info.width, height: info.height };
}

function pixel(img: Raw, x: number, y: number): [number, number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}

/** Бумага 200×200 и тёмно-зелёный квадрат 60×60 по центру. */
async function paperWithSquare(): Promise<Buffer> {
  const square = await sharp({ create: { width: 60, height: 60, channels: 3, background: GREEN } })
    .png()
    .toBuffer();
  return sharp({ create: { width: 200, height: 200, channels: 3, background: PAPER } })
    .composite([{ input: square, left: 70, top: 70 }])
    .png()
    .toBuffer();
}

/** Неровная бумага: слева светлее, справа темнее и с шумом, как у старой литографии. */
async function unevenPaper(width: number, height: number, line?: { x: number; color: number[] }): Promise<Buffer> {
  const data = Buffer.alloc(width * height * 3);
  let seed = 7;
  const noise = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return (seed / 2147483648 - 0.5) * 10; // ±5
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const shade = 12 * (x / (width - 1)); // до 12 единиц темнее к правому краю
      const i = (y * width + x) * 3;
      const n = noise();
      data[i] = Math.round(PAPER.r - shade + n);
      data[i + 1] = Math.round(PAPER.g - shade + n);
      data[i + 2] = Math.round(PAPER.b - shade + n);
      if (line && x === line.x && y > height / 4 && y < (height * 3) / 4) {
        data[i] = line.color[0]!;
        data[i + 1] = line.color[1]!;
        data[i + 2] = line.color[2]!;
      }
    }
  }
  return sharp(data, { raw: { width, height, channels: 3 } }).png().toBuffer();
}

describe('paperToAlpha', () => {
  it('бумага становится прозрачной, рисунок остаётся непрозрачным и своего цвета', async () => {
    const out = await decode(await paperToAlpha(await paperWithSquare()));
    expect([out.width, out.height]).toEqual([200, 200]);
    expect(pixel(out, 0, 0)[3]).toBe(0);
    expect(pixel(out, 199, 199)[3]).toBe(0);
    expect(pixel(out, 20, 100)[3]).toBe(0);
    const [r, g, b, a] = pixel(out, 100, 100);
    expect(a).toBe(255);
    expect(Math.abs(r - GREEN.r)).toBeLessThanOrEqual(2);
    expect(Math.abs(g - GREEN.g)).toBeLessThanOrEqual(2);
    expect(Math.abs(b - GREEN.b)).toBeLessThanOrEqual(2);
  });

  it('неровная бумага с шумом прозрачна целиком, а бледная линия карандаша сохраняется полупрозрачной', async () => {
    // бледно-серая линия: заметно темнее бумаги, но далеко не чёрная
    const pencil = [PAPER.r - 70, PAPER.g - 70, PAPER.b - 60];
    const out = await decode(await paperToAlpha(await unevenPaper(160, 120, { x: 80, color: pencil })));
    let maxPaperAlpha = 0;
    for (let y = 0; y < out.height; y++) {
      for (let x = 0; x < out.width; x++) {
        if (Math.abs(x - 80) > 2) maxPaperAlpha = Math.max(maxPaperAlpha, pixel(out, x, y)[3]);
      }
    }
    expect(maxPaperAlpha).toBeLessThanOrEqual(8);
    const lineAlpha = pixel(out, 80, 60)[3];
    expect(lineAlpha).toBeGreaterThan(120);
  });

  it('убирает пылинки и бледные пятна на бумаге, но не рисунок', async () => {
    const dust = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 40, g: 30, b: 20 } } })
      .png()
      .toBuffer();
    // бледное пятно (как пятна старой бумаги): чуть темнее и рыжее бумаги
    const stain = await sharp({ create: { width: 30, height: 30, channels: 3, background: { r: 224, g: 209, b: 178 } } })
      .png()
      .toBuffer();
    const input = await sharp(await paperWithSquare())
      .composite([
        { input: dust, left: 20, top: 20 },
        { input: stain, left: 150, top: 20 },
      ])
      .png()
      .toBuffer();
    const out = await decode(await paperToAlpha(input));
    expect(pixel(out, 20, 20)[3]).toBe(0);
    expect(pixel(out, 165, 35)[3]).toBe(0);
    expect(pixel(out, 100, 100)[3]).toBe(255);
  });

  it('цвет полупрозрачного пикселя очищается от бумаги: на исходной бумаге выглядит как раньше', async () => {
    // бледная заливка: четверть зелёного, три четверти бумаги
    const mix = {
      r: Math.round(GREEN.r * 0.25 + PAPER.r * 0.75),
      g: Math.round(GREEN.g * 0.25 + PAPER.g * 0.75),
      b: Math.round(GREEN.b * 0.25 + PAPER.b * 0.75),
    };
    const dot = await sharp({ create: { width: 20, height: 20, channels: 3, background: mix } }).png().toBuffer();
    const input = await sharp({ create: { width: 120, height: 120, channels: 3, background: PAPER } })
      .composite([{ input: dot, left: 50, top: 50 }])
      .png()
      .toBuffer();
    const out = await decode(await paperToAlpha(input));
    const [r, g, b, a] = pixel(out, 60, 60);
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThan(255);
    // наложение обратно на бумагу даёт исходный цвет смеси
    const k = a / 255;
    expect(Math.abs(r * k + PAPER.r * (1 - k) - mix.r)).toBeLessThanOrEqual(3);
    expect(Math.abs(g * k + PAPER.g * (1 - k) - mix.g)).toBeLessThanOrEqual(3);
    expect(Math.abs(b * k + PAPER.b * (1 - k) - mix.b)).toBeLessThanOrEqual(3);
  });
});

/** Прозрачный холст с непрозрачными прямоугольниками (x, y, w, h). */
async function figures(width: number, height: number, rects: number[][]): Promise<Buffer> {
  const layers = await Promise.all(
    rects.map(async ([left, top, w, h]) => ({
      input: await sharp({ create: { width: w!, height: h!, channels: 4, background: { ...GREEN, alpha: 1 } } })
        .png()
        .toBuffer(),
      left: left!,
      top: top!,
    })),
  );
  return sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers)
    .png()
    .toBuffer();
}

describe('keepMainFigure', () => {
  it('оставляет главное растение и близкие к нему части, убирает отдельные фигуры таблицы', async () => {
    const input = await figures(400, 400, [
      [180, 40, 20, 320], // стебель
      [100, 150, 80, 30], // лист, касается стебля
      [204, 20, 30, 15], // цветок отделён щелью в 4 px
      [20, 300, 40, 40], // отдельная фигура (разрез цветка)
      [320, 30, 30, 30], // номер таблицы
    ]);
    const out = await decode(await keepMainFigure(input));
    expect(pixel(out, 190, 200)[3]).toBe(255);
    expect(pixel(out, 120, 160)[3]).toBe(255);
    expect(pixel(out, 215, 25)[3]).toBe(255);
    expect(pixel(out, 40, 320)[3]).toBe(0);
    expect(pixel(out, 335, 45)[3]).toBe(0);
  });
});

describe('keepMainFigure: бледная дымка', () => {
  it('бледная дымка бумаги не склеивает растение с отдельной фигурой', async () => {
    const plant = await figures(300, 200, [
      [20, 20, 60, 160],
      [200, 80, 40, 40],
    ]);
    // полоса почти прозрачных пикселей между растением и фигурой
    const haze = await sharp({ create: { width: 120, height: 10, channels: 4, background: { ...GREEN, alpha: 0.04 } } })
      .png()
      .toBuffer();
    const input = await sharp(plant).composite([{ input: haze, left: 80, top: 95 }]).png().toBuffer();
    const out = await decode(await keepMainFigure(input));
    expect(pixel(out, 50, 100)[3]).toBe(255);
    expect(pixel(out, 220, 100)[3]).toBe(0);
    expect(pixel(out, 150, 100)[3]).toBe(0);
  });
});

describe('trimTransparent', () => {
  it('обрезает прозрачные поля, оставляя небольшой запас', async () => {
    const input = await figures(400, 300, [[100, 50, 200, 100]]);
    const out = await decode(await trimTransparent(input, 10));
    expect([out.width, out.height]).toEqual([220, 120]);
    expect(pixel(out, 0, 0)[3]).toBe(0);
    expect(pixel(out, 10, 10)[3]).toBe(255);
    expect(pixel(out, 209, 109)[3]).toBe(255);
  });
});
