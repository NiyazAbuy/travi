import { EVIDENCE_LABELS } from '../labels';
import type { ContentBundle } from '../schema';
import { CATALOG_SECTIONS, optionLabel, type CatalogKey } from './catalog';
import type { HerbFilter } from './filter';

/** Плашка выбранного условия в строке активных фильтров. */
export interface FilterChip {
  key: CatalogKey | 'minEvidence';
  value: string;
  label: string;
}

function valuesOf(f: HerbFilter, key: CatalogKey): string[] {
  return key === 'months' ? f.months.map(String) : [...(f[key] as readonly string[])];
}

export function isFilterValueSelected(f: HerbFilter, key: CatalogKey, value: string): boolean {
  return valuesOf(f, key).includes(value);
}

/** Добавляет значение в группу или убирает его, не меняя исходный фильтр. */
export function toggleFilterValue(f: HerbFilter, key: CatalogKey, value: string): HerbFilter {
  const current = valuesOf(f, key);
  const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
  if (key === 'months') return { ...f, months: next.map(Number) };
  return { ...f, [key]: next } as HerbFilter;
}

/** Все выбранные условия в порядке разделов каталога, с русскими подписями. */
export function describeFilter(f: HerbFilter, content: ContentBundle): FilterChip[] {
  const chips: FilterChip[] = [];
  for (const { key } of CATALOG_SECTIONS) {
    for (const value of valuesOf(f, key)) chips.push({ key, value, label: optionLabel(content, key, value) });
  }
  if (f.minEvidence) {
    chips.push({
      key: 'minEvidence',
      value: f.minEvidence,
      label: `Не ниже: ${EVIDENCE_LABELS[f.minEvidence].toLowerCase()}`,
    });
  }
  return chips;
}

export function removeFilterChip(f: HerbFilter, chip: FilterChip): HerbFilter {
  if (chip.key === 'minEvidence') return { ...f, minEvidence: null };
  return isFilterValueSelected(f, chip.key, chip.value) ? toggleFilterValue(f, chip.key, chip.value) : f;
}
