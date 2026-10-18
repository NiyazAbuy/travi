import {
  buildFilterIndex,
  bundleSchemas,
  type ContentBundle,
  type DictionaryKey,
  type FilterIndex,
  type Herb,
  type Recipe,
  type Source,
} from '@travy/shared';
import type { ImageSource } from 'expo-image';
import raw from '../../assets/content/content.json';
import { BUNDLED_PHOTOS } from './bundled-photos';

export interface AppContent {
  bundle: ContentBundle;
  index: FilterIndex;
  herbById: Map<string, Herb>;
  recipeById: Map<string, Recipe>;
  sourceById: Map<string, Source>;
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
    sourceById: new Map(bundle.sources.map((s) => [s.id, s])),
    nameOf: (key, id) => names.get(key)?.get(id) ?? id,
  };
}

/** Фото из встроенной базы по пути вида photos/<sha256>.webp. */
/** expo-image: ImageSource не включает number (результат require), поэтому добавляем его явно. */
export type PhotoSource = ImageSource | number;

export function photoSource(path: string): PhotoSource | null {
  // План 4: сначала искать скачанное фото ({ uri }), затем встроенное.
  return BUNDLED_PHOTOS[path] ?? null;
}
