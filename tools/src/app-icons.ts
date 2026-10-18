import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export const ICON_BACKGROUND = '#0B120E';
export const ICON_LEAF = '#9BD49B';

// Лист в координатах 100×100: контур с заострённой вершиной и черенком и
// центральная жилка — вырез (fill-rule evenodd), поэтому на прозрачном фоне
// жилка тоже прозрачная.
const LEAF_PATH = [
  'M50 5 C80 26 88 56 51.5 90 L51.5 97 L48.5 97 L48.5 90 C12 56 20 26 50 5 Z',
  'M48.9 86 L48.9 28 L50 20 L51.1 28 L51.1 86 Z',
].join(' ');

/** SVG с одним листом по центру; `scale` — доля стороны, занимаемая высотой листа (до наклона). */
export function leafSvg(opts: { size: number; background: string | null; leaf: string; scale: number }): string {
  const { size, background, leaf, scale } = opts;
  const k = (size * scale) / 100;
  const half = size / 2;
  const rect = background ? `<rect width="${size}" height="${size}" fill="${background}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">` +
    rect +
    `<path fill="${leaf}" fill-rule="evenodd" transform="translate(${half} ${half}) rotate(30) scale(${k}) translate(-50 -50)" d="${LEAF_PATH}"/>` +
    `</svg>`
  );
}

interface IconSpec {
  name: string;
  size: number;
  background: string | null;
  leaf: string;
  scale: number;
  /** Только фон без листа (подложка адаптивной иконки). */
  plain?: boolean;
}

const SPECS: IconSpec[] = [
  { name: 'icon.png', size: 1024, background: ICON_BACKGROUND, leaf: ICON_LEAF, scale: 0.62 },
  // лист внутри безопасной зоны адаптивной иконки Android (≈ 66 % по центру)
  { name: 'android-icon-foreground.png', size: 1024, background: null, leaf: ICON_LEAF, scale: 0.5 },
  { name: 'android-icon-background.png', size: 1024, background: ICON_BACKGROUND, leaf: ICON_LEAF, scale: 0, plain: true },
  { name: 'android-icon-monochrome.png', size: 1024, background: null, leaf: '#FFFFFF', scale: 0.5 },
  { name: 'splash-icon.png', size: 512, background: null, leaf: ICON_LEAF, scale: 0.9 },
  { name: 'favicon.png', size: 48, background: ICON_BACKGROUND, leaf: ICON_LEAF, scale: 0.7 },
];

/** Рисует все иконки приложения в `outDir` и возвращает имена файлов. */
export async function writeAppIcons(outDir: string): Promise<string[]> {
  await mkdir(outDir, { recursive: true });
  const names: string[] = [];
  for (const spec of SPECS) {
    const svg = spec.plain
      ? `<svg xmlns="http://www.w3.org/2000/svg" width="${spec.size}" height="${spec.size}"><rect width="${spec.size}" height="${spec.size}" fill="${spec.background}"/></svg>`
      : leafSvg(spec);
    await sharp(Buffer.from(svg)).png().toFile(path.join(outDir, spec.name));
    names.push(spec.name);
  }
  return names;
}
