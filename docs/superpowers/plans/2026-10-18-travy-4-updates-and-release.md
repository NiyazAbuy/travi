# «Травы», план 4: обновление базы по сети и выпуск APK — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Приложение само обновляет базу трав с GitHub Pages (спецификация §7) и собирается в APK в облаке Expo для раздачи через GitHub Releases.

**Architecture:** Весь алгоритм обновления — чистый TypeScript в `shared/src/update/` с внедряемыми зависимостями (сеть, хранилище, sha256) и тестами Vitest на подменах. Приложение даёт тонкие адаптеры (`expo-file-system`, `expo-crypto`, `fetch`), делает `ContentProvider` заменяемым и добавляет `UpdateProvider` (автопроверка, ручная проверка, плашка). Версия базы становится детерминированной (время последнего коммита в `content/`), чтобы свежий APK не скачивал ту же базу.

**Tech Stack:** как в планах 3a/3b + `expo-file-system` (новый API `File`/`Directory`/`Paths`), `expo-crypto`, EAS Build.

**Spec:** `docs/superpowers/specs/2026-10-18-travy-4-updates-and-release-design.md` (дизайн этого плана) и `docs/superpowers/specs/2026-10-15-travy-design.md` §4.3, §7, §10–§12.

## Global Constraints

- Маршруты — только в `app/src/app/`; логика без UI — в `shared` с тестами; цвета и размеры — только из `app/src/theme/`; зависимости Expo — только `npx expo install`; все тексты интерфейса — на русском.
- `shared` не использует Node API и Expo: только то, что работает и в Node (Vitest), и в Hermes.
- Адрес базы: `https://niyazabuy.github.io/travi/` — одна константа `CONTENT_BASE_URL` в `app/src/update/config.ts`.
- Таймауты: манифест 10 000 мс, `content.json` 60 000 мс, фото 30 000 мс. Интервал автопроверки — 24 ч.
- Ключ состояния обновлений в `AsyncStorage`: `travy.update.v1`.
- Файлы: `<документы>/content/active.json`, `<документы>/content/incoming.json`, `<документы>/photos/<sha256>.webp`.
- `android.package` = `io.github.niyazabuy.travy`, `version` = `1.0.0`, `android.versionCode` = 1.
- Тексты (точно):
  - автоплашка: `База обновлена: +2 травы, изменено 3, удалено 1` (части без нулей, через «, »; склонение через `countRu(n, ['трава', 'травы', 'трав'])`); только словари/источники/сборы → `База обновлена`; ничего кроме версии → без плашки;
  - ручная проверка: `Проверяю…` · `База актуальна` · текст автоплашки · `Нет связи с сервером, попробуйте позже` · `Скачанная база повреждена, оставлена текущая` · `Доступна новая база — обновите приложение`.
- После любой ошибки на любом шаге приложение работает на прежней базе; пользовательские данные (`travy.user.v1`) обновление не трогает.
- Веб-превью (`npm run app:web`) продолжает работать: на вебе обновления отключены, база встроенная.

## Review Focus

- `active.json` обрезан или испорчен (выключился телефон во время записи) → старт на встроенной базе, файл удаляется — тест `pickActiveContent` «битый JSON» (Task 2).
- Многократные запуски без сети → ни сообщений, ни сдвига таймера; следующая попытка при следующем запуске — тесты `completesCheck('unreachable') === false` и `isCheckDue` (Task 2, Task 3).
- APK со встроенной базой новее, чем на Pages (CI ещё не доехал) → никакого отката и докачки фото — тест `checkContent` «текущая новее манифеста» (Task 3) и условие в `UpdateProvider` (Task 4).
- После обновления в открытом списке трав выбран фильтр по исчезнувшему показанию → фильтр тихо очищается, экран не падает — тест `pruneFilter` (Task 2).
- Часы телефона переведены назад (`lastCheckedAt` в будущем) → проверка считается просроченной — тест `isCheckDue` (Task 2).

---

### Task 1: Детерминированная версия базы

**Files:**
- Create: `tools/src/content-version.ts`, `tools/test/content-version.test.ts`
- Modify: `tools/src/build.ts` (опция `contentVersion`), `tools/src/cli/build.ts`, `.github/workflows/content.yml`

**Interfaces:**
- Produces: `pickContentVersion(git: { dirty: boolean; lastCommitSeconds: number | null } | null, now: Date): number`; `resolveContentVersion(contentDir: string, now: Date): number`; `BuildOptions.contentVersion?: number` (если не задана — `formatContentVersion(now)`, как сейчас).

- [ ] **Step 1: Тест**

```ts
import { describe, expect, it } from 'vitest';
import { pickContentVersion } from '../src/content-version';

const NOW = new Date('2026-10-18T10:07:00Z');

describe('pickContentVersion', () => {
  it('чистое дерево — время последнего коммита в content/', () => {
    const seconds = Date.parse('2026-10-17T21:05:59Z') / 1000;
    expect(pickContentVersion({ dirty: false, lastCommitSeconds: seconds }, NOW)).toBe(202610172105);
  });
  it('незакоммиченные изменения — текущее время', () => {
    expect(pickContentVersion({ dirty: true, lastCommitSeconds: 1 }, NOW)).toBe(202610181007);
  });
  it('нет коммитов в content/ или нет git — текущее время', () => {
    expect(pickContentVersion({ dirty: false, lastCommitSeconds: null }, NOW)).toBe(202610181007);
    expect(pickContentVersion(null, NOW)).toBe(202610181007);
  });
});
```

Плюс в `tools/test/build.test.ts`: `buildContent({ contentDir, distDir, now: NOW, contentVersion: 202601010000 })` → `manifest.contentVersion` и `content.json.contentVersion` равны `202601010000`.

- [ ] **Step 2: Запустить — падает** — `npx vitest run tools/test/content-version.test.ts tools/test/build.test.ts`; Expected: FAIL (`Cannot find module '../src/content-version'`).

- [ ] **Step 3: Реализация**

`pickContentVersion` использует `formatContentVersion` из `build.ts`. `resolveContentVersion` вызывает `execFileSync('git', [...], { cwd: contentDir })`: `status --porcelain -- .` (непустой вывод → `dirty`), `log -1 --format=%ct -- .` (пусто → `null`); любое исключение → `null`. `cli/build.ts` передаёт `contentVersion: resolveContentVersion(CONTENT_DIR, now)` и печатает, откуда версия («из коммита» / «текущее время»). В `content.yml` у `actions/checkout@v5` — `with: fetch-depth: 0`.

- [ ] **Step 4: Проверка** — `npx vitest run && npm run typecheck && npm run content:build`; Expected: все тесты PASS; при чистом `content/` версия в выводе = время последнего коммита в `content/`.

- [ ] **Step 5: Commit** — `git add tools .github && git commit -m "feat(tools): content version from last content commit"` (+ строка `Co-Authored-By`).

---

### Task 2: Чистые помощники обновления в shared

**Files:**
- Create: `shared/src/update/state.ts`, `shared/src/update/content.ts`, `shared/src/update/index.ts`, `shared/src/query/prune.ts`, `shared/test/update-helpers.test.ts`
- Modify: `shared/src/index.ts` (`export * from './update'`), `shared/src/query/index.ts` (`export * from './prune'`)

**Interfaces:**
- Produces (`shared/src/update/state.ts`):
  - `UPDATE_STATE_KEY = 'travy.update.v1'`, `CHECK_INTERVAL_MS = 86_400_000`
  - `interface UpdateState { lastCheckedAt: number | null; appUpdateNeeded: { schemaVersion: number } | null }`
  - `emptyUpdateState(): UpdateState`, `parseUpdateState(raw: string | null): UpdateState` (любой мусор → пустое; частично верное — берёт верные поля), `serializeUpdateState(s: UpdateState): string`
  - `isCheckDue(s: UpdateState, now: number): boolean`
- Produces (`shared/src/update/content.ts`):
  - `bundleReferenceErrors(b: ContentBundle): string[]` — те же ссылки, что проверяет `tools/src/validate.ts` (словари, источники, `lookalikes[].herb`, `components[].herb`, `indications[].organ_system`, `substances[].class`), текст ошибки `"<где>: нет <id>"`
  - `type ParsedContent = { ok: true; bundle: ContentBundle } | { ok: false; reason: 'json' | 'schema' | 'references' }`; `parseContentBundle(text: string): ParsedContent`
  - `pickActiveContent(bundled: ContentBundle, downloadedText: string | null): { bundle: ContentBundle; source: 'bundled' | 'downloaded'; discardDownloaded: boolean }`
  - `photoPaths(b: ContentBundle): Set<string>` — пути фото трав и двойников
  - `interface ChangeSummary { added: number; removed: number; changed: number; otherChanged: boolean }`; `summarizeChanges(prev: ContentBundle, next: ContentBundle): ChangeSummary` (травы по `id`, «изменена» — разный `JSON.stringify`; `otherChanged` — различаются сборы, словари или источники)
  - `updateMessage(s: ChangeSummary): string | null`
- Produces (`shared/src/query/prune.ts`): `pruneFilter(f: HerbFilter, b: ContentBundle): HerbFilter` — убирает id, которых нет в словарях (`indications`, `substances`, `substanceClasses`, `actions`, `organSystems`, `parts`→`plantParts`, `habitats`, `families`); если убирать нечего — возвращает **тот же объект**.

- [ ] **Step 1: Тесты** (`shared/test/update-helpers.test.ts`, фикстуры — `queryContent`, `queryHerbs4` из `query-fixtures.ts`)

```ts
const DAY = 86_400_000;

describe('состояние проверки', () => {
  it('пустое и мусор → пустое', () => {
    expect(parseUpdateState(null)).toEqual({ lastCheckedAt: null, appUpdateNeeded: null });
    expect(parseUpdateState('{oops')).toEqual(emptyUpdateState());
    expect(parseUpdateState('{"lastCheckedAt":"x","appUpdateNeeded":{"schemaVersion":2}}')).toEqual({
      lastCheckedAt: null,
      appUpdateNeeded: { schemaVersion: 2 },
    });
  });
  it('туда и обратно', () => {
    const s = { lastCheckedAt: 5, appUpdateNeeded: null };
    expect(parseUpdateState(serializeUpdateState(s))).toEqual(s);
  });
  it('isCheckDue: никогда, сутки, меньше суток, часы назад', () => {
    expect(isCheckDue(emptyUpdateState(), 1000)).toBe(true);
    expect(isCheckDue({ lastCheckedAt: 0, appUpdateNeeded: null }, DAY)).toBe(true);
    expect(isCheckDue({ lastCheckedAt: 0, appUpdateNeeded: null }, DAY - 1)).toBe(false);
    expect(isCheckDue({ lastCheckedAt: 10 * DAY, appUpdateNeeded: null }, DAY)).toBe(true);
  });
});

describe('разбор и выбор базы', () => {
  const bundled = queryContent();
  const newer = { ...bundled, contentVersion: bundled.contentVersion + 1 };
  it('parseContentBundle: json / schema / references / ok', () => {
    expect(parseContentBundle('{"herbs":')).toEqual({ ok: false, reason: 'json' });
    expect(parseContentBundle('{"herbs":[]}')).toEqual({ ok: false, reason: 'schema' });
    const broken = { ...newer, herbs: [{ ...newer.herbs[0]!, family: 'nope' }, ...newer.herbs.slice(1)] };
    expect(parseContentBundle(JSON.stringify(broken))).toEqual({ ok: false, reason: 'references' });
    expect(parseContentBundle(JSON.stringify(newer))).toMatchObject({ ok: true });
  });
  it('bundleReferenceErrors: целая база — пусто, битая ссылка — сообщение', () => {
    expect(bundleReferenceErrors(bundled)).toEqual([]);
    const broken = { ...bundled, herbs: [{ ...bundled.herbs[0]!, family: 'nope' }] };
    expect(bundleReferenceErrors(broken)[0]).toContain('nope');
  });
  it('pickActiveContent', () => {
    expect(pickActiveContent(bundled, null)).toEqual({ bundle: bundled, source: 'bundled', discardDownloaded: false });
    expect(pickActiveContent(bundled, JSON.stringify(newer))).toMatchObject({ source: 'downloaded', discardDownloaded: false });
    expect(pickActiveContent(bundled, JSON.stringify(newer)).bundle.contentVersion).toBe(newer.contentVersion);
    // встроенная новее или равна (поставили новый APK) — скачанная выбрасывается
    expect(pickActiveContent(newer, JSON.stringify(bundled))).toMatchObject({ source: 'bundled', discardDownloaded: true });
    expect(pickActiveContent(bundled, JSON.stringify(bundled))).toMatchObject({ source: 'bundled', discardDownloaded: true });
    // обрезанный файл
    expect(pickActiveContent(bundled, JSON.stringify(newer).slice(0, 100))).toMatchObject({ source: 'bundled', discardDownloaded: true });
  });
  it('photoPaths включает фото двойников', () => {
    const h = bundled.herbs[0]!;
    const withLookalike = { ...bundled, herbs: [{ ...h, lookalikes: [{ name: 'Двойник', poisonous: true, differences: 'x',
      photo: { ...h.photos[0]!, path: `photos/${'b'.repeat(64)}.webp` } }] }] };
    expect(photoPaths(withLookalike)).toEqual(new Set([h.photos[0]!.path, `photos/${'b'.repeat(64)}.webp`]));
  });
});

describe('сводка изменений', () => {
  const prev = queryContent();
  const [a, b, c, d] = queryHerbs4();
  it('добавлено, удалено, изменено', () => {
    const next = queryContent([{ ...a!, description: 'новое' }, b!, c!, { ...d!, id: 'new-herb' }]);
    expect(summarizeChanges(prev, next)).toEqual({ added: 1, removed: 1, changed: 1, otherChanged: false });
  });
  it('только версия — ничего', () => {
    expect(summarizeChanges(prev, { ...prev, contentVersion: prev.contentVersion + 1 })).toEqual({
      added: 0, removed: 0, changed: 0, otherChanged: false,
    });
  });
  it('updateMessage', () => {
    expect(updateMessage({ added: 2, removed: 1, changed: 3, otherChanged: true })).toBe('База обновлена: +2 травы, изменено 3, удалено 1');
    expect(updateMessage({ added: 0, removed: 0, changed: 5, otherChanged: false })).toBe('База обновлена: изменено 5');
    expect(updateMessage({ added: 1, removed: 0, changed: 0, otherChanged: false })).toBe('База обновлена: +1 трава');
    expect(updateMessage({ added: 0, removed: 0, changed: 0, otherChanged: true })).toBe('База обновлена');
    expect(updateMessage({ added: 0, removed: 0, changed: 0, otherChanged: false })).toBeNull();
  });
});

describe('pruneFilter', () => {
  const content = queryContent();
  it('убирает исчезнувшие id и не трогает остальное', () => {
    const f = { ...emptyFilter(), indications: ['insomnia', 'gone'], parts: ['gone-part'], months: [6], minEvidence: 'traditional' as const };
    expect(pruneFilter(f, content)).toEqual({ ...f, indications: ['insomnia'], parts: [] });
  });
  it('нечего убирать — тот же объект', () => {
    const f = { ...emptyFilter(), indications: ['insomnia'] };
    expect(pruneFilter(f, content)).toBe(f);
  });
});
```

- [ ] **Step 2: Запустить — падает** — `npx vitest run shared/test/update-helpers.test.ts`; Expected: FAIL (модули не найдены).

- [ ] **Step 3: Реализация** — по сигнатурам выше. `parseContentBundle`: `JSON.parse` → `bundleSchemas.contentBundle.safeParse` → `bundleReferenceErrors`. `pickActiveContent`: скачанную берём, только если `parseContentBundle` ok и её `contentVersion` > встроенной; любое иное непустое `downloadedText` → `discardDownloaded: true`.

- [ ] **Step 4: Проверка** — `npx vitest run && npm run typecheck`; Expected: все PASS, `tsc` без ошибок.

- [ ] **Step 5: Commit** — `git add shared && git commit -m "feat(shared): update state, content selection, change summary and filter pruning"`.

---

### Task 3: Алгоритм проверки и докачки фото

**Files:**
- Create: `shared/src/update/check.ts`, `shared/test/update-check.test.ts`
- Modify: `shared/src/update/index.ts`

**Interfaces:**
- Consumes: всё из Task 2; `manifestSchema`, `SCHEMA_VERSION`.
- Produces:

```ts
export const UPDATE_TIMEOUTS = { manifest: 10_000, content: 60_000, photo: 30_000 } as const;

export interface UpdateStore {
  writeIncoming(text: string): Promise<void>;
  commitIncoming(): Promise<void>; // incoming.json → active.json, атомарно
  discardIncoming(): Promise<void>; // нет файла — не ошибка
  listPhotos(): Promise<string[]>; // имена файлов "<sha256>.webp"
  writePhoto(fileName: string, bytes: Uint8Array): Promise<void>; // через временный файл
  deletePhoto(fileName: string): Promise<void>;
}

export interface UpdateDeps {
  baseUrl: string; // оканчивается на "/"
  fetchBytes(url: string, timeoutMs: number): Promise<Uint8Array>; // отклоняется при ошибке сети, таймауте, HTTP не 2xx
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

export function completesCheck(r: CheckResult): boolean; // всё, кроме 'unreachable'
export function checkContent(deps: UpdateDeps, current: ContentBundle): Promise<CheckResult>;
export function manualCheckMessage(r: CheckResult): string;

export interface PhotoSyncResult { downloaded: string[]; failed: string[]; deleted: string[] } // пути "photos/<sha>.webp"
export function syncPhotos(
  deps: UpdateDeps,
  manifest: Manifest,
  active: ContentBundle,
  bundledPaths: ReadonlySet<string>,
  onPhoto?: (path: string) => void,
): Promise<PhotoSyncResult>;
export function removeUnreferencedPhotos(store: UpdateStore, active: ContentBundle): Promise<string[]>;
```

Правила `checkContent` (по порядку):
1. `fetchBytes(baseUrl + 'manifest.json', 10 000)`; ошибка, не-JSON или не проходит `manifestSchema` → `unreachable`.
2. `manifest.schemaVersion > SCHEMA_VERSION` → `app-update-needed`; `<` → `rejected: 'version'`.
3. `manifest.contentVersion <= current.contentVersion` → `up-to-date`.
4. `fetchBytes(baseUrl + manifest.content.path, 60 000)`; ошибка → `unreachable`.
5. Длина ≠ `size` → `rejected: 'size'`; sha256 ≠ → `rejected: 'sha256'`.
6. `TextDecoder` → `parseContentBundle`: `json` → `rejected: 'json'`; `schema` → `app-update-needed` с `manifest.schemaVersion`; `references` → `rejected: 'references'`.
7. `bundle.contentVersion`/`schemaVersion` ≠ манифесту → `rejected: 'version'`.
8. `writeIncoming(text)` → `commitIncoming()`; исключение → `discardIncoming()` (ошибку глушить) и `rejected: 'storage'`.
9. → `applied` со `summarizeChanges(current, bundle)`.

`manualCheckMessage`: `unreachable` → «Нет связи с сервером, попробуйте позже»; `up-to-date` → «База актуальна»; `applied` → `updateMessage(summary) ?? 'База актуальна'`; `rejected` → «Скачанная база повреждена, оставлена текущая»; `app-update-needed` → «Доступна новая база — обновите приложение».

`syncPhotos`: к скачиванию — фото из `manifest.photos`, путь которых есть в `photoPaths(active)`, нет в `bundledPaths` и нет среди `listPhotos()`. По одному: `fetchBytes(baseUrl + path, 30 000)` → проверка размера и sha256 → `writePhoto(<имя файла>, bytes)` → `onPhoto(path)`. Любая ошибка одного фото → в `failed`, дальше. В конце всегда `removeUnreferencedPhotos` (удаляет скачанные фото, которых нет в `photoPaths(active)`; ошибка удаления — глушить).

- [ ] **Step 1: Тесты** (`shared/test/update-check.test.ts`). Подмены: `fakeServer(files: Record<string, Uint8Array | 'fail'>)` → `fetchBytes`, который отдаёт байты по URL без `baseUrl` или отклоняется; `memoryStore()` → `UpdateStore` на `Map` с полями `incoming`, `active`, `photos` для проверок и флагом `failCommit`; `sha256Hex` — `node:crypto` (`createHash('sha256')`) прямо в тесте; хелпер `publish(bundle, photos)` собирает `manifest.json` и `content.json` как `tools/build.ts`.

Случаи (имя теста → ожидание):
- «нет сети» — манифест `'fail'` → `{ kind: 'unreachable' }`, `completesCheck` → `false`, хранилище не тронуто.
- «манифест не JSON» → `unreachable`.
- «новая схема» — `schemaVersion: SCHEMA_VERSION + 1` → `{ kind: 'app-update-needed', schemaVersion: SCHEMA_VERSION + 1 }`, `content.json` не запрашивался.
- «та же версия» и «текущая новее манифеста» → `up-to-date`, `content.json` не запрашивался.
- «новая версия» → `applied`, `store.active` = текст `content.json`, `incoming` пуст, `summary` верная.
- «content.json не скачался» → `unreachable`.
- «неверный размер» → `rejected: 'size'`; «битый sha256» → `rejected: 'sha256'`; «невалидный JSON при верном sha» → `rejected: 'json'`; «не проходит схему при верном sha» → `app-update-needed`; «битая ссылка» → `rejected: 'references'`; «версия в content.json ≠ манифесту» → `rejected: 'version'`. Во всех — `store.active` прежний.
- «сбой записи» — `failCommit` → `rejected: 'storage'`, `incoming` удалён, `active` прежний.
- `manualCheckMessage` — по одному ожиданию на каждый `kind` (тексты из Global Constraints); `applied` без изменений → «База актуальна».
- `syncPhotos` «докачка»: 2 нужных фото, одно `'fail'` → `downloaded` = [второе], `failed` = [первое], `onPhoto` вызван один раз; встроенные и уже скачанные не запрашивались.
- `syncPhotos` «битое фото» — байты не совпадают с sha256 → `failed`, `writePhoto` не вызывался.
- `syncPhotos` «уборка»: в хранилище лишнее фото → `deleted` содержит его путь, нужные остались.

- [ ] **Step 2: Запустить — падает** — `npx vitest run shared/test/update-check.test.ts`; Expected: FAIL.

- [ ] **Step 3: Реализация** — по правилам выше; `TextDecoder` — глобальный (есть в Node и Hermes).

- [ ] **Step 4: Проверка** — `npx vitest run && npm run typecheck`; Expected: PASS.

- [ ] **Step 5: Commit** — `git add shared && git commit -m "feat(shared): content update check and photo sync"`.

---

### Task 4: Обновление в приложении

**Files:**
- Create: `app/src/update/config.ts`, `app/src/update/fileStore.ts`, `app/src/update/net.ts`, `app/src/update/UpdateProvider.tsx`, `app/src/components/Toast.tsx`
- Modify: `app/src/content/content.ts`, `app/src/content/ContentProvider.tsx`, `app/src/app/_layout.tsx`, `app/src/app/settings.tsx`, `app/src/app/herbs.tsx`, `app/src/components/index.ts`, места вызова `photoSource` (`app/src/app/(tabs)/index.tsx`, `app/src/app/herb/[id].tsx`, `app/src/components/HerbCard.tsx`, `app/src/components/HerbRow.tsx`)

**Interfaces:**
- Consumes: Task 2 и Task 3.
- Produces:
  - `config.ts`: `CONTENT_BASE_URL = 'https://niyazabuy.github.io/travi/'`.
  - `fileStore.ts`: `interface FileStore extends UpdateStore { readActiveSync(): string | null; deleteActive(): void; listPhotosSync(): string[]; photoUri(fileName: string): string }`; `createFileStore(): FileStore | null` (`null` на `Platform.OS === 'web'`). Новый API `expo-file-system` (`File`, `Directory`, `Paths.document`); папки создаются при первой записи; `commitIncoming` — удалить старый `active.json`, затем `move` `incoming.json` → `active.json`; `writePhoto` — запись в `<sha>.webp.tmp`, затем `move`.
  - `net.ts`: `fetchBytes(url, timeoutMs)` (`fetch` + `AbortSignal.timeout`, не-2xx → `throw`, `new Uint8Array(await res.arrayBuffer())`); `sha256Hex(bytes)` (`Crypto.digest(CryptoDigestAlgorithm.SHA256, bytes)` → hex).
  - `content.ts`: `AppContent` получает поля `source: 'bundled' | 'downloaded'` и `photoSource(path: string): PhotoSource | null` (сначала скачанное `{ uri }`, затем встроенное, иначе `null`); свободная функция `photoSource` удаляется; `createAppContent(bundle: ContentBundle, source: 'bundled' | 'downloaded', downloaded: ReadonlySet<string>, photoUri: (fileName: string) => string): AppContent`; `BUNDLED_BUNDLE: ContentBundle` (встроенная, разобранная один раз); `BUNDLED_PHOTO_PATHS: ReadonlySet<string>`.
  - `ContentProvider.tsx`: при старте `pickActiveContent(BUNDLED_BUNDLE, store?.readActiveSync() ?? null)`; `discardDownloaded` → `deleteActive()` и фоном `removeUnreferencedPhotos(store, bundle)`; хук `useContent(): AppContent` (как раньше) и новый `useContentControl(): { store: FileStore | null; replaceBundle(bundle: ContentBundle): void; photoAdded(path: string): void }`.
  - `UpdateProvider.tsx`: `useUpdates(): { status: string | null; checking: boolean; appUpdateNeeded: boolean; checkNow?: () => void }`. Поведение: читает `UpdateState`; после чтения и при `AppState` → `active` запускает проверку, если `isCheckDue`; одновременно — одна проверка (ref); `applied` → `replaceBundle`; `applied` или (`up-to-date` и `manifest.contentVersion === активной`) → фоном `syncPhotos(..., photoAdded)`; `completesCheck` → сохраняет `lastCheckedAt = Date.now()`; `app-update-needed` → `appUpdateNeeded = { schemaVersion }`, `applied`/`up-to-date` → `null`; автопроверка показывает плашку только `updateMessage(summary)` при `applied`; ручная — `status = manualCheckMessage(result)` и та же плашка. Без `store` (веб) ничего не делает и `checkNow` — `undefined`.
  - `Toast.tsx`: `Toast({ message }: { message: string | null })` — плашка над панелью вкладок, исчезает через 4 с; цвета `surfaceRaised`/`text`/`border` из темы.

- [ ] **Step 1: Зависимости** — `cd app && npx expo install expo-file-system expo-crypto && cd ..`; Expected: обе в `app/package.json` с версиями `~58.*`. Прочитать их `.d.ts` в `node_modules` и сверить имена `File`, `Directory`, `Paths`, `move`, `write`, `textSync`, `list`, `Crypto.digest` с этим планом; расхождение — адаптировать вызовы, не интерфейсы.

- [ ] **Step 2: Контент и фото** — `content.ts`, `ContentProvider.tsx`, четыре места вызова `photoSource` → `useContent().photoSource`. `herbs.tsx`: `const active = useMemo(() => pruneFilter(filter, bundle), [filter, bundle])` и дальше везде `active` вместо `filter` (в т. ч. `FiltersSheet`).

- [ ] **Step 3: Обновления** — `config.ts`, `fileStore.ts`, `net.ts`, `UpdateProvider.tsx`, `Toast.tsx`; `_layout.tsx`: `<ContentProvider><UpdateProvider>…</UpdateProvider></ContentProvider>`, `Toast` внутри `UpdateProvider`.

- [ ] **Step 4: «О приложении»** — раздел «Приложение»: `Версия {Constants.expoConfig?.version}`. Раздел «База трав»: версия и дата, счётчики (как сейчас), строка `Скачана из сети` / `Встроенная`, кнопка `Проверить обновления` (`Button`, неактивна при `checking`), под ней `status`; при `appUpdateNeeded` — постоянная строка «Доступна новая база — обновите приложение». На вебе вместо кнопки — `Обновление базы доступно в приложении для Android`. Строку «появится в следующей версии» удалить.

- [ ] **Step 5: Проверка** — `npm run typecheck && npm test && (cd app && npx expo export --platform web --output-dir ../.app-web-check) && rm -rf .app-web-check`; Expected: без ошибок, `Exported`. Веб-превью 375×812: главная, карточка с фото, список с фильтром, «О приложении» — без ошибок в консоли.

- [ ] **Step 6: Проверка на Android-сборке** — делается в Task 6 (Expo Go на телефоне пользователя тоже подходит, если он настроит сеть): первый запуск без сети → встроенная база, без сообщений; с сетью → «База актуальна» по кнопке.

- [ ] **Step 7: Commit** — `git add app package-lock.json && git commit -m "feat(app): download content updates from GitHub Pages"`.

---

### Task 5: Готовность к сборке

**Files:**
- Create: `tools/src/app-icons.ts`, `tools/src/cli/app-icons.ts`, `tools/test/app-icons.test.ts`, `app/eas.json`, `docs/release.md`
- Modify: `package.json` (скрипт `"app:icons": "tsx tools/src/cli/app-icons.ts"`), `app/app.json`, PNG в `app/assets/images/`
- Delete: неиспользуемые шаблонные картинки Expo в `app/assets/images/` (`expo-badge*.png`, `expo-logo.png`, `logo-glow.png`, `react-logo*.png`, `tutorial-web.png`, `tabIcons/` — только если `grep` не находит ссылок) и `app/assets/expo.icon`

**Interfaces:**
- Produces: `leafSvg(opts: { size: number; background: string | null; leaf: string; scale: number }): string`; `writeAppIcons(outDir: string): Promise<string[]>` — пишет и возвращает имена: `icon.png` (1024, фон `#0B120E`, лист `#9BD49B`, scale 0.62), `android-icon-foreground.png` (1024, прозрачный, scale 0.5 — в безопасной зоне), `android-icon-background.png` (1024, сплошной `#0B120E`), `android-icon-monochrome.png` (1024, прозрачный, лист `#FFFFFF`, scale 0.5), `splash-icon.png` (512, прозрачный, scale 0.9), `favicon.png` (48, фон `#0B120E`, scale 0.7).

- [ ] **Step 1: Тест** — `writeAppIcons(tmp)` создаёт 6 файлов; `sharp(...).metadata()` даёт размеры 1024/1024/1024/1024/512/48; у `android-icon-foreground.png` угловой пиксель прозрачный (`alpha === 0`), у `icon.png` — непрозрачный.

- [ ] **Step 2: Запустить — падает**; **Step 3: Реализация** — лист — один `<path>` с центральной жилкой, `sharp(Buffer.from(svg)).png()`; **Step 4:** `npx vitest run tools/test/app-icons.test.ts` PASS, `npm run app:icons` записывает PNG в `app/assets/images/`. Контроллер смотрит `icon.png` глазами.

- [ ] **Step 5: `app.json`** — `android.package`, `android.versionCode: 1`; `ios.icon` → `./assets/images/icon.png`; остальное без изменений.

- [ ] **Step 6: `app/eas.json`**

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "local" },
  "build": {
    "preview": { "distribution": "internal", "android": { "buildType": "apk" } }
  }
}
```

- [ ] **Step 7: `docs/release.md`** — шаги из дизайна §4.8 + §4.6 (чтобы выпустить базу, нужна правка в `content/`; поднять `version` и `versionCode` перед следующим выпуском; резервная копия ключа: `npx eas-cli credentials -p android` → «Download credentials»).

- [ ] **Step 8: Проверка** — `npm run typecheck && npm test && (cd app && npx expo export --platform web --output-dir ../.app-web-check) && rm -rf .app-web-check`; `cd app && npx expo config --type public` показывает `android.package`.

- [ ] **Step 9: Commit** — `git add -A app/assets app/app.json app/eas.json tools package.json docs/release.md && git commit -m "build(app): icons, android package and EAS preview profile"`.

---

### Task 6: Первая сборка и релиз (с пользователем)

- [ ] **Step 1:** `npm run content:app`, тесты, коммит (если что-то изменилось), `git push`; дождаться зелёного CI и новой базы на Pages (`curl https://niyazabuy.github.io/travi/manifest.json` — `contentVersion` = встроенной).
- [ ] **Step 2 (пользователь):** аккаунт на expo.dev, `cd app && npx eas-cli login`.
- [ ] **Step 3:** `cd app && npx eas-cli init` (пропишет `extra.eas.projectId` в `app.json`) → `npx eas-cli build -p android --profile preview` (на вопрос о ключе — создать новый). Ошибки сборки монорепо — чинить и коммитить.
- [ ] **Step 4 (пользователь):** поставить APK по ссылке/QR из EAS, проверить: запуск без сети, «Проверить обновления», карточка, фото, избранное, заметка.
- [ ] **Step 5:** коммит `app.json` с `projectId`, пуш; пользователь (или Claude через `gh`, если он установлен и авторизован, с явного согласия) создаёт релиз `v1.0.0` с `travy-1.0.0.apk`.
