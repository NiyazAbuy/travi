import type { ContentBundle, Herb } from '../schema';
import { compareNames } from './filter';

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

export interface SearchGroupHit {
  kind: 'indications' | 'substances' | 'actions';
  id: string;
  name: string;
}

export interface SearchResult {
  herbs: Herb[];
  groups: SearchGroupHit[];
}

/** Спецификация §6.5: подстрока в названии, народных названиях и латыни + совпавшие группы. */
export function searchContent(content: ContentBundle, query: string): SearchResult {
  const q = normalizeText(query);
  if (!q) return { herbs: [], groups: [] };
  const hit = (...texts: string[]) => texts.some((t) => normalizeText(t).includes(q));

  const herbs = content.herbs
    .filter((h) => hit(h.name, h.latin, ...h.other_names))
    .sort((a, b) => compareNames(a.name, b.name));

  const used = {
    indications: new Set(content.herbs.flatMap((h) => h.indications.map((x) => x.indication))),
    substances: new Set(content.herbs.flatMap((h) => h.substances)),
    actions: new Set(content.herbs.flatMap((h) => h.actions)),
  };
  const groups: SearchGroupHit[] = [];
  for (const kind of ['indications', 'substances', 'actions'] as const) {
    for (const item of content.dictionaries[kind]) {
      if (used[kind].has(item.id) && hit(item.name, ...item.synonyms)) {
        groups.push({ kind, id: item.id, name: item.name });
      }
    }
  }
  return { herbs, groups };
}
