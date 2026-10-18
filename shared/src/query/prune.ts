import type { ContentBundle, DictionaryKey } from '../schema';
import type { HerbFilter } from './filter';

/** Поля фильтра, хранящие id из словарей, и словарь для каждого. */
const DICTIONARY_FIELDS = [
  ['indications', 'indications'],
  ['substances', 'substances'],
  ['substanceClasses', 'substanceClasses'],
  ['actions', 'actions'],
  ['organSystems', 'organSystems'],
  ['parts', 'plantParts'],
  ['habitats', 'habitats'],
  ['families', 'families'],
] as const satisfies ReadonlyArray<readonly [keyof HerbFilter, DictionaryKey]>;

/** Убирает из фильтра id, исчезнувшие из словарей после обновления; если убирать нечего — тот же объект. */
export function pruneFilter(f: HerbFilter, b: ContentBundle): HerbFilter {
  let result = f;
  for (const [field, dictKey] of DICTIONARY_FIELDS) {
    const known = new Set<string>(b.dictionaries[dictKey].map((x) => x.id));
    const kept = f[field].filter((id) => known.has(id));
    if (kept.length !== f[field].length) result = { ...result, [field]: kept };
  }
  return result;
}
