import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { fetchPhoto, parseCrop } from '../src/fetch-photo';
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

  it('рисунок: вырезает фрагмент и делает бумагу прозрачной', async () => {
    const contentDir = await makeTempDir();
    const square = await sharp({ create: { width: 100, height: 100, channels: 3, background: { r: 46, g: 90, b: 46 } } })
      .png()
      .toBuffer();
    // «таблица»: бумага, растение (квадрат) и номер таблицы в углу, который отрезается
    const plate = await sharp({ create: { width: 800, height: 600, channels: 3, background: { r: 232, g: 220, b: 192 } } })
      .composite([
        { input: square, left: 250, top: 200 },
        { input: square, left: 700, top: 0 },
      ])
      .jpeg({ quality: 95 })
      .toBuffer();
    const fetchFn = fakeFetch({
      'https://commons.wikimedia.org/w/api.php': () => Response.json(apiJson('Public domain')),
      'https://upload.wikimedia.org/thumb.jpg': () => new Response(new Uint8Array(plate)),
    });

    const r = await fetchPhoto(
      {
        contentDir,
        herbId: 'plantago-major',
        fileTitle: 'Plantago major.jpg',
        outName: 'illustration.webp',
        crop: { left: 150, top: 100, width: 400, height: 300 },
        illustration: true,
      },
      fetchFn,
    );

    expect(r.license).toBe('PD');
    const { data, info } = await sharp(await readFile(r.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    // номер таблицы отрезан, прозрачные поля убраны: остался квадрат 100×100 с небольшим запасом
    expect(info.width).toBeGreaterThanOrEqual(100);
    expect(info.width).toBeLessThan(130);
    expect(Math.abs(info.height - info.width)).toBeLessThanOrEqual(4);
    const alphaAt = (x: number, y: number) => data[(y * info.width + x) * 4 + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(info.width - 1, 0)).toBe(0);
    expect(alphaAt(info.width >> 1, info.height >> 1)).toBe(255);
    const meta = parse(await readFile(path.join(contentDir, 'photos', 'plantago-major', 'photos.yaml'), 'utf8'));
    expect(meta['illustration.webp']).toMatchObject({ license: 'PD' });
  });

  it('рисунок: --erase стирает прилипшую к растению подпись, --keep-main убирает отдельные фигуры', async () => {
    const contentDir = await makeTempDir();
    const block = (w: number, h: number) =>
      sharp({ create: { width: w, height: h, channels: 3, background: { r: 46, g: 90, b: 46 } } })
        .png()
        .toBuffer();
    const plate = await sharp({ create: { width: 600, height: 400, channels: 3, background: { r: 232, g: 220, b: 192 } } })
      .composite([
        { input: await block(100, 200), left: 200, top: 100 }, // растение
        { input: await block(30, 30), left: 300, top: 270 }, // буква «a», касается растения
        { input: await block(60, 60), left: 450, top: 50 }, // отдельная фигура
      ])
      .png()
      .toBuffer();
    const fetchFn = fakeFetch({
      'https://commons.wikimedia.org/w/api.php': () => Response.json(apiJson('Public domain')),
      'https://upload.wikimedia.org/thumb.jpg': () => new Response(new Uint8Array(plate)),
    });
    const r = await fetchPhoto(
      {
        contentDir,
        herbId: 'plantago-major',
        fileTitle: 'Plantago major.jpg',
        outName: 'illustration.webp',
        crop: { left: 100, top: 20, width: 500, height: 360 },
        erase: [{ left: 300, top: 265, width: 40, height: 40 }],
        illustration: true,
        keepMain: true,
      },
      fetchFn,
    );
    const meta = await sharp(await readFile(r.file)).metadata();
    // осталось только растение 100×200 и небольшой запас
    expect(meta.width).toBeLessThan(115);
    expect(meta.height).toBeLessThan(220);
  });

  it('parseCrop разбирает x,y,w,h и отклоняет мусор', () => {
    expect(parseCrop('10,20,300,400')).toEqual({ left: 10, top: 20, width: 300, height: 400 });
    expect(() => parseCrop('10,20,300')).toThrow(/--crop/);
    expect(() => parseCrop('10,20,0,400')).toThrow(/--crop/);
    expect(() => parseCrop('a,b,c,d')).toThrow(/--crop/);
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
