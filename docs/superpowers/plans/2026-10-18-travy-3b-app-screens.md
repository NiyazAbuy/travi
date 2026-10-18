# «Травы», план 3b: экраны приложения — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Все экраны первой версии: главная (поиск, плитки, баннер, «Собирать сейчас»), каталог → группы → список трав, панель фильтров, поиск, карточка травы (галерея, разделы, источники, заметка, избранное), сборы, избранное, «О приложении» и дисклеймер при первом запуске.

**Architecture:** Логика без UI добавляется в `shared/` с тестами (Task 1): подписи активных фильтров и их редактирование, строки «Избранного» (включая удалённые из базы травы), порядок источников карточки, склонение числительных, дата версии базы; хелперы ссылок на источники переезжают из `tools` в `shared` (`tools` их реэкспортирует). Экраны (Task 2) — тонкие, используют `@travy/shared`, тему и компоненты плана 3a; общий фильтр списка трав хранится в `ListFilterProvider`.

**Tech Stack:** как в плане 3a + `@expo/vector-icons` (MaterialCommunityIcons).

**Spec:** `docs/superpowers/specs/2026-10-15-travy-design.md` §6 и решения пользователя в шапке плана 3a (`docs/superpowers/plans/2026-10-18-travy-3a-app-foundation.md`).

## Global Constraints

- Все Global Constraints плана 3a действуют (маршруты только в `app/src/app/`; логика — в `shared` с тестами; цвета и размеры — только из `app/src/theme/`; зависимости Expo — только `npx expo install`; тексты — на русском).
- Код ниже уже проверен на копии репозитория: `vitest` 236/236, `tsc` (shared, tools, app) без ошибок, `expo export --platform web` проходит, экраны просмотрены в веб-превью 375×812. Переносить **дословно**.
- Дисклеймер показывается только после загрузки пользовательских данных (`loaded`), чтобы не мигать и не перезаписывать данные.

## Review Focus

- Длинные подписи плашек (показания) не вылезают за экран — `Chip` с `maxWidth: '100%'` (проверено визуально).
- Заметка не теряет пробелы при наборе и сохраняется с паузой — `NoteEditor` с черновиком и таймером 600 мс.
- Трава из избранного, удалённая из базы, показывается с пометкой, а не пропадает — тест `favoriteEntries`.
- Склонения «1 трава / 2 травы / 5 трав / 11 трав / 21 трава» — тест `pluralRu`.
- Переходы «показание/вещество/действие в карточке → список трав» и «каталог → группа → список» используют один `ListFilterProvider`.

---

### Task 1: Логика экранов в shared

**Files:**
- Create: `shared/src/sources.ts`, `shared/src/text.ts`, `shared/src/query/filter-edit.ts`, `shared/src/query/favorites.ts`, `shared/src/query/herb-sources.ts`, `shared/test/screens-logic.test.ts`
- Replace (целиком): `shared/src/query/catalog.ts`, `shared/src/query/index.ts`, `shared/src/index.ts`, `tools/src/verify-sources.ts`, `tools/src/report.ts`

**Interfaces:**
- Produces (из `@travy/shared`): `normalizeDoi`, `normalizePmid`, `sourceHref(source)`; `pluralRu(n, forms)`, `countRu(n, forms)`, `contentVersionDate(version)`; `catalogOptions(content, key)`, `optionLabel(content, key, value)`; `interface FilterChip`, `isFilterValueSelected`, `toggleFilterValue`, `describeFilter`, `removeFilterChip`; `interface FavoriteEntry`, `favoriteEntries(data, herbById)`; `herbSourceIds(herb)`, `recipeSourceIds(recipe)`. `tools/src/verify-sources.ts` реэкспортирует `normalizeDoi`/`normalizePmid`, `tools/src/report.ts` — `sourceHref`, поэтому существующие тесты tools не меняются.

- [ ] **Step 1: Написать падающий тест**

`shared/test/screens-logic.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { optionLabel } from '../src/query/catalog';
import { favoriteEntries } from '../src/query/favorites';
import { emptyFilter } from '../src/query/filter';
import { describeFilter, isFilterValueSelected, removeFilterChip, toggleFilterValue } from '../src/query/filter-edit';
import { herbSourceIds } from '../src/query/herb-sources';
import { sourceHref } from '../src/sources';
import { contentVersionDate, countRu, pluralRu } from '../src/text';
import { emptyUserData, setNote, toggleFavorite } from '../src/user';
import { queryContent, queryHerbs4 } from './query-fixtures';

const content = queryContent();

describe('pluralRu / countRu', () => {
  const forms = ['трава', 'травы', 'трав'] as const;
  it.each([
    [1, 'трава'],
    [2, 'травы'],
    [4, 'травы'],
    [5, 'трав'],
    [11, 'трав'],
    [12, 'трав'],
    [21, 'трава'],
    [22, 'травы'],
    [111, 'трав'],
    [0, 'трав'],
  ])('%i → %s', (n, word) => {
    expect(pluralRu(n, forms)).toBe(word);
  });
  it('countRu', () => expect(countRu(21, forms)).toBe('21 трава'));
});

describe('contentVersionDate', () => {
  it('YYYYMMDDHHmm → дата и время', () => {
    expect(contentVersionDate(202610180141)).toBe('18.10.2026 01:41 UTC');
  });
});

describe('редактирование фильтра', () => {
  it('toggleFilterValue добавляет и убирает, не меняя исходный фильтр', () => {
    const f = emptyFilter();
    const on = toggleFilterValue(f, 'indications', 'cough');
    expect(on.indications).toEqual(['cough']);
    expect(f.indications).toEqual([]);
    expect(toggleFilterValue(on, 'indications', 'cough').indications).toEqual([]);
  });
  it('месяцы хранятся числами', () => {
    const on = toggleFilterValue(emptyFilter(), 'months', '6');
    expect(on.months).toEqual([6]);
    expect(isFilterValueSelected(on, 'months', '6')).toBe(true);
  });
  it('describeFilter: подписи в порядке разделов каталога и порог доказанности', () => {
    const f = { ...emptyFilter(), months: [6], indications: ['cough'], safety: ['children-ok' as const], minEvidence: 'proven' as const };
    expect(describeFilter(f, content).map((c) => c.label)).toEqual([
      'Кашель',
      'июнь',
      'Можно детям',
      'Не ниже: доказано исследованиями',
    ]);
  });
  it('removeFilterChip убирает значение и порог', () => {
    const f = { ...emptyFilter(), indications: ['cough', 'gastritis'], minEvidence: 'proven' as const };
    const chips = describeFilter(f, content);
    expect(removeFilterChip(f, chips[0]!).indications).toEqual(['gastritis']);
    expect(removeFilterChip(f, chips[2]!).minEvidence).toBeNull();
  });
  it('optionLabel: неизвестное значение — как есть', () => {
    expect(optionLabel(content, 'indications', 'cough')).toBe('Кашель');
    expect(optionLabel(content, 'indications', 'nope')).toBe('nope');
  });
});

describe('favoriteEntries', () => {
  const herbById = new Map(queryHerbs4().map((h) => [h.id, h]));
  it('избранное и заметки вместе, по алфавиту; удалённые из базы — в конце', () => {
    let data = toggleFavorite(emptyUserData(), 'gamma');
    data = toggleFavorite(data, 'removed-herb');
    data = setNote(data, 'alpha', 'растёт у ручья', new Date('2026-10-18T00:00:00Z'));
    const entries = favoriteEntries(data, herbById);
    expect(entries.map((e) => [e.herbId, e.favorite, Boolean(e.note), Boolean(e.herb)])).toEqual([
      ['alpha', false, true, true],
      ['gamma', true, false, true],
      ['removed-herb', true, false, false],
    ]);
  });
  it('пусто — пустой список', () => {
    expect(favoriteEntries(emptyUserData(), herbById)).toEqual([]);
  });
});

describe('herbSourceIds', () => {
  it('уникальные источники в порядке появления', () => {
    const herb = queryHerbs4()[0]!;
    expect(herbSourceIds(herb)).toEqual(['book-test']);
  });
});

describe('sourceHref', () => {
  const base = { id: 's', type: 'rct' as const, title: 'T', authors: ['A'], year: 2020 };
  it('DOI, PMID, url, ISBN', () => {
    expect(sourceHref({ ...base, doi: 'doi:10.1/ABC' })).toBe('https://doi.org/10.1/abc');
    expect(sourceHref({ ...base, pmid: 'PMID: 7' })).toBe('https://pubmed.ncbi.nlm.nih.gov/7/');
    expect(sourceHref({ ...base, url: 'https://e.org' })).toBe('https://e.org');
    expect(sourceHref({ ...base, isbn: '978' })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить и убедиться, что падает**

Run: `npx vitest run shared/test/screens-logic.test.ts`
Expected: FAIL — `Cannot find module` для новых модулей (`../src/query/favorites`, `../src/sources`, `../src/text` …).

- [ ] **Step 3: Новые модули**

`shared/src/sources.ts`:

```ts
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
```

`shared/src/text.ts`:

```ts
/** Форма слова для числа: pluralRu(5, ['трава', 'травы', 'трав']) → 'трав'. */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const abs = Math.abs(n) % 100;
  const last = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (last === 1) return forms[0];
  if (last >= 2 && last <= 4) return forms[1];
  return forms[2];
}

/** Число со словом: countRu(21, ['трава', 'травы', 'трав']) → '21 трава'. */
export function countRu(n: number, forms: readonly [string, string, string]): string {
  return `${n} ${pluralRu(n, forms)}`;
}

/** Версия базы YYYYMMDDHHmm (UTC) → «18.10.2026 01:41 UTC». */
export function contentVersionDate(version: number): string {
  const s = String(version).padStart(12, '0');
  return `${s.slice(6, 8)}.${s.slice(4, 6)}.${s.slice(0, 4)} ${s.slice(8, 10)}:${s.slice(10, 12)} UTC`;
}
```

`shared/src/query/filter-edit.ts`:

```ts
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
```

`shared/src/query/favorites.ts`:

```ts
import type { Herb } from '../schema';
import type { UserData, UserNote } from '../user';
import { compareNames } from './filter';

/** Строка экрана «Избранное»: трава со звёздочкой и/или с заметкой (спецификация §6.6). */
export interface FavoriteEntry {
  herbId: string;
  /** undefined — трава удалена из базы, но заметка или звёздочка остались. */
  herb: Herb | undefined;
  favorite: boolean;
  note: UserNote | undefined;
}

export function favoriteEntries(data: UserData, herbById: ReadonlyMap<string, Herb>): FavoriteEntry[] {
  const ids = [...new Set([...data.favorites, ...Object.keys(data.notes)])];
  return ids
    .map((herbId) => ({
      herbId,
      herb: herbById.get(herbId),
      favorite: data.favorites.includes(herbId),
      note: data.notes[herbId],
    }))
    .sort((a, b) => {
      if (Boolean(a.herb) !== Boolean(b.herb)) return a.herb ? -1 : 1;
      return a.herb && b.herb ? compareNames(a.herb.name, b.herb.name) : compareNames(a.herbId, b.herbId);
    });
}
```

`shared/src/query/herb-sources.ts`:

```ts
import type { Herb, Recipe, SourceRef } from '../schema';

function uniqueIds(groups: SourceRef[][]): string[] {
  return [...new Set(groups.flat().map((r) => r.id))];
}

/** Источники карточки травы в порядке появления: показания, сбор, применение, безопасность, общие. */
export function herbSourceIds(herb: Herb): string[] {
  return uniqueIds([
    ...herb.indications.map((x) => x.sources),
    ...herb.harvest.map((x) => x.sources),
    ...herb.usage.map((x) => x.sources),
    herb.safety.sources,
    herb.sources,
  ]);
}

export function recipeSourceIds(recipe: Recipe): string[] {
  return uniqueIds([recipe.sources]);
}
```

- [ ] **Step 4: Изменённые модули (файлы целиком)**

`shared/src/query/catalog.ts` — целиком:

```ts
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
```

`shared/src/query/index.ts` — целиком:

```ts
export * from './catalog';
export * from './favorites';
export * from './filter';
export * from './filter-edit';
export * from './herb-sources';
export * from './search';
```

`shared/src/index.ts` — целиком:

```ts
export * from './enums';
export * from './evidence';
export * from './labels';
export * from './manifest';
export * from './schema';
export * from './query';
export * from './user';
export * from './sources';
export * from './text';
```

`tools/src/verify-sources.ts` — целиком:

```ts
import { normalizeDoi, normalizePmid, type Source } from '@travy/shared';
import { USER_AGENT } from './wikimedia';

export { normalizeDoi, normalizePmid };

export type VerifyStatus = 'ok' | 'mismatch' | 'not_found' | 'error';

export interface VerifyResult {
  sourceId: string;
  kind: 'doi' | 'pmid';
  value: string;
  status: VerifyStatus;
  /** Название, найденное в Crossref/PubMed */
  found?: string;
  detail?: string;
}


function normalizeTitle(title: string): string {
  return title
    .replace(/<[^>]*>/g, ' ')
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Совпадают ли названия статьи: без учёта регистра, пунктуации, тегов и подзаголовка. */
export function titlesMatch(a: string, b: string): boolean {
  const x = normalizeTitle(a);
  const y = normalizeTitle(b);
  if (!x || !y) return false;
  if (x === y || x.includes(y) || y.includes(x)) return true;
  const wordsA = new Set(x.split(' '));
  const wordsB = new Set(y.split(' '));
  const common = [...wordsA].filter((w) => wordsB.has(w)).length;
  return common / new Set([...wordsA, ...wordsB]).size >= 0.8;
}

export function parseCrossrefTitle(json: unknown): string | null {
  const title = (json as { message?: { title?: unknown } }).message?.title;
  return Array.isArray(title) && typeof title[0] === 'string' && title[0] ? title[0] : null;
}

export function parsePubmedTitle(json: unknown, pmid: string): string | null {
  const entry = (json as { result?: Record<string, { title?: unknown; error?: unknown }> }).result?.[pmid];
  return entry && !entry.error && typeof entry.title === 'string' && entry.title ? entry.title : null;
}

async function check(
  source: Source,
  kind: 'doi' | 'pmid',
  value: string,
  url: string,
  parseTitle: (json: unknown) => string | null,
  fetchFn: typeof fetch,
  timeoutMs: number,
): Promise<VerifyResult> {
  const base = { sourceId: source.id, kind, value };
  try {
    const response = await fetchFn(url, {
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (response.status === 404) return { ...base, status: 'not_found' };
    if (!response.ok) return { ...base, status: 'error', detail: `HTTP ${response.status}` };
    const found = parseTitle(await response.json());
    if (found === null) return { ...base, status: 'not_found' };
    return { ...base, status: titlesMatch(source.title, found) ? 'ok' : 'mismatch', found };
  } catch (e) {
    const detail =
      (e as Error).name === 'TimeoutError' ? `нет ответа за ${timeoutMs / 1000} с` : (e as Error).message;
    return { ...base, status: 'error', detail };
  }
}

/** Таймаут одного запроса: зависший Crossref/PubMed не должен задерживать публикацию (спецификация §8.3). */
export const REQUEST_TIMEOUT_MS = 20_000;

export async function verifySource(
  source: Source,
  fetchFn: typeof fetch = fetch,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];
  if (source.doi) {
    const doi = normalizeDoi(source.doi);
    const encoded = doi.split('/').map(encodeURIComponent).join('/');
    const url = `https://api.crossref.org/works/${encoded}`;
    results.push(await check(source, 'doi', doi, url, parseCrossrefTitle, fetchFn, timeoutMs));
  }
  if (source.pmid) {
    const pmid = normalizePmid(source.pmid);
    if (pmid === null) {
      results.push({
        sourceId: source.id,
        kind: 'pmid',
        value: source.pmid,
        status: 'error',
        detail: 'PMID должен состоять из цифр',
      });
    } else {
      const url = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${pmid}`;
      results.push(
        await check(source, 'pmid', pmid, url, (json) => parsePubmedTitle(json, pmid), fetchFn, timeoutMs),
      );
    }
  }
  return results;
}

/** Проверяет источники по очереди; пауза между запросами — чтобы не превысить лимиты PubMed (3 запроса/с). */
export async function verifySources(
  sources: Source[],
  fetchFn: typeof fetch = fetch,
  delayMs = 400,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<VerifyResult[]> {
  const all: VerifyResult[] = [];
  for (const source of sources) {
    const results = await verifySource(source, fetchFn, timeoutMs);
    all.push(...results);
    if (results.length > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return all;
}
```

`tools/src/report.ts` — целиком:

```ts
import {
  EVIDENCE_LABELS,
  HERB_STATUS_LABELS,
  LIFE_FORM_LABELS,
  monthName,
  PHOTO_KIND_LABELS,
  SAFETY_STATUS_LABELS,
  SOURCE_TYPE_LABELS,
  SOURCING_LABELS,
  TOXICITY_LABELS,
  USAGE_FORM_LABELS,
  type DictionaryKey,
  type HerbInput,
  type PhotoRef,
  type Recipe,
  type SafetyStatus,
  type Source,
  type SourceRef,
  sourceHref,
} from '@travy/shared';

export { sourceHref };
import type { LoadedContent } from './load';


export interface ReportOptions {
  /** Адрес фото относительно страницы отчёта */
  photoUrl: (herbId: string, file: string) => string;
  generatedAt: Date;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


const e = escapeHtml;
const byId = <T extends { id: string }>(a: T, b: T) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

const STYLE = `
:root { --bg: #f4f6f1; --card: #ffffff; --text: #1d2a1f; --muted: #5d6b5f; --accent: #3f6b45; --line: #dde3d9;
  --proven: #3b6d11; --traditional: #b77a0b; --folk: #b5501f; --refuted: #a32d2d; }
@media (prefers-color-scheme: dark) { :root { --bg: #0f1512; --card: #18211b; --text: #e3ebe3; --muted: #9aaa9c;
  --accent: #9bd09b; --line: #2a362d; --proven: #97c459; --traditional: #ef9f27; --folk: #f0997b; --refuted: #f09595; } }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, sans-serif; }
.top, main { max-width: 960px; margin: 0 auto; padding: 16px; }
h1, h2 { font-family: Georgia, 'Times New Roman', serif; font-weight: 500; }
a { color: var(--accent); }
nav { line-height: 2; }
.card { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: 16px 20px; margin: 24px 0; }
.card header h2 { margin: 0; }
.latin { color: var(--muted); font-style: italic; margin: 0; }
.badge { display: inline-block; margin-top: 8px; padding: 2px 10px; border-radius: 999px; font-size: 13px; }
.badge.draft { background: #f7e3b8; color: #6b4a07; }
.badge.checked { background: #d6ecc4; color: #27500a; }
.photos { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0; }
figure { margin: 0; max-width: 300px; }
figure img { width: 100%; border-radius: 12px; display: block; }
figcaption { font-size: 12px; color: var(--muted); }
dl { display: grid; grid-template-columns: max-content 1fr; gap: 4px 16px; }
dt { color: var(--muted); }
dd { margin: 0; }
.ev { border-left: 4px solid var(--line); padding-left: 10px; margin: 8px 0; list-style: none; }
.legend .ev { display: inline-block; margin-right: 12px; }
.ev-proven { border-color: var(--proven); }
.ev-traditional { border-color: var(--traditional); }
.ev-folk { border-color: var(--folk); }
.ev-refuted { border-color: var(--refuted); }
.indications { padding-left: 0; }
.refs a { font-size: 13px; text-decoration: none; }
.safety-contraindicated { color: var(--refuted); font-weight: 600; }
.safety-caution { color: var(--traditional); }
.lookalikes .poison { border: 2px solid var(--refuted); border-radius: 12px; padding: 8px 12px; list-style: none; margin: 8px 0; }
.poison-label { color: var(--refuted); font-weight: 600; }
.sources li { margin: 6px 0; }
.section { margin-top: 40px; }
`;

/** HTML-страница для проверки базы человеком: все травы, сборы и источники. */
export function renderReport(content: LoadedContent, opts: ReportOptions): string {
  const dictionaryNames = new Map<DictionaryKey, Map<string, string>>(
    (Object.keys(content.dictionaries) as DictionaryKey[]).map((key) => [
      key,
      new Map(content.dictionaries[key].map((item) => [item.id, item.name])),
    ]),
  );
  const name = (key: DictionaryKey, id: string) => e(dictionaryNames.get(key)?.get(id) ?? id);
  const herbs = [...content.herbs].sort(byId);
  const herbName = new Map(herbs.map((h) => [h.id, h.name]));
  const sources = [...content.sources].sort(byId);
  const sourceNumber = new Map(sources.map((s, i) => [s.id, i + 1]));
  const organSystemOf = new Map(content.dictionaries.indications.map((x) => [x.id, x.organ_system]));
  const classOf = new Map(content.dictionaries.substances.map((x) => [x.id, x.class]));

  function refs(list: SourceRef[]): string {
    if (list.length === 0) return '';
    const links = list.map((r) => {
      const page = r.page ? `, с. ${e(r.page)}` : '';
      return `<a href="#src-${e(r.id)}">[${sourceNumber.get(r.id) ?? '?'}${page}]</a>`;
    });
    return ` <span class="refs">${links.join(' ')}</span>`;
  }

  function figure(herbId: string, photo: PhotoRef, alt: string): string {
    const meta = content.photoMeta[herbId]?.[photo.file];
    const credit = meta
      ? ` · ${e(meta.author)} · ${e(meta.license)} · <a href="${e(meta.source_url)}">страница файла</a>`
      : '';
    const caption = photo.caption ? `: ${e(photo.caption)}` : '';
    const src = e(opts.photoUrl(herbId, photo.file));
    return `<figure><img src="${src}" alt="${e(alt)}" loading="lazy"><figcaption>${PHOTO_KIND_LABELS[photo.kind]}${caption}${credit}</figcaption></figure>`;
  }

  const list = (items: string[]) => (items.length ? `<ul>${items.map((x) => `<li>${x}</li>`).join('')}</ul>` : '<p>—</p>');
  const safety = (label: string, status: SafetyStatus, text = SAFETY_STATUS_LABELS[status]) =>
    `<li>${label}: <span class="safety-${status}">${text}</span></li>`;

  function renderHerb(h: HerbInput): string {
    const { children } = h.safety;
    const childrenText =
      children.status === 'ok' && children.from_age !== undefined
        ? `${SAFETY_STATUS_LABELS.ok} с ${children.from_age} ${children.from_age === 1 ? 'года' : 'лет'}`
        : SAFETY_STATUS_LABELS[children.status];

    const indications = h.indications.map((x) => {
      const system = organSystemOf.get(x.indication);
      const systemText = system ? ` <em>(${name('organSystems', system)})</em>` : '';
      return `<li class="ev ev-${x.evidence.level}"><strong>${name('indications', x.indication)}</strong>${systemText} — ${EVIDENCE_LABELS[x.evidence.level]}<br><small>${e(x.evidence.note)}</small>${refs(x.sources)}</li>`;
    });
    const substances = h.substances.map((id) => {
      const cls = classOf.get(id);
      return `${name('substances', id)}${cls ? ` (${name('substanceClasses', cls)})` : ''}`;
    });
    const harvest = h.harvest.map(
      (x) =>
        `<strong>${name('plantParts', x.part)}</strong> · ${x.months.map(monthName).join(', ')} · ${e(x.how)} · Сушка: ${e(x.drying)} · Хранение: ${e(x.storage)}${refs(x.sources)}`,
    );
    const usage = h.usage.map((u) => {
      const forWhat = u.for_indications.length
        ? ` (${u.for_indications.map((id) => name('indications', id)).join(', ')})`
        : '';
      const course = u.course ? ` · Курс: ${e(u.course)}` : '';
      return `<strong>${USAGE_FORM_LABELS[u.form]}</strong>${forWhat} · ${e(u.recipe)} · Дозировка: ${e(u.dosage)}${course}${refs(u.sources)}`;
    });
    const safetyItems = [
      safety('Беременность', h.safety.pregnancy),
      safety('Кормление грудью', h.safety.lactation),
      safety('Дети', children.status, childrenText),
      `<li>Токсичность: ${TOXICITY_LABELS[h.safety.toxicity]}</li>`,
      ...h.safety.contraindications.map((x) => `<li>Противопоказание: ${e(x)}</li>`),
      ...h.safety.warnings.map((x) => `<li>Предостережение: ${e(x)}</li>`),
      ...h.safety.side_effects.map((x) => `<li>Побочное действие: ${e(x)}</li>`),
      ...h.safety.interactions.map((x) => `<li>Взаимодействие: ${e(x)}</li>`),
    ];
    const lookalikes = h.lookalikes.map((l) => {
      const title = l.herb ? e(herbName.get(l.herb) ?? l.herb) : `${e(l.name ?? '')} <em>${e(l.latin ?? '')}</em>`;
      const poison = l.poisonous ? ' <span class="poison-label">ядовит</span>' : '';
      const alt = l.name ?? herbName.get(l.herb ?? '') ?? '';
      const photo = l.photo ? figure(h.id, l.photo, alt) : '';
      return `<li class="${l.poisonous ? 'poison' : ''}"><strong>${title}</strong>${poison} — ${e(l.differences)}${photo}</li>`;
    });

    return `<article class="card" id="herb-${e(h.id)}">
<header><h2>${e(h.name)}</h2><p class="latin">${e(h.latin)} · ${name('families', h.family)}</p><span class="badge ${h.status}">${HERB_STATUS_LABELS[h.status]}</span></header>
<div class="photos">${h.photos.map((p) => figure(h.id, p, h.name)).join('')}</div>
<dl>
<dt>Другие названия</dt><dd>${h.other_names.map((x) => e(x)).join(', ') || '—'}</dd>
<dt>Жизненная форма</dt><dd>${LIFE_FORM_LABELS[h.life_form]}</dd>
<dt>Где взять</dt><dd>${h.sourcing.map((s) => SOURCING_LABELS[s]).join(', ')}</dd>
<dt>Где растёт</dt><dd>${h.habitats.map((id) => name('habitats', id)).join(', ') || '—'}</dd>
</dl>
<h3>Как узнать</h3><p>${e(h.description)}</p>
<h3>От чего помогает</h3><ul class="indications">${indications.join('')}</ul>
<h3>Действующие вещества</h3><p>${substances.join(', ') || '—'}</p>
<h3>Действие</h3><p>${h.actions.map((id) => name('actions', id)).join(', ') || '—'}</p>
<h3>Сбор</h3>${list(harvest)}
<h3>Применение</h3>${list(usage)}
<h3>Безопасность</h3><ul>${safetyItems.join('')}</ul>${refs(h.safety.sources)}
${lookalikes.length ? `<h3>С чем можно спутать</h3><ul class="lookalikes">${lookalikes.join('')}</ul>` : ''}
${h.sources.length ? `<p>Общие источники:${refs(h.sources)}</p>` : ''}
</article>`;
  }

  function renderRecipe(r: Recipe): string {
    const components = r.components.map((c) => {
      const part = c.part ? ` (${name('plantParts', c.part)})` : '';
      return `${e(herbName.get(c.herb) ?? c.herb)} — ${c.parts} ч.${part}`;
    });
    return `<article class="card" id="recipe-${e(r.id)}">
<header><h2>${e(r.name)}</h2><p class="latin">При: ${r.purpose.map((id) => name('indications', id)).join(', ')}</p></header>
<h3>Состав</h3>${list(components)}
<h3>Приготовление</h3><p>${e(r.preparation)}</p>
<h3>Дозировка</h3><p>${e(r.dosage)}</p>
<p class="ev ev-${r.evidence.level}">${EVIDENCE_LABELS[r.evidence.level]}<br><small>${e(r.evidence.note)}</small>${refs(r.sources)}</p>
${r.safety_note ? `<p><strong>Осторожно:</strong> ${e(r.safety_note)}</p>` : ''}
</article>`;
  }

  function renderSource(s: Source, index: number): string {
    const where = [s.journal, s.publisher].filter((x): x is string => Boolean(x)).map((x) => e(x)).join(', ');
    const href = sourceHref(s);
    const link = href ? ` <a href="${e(href)}">${e(href)}</a>` : '';
    const isbn = s.isbn ? ` ISBN ${e(s.isbn)}.` : '';
    return `<li id="src-${e(s.id)}" value="${index + 1}">${s.authors.map((x) => e(x)).join(', ')}. ${e(s.title)}.${where ? ` ${where},` : ''} ${s.year}. <em>${SOURCE_TYPE_LABELS[s.type]}</em>.${isbn}${link}</li>`;
  }

  const generated = `${opts.generatedAt.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
  const legend = (['proven', 'traditional', 'folk', 'refuted'] as const)
    .map((level) => `<span class="ev ev-${level}">${EVIDENCE_LABELS[level]}</span>`)
    .join(' ');
  const toc = herbs.map((h) => `<a href="#herb-${e(h.id)}">${e(h.name)}</a>`).join(' · ');
  const recipes = [...content.recipes].sort(byId);

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Травы — проверка базы</title>
<style>${STYLE}</style>
</head>
<body>
<header class="top">
<h1>Травы — проверка базы</h1>
<p>Сформировано: ${generated} · трав: ${herbs.length} · сборов: ${recipes.length} · источников: ${sources.length}</p>
<p class="legend">${legend}</p>
<nav>${toc}</nav>
</header>
<main>
${herbs.map((h) => renderHerb(h)).join('\n')}
${recipes.length ? `<h2 class="section">Сборы</h2>\n${recipes.map((r) => renderRecipe(r)).join('\n')}` : ''}
<h2 class="section">Источники</h2>
<ol class="sources">${sources.map((s, i) => renderSource(s, i)).join('')}</ol>
</main>
</body>
</html>
`;
}
```

- [ ] **Step 5: Проверка**

Run: `npx vitest run && npm run typecheck`
Expected: все тесты PASS (236), `tsc` без ошибок.

- [ ] **Step 6: Commit**

```bash
git add shared tools
git commit -m "feat(shared): screen helpers for filters, favorites, sources and plurals" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Экраны приложения

**Files:**
- Replace (целиком): `app/src/components/Chip.tsx`, `app/src/components/ListRow.tsx`, `app/src/components/Screen.tsx`, `app/src/components/index.ts`, `app/src/content/content.ts`, `app/src/app/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx`, `app/src/app/(tabs)/index.tsx`, `app/src/app/(tabs)/catalog.tsx`, `app/src/app/(tabs)/recipes.tsx`, `app/src/app/(tabs)/favorites.tsx`
- Create: `app/src/components/IconButton.tsx`, `app/src/components/HerbCard.tsx`, `app/src/components/Section.tsx`, `app/src/components/NoteEditor.tsx`, `app/src/components/DisclaimerGate.tsx`, `app/src/components/HerbRow.tsx`, `app/src/state/ListFilterProvider.tsx`, `app/src/app/catalog/[key].tsx`, `app/src/app/herbs.tsx`, `app/src/app/filters.tsx`, `app/src/app/search.tsx`, `app/src/app/herb/[id].tsx`, `app/src/app/recipe/[id].tsx`, `app/src/app/settings.tsx`

**Interfaces:**
- Consumes: всё из Task 1 и плана 3a (`useContent`, `useUserData` с `readOnly`, `photoSource`/`PhotoSource`, тема, компоненты).
- Produces: маршруты `/`, `/catalog`, `/recipes`, `/favorites`, `/catalog/[key]`, `/herbs`, `/filters` (модальный), `/search`, `/herb/[id]`, `/recipe/[id]`, `/settings`; `AppContent.sourceById`; `useListFilter()`; компоненты `IconButton` (+ тип `IconName`), `HerbCard`, `HerbRow`, `Section`, `NoteEditor`, `DisclaimerGate` (+ `DISCLAIMER_TEXT`); `ListRow.onLongPress`; `Screen.safeTop`.

- [ ] **Step 1: Иконки**

```bash
cd app && npx expo install @expo/vector-icons && cd ..
```

Expected: в `app/package.json` появилась зависимость `@expo/vector-icons` (версия, совместимая с SDK 58).

- [ ] **Step 2: Компоненты, контент, состояние фильтра (файлы целиком)**

`app/src/components/Chip.tsx`:

```tsx
import { Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        maxWidth: '100%',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? (pressed ? colors.accentPressed : colors.accent) : colors.chip,
        opacity: pressed && !selected ? 0.8 : 1,
      })}
    >
      <AppText variant="caption" style={{ color: selected ? colors.onAccent : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
```

`app/src/components/ListRow.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { PhotoSource } from '@/content/content';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Tag } from './Tag';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Не передан — слота под фото нет; null — слот-заглушка того же размера. */
  image?: PhotoSource | null;
  tags?: string[];
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function ListRow({ title, subtitle, image, tags = [], right, onPress, onLongPress }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {image === null && (
        <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceRaised }} />
      )}
      {image != null && (
        <Image source={image} style={{ width: 56, height: 56, borderRadius: radius.md }} contentFit="cover" />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={{ fontStyle: 'italic' }}>
            {subtitle}
          </AppText>
        ) : null}
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
            {tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        )}
      </View>
      {right ?? (onPress ? <AppText tone="faint">›</AppText> : null)}
    </Pressable>
  );
}
```

`app/src/components/Screen.tsx`:

```tsx
import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** false — экран под заголовком стека: верхний отступ уже есть. */
  safeTop?: boolean;
}

export function Screen({ children, scroll = true, padded = true, safeTop = true }: ScreenProps) {
  const padding = padded ? spacing.lg : 0;
  return (
    <SafeAreaView edges={safeTop ? ['top'] : []} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding, paddingBottom: spacing.xxl, gap: spacing.lg }}>{children}</ScrollView>
      ) : (
        <View style={{ flex: 1, padding, gap: spacing.lg }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
```

`app/src/components/IconButton.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { colors, spacing } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
}

export function IconButton({ icon, label, onPress, color = colors.text, size = 24 }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.6 : 1 })}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </Pressable>
  );
}
```

`app/src/components/HerbCard.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { Herb } from '@travy/shared';
import { photoSource } from '@/content/content';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

/** Карточка травы для горизонтальных лент: фото и название. */
export function HerbCard({ herb, onPress }: { herb: Herb; onPress: () => void }) {
  const photo = herb.photos[0];
  const source = photo ? photoSource(photo.path) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={herb.name}
      style={({ pressed }) => ({ width: 140, gap: spacing.xs, opacity: pressed ? 0.7 : 1 })}
    >
      {source ? (
        <Image source={source} style={{ width: 140, height: 140, borderRadius: radius.lg }} contentFit="cover" />
      ) : (
        <View style={{ width: 140, height: 140, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised }} />
      )}
      <AppText variant="caption" numberOfLines={2}>
        {herb.name}
      </AppText>
    </Pressable>
  );
}
```

`app/src/components/Section.tsx`:

```tsx
import type { ReactNode } from 'react';
import { AppText } from './AppText';
import { Card } from './Card';

/** Раздел карточки травы: заголовок и содержимое в рамке. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      {children}
    </Card>
  );
}
```

`app/src/components/NoteEditor.tsx`:

```tsx
import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface NoteEditorProps {
  value: string;
  onSave: (text: string) => void;
}

const SAVE_DELAY_MS = 600;

/** Заметка: локальный черновик, сохранение через паузу после ввода и при уходе с поля. */
export function NoteEditor({ value, onSave }: NoteEditorProps) {
  const [draft, setDraft] = useState(value);
  const saved = useRef(value);

  useEffect(() => {
    if (draft === saved.current) return;
    const timer = setTimeout(() => {
      saved.current = draft;
      onSave(draft);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, onSave]);

  const flush = () => {
    if (draft !== saved.current) {
      saved.current = draft;
      onSave(draft);
    }
  };

  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onBlur={flush}
      multiline
      placeholder="Например: растёт за дачей у ручья"
      placeholderTextColor={colors.textFaint}
      accessibilityLabel="Моя заметка"
      style={[
        typography.body,
        {
          minHeight: 88,
          color: colors.text,
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.md,
          padding: spacing.md,
          textAlignVertical: 'top',
        },
      ]}
    />
  );
}
```

`app/src/components/DisclaimerGate.tsx`:

```tsx
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserData } from '@/user/UserDataProvider';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';

export const DISCLAIMER_TEXT =
  'Справочник носит информационный характер и не заменяет консультацию врача. ' +
  'Перед применением трав, особенно при беременности, кормлении грудью, у детей и при приёме лекарств, посоветуйтесь с врачом.';

/** Однократный экран-дисклеймер при первом запуске (спецификация §6.2). Ждёт загрузки данных, чтобы не мигать. */
export function DisclaimerGate() {
  const { data, loaded, acceptDisclaimer } = useUserData();
  if (!loaded || data.disclaimerAccepted) return null;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <SafeAreaView style={{ flex: 1, padding: spacing.xl, justifyContent: 'center', gap: spacing.xl }}>
        <AppText variant="hero">Травы</AppText>
        <AppText variant="title">Ближе к природе — ближе к себе</AppText>
        <AppText tone="muted">{DISCLAIMER_TEXT}</AppText>
        <Button label="Понятно" onPress={acceptDisclaimer} />
      </SafeAreaView>
    </View>
  );
}
```

`app/src/components/HerbRow.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { evidenceRank, type Herb } from '@travy/shared';
import { photoSource } from '@/content/content';
import { useContent } from '@/content/ContentProvider';
import { useUserData } from '@/user/UserDataProvider';
import { EvidenceDot } from './EvidenceDot';
import { ListRow } from './ListRow';

export interface HerbRowProps {
  herb: Herb;
  /** Выбранные в фильтре показания: справа точка наименьшего уровня среди них. */
  indications?: readonly string[];
}

/** Строка травы в списках: фото, название, латынь, до двух показаний; долгое нажатие — в избранное. */
export function HerbRow({ herb, indications = [] }: HerbRowProps) {
  const router = useRouter();
  const { nameOf } = useContent();
  const { isFavorite, toggleFavorite } = useUserData();
  const photo = herb.photos[0];

  const selected = herb.indications.filter((x) => indications.includes(x.indication));
  const lowest = selected.length
    ? selected.reduce((a, b) => (evidenceRank(b.evidence.level) < evidenceRank(a.evidence.level) ? b : a))
    : undefined;

  const tags = herb.indications.slice(0, 2).map((x) => nameOf('indications', x.indication));
  if (isFavorite(herb.id)) tags.unshift('★ в избранном');

  return (
    <ListRow
      title={herb.name}
      subtitle={herb.latin}
      image={photo ? photoSource(photo.path) : null}
      tags={tags}
      right={lowest ? <EvidenceDot level={lowest.evidence.level} size={12} /> : undefined}
      onPress={() => router.push({ pathname: '/herb/[id]', params: { id: herb.id } })}
      onLongPress={() => toggleFavorite(herb.id)}
    />
  );
}
```

`app/src/components/index.ts`:

```ts
export * from './AppText';
export * from './Button';
export * from './Card';
export * from './Chip';
export * from './DisclaimerGate';
export * from './EvidenceDot';
export * from './HerbCard';
export * from './HerbRow';
export * from './IconButton';
export * from './ListRow';
export * from './NoteEditor';
export * from './Screen';
export * from './SearchField';
export * from './Section';
export * from './SectionHeader';
export * from './Tag';
```

`app/src/content/content.ts`:

```ts
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
```

`app/src/state/ListFilterProvider.tsx`:

```tsx
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { emptyFilter, type HerbFilter } from '@travy/shared';

interface ListFilterApi {
  filter: HerbFilter;
  setFilter: (filter: HerbFilter) => void;
}

const ListFilterContext = createContext<ListFilterApi | null>(null);

/** Текущий фильтр списка трав: его задают каталог, поиск, карточка травы и панель фильтров. */
export function ListFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<HerbFilter>(emptyFilter);
  const api = useMemo(() => ({ filter, setFilter }), [filter]);
  return <ListFilterContext.Provider value={api}>{children}</ListFilterContext.Provider>;
}

export function useListFilter(): ListFilterApi {
  const api = useContext(ListFilterContext);
  if (!api) throw new Error('useListFilter вызван вне ListFilterProvider');
  return api;
}
```

- [ ] **Step 3: Маршруты (файлы целиком)**

`app/src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DisclaimerGate } from '@/components';
import { ContentProvider } from '@/content/ContentProvider';
import { ListFilterProvider } from '@/state/ListFilterProvider';
import { colors } from '@/theme';
import { UserDataProvider } from '@/user/UserDataProvider';

export default function RootLayout() {
  return (
    <ContentProvider>
      <UserDataProvider>
        <ListFilterProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="herbs" options={{ title: 'Травы' }} />
            <Stack.Screen name="filters" options={{ title: 'Фильтры', presentation: 'modal' }} />
            <Stack.Screen name="herb/[id]" options={{ title: '' }} />
            <Stack.Screen name="recipe/[id]" options={{ title: '' }} />
            <Stack.Screen name="catalog/[key]" options={{ title: 'Каталог' }} />
            <Stack.Screen name="search" options={{ title: 'Поиск' }} />
            <Stack.Screen name="settings" options={{ title: 'О приложении' }} />
          </Stack>
          <DisclaimerGate />
        </ListFilterProvider>
      </UserDataProvider>
    </ContentProvider>
  );
}
```

`app/src/app/(tabs)/_layout.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import type { IconName } from '@/components';
import { colors } from '@/theme';

const icon =
  (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => (
    <MaterialCommunityIcons name={name} color={typeof color === 'string' ? color : undefined} size={size} />
  );

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textFaint,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Главная', tabBarIcon: icon('leaf') }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог', tabBarIcon: icon('view-grid-outline') }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы', tabBarIcon: icon('bowl-mix-outline') }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное', tabBarIcon: icon('heart-outline') }} />
    </Tabs>
  );
}
```

`app/src/app/(tabs)/index.tsx`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { collectNow, emptyFilter, filterForGroup, monthName } from '@travy/shared';
import { AppText, HerbCard, Screen, SectionHeader, type IconName } from '@/components';
import { photoSource } from '@/content/content';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, radius, spacing, typography } from '@/theme';

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: spacing.xs, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <MaterialCommunityIcons name={icon} size={26} color={colors.accent} />
      </View>
      <AppText variant="tiny" tone="muted" style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const month = new Date().getMonth() + 1;
  const now = useMemo(() => collectNow(bundle, month), [bundle, month]);
  const bannerPhoto = (now[0] ?? bundle.herbs[0])?.photos[0];
  const bannerSource = bannerPhoto ? photoSource(bannerPhoto.path) : null;

  const openList = (filter = emptyFilter()) => {
    setFilter(filter);
    router.push('/herbs');
  };
  const go = (href: Href) => router.push(href);

  return (
    <Screen>
      <View>
        <AppText variant="hero">Травы</AppText>
        <AppText tone="muted">Знания о травах. Гармония с природой.</AppText>
      </View>

      <Pressable
        onPress={() => go('/search')}
        accessibilityRole="search"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <MaterialCommunityIcons name="magnify" size={20} color={colors.textFaint} />
        <AppText style={[typography.body, { color: colors.textFaint }]}>Поиск трав, свойств, проблем…</AppText>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile icon="view-grid-outline" label="Каталог" onPress={() => go('/catalog')} />
        <Tile icon="sprout-outline" label="Все травы" onPress={() => openList()} />
        <Tile icon="heart-outline" label="Избранное" onPress={() => go('/favorites')} />
        <Tile icon="information-outline" label="О приложении" onPress={() => go('/settings')} />
      </View>

      <Pressable
        onPress={() => openList()}
        accessibilityRole="button"
        style={{ height: 150, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceRaised }}
      >
        {bannerSource && (
          <Image source={bannerSource} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
        )}
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
          <AppText variant="title">Природа — лучшая аптека</AppText>
          <AppText variant="caption" tone="muted">
            Здесь ты найдёшь силу в простых вещах
          </AppText>
        </View>
      </Pressable>

      <SectionHeader
        title={`Собирать сейчас · ${monthName(month)}`}
        actionLabel={now.length ? 'Все' : undefined}
        onAction={now.length ? () => openList(filterForGroup('months', String(month))) : undefined}
      />
      {now.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {now.map((h) => (
            <HerbCard key={h.id} herb={h} onPress={() => router.push({ pathname: '/herb/[id]', params: { id: h.id } })} />
          ))}
        </ScrollView>
      ) : (
        <AppText tone="muted">В этом месяце по базе ничего не собирают.</AppText>
      )}
    </Screen>
  );
}
```

`app/src/app/(tabs)/catalog.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { CATALOG_SECTIONS, catalogGroups, collectNow, countRu, filterForGroup, monthName } from '@travy/shared';
import { AppText, ListRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';

const GROUP_FORMS = ['группа', 'группы', 'групп'] as const;
const HERB_FORMS = ['трава', 'травы', 'трав'] as const;

export default function CatalogScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const month = new Date().getMonth() + 1;
  const nowCount = useMemo(() => collectNow(bundle, month).length, [bundle, month]);
  const sections = useMemo(
    () =>
      CATALOG_SECTIONS.map((s) => ({ ...s, count: catalogGroups(bundle, s.key).length })).filter((s) => s.count > 0),
    [bundle],
  );

  return (
    <Screen>
      <AppText variant="title">Каталог</AppText>
      <ListRow
        title={`Собирать сейчас · ${monthName(month)}`}
        subtitle={countRu(nowCount, HERB_FORMS)}
        onPress={() => {
          setFilter(filterForGroup('months', String(month)));
          router.push('/herbs');
        }}
      />
      {sections.map((s) => (
        <ListRow
          key={s.key}
          title={s.title}
          subtitle={countRu(s.count, GROUP_FORMS)}
          onPress={() => router.push({ pathname: '/catalog/[key]', params: { key: s.key } })}
        />
      ))}
    </Screen>
  );
}
```

`app/src/app/catalog/[key].tsx`:

```tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { CATALOG_SECTIONS, catalogGroups, filterForGroup, type CatalogKey } from '@travy/shared';
import { AppText, ListRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';

export default function CatalogSectionScreen() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const section = CATALOG_SECTIONS.find((s) => s.key === key);
  const groups = useMemo(() => (section ? catalogGroups(bundle, section.key as CatalogKey) : []), [bundle, section]);

  if (!section) {
    return (
      <Screen safeTop={false}>
        <AppText tone="muted">Раздел не найден.</AppText>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <Stack.Screen options={{ title: section.title }} />
      {groups.map((g) => (
        <ListRow
          key={g.value}
          title={g.label}
          right={
            <AppText variant="caption" tone="muted">
              {g.count}
            </AppText>
          }
          onPress={() => {
            setFilter(filterForGroup(section.key, g.value));
            router.push('/herbs');
          }}
        />
      ))}
    </Screen>
  );
}
```

`app/src/app/herbs.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { countRu, describeFilter, queryHerbs, removeFilterChip } from '@travy/shared';
import { AppText, Chip, HerbRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

const FOUND_FORMS = ['трава', 'травы', 'трав'] as const;

export default function HerbListScreen() {
  const router = useRouter();
  const { bundle, index } = useContent();
  const { filter, setFilter } = useListFilter();
  const herbs = useMemo(() => queryHerbs(bundle.herbs, filter, index), [bundle, filter, index]);
  const chips = useMemo(() => describeFilter(filter, bundle), [filter, bundle]);

  return (
    <Screen safeTop={false}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {chips.map((c) => (
          <Chip
            key={`${c.key}:${c.value}`}
            label={`${c.label} ×`}
            selected
            onPress={() => setFilter(removeFilterChip(filter, c))}
          />
        ))}
        <Chip label="+ фильтр" onPress={() => router.push('/filters')} />
      </View>
      <AppText variant="caption" tone="muted">
        Найдено {countRu(herbs.length, FOUND_FORMS)}
        {filter.indications.length > 0 ? ' · по доказанности' : ' · по алфавиту'}
      </AppText>
      {herbs.length === 0 ? (
        <AppText tone="muted">Ничего не нашлось — уберите часть условий.</AppText>
      ) : (
        herbs.map((h) => <HerbRow key={h.id} herb={h} indications={filter.indications} />)
      )}
    </Screen>
  );
}
```

`app/src/app/filters.tsx`:

```tsx
import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  CATALOG_SECTIONS,
  catalogGroups,
  countRu,
  emptyFilter,
  EVIDENCE_LABELS,
  isFilterValueSelected,
  queryHerbs,
  toggleFilterValue,
  type EvidenceLevel,
  type HerbFilter,
} from '@travy/shared';
import { AppText, Button, Chip, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

const THRESHOLDS: { level: EvidenceLevel | null; label: string }[] = [
  { level: null, label: 'любая' },
  { level: 'traditional', label: EVIDENCE_LABELS.traditional.toLowerCase() },
  { level: 'proven', label: EVIDENCE_LABELS.proven.toLowerCase() },
];
const HERB_FORMS = ['траву', 'травы', 'трав'] as const;

export default function FiltersScreen() {
  const router = useRouter();
  const { bundle, index } = useContent();
  const { filter, setFilter } = useListFilter();
  const [draft, setDraft] = useState<HerbFilter>(filter);
  const sections = useMemo(
    () =>
      CATALOG_SECTIONS.map((s) => ({ ...s, groups: catalogGroups(bundle, s.key) })).filter((s) => s.groups.length > 0),
    [bundle],
  );
  const count = useMemo(() => queryHerbs(bundle.herbs, draft, index).length, [bundle, draft, index]);

  return (
    <Screen safeTop={false}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setDraft(emptyFilter())} accessibilityRole="button" style={{ paddingHorizontal: spacing.md }}>
              <AppText tone="accent">Сбросить</AppText>
            </Pressable>
          ),
        }}
      />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Доказанность не ниже</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {THRESHOLDS.map((t) => (
            <Chip
              key={t.label}
              label={t.label}
              selected={draft.minEvidence === t.level}
              onPress={() => setDraft({ ...draft, minEvidence: t.level })}
            />
          ))}
        </View>
      </View>
      {sections.map((s) => (
        <View key={s.key} style={{ gap: spacing.sm }}>
          <AppText variant="heading">{s.title}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {s.groups.map((g) => (
              <Chip
                key={g.value}
                label={g.label}
                selected={isFilterValueSelected(draft, s.key, g.value)}
                onPress={() => setDraft(toggleFilterValue(draft, s.key, g.value))}
              />
            ))}
          </View>
        </View>
      ))}
      <Button
        label={`Показать ${countRu(count, HERB_FORMS)}`}
        onPress={() => {
          setFilter(draft);
          router.back();
        }}
      />
    </Screen>
  );
}
```

`app/src/app/search.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { filterForGroup, searchContent } from '@travy/shared';
import { AppText, Chip, HerbRow, Screen, SearchField } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const [query, setQuery] = useState('');
  const result = useMemo(() => searchContent(bundle, query), [bundle, query]);

  return (
    <Screen safeTop={false}>
      <SearchField value={query} onChangeText={setQuery} />
      {result.groups.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {result.groups.map((g) => (
            <Chip
              key={`${g.kind}:${g.id}`}
              label={g.name}
              onPress={() => {
                setFilter(filterForGroup(g.kind, g.id));
                router.push('/herbs');
              }}
            />
          ))}
        </View>
      )}
      {query.trim() && result.herbs.length === 0 && result.groups.length === 0 ? (
        <AppText tone="muted">Ничего не нашлось.</AppText>
      ) : null}
      {result.herbs.map((h) => (
        <HerbRow key={h.id} herb={h} />
      ))}
    </Screen>
  );
}
```

`app/src/app/herb/[id].tsx`:

```tsx
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Linking, Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import {
  EVIDENCE_LABELS,
  filterForGroup,
  herbSourceIds,
  HERB_STATUS_LABELS,
  LIFE_FORM_LABELS,
  monthName,
  PHOTO_KIND_LABELS,
  SAFETY_STATUS_LABELS,
  sourceHref,
  SOURCING_LABELS,
  TOXICITY_LABELS,
  USAGE_FORM_LABELS,
  type CatalogKey,
  type SourceRef,
} from '@travy/shared';
import { AppText, Card, Chip, EvidenceDot, IconButton, NoteEditor, Screen, Section, Tag } from '@/components';
import { photoSource } from '@/content/content';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, radius, spacing } from '@/theme';
import { useUserData } from '@/user/UserDataProvider';

function Line({ label, children }: { label: string; children: string }) {
  return (
    <AppText>
      <AppText tone="muted">{label}: </AppText>
      {children}
    </AppText>
  );
}

export default function HerbScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { herbById, sourceById, nameOf } = useContent();
  const { setFilter } = useListFilter();
  const { data, isFavorite, toggleFavorite, setNote } = useUserData();
  const { width } = useWindowDimensions();
  const herb = id ? herbById.get(id) : undefined;

  const sourceIds = useMemo(() => (herb ? herbSourceIds(herb) : []), [herb]);
  const saveNote = useCallback((text: string) => herb && setNote(herb.id, text), [herb, setNote]);

  if (!herb) {
    return (
      <Screen safeTop={false}>
        <AppText tone="muted">Трава не найдена — возможно, её убрали из базы.</AppText>
      </Screen>
    );
  }

  const refs = (list: SourceRef[]) =>
    list.length ? ` [${list.map((r) => `${sourceIds.indexOf(r.id) + 1}${r.page ? `, ${r.page}` : ''}`).join('; ')}]` : '';
  const openGroup = (key: CatalogKey, value: string) => {
    setFilter(filterForGroup(key, value));
    router.push('/herbs');
  };
  const favorite = isFavorite(herb.id);
  const photoWidth = Math.min(width, 640) - spacing.lg * 2;
  const children = herb.safety.children;
  const childrenText =
    children.status === 'ok' && children.from_age !== undefined
      ? `можно с ${children.from_age} ${children.from_age === 1 ? 'года' : 'лет'}`
      : SAFETY_STATUS_LABELS[children.status];

  return (
    <Screen safeTop={false}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <IconButton
              icon={favorite ? 'heart' : 'heart-outline'}
              label={favorite ? 'Убрать из избранного' : 'В избранное'}
              color={favorite ? colors.accent : colors.text}
              onPress={() => toggleFavorite(herb.id)}
            />
          ),
        }}
      />

      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
        {herb.photos.map((p) => {
          const source = photoSource(p.path);
          return (
            <View key={p.path} style={{ width: photoWidth + spacing.lg * 2, paddingHorizontal: spacing.lg, gap: spacing.xs }}>
              {source ? (
                <Image source={source} style={{ width: photoWidth, height: 260, borderRadius: radius.lg }} contentFit="cover" />
              ) : (
                <View style={{ width: photoWidth, height: 260, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised }} />
              )}
              <AppText variant="tiny" tone="faint">
                {PHOTO_KIND_LABELS[p.kind]}
                {p.caption ? `: ${p.caption}` : ''} · {p.author} · {p.license}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="title">{herb.name}</AppText>
        <AppText tone="muted" style={{ fontStyle: 'italic' }}>
          {herb.latin} · {nameOf('families', herb.family)}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
          {herb.status === 'draft' && <Tag label={HERB_STATUS_LABELS.draft} />}
          <Tag label={LIFE_FORM_LABELS[herb.life_form]} />
          {herb.sourcing.map((s) => (
            <Tag key={s} label={SOURCING_LABELS[s]} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {herb.indications.map((x) => (
          <Chip key={x.indication} label={nameOf('indications', x.indication)} onPress={() => openGroup('indications', x.indication)} />
        ))}
      </View>

      <Section title="Кратко">
        <AppText>{herb.description}</AppText>
      </Section>

      <Section title="От чего помогает">
        {herb.indications.map((x) => (
          <Pressable key={x.indication} onPress={() => openGroup('indications', x.indication)} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <EvidenceDot level={x.evidence.level} />
              <AppText variant="heading" style={{ flex: 1 }}>
                {nameOf('indications', x.indication)}
              </AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {EVIDENCE_LABELS[x.evidence.level]}. {x.evidence.note}
              {refs(x.sources)}
            </AppText>
          </Pressable>
        ))}
      </Section>

      {herb.substances.length > 0 && (
        <Section title="Действующие вещества">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {herb.substances.map((s) => (
              <Chip key={s} label={nameOf('substances', s)} onPress={() => openGroup('substances', s)} />
            ))}
          </View>
        </Section>
      )}

      {herb.actions.length > 0 && (
        <Section title="Действие">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {herb.actions.map((a) => (
              <Chip key={a} label={nameOf('actions', a)} onPress={() => openGroup('actions', a)} />
            ))}
          </View>
        </Section>
      )}

      <Section title="Сбор">
        {herb.harvest.map((x, i) => (
          <View key={i} style={{ gap: 2 }}>
            <AppText variant="heading">
              {nameOf('plantParts', x.part)} · {x.months.map(monthName).join(', ')}
            </AppText>
            <AppText>
              {x.how}
              {refs(x.sources)}
            </AppText>
            <Line label="Сушка">{x.drying}</Line>
            <Line label="Хранение">{x.storage}</Line>
          </View>
        ))}
      </Section>

      <Section title="Применение">
        {herb.usage.map((u, i) => (
          <View key={i} style={{ gap: 2 }}>
            <AppText variant="heading">
              {USAGE_FORM_LABELS[u.form]}
              {u.for_indications.length ? ` · ${u.for_indications.map((x) => nameOf('indications', x)).join(', ')}` : ''}
            </AppText>
            <AppText>{u.recipe}</AppText>
            <Line label="Дозировка">{u.dosage}</Line>
            {u.course ? <Line label="Курс">{u.course}</Line> : null}
            <AppText variant="tiny" tone="faint">
              {refs(u.sources).trim()}
            </AppText>
          </View>
        ))}
      </Section>

      <Section title="Безопасность">
        <Line label="Беременность">{SAFETY_STATUS_LABELS[herb.safety.pregnancy]}</Line>
        <Line label="Кормление грудью">{SAFETY_STATUS_LABELS[herb.safety.lactation]}</Line>
        <Line label="Дети">{childrenText}</Line>
        <Line label="Токсичность">{TOXICITY_LABELS[herb.safety.toxicity]}</Line>
        {herb.safety.contraindications.map((x) => (
          <AppText key={x} tone="danger">
            Противопоказание: {x}
          </AppText>
        ))}
        {herb.safety.warnings.map((x) => (
          <AppText key={x}>⚠ {x}</AppText>
        ))}
        {herb.safety.interactions.map((x) => (
          <AppText key={x}>Взаимодействие: {x}</AppText>
        ))}
        {herb.safety.side_effects.map((x) => (
          <AppText key={x} tone="muted">
            Побочное действие: {x}
          </AppText>
        ))}
        <AppText variant="tiny" tone="faint">
          {refs(herb.safety.sources).trim()}
        </AppText>
      </Section>

      {herb.lookalikes.length > 0 && (
        <Section title="С чем можно спутать">
          {herb.lookalikes.map((l, i) => {
            const title = l.herb ? (herbById.get(l.herb)?.name ?? l.herb) : `${l.name ?? ''} (${l.latin ?? ''})`;
            const source = l.photo ? photoSource(l.photo.path) : null;
            return (
              <Card key={i} style={l.poisonous ? { borderColor: colors.danger, borderWidth: 2 } : undefined}>
                <AppText variant="heading" tone={l.poisonous ? 'danger' : 'default'}>
                  {title}
                  {l.poisonous ? ' — ядовит' : ''}
                </AppText>
                <AppText>{l.differences}</AppText>
                {source && <Image source={source} style={{ width: '100%', height: 180, borderRadius: radius.md }} contentFit="cover" />}
              </Card>
            );
          })}
        </Section>
      )}

      <Section title="Мои заметки">
        <NoteEditor value={data.notes[herb.id]?.text ?? ''} onSave={saveNote} />
      </Section>

      <Section title="Источники">
        {sourceIds.map((sid, i) => {
          const s = sourceById.get(sid);
          if (!s) return null;
          const href = sourceHref(s);
          return (
            <Pressable key={sid} disabled={!href} onPress={() => href && Linking.openURL(href)} accessibilityRole={href ? 'link' : undefined}>
              <AppText variant="caption" tone={href ? 'accent' : 'muted'}>
                [{i + 1}] {s.authors.join(', ')}. {s.title}. {s.year}.{s.isbn ? ` ISBN ${s.isbn}.` : ''}
              </AppText>
            </Pressable>
          );
        })}
      </Section>
    </Screen>
  );
}
```

`app/src/app/recipe/[id].tsx`:

```tsx
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { EVIDENCE_LABELS, recipeSourceIds, sourceHref } from '@travy/shared';
import { AppText, EvidenceDot, ListRow, Screen, Section } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { spacing } from '@/theme';

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipeById, herbById, sourceById, nameOf } = useContent();
  const recipe = id ? recipeById.get(id) : undefined;

  if (!recipe) {
    return (
      <Screen safeTop={false}>
        <AppText tone="muted">Сбор не найден.</AppText>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <AppText variant="title">{recipe.name}</AppText>
      <AppText tone="muted">При: {recipe.purpose.map((p) => nameOf('indications', p)).join(', ')}</AppText>
      <Section title="Состав">
        {recipe.components.map((c) => (
          <ListRow
            key={c.herb}
            title={herbById.get(c.herb)?.name ?? c.herb}
            subtitle={`${c.parts} ч.${c.part ? ` · ${nameOf('plantParts', c.part)}` : ''}`}
            onPress={herbById.has(c.herb) ? () => router.push({ pathname: '/herb/[id]', params: { id: c.herb } }) : undefined}
          />
        ))}
      </Section>
      <Section title="Приготовление">
        <AppText>{recipe.preparation}</AppText>
        <AppText>
          <AppText tone="muted">Дозировка: </AppText>
          {recipe.dosage}
        </AppText>
        {recipe.safety_note ? <AppText tone="danger">{recipe.safety_note}</AppText> : null}
      </Section>
      <Section title="Доказанность">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <EvidenceDot level={recipe.evidence.level} />
          <AppText variant="heading">{EVIDENCE_LABELS[recipe.evidence.level]}</AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {recipe.evidence.note}
        </AppText>
      </Section>
      <Section title="Источники">
        {recipeSourceIds(recipe).map((sid, i) => {
          const s = sourceById.get(sid);
          if (!s) return null;
          const href = sourceHref(s);
          return (
            <Pressable key={sid} disabled={!href} onPress={() => href && Linking.openURL(href)}>
              <AppText variant="caption" tone={href ? 'accent' : 'muted'}>
                [{i + 1}] {s.authors.join(', ')}. {s.title}. {s.year}.
              </AppText>
            </Pressable>
          );
        })}
      </Section>
    </Screen>
  );
}
```

`app/src/app/(tabs)/recipes.tsx`:

```tsx
import { useRouter } from 'expo-router';
import { compareNames, countRu } from '@travy/shared';
import { AppText, ListRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';

export default function RecipesScreen() {
  const router = useRouter();
  const { bundle, nameOf } = useContent();
  const recipes = [...bundle.recipes].sort((a, b) => compareNames(a.name, b.name));
  return (
    <Screen>
      <AppText variant="title">Сборы</AppText>
      {recipes.length === 0 ? (
        <AppText tone="muted">Сборов пока нет — они появятся в следующих обновлениях базы.</AppText>
      ) : (
        recipes.map((r) => (
          <ListRow
            key={r.id}
            title={r.name}
            subtitle={`${countRu(r.components.length, ['компонент', 'компонента', 'компонентов'])} · ${r.purpose.map((p) => nameOf('indications', p)).join(', ')}`}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}
          />
        ))
      )}
    </Screen>
  );
}
```

`app/src/app/(tabs)/favorites.tsx`:

```tsx
import { useMemo } from 'react';
import { favoriteEntries } from '@travy/shared';
import { AppText, Card, HerbRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useUserData } from '@/user/UserDataProvider';

export default function FavoritesScreen() {
  const { herbById } = useContent();
  const { data, readOnly } = useUserData();
  const entries = useMemo(() => favoriteEntries(data, herbById), [data, herbById]);

  return (
    <Screen>
      <AppText variant="title">Избранное</AppText>
      {readOnly && (
        <AppText tone="danger">Не удалось прочитать сохранённые данные — изменения сейчас не сохраняются.</AppText>
      )}
      {entries.length === 0 ? (
        <AppText tone="muted">
          Здесь появятся травы со звёздочкой и травы с заметками. Отметить траву: сердечко в карточке или долгое нажатие в списке.
        </AppText>
      ) : (
        entries.map((e) =>
          e.herb ? (
            <HerbRow key={e.herbId} herb={e.herb} />
          ) : (
            <Card key={e.herbId}>
              <AppText variant="heading">{e.herbId}</AppText>
              <AppText tone="danger">Трава удалена из базы</AppText>
              {e.note ? <AppText>{e.note.text}</AppText> : null}
            </Card>
          ),
        )
      )}
    </Screen>
  );
}
```

`app/src/app/settings.tsx`:

```tsx
import { Linking, Pressable } from 'react-native';
import { contentVersionDate, countRu } from '@travy/shared';
import { AppText, DISCLAIMER_TEXT, Screen, Section } from '@/components';
import { useContent } from '@/content/ContentProvider';

export default function SettingsScreen() {
  const { bundle } = useContent();
  const photos = bundle.herbs.flatMap((h) => h.photos.map((p) => ({ herb: h.name, ...p })));

  return (
    <Screen safeTop={false}>
      <Section title="База трав">
        <AppText>Версия: {contentVersionDate(bundle.contentVersion)}</AppText>
        <AppText tone="muted">
          {countRu(bundle.herbs.length, ['трава', 'травы', 'трав'])}, {countRu(bundle.recipes.length, ['сбор', 'сбора', 'сборов'])},{' '}
          {countRu(bundle.sources.length, ['источник', 'источника', 'источников'])}
        </AppText>
        <AppText variant="caption" tone="muted">
          Обновление базы по сети появится в следующей версии приложения.
        </AppText>
      </Section>
      <Section title="Важно">
        <AppText>{DISCLAIMER_TEXT}</AppText>
      </Section>
      <Section title="Авторы фотографий">
        {photos.map((p) => (
          <Pressable key={p.path + p.herb} onPress={() => Linking.openURL(p.source_url)} accessibilityRole="link">
            <AppText variant="caption" tone="accent">
              {p.herb}: {p.author} · {p.license}
            </AppText>
          </Pressable>
        ))}
      </Section>
    </Screen>
  );
}
```

- [ ] **Step 4: Проверка**

Run: `npm run typecheck && npm test && (cd app && npx expo export --platform web --output-dir ../.app-web-check) && rm -rf .app-web-check`
Expected: `tsc` без ошибок; 236 тестов PASS; `Exported`.

Визуальная проверка (делает контроллер, веб-превью 375×812): дисклеймер при первом запуске → главная (поиск, 4 плитки, баннер, «Собирать сейчас · <месяц>») → карточка травы (галерея, разделы, источники, заметка, сердечко) → показание → список с плашкой фильтра → «+ фильтр» → панель фильтров (длинные плашки переносятся) → каталог со склонениями → «О приложении» → «Избранное».

- [ ] **Step 5: Commit**

```bash
git add app package-lock.json
git commit -m "feat(app): v1 screens — home, catalog, list, filters, search, herb card, recipes, favorites, settings" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
