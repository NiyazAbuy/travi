import {
  buildFilterIndex,
  bundleSchemas,
  type ContentBundle,
  type DictionaryKey,
  type FilterIndex,
  type Herb,
  type Recipe,
} from '@travy/shared';
import raw from '../../assets/content/content.json';
import { BUNDLED_PHOTOS } from './bundled-photos';

export interface AppContent {
  bundle: ContentBundle;
  index: FilterIndex;
  herbById: Map<string, Herb>;
  recipeById: Map<string, Recipe>;
  /** Русское название записи словаря по id (или сам id, если записи нет). */
  nameOf: (key: DictionaryKey, id: string) => string;
}

export function loadBundledContent(): AppContent {
  const bundle = bundleSchemas.contentBundle.parse(raw);
  const names = new Map<DictionaryKey, Map<string, string>>(
    (Object.keys(bundle.dictionaries) as DictionaryKey[]).map((key) => [
      key,
      new Map(bundle.dictionaries[key].map((item) => [item.id, item.name])),
    ]),
  );
  return {
    bundle,
    index: buildFilterIndex(bundle.dictionaries),
    herbById: new Map(bundle.herbs.map((h) => [h.id, h])),
    recipeById: new Map(bundle.recipes.map((r) => [r.id, r])),
    nameOf: (key, id) => names.get(key)?.get(id) ?? id,
  };
}

/** Фото из встроенной базы по пути вида photos/<sha256>.webp. */
export function photoSource(path: string): number | undefined {
  return BUNDLED_PHOTOS[path];
}
