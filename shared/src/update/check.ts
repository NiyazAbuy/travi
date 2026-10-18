import { manifestSchema, type Manifest } from '../manifest';
import { SCHEMA_VERSION, type ContentBundle } from '../schema';
import { parseContentBundle, photoPaths, summarizeChanges, updateMessage, type ChangeSummary } from './content';

/** Таймауты сетевых запросов, мс. */
export const UPDATE_TIMEOUTS = { manifest: 10_000, content: 60_000, photo: 30_000 } as const;

/** Файловое хранилище скачанной базы и фото; реализуется в приложении. */
export interface UpdateStore {
  writeIncoming(text: string): Promise<void>;
  /** incoming.json → active.json, атомарно. */
  commitIncoming(): Promise<void>;
  /** Нет файла — не ошибка. */
  discardIncoming(): Promise<void>;
  /** Имена файлов "<sha256>.webp". */
  listPhotos(): Promise<string[]>;
  /** Запись через временный файл. */
  writePhoto(fileName: string, bytes: Uint8Array): Promise<void>;
  deletePhoto(fileName: string): Promise<void>;
}

export interface UpdateDeps {
  /** Оканчивается на "/". */
  baseUrl: string;
  /** Отклоняется при ошибке сети, таймауте и HTTP не 2xx. */
  fetchBytes(url: string, timeoutMs: number): Promise<Uint8Array>;
  sha256Hex(bytes: Uint8Array): Promise<string>;
  store: UpdateStore;
}

export type RejectReason = 'size' | 'sha256' | 'json' | 'references' | 'version' | 'storage';

export type CheckResult =
  | { kind: 'unreachable' }
  | { kind: 'app-update-needed'; schemaVersion: number }
  | { kind: 'up-to-date'; manifest: Manifest }
  | { kind: 'rejected'; reason: RejectReason }
  | { kind: 'applied'; bundle: ContentBundle; manifest: Manifest; summary: ChangeSummary };

/** Проверка дошла до конца (сервер ответил): время последней проверки обновляется. */
export function completesCheck(r: CheckResult): boolean {
  return r.kind !== 'unreachable';
}

async function fetchManifest(deps: UpdateDeps): Promise<Manifest | null> {
  try {
    const bytes = await deps.fetchBytes(`${deps.baseUrl}manifest.json`, UPDATE_TIMEOUTS.manifest);
    const parsed = manifestSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/**
 * Проверяет и применяет новую базу. На любой ошибке прежняя база остаётся нетронутой:
 * новая становится активной только после полной проверки и атомарной подмены файла.
 */
export async function checkContent(deps: UpdateDeps, current: ContentBundle): Promise<CheckResult> {
  const manifest = await fetchManifest(deps);
  if (!manifest) return { kind: 'unreachable' };
  if (manifest.schemaVersion > SCHEMA_VERSION) {
    return { kind: 'app-update-needed', schemaVersion: manifest.schemaVersion };
  }
  if (manifest.schemaVersion < SCHEMA_VERSION) return { kind: 'rejected', reason: 'version' };
  if (manifest.contentVersion <= current.contentVersion) return { kind: 'up-to-date', manifest };

  let bytes: Uint8Array;
  try {
    // Версия в адресе: кэш CDN или HTTP-клиента не должен подсунуть старый content.json к свежему манифесту.
    // К manifest.json и фото параметр не добавляется: манифест всегда свежий, а фото адресуются по содержимому.
    bytes = await deps.fetchBytes(
      `${deps.baseUrl}${manifest.content.path}?v=${manifest.contentVersion}`,
      UPDATE_TIMEOUTS.content,
    );
  } catch {
    return { kind: 'unreachable' };
  }
  if (bytes.length !== manifest.content.size) return { kind: 'rejected', reason: 'size' };
  if ((await deps.sha256Hex(bytes)) !== manifest.content.sha256) return { kind: 'rejected', reason: 'sha256' };

  const text = new TextDecoder().decode(bytes);
  const parsed = parseContentBundle(text);
  if (!parsed.ok) {
    if (parsed.reason === 'schema') return { kind: 'app-update-needed', schemaVersion: manifest.schemaVersion };
    return { kind: 'rejected', reason: parsed.reason };
  }
  const bundle = parsed.bundle;
  if (bundle.contentVersion !== manifest.contentVersion || bundle.schemaVersion !== manifest.schemaVersion) {
    return { kind: 'rejected', reason: 'version' };
  }

  try {
    await deps.store.writeIncoming(text);
    await deps.store.commitIncoming();
  } catch {
    try {
      await deps.store.discardIncoming();
    } catch {
      // Уборка недописанного файла не должна менять причину отказа.
    }
    return { kind: 'rejected', reason: 'storage' };
  }
  return { kind: 'applied', bundle, manifest, summary: summarizeChanges(current, bundle) };
}

/** Сообщение для ручной проверки в настройках. */
export function manualCheckMessage(r: CheckResult): string {
  switch (r.kind) {
    case 'unreachable':
      return 'Нет связи с сервером, попробуйте позже';
    case 'up-to-date':
      return 'База актуальна';
    case 'applied':
      return updateMessage(r.summary) ?? 'База актуальна';
    case 'rejected':
      return 'Скачанная база повреждена, оставлена текущая';
    case 'app-update-needed':
      return 'Доступна новая база — обновите приложение';
  }
}

export interface PhotoSyncResult {
  /** Пути вида "photos/<sha256>.webp". */
  downloaded: string[];
  failed: string[];
  deleted: string[];
}

/** Имя файла в хранилище — последний сегмент пути. */
const fileNameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);

/**
 * Докачивает фото активной базы, которых нет ни в приложении, ни в хранилище.
 * Сбой одного фото не прерывает остальные; в конце всегда убирает ненужные.
 */
export async function syncPhotos(
  deps: UpdateDeps,
  manifest: Manifest,
  active: ContentBundle,
  bundledPaths: ReadonlySet<string>,
  onPhoto?: (path: string) => void,
): Promise<PhotoSyncResult> {
  const downloaded: string[] = [];
  const failed: string[] = [];
  const needed = photoPaths(active);
  let stored: Set<string>;
  try {
    stored = new Set(await deps.store.listPhotos());
  } catch {
    stored = new Set();
  }
  const todo = manifest.photos.filter(
    (f) => needed.has(f.path) && !bundledPaths.has(f.path) && !stored.has(fileNameOf(f.path)),
  );
  for (const file of todo) {
    try {
      const bytes = await deps.fetchBytes(`${deps.baseUrl}${file.path}`, UPDATE_TIMEOUTS.photo);
      if (bytes.length !== file.size) throw new Error('size');
      if ((await deps.sha256Hex(bytes)) !== file.sha256) throw new Error('sha256');
      await deps.store.writePhoto(fileNameOf(file.path), bytes);
      downloaded.push(file.path);
      onPhoto?.(file.path);
    } catch {
      failed.push(file.path);
    }
  }
  // Уборка выполняется всегда, в том числе когда качать нечего.
  const deleted = await removeUnreferencedPhotos(deps.store, active);
  return { downloaded, failed, deleted };
}

/** Удаляет скачанные фото, которых нет в активной базе; возвращает удалённые пути. */
export async function removeUnreferencedPhotos(store: UpdateStore, active: ContentBundle): Promise<string[]> {
  const keep = new Set([...photoPaths(active)].map(fileNameOf));
  let names: string[];
  try {
    names = await store.listPhotos();
  } catch {
    return [];
  }
  const deleted: string[] = [];
  for (const name of names) {
    if (keep.has(name)) continue;
    try {
      await store.deletePhoto(name);
      deleted.push(`photos/${name}`);
    } catch {
      // Не удалось удалить — останется до следующей уборки.
    }
  }
  return deleted;
}
