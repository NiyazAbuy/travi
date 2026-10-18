import sharp from 'sharp';

/**
 * Плитка бумажной текстуры для фона приложения (`app/assets/images/paper.png`).
 *
 * Это не цвет бумаги, а полупрозрачный слой поверх него: тёмные пиксели чуть затемняют фон, светлые — осветляют.
 * Так одна плитка подходит и к фону экрана, и к карточкам. Слой — сумма периодического шума нескольких масштабов
 * (крупные пятна, средняя неровность, мелкое зерно) и коротких волокон; всё периодично по размеру плитки,
 * поэтому при повторе швов нет. Непрозрачность мала — текстура не мешает читать текст.
 */

export interface PaperTextureOptions {
  /** Сторона квадратной плитки, px. */
  size?: number;
  /** Зерно генератора: тот же `seed` — та же плитка байт в байт. */
  seed?: number;
}

/** Наибольшая непрозрачность затемнения и осветления (доля от 255). */
export const PAPER_MAX_DARK = 0.085;
export const PAPER_MAX_LIGHT = 0.09;
/** Цвета слоя: тёмный — вторичный текст палитры, светлый — почти белая бумага. */
const DARK = [90, 74, 58] as const;
const LIGHT = [255, 253, 248] as const;

/** Масштабы шума: число ячеек на сторону плитки и вес. */
const OCTAVES = [
  { cells: 4, weight: 0.22 },
  { cells: 9, weight: 0.24 },
  { cells: 23, weight: 0.2 },
  { cells: 61, weight: 0.16 },
] as const;
/** Вес попиксельного зерна. */
const GRAIN = 0.5;
/** Волокна: сколько, длина и непрозрачность. */
const FIBERS = 110;

/** mulberry32 — воспроизводимый генератор случайных чисел. */
function random(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Периодический шум значений: решётка `cells × cells`, замкнутая по краям, плавная интерполяция. */
function valueNoise(size: number, cells: number, rnd: () => number): Float32Array {
  const lattice = Array.from({ length: cells * cells }, () => rnd() * 2 - 1);
  const at = (i: number, j: number) => lattice[(j % cells) * cells + (i % cells)]!;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const v = (y / size) * cells;
    const j = Math.floor(v);
    const ty = smooth(v - j);
    for (let x = 0; x < size; x++) {
      const u = (x / size) * cells;
      const i = Math.floor(u);
      const tx = smooth(u - i);
      const top = at(i, j) * (1 - tx) + at(i + 1, j) * tx;
      const bottom = at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx;
      out[y * size + x] = top * (1 - ty) + bottom * ty;
    }
  }
  return out;
}

/** Генерирует плитку: PNG с альфа-каналом, `size × size`. */
export async function paperTexture({ size = 384, seed = 1887 }: PaperTextureOptions = {}): Promise<Buffer> {
  const rnd = random(seed);
  const field = new Float32Array(size * size);
  for (const { cells, weight } of OCTAVES) {
    const noise = valueNoise(size, cells, rnd);
    for (let i = 0; i < field.length; i++) field[i]! += noise[i]! * weight;
  }
  for (let i = 0; i < field.length; i++) field[i]! += (rnd() * 2 - 1) * GRAIN;

  // Волокна: короткие изогнутые штрихи, чуть темнее или светлее бумаги; координаты по модулю — без швов.
  for (let f = 0; f < FIBERS; f++) {
    let x = rnd() * size;
    let y = rnd() * size;
    let angle = rnd() * Math.PI * 2;
    const length = 6 + rnd() * 22;
    const strength = (rnd() < 0.35 ? -1 : 1) * (0.35 + rnd() * 0.35);
    for (let s = 0; s < length; s++) {
      const px = ((Math.round(x) % size) + size) % size;
      const py = ((Math.round(y) % size) + size) % size;
      field[py * size + px]! += strength;
      angle += (rnd() - 0.5) * 0.5;
      x += Math.cos(angle);
      y += Math.sin(angle);
    }
  }

  const rgba = Buffer.alloc(size * size * 4);
  for (let i = 0; i < field.length; i++) {
    const v = Math.max(-1, Math.min(1, field[i]!));
    const [color, alpha] = v < 0 ? [DARK, -v * PAPER_MAX_DARK] : [LIGHT, v * PAPER_MAX_LIGHT];
    rgba[i * 4] = color[0];
    rgba[i * 4 + 1] = color[1];
    rgba[i * 4 + 2] = color[2];
    rgba[i * 4 + 3] = Math.round(alpha * 255);
  }
  // Палитра из 64 цветов: слой почти однотонный, а файл получается в разы меньше полноцветного.
  return sharp(rgba, { raw: { width: size, height: size, channels: 4 } })
    .png({ palette: true, colours: 64, dither: 0, compressionLevel: 9, effort: 10 })
    .toBuffer();
}
