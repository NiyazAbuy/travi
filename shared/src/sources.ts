import type { Source } from './schema';

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

/** Куда ведёт источник: DOI → doi.org, PMID → PubMed, иначе url. У книги с одним ISBN ссылки нет. */
export function sourceHref(source: Source): string | undefined {
  if (source.doi) return `https://doi.org/${normalizeDoi(source.doi)}`;
  const pmid = source.pmid ? normalizePmid(source.pmid) : null;
  if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  return source.url;
}
