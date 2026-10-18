import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { paperToAlpha } from './paper';
import { REPO_ROOT } from './paths';

/** Кремовый фон приложения (палитра «полевого дневника»). */
export const ICON_BACKGROUND = '#F5F0E8';
/** Картинка пользователя: веточка шалфея на бумаге с надписью «Травница» (надпись в иконку не берём). */
export const ICON_SOURCE = path.join(REPO_ROOT, 'docs', 'design', 'travnitsa', '01-icon.webp');

/**
 * Прямоугольник с веточкой в `01-icon.webp` (784×1168): сама веточка — примерно x 136…655, y 180…781;
 * по краям оставлен запас бумаги, по которому `paperToAlpha` оценивает её цвет. Надпись ниже не попадает.
 */
const SPRIG_CROP = { left: 105, top: 150, width: 582, height: 660 };
/** Пиксель считается частью веточки при такой непрозрачности (для рамки и безопасной зоны). */
const VISIBLE_ALPHA = 16;
/** Безопасная зона адаптивной иконки Android — круг диаметром 66 из 108 dp по центру. */
const SAFE_ZONE = 66 / 108;

interface Sprig {
  /** Квадратный PNG с веточкой на прозрачном фоне; веточка по центру. */
  png: Buffer;
  /** Самая дальняя видимая точка веточки от центра — в долях стороны квадрата. */
  radius: number;
}

/** Вырезает веточку из картинки, отделяет от бумаги и кладёт по центру квадрата. */
async function cutSprig(source: string): Promise<Sprig> {
  const crop = await sharp(await readFile(source)).extract(SPRIG_CROP).png().toBuffer();
  const { data, info } = await sharp(await paperToAlpha(crop))
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! <= VISIBLE_ALPHA) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) throw new Error('В картинке иконки не нашлось веточки — проверьте SPRIG_CROP');
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const side = Math.max(w, h) + 4; // пара пикселей запаса, чтобы сглаженный край не обрезался
  const left = Math.floor((side - w) / 2);
  const top = Math.floor((side - h) / 2);
  let radius = 0;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (data[(y * width + x) * 4 + 3]! <= VISIBLE_ALPHA) continue;
      const dx = x - minX + left + 0.5 - side / 2;
      const dy = y - minY + top + 0.5 - side / 2;
      radius = Math.max(radius, Math.hypot(dx, dy));
    }
  }
  const trimmed = await sharp(data, { raw: { width, height, channels: 4 } })
    .extract({ left: minX, top: minY, width: w, height: h })
    .png()
    .toBuffer();
  const png = await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: trimmed, left, top }])
    .png()
    .toBuffer();
  return { png, radius: radius / side };
}

function smoothstep(v: number, from: number, to: number): number {
  const t = Math.min(1, Math.max(0, (v - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/**
 * Силуэт: всё, что заметно отличается от бумаги, — сплошная белая заливка. Бледные блики на листьях почти
 * прозрачны, поэтому маска сначала размывается (мелкие дырочки затягиваются), потом снова делается резкой.
 */
async function silhouette(sprigPng: Buffer): Promise<Buffer> {
  const { data, info } = await sharp(sprigPng).raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const mask = Buffer.alloc(width * height);
  for (let i = 0; i < mask.length; i++) mask[i] = Math.round(smoothstep(data[i * 4 + 3]!, 4, 40) * 255);
  const blurred = await sharp(mask, { raw: { width, height, channels: 1 } })
    .blur(2)
    .extractChannel(0)
    .raw()
    .toBuffer();
  const out = Buffer.alloc(width * height * 4, 255);
  for (let i = 0; i < mask.length; i++) out[i * 4 + 3] = Math.round(smoothstep(blurred[i]!, 70, 150) * 255);
  return sharp(out, { raw: { width, height, channels: 4 } }).png().toBuffer();
}

interface IconSpec {
  name: string;
  size: number;
  /** Фон; null — прозрачный. */
  background: string | null;
  /** Сторона квадрата с веточкой — доля стороны иконки; 'safe' — по безопасной зоне Android; 0 — без веточки. */
  scale: number | 'safe';
  /** Белый силуэт вместо рисунка (монохромная иконка Android). */
  mono?: boolean;
}

const SPECS: IconSpec[] = [
  { name: 'icon.png', size: 1024, background: ICON_BACKGROUND, scale: 0.8 },
  { name: 'android-icon-foreground.png', size: 1024, background: null, scale: 'safe' },
  { name: 'android-icon-background.png', size: 1024, background: ICON_BACKGROUND, scale: 0 },
  { name: 'android-icon-monochrome.png', size: 1024, background: null, scale: 'safe', mono: true },
  { name: 'splash-icon.png', size: 512, background: null, scale: 0.92 },
  { name: 'favicon.png', size: 48, background: ICON_BACKGROUND, scale: 0.92 },
];

/** Масштаб, при котором веточка целиком (с запасом 6 %) помещается в безопасный круг адаптивной иконки. */
function safeScale(radius: number): number {
  return ((SAFE_ZONE / 2) * 0.94) / radius;
}

async function renderIcon(spec: IconSpec, sprig: Sprig, mono: Buffer): Promise<Buffer> {
  const { size } = spec;
  const background = spec.background ?? { r: 0, g: 0, b: 0, alpha: 0 };
  const canvas = sharp({ create: { width: size, height: size, channels: 4, background } });
  if (spec.scale === 0) return canvas.png().toBuffer();
  const scale = spec.scale === 'safe' ? safeScale(sprig.radius) : spec.scale;
  const side = Math.round(size * scale);
  // увеличение/уменьшение фильтром Ланцоша; веточка по центру
  const resized = await sharp(spec.mono ? mono : sprig.png)
    .resize(side, side, { kernel: 'lanczos3' })
    .png()
    .toBuffer();
  const offset = Math.round((size - side) / 2);
  const composed = await canvas.composite([{ input: resized, left: offset, top: offset }]).png().toBuffer();
  if (!spec.mono) return composed;
  // монохром: строго белый цвет, форма — только в альфа-канале (после сглаживания цвет мог чуть «уплыть»)
  const { data, info } = await sharp(composed).raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255;
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Рисует все иконки приложения в `outDir` из веточки шалфея `source` и возвращает имена файлов. */
export async function writeAppIcons(outDir: string, source: string = ICON_SOURCE): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const sprig = await cutSprig(source);
  const mono = await silhouette(sprig.png);
  const names: string[] = [];
  for (const spec of SPECS) {
    await writeFile(path.join(outDir, spec.name), await renderIcon(spec, sprig, mono));
    names.push(spec.name);
  }
  return names;
}
