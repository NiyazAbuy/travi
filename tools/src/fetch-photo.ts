import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ID_PATTERN, PHOTO_FILE_PATTERN } from '@travy/shared';
import { compressToWebp } from './image';
import { upsertPhotoMeta } from './photo-meta';
import { imageInfoUrl, parseImageInfo, USER_AGENT } from './wikimedia';

export interface FetchPhotoOptions {
  contentDir: string;
  herbId: string;
  /** Название файла на Commons, с префиксом "File:" или без */
  fileTitle: string;
  /** Имя файла в content/photos/<herbId>/, например plant.webp */
  outName: string;
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
  const webp = await compressToWebp(Buffer.from(await imageResponse.arrayBuffer()));

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
