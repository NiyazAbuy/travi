import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { fetchPhoto } from '../src/fetch-photo';
import { compressToWebp, MAX_SIDE, TARGET_BYTES } from '../src/image';
import { imageInfoUrl, normalizeFileTitle, normalizeLicense, parseImageInfo, stripHtml } from '../src/wikimedia';
import { cleanupTempDirs, makeTempDir } from './helpers';

afterEach(cleanupTempDirs);

function apiJson(license = 'CC BY-SA 4.0') {
  return {
    query: {
      pages: [
        {
          title: 'File:Plantago major.jpg',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/orig.jpg',
              thumburl: 'https://upload.wikimedia.org/thumb.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Plantago_major.jpg',
              extmetadata: {
                Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Test">Test &amp; Co</a>' },
                LicenseShortName: { value: license },
              },
            },
          ],
        },
      ],
    },
  };
}

function solidImage(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 20, g: 140, b: 60 } } });
}

/** Подменяет fetch: отвечает по началу URL, на неожиданный URL падает. */
function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (!prefix) throw new Error(`неожиданный запрос: ${url}`);
    return routes[prefix]!();
  }) as typeof fetch;
}

describe('wikimedia', () => {
  it.each([
    ['CC BY-SA 4.0', 'CC BY-SA 4.0'],
    ['cc-by-sa-4.0', 'CC BY-SA 4.0'],
    ['CC BY 2.0', 'CC BY 2.0'],
    ['CC BY-SA 3.0 de', 'CC BY-SA 3.0 de'],
    ['Public domain', 'PD'],
    ['CC0', 'CC0'],
    ['CC0 1.0', 'CC0'],
    ['CC BY-NC 4.0', null],
    ['GFDL', null],
  ])('normalizeLicense(%s) = %s', (raw, expected) => {
    expect(normalizeLicense(raw)).toBe(expected);
  });

  it('stripHtml убирает теги и раскрывает сущности', () => {
    expect(stripHtml('<a href="x">Test &amp; Co</a>\n <span>2020</span>')).toBe('Test & Co 2020');
  });

  it('normalizeFileTitle добавляет префикс File:', () => {
    expect(normalizeFileTitle('Plantago major.jpg')).toBe('File:Plantago major.jpg');
    expect(normalizeFileTitle('file:Plantago major.jpg')).toBe('File:Plantago major.jpg');
  });

  it('imageInfoUrl запрашивает url и extmetadata', () => {
    const url = new URL(imageInfoUrl('Plantago major.jpg'));
    expect(url.searchParams.get('titles')).toBe('File:Plantago major.jpg');
    expect(url.searchParams.get('iiprop')).toBe('url|extmetadata');
    expect(url.searchParams.get('formatversion')).toBe('2');
  });

  it('parseImageInfo достаёт ссылку, автора, лицензию и страницу файла', () => {
    expect(parseImageInfo(apiJson())).toEqual({
      downloadUrl: 'https://upload.wikimedia.org/thumb.jpg',
      author: 'Test & Co',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Plantago_major.jpg',
    });
  });

  it('parseImageInfo: файл не найден', () => {
    expect(() => parseImageInfo({ query: { pages: [{ title: 'File:X.jpg', missing: true }] } })).toThrow(/не найден/);
  });

  it('parseImageInfo: неподходящая лицензия', () => {
    expect(() => parseImageInfo(apiJson('CC BY-NC 4.0'))).toThrow(/не подходит/);
  });
});

describe('compressToWebp', () => {
  it('уменьшает большое фото до 1080 px по длинной стороне', async () => {
    const out = await compressToWebp(await solidImage(3000, 2000).jpeg().toBuffer());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(Math.max(meta.width!, meta.height!)).toBe(MAX_SIDE);
    expect(out.length).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('не увеличивает маленькое фото', async () => {
    const out = await compressToWebp(await solidImage(500, 300).png().toBuffer());
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([500, 300]);
  });
});

describe('fetchPhoto', () => {
  it('скачивает, сжимает и записывает фото и метаданные; второе фото не затирает первое', async () => {
    const contentDir = await makeTempDir();
    const jpeg = new Uint8Array(await solidImage(2000, 1500).jpeg().toBuffer());
    const fetchFn = fakeFetch({
      'https://commons.wikimedia.org/w/api.php': () => Response.json(apiJson()),
      'https://upload.wikimedia.org/thumb.jpg': () => new Response(jpeg),
    });

    const first = await fetchPhoto(
      { contentDir, herbId: 'plantago-major', fileTitle: 'Plantago major.jpg', outName: 'plant.webp' },
      fetchFn,
    );
    await fetchPhoto(
      { contentDir, herbId: 'plantago-major', fileTitle: 'Plantago major.jpg', outName: 'closeup.webp' },
      fetchFn,
    );

    expect(first).toMatchObject({ author: 'Test & Co', license: 'CC BY-SA 4.0' });
    const written = await sharp(await readFile(first.file)).metadata();
    expect(written.format).toBe('webp');

    const meta = parse(await readFile(path.join(contentDir, 'photos', 'plantago-major', 'photos.yaml'), 'utf8'));
    expect(Object.keys(meta)).toEqual(['plant.webp', 'closeup.webp']);
    expect(meta['plant.webp']).toEqual({
      author: 'Test & Co',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Plantago_major.jpg',
    });
  });

  it('проверяет имя файла до обращения к сети', async () => {
    const contentDir = await makeTempDir();
    const noNetwork = fakeFetch({});
    await expect(
      fetchPhoto({ contentDir, herbId: 'plantago-major', fileTitle: 'X.jpg', outName: 'Plant.JPG' }, noNetwork),
    ).rejects.toThrow(/Имя файла/);
    await expect(
      fetchPhoto({ contentDir, herbId: 'Подорожник', fileTitle: 'X.jpg', outName: 'plant.webp' }, noNetwork),
    ).rejects.toThrow(/id травы/);
  });

  it('сообщает об ошибке API', async () => {
    const contentDir = await makeTempDir();
    const fetchFn = fakeFetch({ 'https://commons.wikimedia.org/w/api.php': () => new Response('', { status: 503 }) });
    await expect(
      fetchPhoto({ contentDir, herbId: 'plantago-major', fileTitle: 'X.jpg', outName: 'plant.webp' }, fetchFn),
    ).rejects.toThrow(/503/);
  });
});
