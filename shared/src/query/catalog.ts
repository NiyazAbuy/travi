import { LIFE_FORMS, SOURCING_OPTIONS } from '../enums';
import { LIFE_FORM_LABELS, MONTH_NAMES, SAFETY_FLAG_LABELS, SOURCING_LABELS } from '../labels';
import type { ContentBundle, Herb } from '../schema';
import { buildFilterIndex, compareNames, emptyFilter, matchesFilter, SAFETY_FLAGS, type HerbFilter } from './filter';

export type CatalogKey = Exclude<keyof HerbFilter, 'minEvidence'>;

export const CATALOG_SECTIONS: { key: CatalogKey; title: string }[] = [
  { key: 'indications', title: 'От чего помогает' },
  { key: 'substances', title: 'Действующие вещества' },
  { key: 'substanceClasses', title: 'Классы веществ' },
  { key: 'actions', title: 'Действие' },
  { key: 'organSystems', title: 'Система органов' },
  { key: 'months', title: 'Месяц сбора' },
  { key: 'parts', title: 'Часть растения' },
  { key: 'habitats', title: 'Где растёт' },
  { key: 'families', title: 'Семейство' },
  { key: 'lifeForms', title: 'Жизненная форма' },
  { key: 'sourcing', title: 'Где взять' },
  { key: 'safety', title: 'Безопасность' },
];

export interface CatalogGroup {
  key: CatalogKey;
  value: string;
  label: string;
  count: number;
}

/** Все возможные значения раздела каталога с русскими подписями (в том числе без трав). */
export function catalogOptions(content: ContentBundle, key: CatalogKey): { value: string; label: string }[] {
  const d = content.dictionaries;
  const fromDict = (items: { id: string; name: string }[]) => items.map((x) => ({ value: x.id, label: x.name }));
  switch (key) {
    case 'indications':
      return fromDict(d.indications);
    case 'substances':
      return fromDict(d.substances);
    case 'substanceClasses':
      return fromDict(d.substanceClasses);
    case 'actions':
      return fromDict(d.actions);
    case 'organSystems':
      return fromDict(d.organSystems);
    case 'parts':
      return fromDict(d.plantParts);
    case 'habitats':
      return fromDict(d.habitats);
    case 'families':
      return fromDict(d.families);
    case 'months':
      return MONTH_NAMES.map((label, i) => ({ value: String(i + 1), label }));
    case 'lifeForms':
      return LIFE_FORMS.map((v) => ({ value: v, label: LIFE_FORM_LABELS[v] }));
    case 'sourcing':
      return SOURCING_OPTIONS.map((v) => ({ value: v, label: SOURCING_LABELS[v] }));
    case 'safety':
      return SAFETY_FLAGS.map((v) => ({ value: v, label: SAFETY_FLAG_LABELS[v] }));
  }
}

/** Русская подпись значения раздела (или само значение, если такого нет). */
export function optionLabel(content: ContentBundle, key: CatalogKey, value: string): string {
  return catalogOptions(content, key).find((o) => o.value === value)?.label ?? value;
}

/** Фильтр с одним выбранным значением — переход из каталога в список трав. */
export function filterForGroup(key: CatalogKey, value: string): HerbFilter {
  const f = emptyFilter();
  if (key === 'months') f.months = [Number(value)];
  else (f as unknown as Record<CatalogKey, string[]>)[key] = [value];
  return f;
}

/** Группы раздела каталога с числом трав; пустые группы не показываются. */
export function catalogGroups(content: ContentBundle, key: CatalogKey): CatalogGroup[] {
  const index = buildFilterIndex(content.dictionaries);
  const groups = catalogOptions(content, key)
    .map((c) => ({
      key,
      value: c.value,
      label: c.label,
      count: content.herbs.filter((h) => matchesFilter(h, filterForGroup(key, c.value), index)).length,
    }))
    .filter((g) => g.count > 0);
  return key === 'months'
    ? groups.sort((a, b) => Number(a.value) - Number(b.value))
    : groups.sort((a, b) => compareNames(a.label, b.label));
}

/** «Собирать сейчас»: травы, у которых в этом месяце есть запись сбора. */
export function collectNow(content: ContentBundle, month: number): Herb[] {
  return content.herbs
    .filter((h) => h.harvest.some((x) => x.months.includes(month)))
    .sort((a, b) => compareNames(a.name, b.name));
}
