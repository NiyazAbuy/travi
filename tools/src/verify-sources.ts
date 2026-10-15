import type { Source } from '@travy/shared';
import { USER_AGENT } from './wikimedia';

export type VerifyStatus = 'ok' | 'mismatch' | 'not_found' | 'error';

export interface VerifyResult {
  sourceId: string;
  kind: 'doi' | 'pmid';
  value: string;
  status: VerifyStatus;
  /** Название, найденное в Crossref/PubMed */
  found?: string;
  detail?: string;
}

export function normalizeDoi(raw: string): string {
  return raw
    .trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i, '')
    .replace(/^doi:\s*/i, '')
    .toLowerCase();
}

export function normalizePmid(raw: string): string | null {
  const s = raw.trim().replace(/^pmid:?\s*/i, '');
  return /^\d+$/.test(s) ? s : null;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Совпадают ли названия статьи: без учёта регистра, пунктуации, тегов и подзаголовка. */
export function titlesMatch(a: string, b: string): boolean {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const wordsA = new Set(x.split(' '));
  const wordsB = new Set(y.split(' '));
  const common = [...wordsA].filter((w) => wordsB.has(w)).length;
  return common / new Set([...wordsA, ...wordsB]).size >= 0.8;
}

export function parseCrossrefTitle(json: unknown): string | null {
  const title = (json as { message?: { title?: unknown } }).message?.title;
  return Array.isArray(title) && typeof title[0] === 'string' && title[0] ? title[0] : null;
}

export function parsePubmedTitle(json: unknown, pmid: string): string | null {
  const entry = (json as { result?: Record<string, { title?: unknown; error?: unknown }> }).result?.[pmid];
  return entry && !entry.error && typeof entry.title === 'string' && entry.title ? entry.title : null;
}

async function check(
  source: Source,
  kind: 'doi' | 'pmid',
  value: string,
  url: string,
  parseTitle: (json: unknown) => string | null,
  fetchFn: typeof fetch,
): Promise<VerifyResult> {
  const base = { sourceId: source.id, kind, value };
  try {
    const response = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 404) return { ...base, status: 'not_found' };
    if (!response.ok) return { ...base, status: 'error', detail: `HTTP ${response.status}` };
    const found = parseTitle(await response.json());
    if (found === null) return { ...base, status: 'not_found' };
    return { ...base, status: titlesMatch(source.title, found) ? 'ok' : 'mismatch', found };
  } catch (e) {
    return { ...base, status: 'error', detail: (e as Error).message };
  }
}

export async function verifySource(source: Source, fetchFn: typeof fetch = fetch): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];
  if (source.doi) {
    const doi = normalizeDoi(source.doi);
    const encoded = doi.split('/').map(encodeURIComponent).join('/');
    results.push(
      await check(source, 'doi', doi, `https://api.crossref.org/works/${encoded}`, parseCrossrefTitle, fetchFn),
    );
  }
  if (source.pmid) {
    const pmid = normalizePmid(source.pmid);
    if (pmid === null) {
      results.push({
        sourceId: source.id,
        kind: 'pmid',
        value: source.pmid,
        status: 'error',
        detail: 'PMID должен состоять из цифр',
      });
    } else {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`;
      results.push(await check(source, 'pmid', pmid, url, (json) => parsePubmedTitle(json, pmid), fetchFn));
    }
  }
  return results;
}

/** Проверяет источники по очереди; пауза между запросами — чтобы не превысить лимиты PubMed (3 запроса/с). */
export async function verifySources(
  sources: Source[],
  fetchFn: typeof fetch = fetch,
  delayMs = 400,
): Promise<VerifyResult[]> {
  const all: VerifyResult[] = [];
  for (const source of sources) {
    const results = await verifySource(source, fetchFn);
    all.push(...results);
    if (results.length > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return all;
}
