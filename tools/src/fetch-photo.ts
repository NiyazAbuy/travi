import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { ID_PATTERN, PHOTO_FILE_PATTERN } from '@travy/shared';
import { compressToWebp } from './image';
import { keepMainFigure, paperToAlpha, trimTransparent } from './paper';
import { upsertPhotoMeta } from './photo-meta';
import { imageInfoUrl, parseImageInfo, USER_AGENT } from './wikimedia';

export interface FetchPhotoOptions {
  contentDir: string;
  herbId: string;
  /** Название файла на Commons, с префиксом "File:" или без */
  fileTitle: string;
  /** Имя файла в content/photos/<herbId>/, например plant.webp */
  outName: string;
  /** Вырезать фрагмент (в пикселях скачанного изображения) до остальной обработки: убрать подписи, номер таблицы. */
  crop?: Crop;
  /**
   * Ботанический рисунок: фон старой бумаги делается прозрачным (`paperToAlpha`), прозрачные поля обрезаются,
   * прозрачность сохраняется в WebP.
   */
  illustration?: boolean;
  /** Только для рисунка: оставить главное растение, убрать отдельные фигуры таблицы, буквы и номера. */
  keepMain?: boolean;
  /**
   * Только для рисунка: стереть прямоугольники (в тех же координатах скачанного изображения, что и `crop`) —
   * буквы и цифры таблицы, которые касаются растения и поэтому не убираются `keepMain`.
   */
  erase?: Crop[];
}

export interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Разбирает значение `--crop x,y,w,h` (целые пиксели, ширина и высота > 0). */
export function parseCrop(value: string): Crop {
  const parts = value.split(',').map((p) => p.trim());
  const nums = parts.map(Number);
  if (nums.length !== 4 || parts.some((p) => !/^\d+$/.test(p)) || nums[2]! <= 0 || nums[3]! <= 0) {
    throw new Error(`--crop ожидает x,y,ширина,высота в пикселях (например 120,80,1300,1900), получено "${value}"`);
  }
  const [left, top, width, height] = nums as [number, number, number, number];
  return { left, top, width, height };
}

/** Делает прямоугольники прозрачными; координаты — в скачанном изображении, поэтому сдвигаются на `crop`. */
async function eraseRects(png: Buffer, rects: Crop[], crop: Crop | undefined): Promise<Buffer> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const dx = crop?.left ?? 0;
  const dy = crop?.top ?? 0;
  for (const r of rects) {
    const x0 = Math.max(0, r.left - dx);
    const y0 = Math.max(0, r.top - dy);
    const x1 = Math.min(info.width, r.left - dx + r.width);
    const y1 = Math.min(info.height, r.top - dy + r.height);
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) data[(y * info.width + x) * 4 + 3] = 0;
    }
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Вырезка и отделение от бумаги — до сжатия, на полном разрешении скачанного изображения. */
async function prepare(input: Buffer, opts: FetchPhotoOptions): Promise<Buffer> {
  let image = input;
  if (opts.crop) {
    // сначала поворот по EXIF, чтобы координаты совпадали с тем, что видно на экране
    const { data, info } = await sharp(image).rotate().png().toBuffer({ resolveWithObject: true });
    const { left, top, width, height } = opts.crop;
    if (left + width > info.width || top + height > info.height) {
      throw new Error(`--crop выходит за границы изображения ${info.width}×${info.height}`);
    }
    image = await sharp(data).extract(opts.crop).png().toBuffer();
  }
  if (opts.illustration) {
    image = await paperToAlpha(image);
    if (opts.erase?.length) image = await eraseRects(image, opts.erase, opts.crop);
    if (opts.keepMain) image = await keepMainFigure(image);
    const { width = 0, height = 0 } = await sharp(image).metadata();
    image = await trimTransparent(image, Math.max(2, Math.round(Math.max(width, height) * 0.01)));
  }
  return image;
}

export interface FetchPhotoResult {
  file: string;
  bytes: number;
  author: string;
  license: string;
}

export async function fetchPhoto(opts: FetchPhotoOptions, fetchFn: typeof fetch = fetch): Promise<FetchPhotoResult> {
  if (!ID_PATTERN.test(opts.herbId)) throw new Error(`Некорректный id травы: "${opts.herbId}"`);
  if (!PHOTO_FILE_PATTERN.test(opts.outName)) {
    throw new Error(`Имя файла должно быть вида plant.webp (латиница, цифры, дефисы): "${opts.outName}"`);
  }
  const headers = { 'User-Agent': USER_AGENT };

  const infoResponse = await fetchFn(imageInfoUrl(opts.fileTitle), { headers });
  if (!infoResponse.ok) throw new Error(`Wikimedia API ответил ошибкой ${infoResponse.status}`);
  const info = parseImageInfo(await infoResponse.json());

  const imageResponse = await fetchFn(info.downloadUrl, { headers });
  if (!imageResponse.ok) throw new Error(`Не удалось скачать изображение: ошибка ${imageResponse.status}`);
  const webp = await compressToWebp(await prepare(Buffer.from(await imageResponse.arrayBuffer()), opts));

  const herbDir = path.join(opts.contentDir, 'photos', opts.herbId);
  await mkdir(herbDir, { recursive: true });
  const file = path.join(herbDir, opts.outName);
  await writeFile(file, webp);
  await upsertPhotoMeta(path.join(herbDir, 'photos.yaml'), opts.outName, {
    author: info.author,
    license: info.license,
    source_url: info.sourceUrl,
  });
  return { file, bytes: webp.length, author: info.author, license: info.license };
}
