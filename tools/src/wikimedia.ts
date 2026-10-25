import { LICENSE_PATTERN } from '@travy/shared';

export const USER_AGENT = 'TravyContentTool/0.1 (personal herb reference app)';
const API = 'https://commons.wikimedia.org/w/api.php';

export interface WikimediaImageInfo {
  downloadUrl: string;
  author: string;
  license: string;
  /** Страница файла на Commons — для указания авторства */
  sourceUrl: string;
}

export function normalizeFileTitle(title: string): string {
  const t = title.trim();
  return /^file:/i.test(t) ? `File:${t.slice(5)}` : `File:${t}`;
}

export function imageInfoUrl(fileTitle: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    // 1280 — стандартный размер миниатюр Commons (обычно уже в кэше); нестандартные размеры Commons генерирует на лету и отвечает 429
    iiurlwidth: '1280',
    titles: normalizeFileTitle(fileTitle),
  });
  return `${API}?${params}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Приводит название лицензии к виду из спецификации; null — лицензия не допускается. */
export function normalizeLicense(raw: string): string | null {
  const s = raw.trim();
  let result = s;
  if (/^(public domain|pd)$/i.test(s)) {
    result = 'PD';
  } else if (/^cc0(?: 1\.0)?$/i.test(s)) {
    result = 'CC0';
  } else {
    const m = /^cc[- ]by(-sa)?[- ](\d\.\d)(?:[- ]([a-z]{2,3}))?$/i.exec(s);
    if (m) result = `CC BY${m[1] ? '-SA' : ''} ${m[2]}${m[3] ? ` ${m[3]}` : ''}`;
  }
  return LICENSE_PATTERN.test(result) ? result : null;
}

interface ApiResponse {
  query?: {
    pages?: Array<{
      title?: string;
      missing?: boolean;
      imageinfo?: Array<{
        url?: string;
        thumburl?: string;
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string } | undefined>;
      }>;
    }>;
  };
}

export function parseImageInfo(json: unknown): WikimediaImageInfo {
  const page = (json as ApiResponse).query?.pages?.[0];
  if (!page || page.missing) {
    throw new Error('Файл не найден на Wikimedia Commons — проверьте название (пример: "File:Plantago major.jpg")');
  }
  const info = page.imageinfo?.[0];
  const downloadUrl = info?.thumburl ?? info?.url;
  if (!info || !downloadUrl || !info.descriptionurl) {
    throw new Error('Wikimedia Commons вернула неполные данные о файле');
  }
  const meta = info.extmetadata ?? {};
  const author = stripHtml(meta.Artist?.value ?? '');
  if (!author) throw new Error('У файла не указан автор — выберите другое фото');
  const rawLicense = stripHtml(meta.LicenseShortName?.value ?? '');
  const license = normalizeLicense(rawLicense);
  if (!license) {
    throw new Error(`Лицензия "${rawLicense}" не подходит: допустимы CC0, PD, CC BY, CC BY-SA`);
  }
  return { downloadUrl, author, license, sourceUrl: info.descriptionurl };
}
