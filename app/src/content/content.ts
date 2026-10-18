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

/** expo-image: ImageSource не включает number (результат require), поэтому добавляем его явно. */
export type PhotoSource = ImageSource | number;

export interface AppContent {
  bundle: ContentBundle;
  /** Откуда активная база: встроенная в приложение или скачанная из сети. */
  source: 'bundled' | 'downloaded';
  index: FilterIndex;
  herbById: Map<string, Herb>;
  recipeById: Map<string, Recipe>;
  sourceById: Map<string, Source>;
  /** Русское название записи словаря по id (или сам id, если записи нет). */
  nameOf: (key: DictionaryKey, id: string) => string;
  /** Фото по пути вида photos/<sha256>.webp: сначала скачанное, затем встроенное, иначе null (заглушка). */
  photoSource: (path: string) => PhotoSource | null;
}

/** Встроенная база, разобранная один раз при загрузке модуля. */
export const BUNDLED_BUNDLE: ContentBundle = bundleSchemas.contentBundle.parse(raw);

/** Пути фото, встроенных в приложение. */
export const BUNDLED_PHOTO_PATHS: ReadonlySet<string> = new Set(Object.keys(BUNDLED_PHOTOS));

/** Имя файла в хранилище — последний сегмент пути. */
const fileNameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/**
 * Контент для экранов из базы.
 * downloaded — пути скачанных фото (photos/<sha256>.webp); photoUri — адрес файла по его имени.
 */
export function createAppContent(
  bundle: ContentBundle,
  source: 'bundled' | 'downloaded',
  downloaded: ReadonlySet<string>,
  photoUri: (fileName: string) => string,
): AppContent {
  const names = new Map<DictionaryKey, Map<string, string>>(
    (Object.keys(bundle.dictionaries) as DictionaryKey[]).map((key) => [
      key,
      new Map(bundle.dictionaries[key].map((item) => [item.id, item.name])),
    ]),
  );
  return {
    bundle,
    source,
    index: buildFilterIndex(bundle.dictionaries),
    herbById: new Map(bundle.herbs.map((h) => [h.id, h])),
    recipeById: new Map(bundle.recipes.map((r) => [r.id, r])),
    sourceById: new Map(bundle.sources.map((s) => [s.id, s])),
    nameOf: (key, id) => names.get(key)?.get(id) ?? id,
    photoSource: (path) => {
      if (downloaded.has(path)) return { uri: photoUri(fileNameOf(path)) };
      return BUNDLED_PHOTOS[path] ?? null;
    },
  };
}
