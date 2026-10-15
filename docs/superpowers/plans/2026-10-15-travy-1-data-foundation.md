# «Травы», план 1: фундамент данных — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Монорепозиторий, в котором база трав хранится в YAML, строго проверяется и собирается в `dist/` (`content.json` + `manifest.json` + фото), с инструментами загрузки фото с Wikimedia и проверки DOI/PMID и CI-публикацией на GitHub Pages.

**Architecture:** npm workspaces: `shared/` — схемы данных на zod (строгие для YAML, нестрогие для собранной базы) и правила доказанности, без Node API (позже их использует приложение); `tools/` — загрузчик YAML, валидатор ссылок и правил, сборщик `dist/`, загрузчик фото, проверка источников; `content/` — сами данные. GitHub Actions на каждый push гоняет тесты и сборку и публикует `dist/` на GitHub Pages из `main`.

**Tech Stack:** Node 22, TypeScript 7 (strict), zod 4, yaml 2, sharp, Vitest 5, tsx, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-15-travy-design.md`

## Дорожная карта (4 плана)

| План | Что даёт | Зависит от |
|---|---|---|
| **1. Фундамент данных (этот)** | Схема, валидатор, сборщик базы, фото-инструмент, проверка источников, CI | — |
| 2. Пилотный контент | Словари, источники и 10 полностью заполненных трав с фото; проверка пользователем | 1 |
| 3. Приложение Expo | Чтение встроенной базы, фильтры/поиск/сортировка (чистая логика в `shared/src/query/`, тесты Vitest), экраны, тема, избранное и заметки, дисклеймер, настройки | 1 (данные — из плана 2 или тестового набора) |
| 4. Обновления и выпуск | Скачивание базы с GitHub Pages (§7 спецификации), сборка APK в EAS, публикация в GitHub Releases | 1, 3 |

Планы 2–4 пишутся после завершения предыдущего, чтобы опираться на реальные интерфейсы. Планы 2 и 3 можно выполнять параллельно.

## Global Constraints

- Node ≥ 20 локально, Node 22 в CI; все пакеты — ES-модули (`"type": "module"`).
- TypeScript: `strict: true`, `noUncheckedIndexedAccess: true`, `moduleResolution: "bundler"`, импорты без расширений.
- `shared/` не импортирует Node API (`node:*`, `fs`, `Buffer`) — его будет использовать React Native приложение.
- Ключи YAML и полей данных — snake_case ровно как в спецификации §5 (`other_names`, `source_url`, `from_age`, `for_indications`, `organ_system`, `safety_note`).
- `id`: `^[a-z0-9]+(?:-[a-z0-9]+)*$`; для трав и сборов `id` = имя файла без `.yaml`.
- Уровни доказанности: `proven` | `traditional` | `folk` | `refuted`; порядок `proven > traditional > folk > refuted`; `proven` требует источник типа `systematic_review`/`rct`/`article`/`monograph`, `refuted` — `systematic_review`/`rct`/`article` (спецификация §5.2).
- Типы источников: `pharmacopoeia`, `monograph`, `systematic_review`, `rct`, `article`, `book`, `reference_book`; у источника обязателен хотя бы один из `isbn`/`doi`/`pmid`/`url`.
- Лицензии фото: только `CC0`, `PD`, `CC BY x.y`, `CC BY-SA x.y` (допускается суффикс юрисдикции: `CC BY-SA 3.0 de`).
- Фото: WebP, длинная сторона ≤ 1080 px, цель ≤ 150 КБ.
- `SCHEMA_VERSION = 1`; `contentVersion` = `YYYYMMDDHHmm` по UTC.
- Все сообщения пользователю (ошибки валидации, вывод CLI) — на русском.
- User-Agent внешних запросов: `TravyContentTool/0.1 (personal herb reference app)` — без личных данных.
- Тесты — Vitest (спецификация §11 упоминает Jest для логики приложения; приложение — план 3, здесь только `shared`/`tools`).

## Review Focus

- YAML, сохранённый в Windows-редакторе с BOM и переводами строк CRLF, должен читаться без ошибок → тест в Task 3.
- Файл травы с кириллическим или несовпадающим именем (`ромашка.yaml`) должен давать понятную ошибку, а не молча пропадать → тест в Task 3.
- Одинаковое фото у двух трав должно попасть в `dist/` один раз (дедупликация по sha256) → тест в Task 5.
- Пустая база (свежий репозиторий без трав) должна собираться, чтобы CI был зелёным с первого коммита → тесты в Task 4 и Task 5.
- DOI/PMID в разных формах записи (`https://doi.org/…`, `doi:…`, `PMID: …`) должны проверяться корректно → тест в Task 7.

---

## Файловая структура (результат плана)

```
travy/
├── package.json              корневой: workspaces, скрипты
├── tsconfig.base.json
├── vitest.config.ts
├── .gitignore
├── README.md                 как работать с базой
├── .github/workflows/content.yml
├── content/                  данные (пока пустые списки)
│   ├── sources.yaml
│   ├── dictionaries/*.yaml   8 файлов
│   ├── herbs/.gitkeep
│   ├── recipes/.gitkeep
│   └── photos/.gitkeep
├── shared/
│   ├── package.json  tsconfig.json
│   ├── src/enums.ts          перечисления (уровни, типы источников, …)
│   ├── src/evidence.ts       порядок уровней, порог, требования к источникам
│   ├── src/schema.ts         zod-схемы: строгие (YAML) и нестрогие (сборка)
│   ├── src/manifest.ts       схема manifest.json
│   ├── src/index.ts
│   └── test/evidence.test.ts  schema.test.ts  sample.ts
└── tools/
    ├── package.json  tsconfig.json
    ├── src/paths.ts          корень репозитория, content/, dist/
    ├── src/errors.ts         ContentError, ContentValidationError
    ├── src/load.ts           чтение YAML → типизированные данные
    ├── src/validate.ts       ссылки, правила доказанности, фото
    ├── src/check.ts          load + validate
    ├── src/hash.ts           sha256
    ├── src/build.ts          сборка dist/
    ├── src/wikimedia.ts      API Wikimedia Commons, лицензии
    ├── src/image.ts          сжатие в WebP
    ├── src/photo-meta.ts     запись в photos.yaml
    ├── src/fetch-photo.ts    скачать + сжать + записать
    ├── src/verify-sources.ts Crossref / PubMed
    ├── src/cli/check.ts  build.ts  fetch-photo.ts  verify-sources.ts
    └── test/helpers.ts  load.test.ts  validate.test.ts  check.test.ts  build.test.ts  fetch-photo.test.ts  verify-sources.test.ts
```

Все команды ниже выполняются из корня репозитория `D:\Projects\Травы` в Git Bash.

---

### Task 1: Каркас монорепозитория и правила доказанности

**Files:**
- Create: `.gitignore`, `package.json`, `tsconfig.base.json`, `vitest.config.ts`
- Create: `shared/package.json`, `shared/tsconfig.json`, `shared/src/enums.ts`, `shared/src/evidence.ts`, `shared/src/index.ts`
- Test: `shared/test/evidence.test.ts`

**Interfaces:**
- Consumes: —
- Produces:
  - `shared/src/enums.ts`: `EVIDENCE_LEVELS`, `type EvidenceLevel`, `SOURCE_TYPES`, `type SourceType`, `HERB_STATUSES`, `type HerbStatus`, `SAFETY_STATUSES`, `type SafetyStatus`, `TOXICITY_LEVELS`, `type ToxicityLevel`, `USAGE_FORMS`, `type UsageForm`, `PHOTO_KINDS`, `type PhotoKind`
  - `shared/src/evidence.ts`: `evidenceRank(level: EvidenceLevel): number`, `compareEvidenceDesc(a: EvidenceLevel, b: EvidenceLevel): number`, `meetsEvidenceThreshold(level: EvidenceLevel, threshold: EvidenceLevel): boolean`, `REQUIRED_SOURCE_TYPES: Record<EvidenceLevel, readonly SourceType[] | null>`
  - пакет `@travy/shared` (точка входа `shared/src/index.ts`)

- [ ] **Step 0: Проверить версию npm**

Run: `npm -v`
Expected: `10.x` или новее. На этой машине сейчас стоит глобальный npm 8.6, а Node 22 рассчитан на npm 10. npm 8 записывает в `package-lock.json` платформенные пакеты `sharp` так, что `npm ci` в CI на Linux может их не поставить. Если версия ниже 10, обновите глобальный npm (это меняет окружение машины — выполнять только с согласия пользователя):

```bash
npm install -g npm@10
npm -v
```

- [ ] **Step 1: Инициализировать git и корневые файлы**

```bash
git init
git branch -M main
```

`.gitignore`:

```gitignore
node_modules/
dist/
coverage/
*.log
.expo/
```

`package.json`:

```json
{
  "name": "travy",
  "private": true,
  "type": "module",
  "workspaces": ["shared"],
  "engines": { "node": ">=20" },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc -p shared"
  }
}
```

`tsconfig.base.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": []
  }
}
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/test/**/*.test.ts', 'tools/test/**/*.test.ts'],
    testTimeout: 20000,
  },
});
```

- [ ] **Step 2: Создать пакет shared**

`shared/package.json`:

```json
{
  "name": "@travy/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "exports": { ".": "./src/index.ts" }
}
```

`shared/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "include": ["src", "test"]
}
```

```bash
npm install -D typescript tsx vitest @types/node
npm install zod@^4 --workspace @travy/shared
```

Expected: `node_modules/` создан, в `shared/package.json` появилась зависимость `zod`.

- [ ] **Step 3: Написать падающий тест**

`shared/test/evidence.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EVIDENCE_LEVELS, type EvidenceLevel } from '../src/enums';
import { compareEvidenceDesc, meetsEvidenceThreshold, REQUIRED_SOURCE_TYPES } from '../src/evidence';

describe('compareEvidenceDesc', () => {
  it('сортирует от самого доказанного к опровергнутому', () => {
    const levels: EvidenceLevel[] = ['folk', 'refuted', 'proven', 'traditional'];
    expect([...levels].sort(compareEvidenceDesc)).toEqual(['proven', 'traditional', 'folk', 'refuted']);
  });
});

describe('meetsEvidenceThreshold', () => {
  it('уровень, равный порогу, проходит', () => {
    expect(meetsEvidenceThreshold('traditional', 'traditional')).toBe(true);
  });
  it('уровень выше порога проходит', () => {
    expect(meetsEvidenceThreshold('proven', 'traditional')).toBe(true);
  });
  it('уровень ниже порога не проходит', () => {
    expect(meetsEvidenceThreshold('folk', 'traditional')).toBe(false);
  });
  it('refuted ниже любого порога', () => {
    for (const threshold of EVIDENCE_LEVELS) {
      expect(meetsEvidenceThreshold('refuted', threshold)).toBe(false);
    }
  });
});

describe('REQUIRED_SOURCE_TYPES', () => {
  it('proven требует исследования или монографию', () => {
    expect(REQUIRED_SOURCE_TYPES.proven).toEqual(['systematic_review', 'rct', 'article', 'monograph']);
  });
  it('refuted требует исследования', () => {
    expect(REQUIRED_SOURCE_TYPES.refuted).toEqual(['systematic_review', 'rct', 'article']);
  });
  it('traditional и folk не проверяются', () => {
    expect(REQUIRED_SOURCE_TYPES.traditional).toBeNull();
    expect(REQUIRED_SOURCE_TYPES.folk).toBeNull();
  });
});
```

- [ ] **Step 4: Запустить тест и убедиться, что он падает**

Run: `npx vitest run shared/test/evidence.test.ts`
Expected: FAIL — `Failed to resolve import "../src/enums"`.

- [ ] **Step 5: Реализовать перечисления и правила**

`shared/src/enums.ts`:

```ts
export const EVIDENCE_LEVELS = ['proven', 'traditional', 'folk', 'refuted'] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const SOURCE_TYPES = [
  'pharmacopoeia',
  'monograph',
  'systematic_review',
  'rct',
  'article',
  'book',
  'reference_book',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const HERB_STATUSES = ['draft', 'checked'] as const;
export type HerbStatus = (typeof HERB_STATUSES)[number];

export const SAFETY_STATUSES = ['ok', 'caution', 'contraindicated', 'unknown'] as const;
export type SafetyStatus = (typeof SAFETY_STATUSES)[number];

export const TOXICITY_LEVELS = ['none', 'low', 'moderate', 'high'] as const;
export type ToxicityLevel = (typeof TOXICITY_LEVELS)[number];

export const USAGE_FORMS = ['infusion', 'decoction', 'tincture', 'rinse', 'bath', 'compress', 'tea', 'other'] as const;
export type UsageForm = (typeof USAGE_FORMS)[number];

export const PHOTO_KINDS = ['plant', 'closeup', 'raw'] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];
```

`shared/src/evidence.ts`:

```ts
import type { EvidenceLevel, SourceType } from './enums';

const RANK: Record<EvidenceLevel, number> = { proven: 3, traditional: 2, folk: 1, refuted: 0 };

export function evidenceRank(level: EvidenceLevel): number {
  return RANK[level];
}

/** Компаратор для сортировки по убыванию доказанности: proven первым. */
export function compareEvidenceDesc(a: EvidenceLevel, b: EvidenceLevel): number {
  return RANK[b] - RANK[a];
}

/** Уровень не ниже порога; refuted ниже любого порога (спецификация §6.3). */
export function meetsEvidenceThreshold(level: EvidenceLevel, threshold: EvidenceLevel): boolean {
  if (level === 'refuted') return false;
  return RANK[level] >= RANK[threshold];
}

/**
 * Типы источников, хотя бы один из которых обязателен для уровня (спецификация §5.2).
 * null — правило для уровня не проверяется.
 */
export const REQUIRED_SOURCE_TYPES: Record<EvidenceLevel, readonly SourceType[] | null> = {
  proven: ['systematic_review', 'rct', 'article', 'monograph'],
  traditional: null,
  folk: null,
  refuted: ['systematic_review', 'rct', 'article'],
};
```

`shared/src/index.ts`:

```ts
export * from './enums';
export * from './evidence';
```

- [ ] **Step 6: Запустить тесты и проверку типов**

Run: `npx vitest run shared/test/evidence.test.ts && npm run typecheck`
Expected: PASS (8 тестов), `tsc` без ошибок.

- [ ] **Step 7: Commit**

```bash
git add .gitignore package.json package-lock.json tsconfig.base.json vitest.config.ts shared docs
git commit -m "chore: scaffold monorepo with shared evidence rules" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Схема данных

**Files:**
- Create: `shared/src/schema.ts`, `shared/src/manifest.ts`, `shared/test/sample.ts`
- Modify: `shared/src/index.ts`
- Test: `shared/test/schema.test.ts`

**Interfaces:**
- Consumes: всё из `shared/src/enums.ts` (Task 1).
- Produces (из `@travy/shared`):
  - константы: `SCHEMA_VERSION = 1`, `ID_PATTERN`, `PHOTO_FILE_PATTERN`, `PHOTO_PATH_PATTERN`, `LICENSE_PATTERN`, `DICTIONARY_FILES: Record<DictionaryKey, string>`
  - `inputSchemas` — строгие (неизвестный ключ = ошибка) и `bundleSchemas` — нестрогие (неизвестные ключи отбрасываются); у обоих поля: `sourceRef`, `source`, `dictionaryItems: Record<DictionaryKey, схема элемента>`, `dictionaries`, `photoRef`, `photoMeta`, `photoMetaFile`, `photo`, `herbInput`, `herb`, `recipe`, `contentBundle`
  - типы: `SourceRef`, `Source`, `Dictionaries`, `DictionaryKey`, `PhotoRef`, `PhotoMeta`, `PhotoMetaFile`, `Photo`, `HerbInput`, `Herb`, `Recipe`, `ContentBundle`
  - `manifestSchema`, типы `Manifest`, `ManifestFile`
  - тестовые данные `shared/test/sample.ts`: `sampleSources()`, `sampleDictionaries()`, `sampleHerb(id, name, family?)`, `sampleRecipe()`, `samplePhotoMeta()`

- [ ] **Step 1: Создать тестовые данные**

`shared/test/sample.ts`:

```ts
/** Минимальный корректный набор данных для тестов shared и tools. Каждый вызов возвращает новые объекты. */

export function sampleSources() {
  return [
    {
      id: 'book-test',
      type: 'book',
      title: 'Лекарственные растения',
      authors: ['Петров П. П.'],
      year: 1990,
      isbn: '978-5-00-000000-0',
    },
    {
      id: 'ema-plantago',
      type: 'monograph',
      title: 'Community herbal monograph on Plantago lanceolata L., folium',
      authors: ['EMA HMPC'],
      year: 2011,
      url: 'https://www.ema.europa.eu/en/medicines/herbal/plantaginis-lanceolatae-folium',
    },
    {
      id: 'rct-test',
      type: 'rct',
      title: 'A randomized trial of a test herb',
      authors: ['Ivanov I.'],
      year: 2020,
      doi: '10.1000/test.2020.1',
    },
  ];
}

export function sampleDictionaries() {
  return {
    indications: [
      { id: 'cough', name: 'Кашель', organ_system: 'respiratory', synonyms: ['кашлять'] },
      { id: 'insomnia', name: 'Бессонница', organ_system: 'nervous' },
    ],
    organSystems: [
      { id: 'nervous', name: 'Нервная система' },
      { id: 'respiratory', name: 'Дыхательная система' },
    ],
    substances: [{ id: 'mucilage', name: 'Слизи', class: 'polysaccharides' }],
    substanceClasses: [{ id: 'polysaccharides', name: 'Полисахариды' }],
    actions: [{ id: 'expectorant', name: 'Отхаркивающее' }],
    plantParts: [
      { id: 'leaf', name: 'Лист' },
      { id: 'root', name: 'Корень' },
    ],
    habitats: [{ id: 'meadow', name: 'Луг' }],
    families: [
      { id: 'malvaceae', name: 'Мальвовые', latin: 'Malvaceae' },
      { id: 'plantaginaceae', name: 'Подорожниковые', latin: 'Plantaginaceae' },
    ],
  };
}

type SampleLookalike = {
  herb?: string;
  name?: string;
  latin?: string;
  poisonous: boolean;
  differences: string;
  photo?: { file: string; kind: string };
};

export function sampleHerb(id: string, name: string, family = 'plantaginaceae') {
  return {
    id,
    name,
    other_names: ['народное название'],
    latin: 'Testus herbus L.',
    family,
    status: 'draft',
    photos: [{ file: 'plant.webp', kind: 'plant' }],
    description: 'Описание внешнего вида',
    habitats: ['meadow'],
    harvest: [
      {
        part: 'leaf',
        months: [6, 7, 8],
        how: 'Срезать листья',
        drying: 'В тени',
        storage: 'В бумажных пакетах',
        sources: [{ id: 'book-test', page: '12' }],
      },
    ],
    substances: ['mucilage'],
    actions: ['expectorant'],
    indications: [
      {
        indication: 'cough',
        evidence: { level: 'traditional', note: 'Монография EMA, традиционное применение' },
        sources: [{ id: 'ema-plantago' }],
      },
    ],
    usage: [
      {
        form: 'infusion',
        recipe: '1 ст. л. на 200 мл кипятка',
        dosage: 'По 1/3 стакана 3 раза в день',
        sources: [{ id: 'book-test' }],
      },
    ],
    safety: {
      pregnancy: 'unknown',
      lactation: 'unknown',
      children: { status: 'ok', from_age: 3 },
      toxicity: 'none',
      sources: [{ id: 'book-test' }],
    },
    lookalikes: [] as SampleLookalike[],
  };
}

export function sampleRecipe() {
  return {
    id: 'chest-blend',
    name: 'Грудной сбор (тест)',
    purpose: ['cough'],
    components: [
      { herb: 'plantago-major', parts: 2, part: 'leaf' },
      { herb: 'althaea-officinalis', parts: 1, part: 'root' },
    ],
    preparation: '1 ст. л. сбора на 200 мл кипятка',
    dosage: '3 раза в день',
    evidence: { level: 'traditional', note: 'Традиционный сбор' },
    sources: [{ id: 'book-test' }],
  };
}

export function samplePhotoMeta() {
  return {
    'plant.webp': {
      author: 'Test Author',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    },
  };
}
```

- [ ] **Step 2: Написать падающий тест**

`shared/test/schema.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { manifestSchema } from '../src/manifest';
import { bundleSchemas, inputSchemas, SCHEMA_VERSION } from '../src/schema';
import { sampleDictionaries, sampleHerb, samplePhotoMeta, sampleRecipe, sampleSources } from './sample';

function messages(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`);
}

const HASH = 'a'.repeat(64);
const bundlePhoto = {
  path: `photos/${HASH}.webp`,
  kind: 'plant',
  author: 'A',
  license: 'CC0',
  source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
};

describe('source', () => {
  it('принимает корректные источники', () => {
    for (const source of sampleSources()) expect(messages(inputSchemas.source, source)).toEqual([]);
  });
  it('требует хотя бы один проверяемый идентификатор', () => {
    const { isbn: _isbn, ...noId } = sampleSources()[0]!;
    expect(messages(inputSchemas.source, noId).join('\n')).toMatch(/проверяемый идентификатор/);
  });
  it('строгая схема ловит опечатку в ключе, нестрогая — нет', () => {
    const typo = { ...sampleSources()[0]!, autors: ['X'] };
    expect(messages(inputSchemas.source, typo).join('\n')).toMatch(/autors/);
    expect(messages(bundleSchemas.source, typo)).toEqual([]);
  });
});

describe('id', () => {
  it.each(['Ромашка', 'Matricaria', 'matricaria_chamomilla', 'matricaria--chamomilla', ''])(
    'отклоняет "%s"',
    (id) => {
      expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), id }).join('\n')).toMatch(/id: только латиница/);
    },
  );
  it('принимает kebab-case', () => {
    expect(messages(inputSchemas.herbInput, sampleHerb('matricaria-chamomilla', 'Ромашка'))).toEqual([]);
  });
});

describe('license', () => {
  const meta = (license: string) => ({ author: 'A', license, source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg' });
  it.each(['CC0', 'PD', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0 de'])('принимает %s', (license) => {
    expect(messages(inputSchemas.photoMeta, meta(license))).toEqual([]);
  });
  it.each(['CC BY-NC 4.0', 'GFDL', 'cc by-sa 4.0', 'CC BY-SA'])('отклоняет %s', (license) => {
    expect(messages(inputSchemas.photoMeta, meta(license)).join('\n')).toMatch(/лицензия должна быть/);
  });
  it('файл метаданных требует имена вида name.webp', () => {
    expect(messages(inputSchemas.photoMetaFile, samplePhotoMeta())).toEqual([]);
    expect(messages(inputSchemas.photoMetaFile, { 'Plant.JPG': samplePhotoMeta()['plant.webp'] })).not.toEqual([]);
  });
});

describe('herb', () => {
  it('принимает корректную траву и подставляет значения по умолчанию', () => {
    const { other_names: _names, ...herb } = sampleHerb('plantago-major', 'Подорожник большой');
    const parsed = inputSchemas.herbInput.parse(herb);
    expect(parsed.other_names).toEqual([]);
    expect(parsed.usage[0]!.for_indications).toEqual([]);
    expect(parsed.safety.contraindications).toEqual([]);
  });
  it('показание без источников — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.indications[0]!.sources = [];
    expect(messages(inputSchemas.herbInput, herb)).toContain('indications.0.sources: нужен хотя бы один источник');
  });
  it('пустое пояснение к доказанности — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.indications[0]!.evidence.note = '  ';
    expect(messages(inputSchemas.herbInput, herb)).toContain('indications.0.evidence.note: не должно быть пустым');
  });
  it('месяц вне 1–12 — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.harvest[0]!.months = [13];
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^harvest\.0\.months\.0:/m);
  });
  it('трава без фото — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.photos = [];
    expect(messages(inputSchemas.herbInput, herb)).toContain('photos: нужно хотя бы одно фото');
  });
  it('неизвестный уровень доказанности — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.indications[0]!.evidence.level = 'maybe';
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^indications\.0\.evidence\.level:/m);
  });
  it('двойник: либо herb, либо name + latin', () => {
    const herb = sampleHerb('x', 'X');
    herb.lookalikes = [{ herb: 'y', poisonous: false, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb)).toEqual([]);
    herb.lookalikes = [{ name: 'Болиголов', latin: 'Conium maculatum L.', poisonous: true, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb)).toEqual([]);
    herb.lookalikes = [{ herb: 'y', name: 'Болиголов', poisonous: true, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/либо herb/);
    herb.lookalikes = [{ name: 'Болиголов', poisonous: true, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/либо herb/);
  });
});

describe('recipe', () => {
  it('принимает корректный сбор', () => {
    expect(messages(inputSchemas.recipe, sampleRecipe())).toEqual([]);
  });
  it('сбор из одного компонента — ошибка', () => {
    const recipe = sampleRecipe();
    recipe.components = recipe.components.slice(0, 1);
    expect(messages(inputSchemas.recipe, recipe)).toContain('components: в сборе должно быть хотя бы 2 компонента');
  });
});

describe('bundle', () => {
  const bundle = () => ({
    schemaVersion: SCHEMA_VERSION,
    contentVersion: 202610151830,
    herbs: [{ ...sampleHerb('x', 'X'), photos: [bundlePhoto], future_field: 1 }],
    recipes: [sampleRecipe()],
    dictionaries: sampleDictionaries(),
    sources: sampleSources(),
  });
  it('нестрогая схема принимает неизвестные поля и отбрасывает их', () => {
    const parsed = bundleSchemas.contentBundle.parse(bundle());
    expect(parsed.herbs[0]).not.toHaveProperty('future_field');
  });
  it('отклоняет другую версию формата', () => {
    expect(messages(bundleSchemas.contentBundle, { ...bundle(), schemaVersion: 2 })).not.toEqual([]);
  });
  it('путь фото в сборке — photos/<sha256>.webp', () => {
    expect(messages(bundleSchemas.photo, { ...bundlePhoto, path: 'photos/plant.webp' })).not.toEqual([]);
  });
});

describe('manifest', () => {
  const manifest = {
    schemaVersion: 1,
    contentVersion: 202610151830,
    publishedAt: '2026-10-15T18:30:00.000Z',
    content: { path: 'content.json', sha256: HASH, size: 100 },
    photos: [{ path: `photos/${HASH}.webp`, sha256: HASH, size: 10 }],
  };
  it('принимает корректный манифест и будущие поля', () => {
    expect(messages(manifestSchema, { ...manifest, futureField: true })).toEqual([]);
  });
  it('принимает манифест с более новой версией формата (решение — на стороне приложения)', () => {
    expect(messages(manifestSchema, { ...manifest, schemaVersion: 7 })).toEqual([]);
  });
  it('отклоняет некорректный sha256', () => {
    expect(messages(manifestSchema, { ...manifest, content: { ...manifest.content, sha256: 'xyz' } })).not.toEqual([]);
  });
});
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npx vitest run shared/test/schema.test.ts`
Expected: FAIL — `Failed to resolve import "../src/manifest"`.

- [ ] **Step 4: Реализовать схемы**

`shared/src/schema.ts`:

```ts
import { z } from 'zod';
import {
  EVIDENCE_LEVELS,
  HERB_STATUSES,
  PHOTO_KINDS,
  SAFETY_STATUSES,
  SOURCE_TYPES,
  TOXICITY_LEVELS,
  USAGE_FORMS,
} from './enums';

/** Версия формата базы. Увеличивать только при несовместимом изменении схемы (спецификация §5.7). */
export const SCHEMA_VERSION = 1;

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PHOTO_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;
export const PHOTO_PATH_PATTERN = /^photos\/[0-9a-f]{64}\.webp$/;
export const LICENSE_PATTERN = /^(CC0|PD|CC BY(?:-SA)? \d\.\d(?: [A-Za-z]{2,3})?)$/;

type ObjectMaker = <T extends z.ZodRawShape>(shape: T) => z.ZodObject<T>;
// Типы вывода у строгой и нестрогой схемы одинаковые, отличается только реакция на неизвестные ключи.
const strictObject: ObjectMaker = (shape) => z.object(shape).strict() as unknown as z.ZodObject<typeof shape>;
const looseObject: ObjectMaker = (shape) => z.object(shape);

const idSchema = z
  .string()
  .regex(ID_PATTERN, 'id: только латиница в нижнем регистре, цифры и одиночные дефисы (пример: matricaria-chamomilla)');
const text = z.string().trim().min(1, 'не должно быть пустым');
const licenseSchema = z.string().regex(LICENSE_PATTERN, 'лицензия должна быть CC0, PD, CC BY x.y или CC BY-SA x.y');
const photoFileSchema = z
  .string()
  .regex(PHOTO_FILE_PATTERN, 'имя фото: латиница в нижнем регистре, цифры, дефисы и расширение .webp');

interface LookalikeIdentity {
  herb?: string;
  name?: string;
  latin?: string;
}
function isValidLookalike(l: LookalikeIdentity): boolean {
  const byRef = Boolean(l.herb) && !l.name && !l.latin;
  const byName = !l.herb && Boolean(l.name) && Boolean(l.latin);
  return byRef || byName;
}
const LOOKALIKE_RULE = { message: 'укажите либо herb (id травы из базы), либо name и latin', path: ['herb'] };

function makeSchemas(o: ObjectMaker) {
  const sourceRef = o({ id: idSchema, page: text.optional() });
  const sourceRefs = z.array(sourceRef).min(1, 'нужен хотя бы один источник');
  const evidence = o({ level: z.enum(EVIDENCE_LEVELS), note: text });
  const synonyms = z.array(text).default([]);

  const source = o({
    id: idSchema,
    type: z.enum(SOURCE_TYPES),
    title: text,
    authors: z.array(text).min(1, 'нужен хотя бы один автор'),
    year: z.number().int().min(1500).max(2100),
    publisher: text.optional(),
    journal: text.optional(),
    isbn: text.optional(),
    doi: text.optional(),
    pmid: text.optional(),
    url: z.url().optional(),
    note: text.optional(),
  }).refine((s) => Boolean(s.isbn || s.doi || s.pmid || s.url), {
    message: 'источник должен иметь хотя бы один проверяемый идентификатор: isbn, doi, pmid или url',
    path: ['isbn'],
  });

  const named = o({ id: idSchema, name: text });
  const indication = o({ id: idSchema, name: text, organ_system: idSchema, synonyms });
  const substance = o({ id: idSchema, name: text, class: idSchema, synonyms });
  const action = o({ id: idSchema, name: text, synonyms });
  const family = o({ id: idSchema, name: text, latin: text });
  const dictionaryItems = {
    indications: indication,
    organSystems: named,
    substances: substance,
    substanceClasses: named,
    actions: action,
    plantParts: named,
    habitats: named,
    families: family,
  };
  const dictionaries = o({
    indications: z.array(indication),
    organSystems: z.array(named),
    substances: z.array(substance),
    substanceClasses: z.array(named),
    actions: z.array(action),
    plantParts: z.array(named),
    habitats: z.array(named),
    families: z.array(family),
  });

  const photoRef = o({ file: photoFileSchema, kind: z.enum(PHOTO_KINDS), caption: text.optional() });
  const photoMeta = o({ author: text, license: licenseSchema, source_url: z.url() });
  const photoMetaFile = z.record(photoFileSchema, photoMeta);
  const photo = o({
    path: z.string().regex(PHOTO_PATH_PATTERN, 'путь фото в сборке: photos/<sha256>.webp'),
    kind: z.enum(PHOTO_KINDS),
    caption: text.optional(),
    author: text,
    license: licenseSchema,
    source_url: z.url(),
  });

  const harvest = o({
    part: idSchema,
    months: z.array(z.number().int().min(1).max(12)).min(1, 'нужен хотя бы один месяц'),
    how: text,
    drying: text,
    storage: text,
    sources: sourceRefs,
  });
  const herbIndication = o({ indication: idSchema, evidence, sources: sourceRefs });
  const usage = o({
    form: z.enum(USAGE_FORMS),
    recipe: text,
    dosage: text,
    course: text.optional(),
    for_indications: z.array(idSchema).default([]),
    sources: sourceRefs,
  });
  const safetyStatus = z.enum(SAFETY_STATUSES);
  const safety = o({
    pregnancy: safetyStatus,
    lactation: safetyStatus,
    children: o({ status: safetyStatus, from_age: z.number().int().min(0).max(18).optional() }),
    toxicity: z.enum(TOXICITY_LEVELS),
    contraindications: z.array(text).default([]),
    side_effects: z.array(text).default([]),
    interactions: z.array(text).default([]),
    sources: sourceRefs,
  });

  const lookalikeShape = {
    herb: idSchema.optional(),
    name: text.optional(),
    latin: text.optional(),
    poisonous: z.boolean(),
    differences: text,
  };
  const lookalikeInput = o({ ...lookalikeShape, photo: photoRef.optional() }).refine(isValidLookalike, LOOKALIKE_RULE);
  const lookalike = o({ ...lookalikeShape, photo: photo.optional() }).refine(isValidLookalike, LOOKALIKE_RULE);

  const herbShape = {
    id: idSchema,
    name: text,
    other_names: z.array(text).default([]),
    latin: text,
    family: idSchema,
    status: z.enum(HERB_STATUSES),
    description: text,
    habitats: z.array(idSchema),
    harvest: z.array(harvest).min(1, 'нужна хотя бы одна запись о сборе'),
    substances: z.array(idSchema),
    actions: z.array(idSchema),
    indications: z.array(herbIndication).min(1, 'нужно хотя бы одно показание'),
    usage: z.array(usage).min(1, 'нужен хотя бы один способ применения'),
    safety,
    sources: z.array(sourceRef).default([]),
  };
  const herbInput = o({
    ...herbShape,
    photos: z.array(photoRef).min(1, 'нужно хотя бы одно фото'),
    lookalikes: z.array(lookalikeInput).default([]),
  });
  const herb = o({
    ...herbShape,
    photos: z.array(photo).min(1, 'нужно хотя бы одно фото'),
    lookalikes: z.array(lookalike).default([]),
  });

  const recipe = o({
    id: idSchema,
    name: text,
    purpose: z.array(idSchema).min(1, 'укажите хотя бы одно показание'),
    components: z
      .array(o({ herb: idSchema, parts: z.number().positive(), part: idSchema.optional() }))
      .min(2, 'в сборе должно быть хотя бы 2 компонента'),
    preparation: text,
    dosage: text,
    evidence,
    sources: sourceRefs,
    safety_note: text.optional(),
  });

  const contentBundle = o({
    schemaVersion: z.literal(SCHEMA_VERSION),
    contentVersion: z.number().int().positive(),
    herbs: z.array(herb),
    recipes: z.array(recipe),
    dictionaries,
    sources: z.array(source),
  });

  return {
    sourceRef,
    source,
    dictionaryItems,
    dictionaries,
    photoRef,
    photoMeta,
    photoMetaFile,
    photo,
    herbInput,
    herb,
    recipe,
    contentBundle,
  };
}

/** Строгие схемы для YAML-исходников: неизвестный ключ (опечатка) — ошибка. */
export const inputSchemas = makeSchemas(strictObject);
/** Нестрогие схемы для собранной базы: неизвестные поля отбрасываются, чтобы старое приложение принимало совместимые обновления. */
export const bundleSchemas = makeSchemas(looseObject);

export type SourceRef = z.infer<typeof bundleSchemas.sourceRef>;
export type Source = z.infer<typeof bundleSchemas.source>;
export type Dictionaries = z.infer<typeof bundleSchemas.dictionaries>;
export type DictionaryKey = keyof Dictionaries;
export type PhotoRef = z.infer<typeof bundleSchemas.photoRef>;
export type PhotoMeta = z.infer<typeof bundleSchemas.photoMeta>;
export type PhotoMetaFile = z.infer<typeof bundleSchemas.photoMetaFile>;
export type Photo = z.infer<typeof bundleSchemas.photo>;
export type HerbInput = z.infer<typeof bundleSchemas.herbInput>;
export type Herb = z.infer<typeof bundleSchemas.herb>;
export type Recipe = z.infer<typeof bundleSchemas.recipe>;
export type ContentBundle = z.infer<typeof bundleSchemas.contentBundle>;

/** Файлы словарей в content/dictionaries/. */
export const DICTIONARY_FILES = {
  indications: 'indications.yaml',
  organSystems: 'organ-systems.yaml',
  substances: 'substances.yaml',
  substanceClasses: 'substance-classes.yaml',
  actions: 'actions.yaml',
  plantParts: 'plant-parts.yaml',
  habitats: 'habitats.yaml',
  families: 'families.yaml',
} as const satisfies Record<DictionaryKey, string>;
```

`shared/src/manifest.ts`:

```ts
import { z } from 'zod';

// Нестрогая схема: старое приложение должно читать манифест с новыми полями.
const fileEntry = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  size: z.number().int().nonnegative(),
});

export const manifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  contentVersion: z.number().int().positive(),
  publishedAt: z.iso.datetime(),
  content: fileEntry,
  photos: z.array(fileEntry),
});

export type ManifestFile = z.infer<typeof fileEntry>;
export type Manifest = z.infer<typeof manifestSchema>;
```

`shared/src/index.ts`:

```ts
export * from './enums';
export * from './evidence';
export * from './manifest';
export * from './schema';
```

- [ ] **Step 5: Запустить тесты и проверку типов**

Run: `npx vitest run shared && npm run typecheck`
Expected: PASS (все тесты `evidence.test.ts` и `schema.test.ts`), `tsc` без ошибок.

- [ ] **Step 6: Commit**

```bash
git add shared
git commit -m "feat(shared): add zod content schemas and manifest schema" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Загрузчик YAML

**Files:**
- Create: `tools/package.json`, `tools/tsconfig.json`, `tools/src/paths.ts`, `tools/src/errors.ts`, `tools/src/load.ts`, `tools/test/helpers.ts`
- Modify: `package.json` (workspaces, typecheck)
- Test: `tools/test/load.test.ts`

**Interfaces:**
- Consumes: `inputSchemas`, `DICTIONARY_FILES`, типы `Dictionaries`, `DictionaryKey`, `HerbInput`, `PhotoMetaFile`, `Recipe`, `Source` из `@travy/shared`; `shared/test/sample.ts`.
- Produces:
  - `tools/src/paths.ts`: `REPO_ROOT`, `CONTENT_DIR`, `DIST_DIR` (абсолютные пути)
  - `tools/src/errors.ts`: `interface ContentError { file: string; path?: string; message: string }`, `formatError(e: ContentError): string`, `class ContentValidationError extends Error { readonly errors: ContentError[] }`
  - `tools/src/load.ts`: `interface LoadedContent { herbs: HerbInput[]; recipes: Recipe[]; dictionaries: Dictionaries; sources: Source[]; photoMeta: Record<string, PhotoMetaFile> }`, `interface LoadResult { content: LoadedContent; errors: ContentError[] }`, `loadContent(contentDir: string): Promise<LoadResult>`, `photoExistsIn(contentDir: string): (herbId: string, file: string) => boolean`
  - `tools/test/helpers.ts`: `sampleTree()`, `emptyTree()`, `type ContentTree`, `writeContentTree(tree): Promise<string>`, `parseTree(tree): LoadedContent`, `makeTempDir(): Promise<string>`, `cleanupTempDirs(): Promise<void>`

- [ ] **Step 1: Создать пакет tools**

В корневом `package.json` заменить `workspaces` и `typecheck`:

```json
  "workspaces": ["shared", "tools"],
```

```json
    "typecheck": "tsc -p shared && tsc -p tools"
```

`tools/package.json`:

```json
{
  "name": "@travy/tools",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@travy/shared": "*"
  }
}
```

`tools/tsconfig.json`:

```json
{
  "extends": "../tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test"]
}
```

```bash
npm install zod@^4 yaml@^2 sharp --workspace @travy/tools
```

Expected: `node_modules/@travy/tools` и `node_modules/@travy/shared` — ссылки на папки воркспейсов.

`tools/src/paths.ts`:

```ts
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// tools/src/paths.ts → tools/src → tools → корень репозитория
export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const CONTENT_DIR = path.join(REPO_ROOT, 'content');
export const DIST_DIR = path.join(REPO_ROOT, 'dist');
```

`tools/src/errors.ts`:

```ts
export interface ContentError {
  /** Путь файла относительно content/, через "/" */
  file: string;
  /** Путь к полю внутри файла, через точку: indications.0.sources */
  path?: string;
  message: string;
}

export function formatError(e: ContentError): string {
  return `${e.file}${e.path ? ` → ${e.path}` : ''}: ${e.message}`;
}

export class ContentValidationError extends Error {
  constructor(readonly errors: ContentError[]) {
    super(`Найдено ошибок: ${errors.length}\n${errors.map(formatError).join('\n')}`);
    this.name = 'ContentValidationError';
  }
}
```

- [ ] **Step 2: Написать тестовые помощники**

`tools/test/helpers.ts`:

```ts
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { stringify } from 'yaml';
import { DICTIONARY_FILES, inputSchemas, type DictionaryKey } from '@travy/shared';
import type { LoadedContent } from '../src/load';
import {
  sampleDictionaries,
  sampleHerb,
  samplePhotoMeta,
  sampleRecipe,
  sampleSources,
} from '../../shared/test/sample';

const tempDirs: string[] = [];

export async function makeTempDir(): Promise<string> {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'travy-'));
  tempDirs.push(dir);
  return dir;
}

export async function cleanupTempDirs(): Promise<void> {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
}

type PhotoDir = { meta: Record<string, unknown>; files: Record<string, string> };

export function sampleTree() {
  return {
    herbs: [
      sampleHerb('plantago-major', 'Подорожник большой'),
      sampleHerb('althaea-officinalis', 'Алтей лекарственный', 'malvaceae'),
    ],
    recipes: [sampleRecipe()],
    dictionaries: sampleDictionaries(),
    sources: sampleSources(),
    photos: {
      'plantago-major': { meta: samplePhotoMeta(), files: { 'plant.webp': 'fake-webp:plantago-major' } },
      'althaea-officinalis': { meta: samplePhotoMeta(), files: { 'plant.webp': 'fake-webp:althaea-officinalis' } },
    } as Record<string, PhotoDir>,
  };
}

export type ContentTree = ReturnType<typeof sampleTree>;

export function emptyTree(): ContentTree {
  return {
    herbs: [],
    recipes: [],
    dictionaries: {
      indications: [],
      organSystems: [],
      substances: [],
      substanceClasses: [],
      actions: [],
      plantParts: [],
      habitats: [],
      families: [],
    },
    sources: [],
    photos: {},
  };
}

/** Записывает дерево content/ во временную папку и возвращает её путь. */
export async function writeContentTree(tree: ContentTree): Promise<string> {
  const dir = await makeTempDir();
  for (const sub of ['herbs', 'recipes', 'dictionaries', 'photos']) {
    await mkdir(path.join(dir, sub), { recursive: true });
  }
  for (const herb of tree.herbs) {
    await writeFile(path.join(dir, 'herbs', `${herb.id}.yaml`), stringify(herb));
  }
  for (const recipe of tree.recipes) {
    await writeFile(path.join(dir, 'recipes', `${recipe.id}.yaml`), stringify(recipe));
  }
  await writeFile(path.join(dir, 'sources.yaml'), stringify(tree.sources));
  for (const [key, file] of Object.entries(DICTIONARY_FILES)) {
    await writeFile(path.join(dir, 'dictionaries', file), stringify(tree.dictionaries[key as DictionaryKey]));
  }
  for (const [herbId, { meta, files }] of Object.entries(tree.photos)) {
    const herbDir = path.join(dir, 'photos', herbId);
    await mkdir(herbDir, { recursive: true });
    await writeFile(path.join(herbDir, 'photos.yaml'), stringify(meta));
    for (const [name, data] of Object.entries(files)) {
      await writeFile(path.join(herbDir, name), data);
    }
  }
  return dir;
}

/** То же дерево, но сразу в виде LoadedContent — для тестов валидатора без файловой системы. */
export function parseTree(tree: ContentTree): LoadedContent {
  return {
    herbs: tree.herbs.map((h) => inputSchemas.herbInput.parse(h)),
    recipes: tree.recipes.map((r) => inputSchemas.recipe.parse(r)),
    dictionaries: inputSchemas.dictionaries.parse(tree.dictionaries),
    sources: tree.sources.map((s) => inputSchemas.source.parse(s)),
    photoMeta: Object.fromEntries(
      Object.entries(tree.photos).map(([id, p]) => [id, inputSchemas.photoMetaFile.parse(p.meta)]),
    ),
  };
}
```

- [ ] **Step 3: Написать падающий тест**

`tools/test/load.test.ts`:

```ts
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { stringify } from 'yaml';
import { loadContent } from '../src/load';
import { sampleHerb } from '../../shared/test/sample';
import { cleanupTempDirs, sampleTree, writeContentTree } from './helpers';

afterEach(cleanupTempDirs);

describe('loadContent', () => {
  it('загружает корректное дерево без ошибок', async () => {
    const dir = await writeContentTree(sampleTree());
    const { content, errors } = await loadContent(dir);
    expect(errors).toEqual([]);
    expect(content.herbs.map((h) => h.id)).toEqual(['althaea-officinalis', 'plantago-major']);
    expect(content.recipes.map((r) => r.id)).toEqual(['chest-blend']);
    expect(content.sources).toHaveLength(3);
    expect(content.dictionaries.indications[1]!.synonyms).toEqual([]);
    expect(content.photoMeta['plantago-major']!['plant.webp']!.license).toBe('CC BY-SA 4.0');
  });

  it('сообщает о синтаксической ошибке YAML и продолжает загрузку остального', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'plantago-major.yaml'), 'id: plantago-major\nname: [незакрытый\n');
    const { content, errors } = await loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('herbs/plantago-major.yaml');
    expect(errors[0]!.message).toMatch(/^ошибка YAML/);
    expect(content.herbs.map((h) => h.id)).toEqual(['althaea-officinalis']);
  });

  it('сообщает об ошибке схемы с путём к полю', async () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.sources = [];
    const { errors } = await loadContent(await writeContentTree(tree));
    expect(errors).toContainEqual({
      file: 'herbs/plantago-major.yaml',
      path: 'indications.0.sources',
      message: 'нужен хотя бы один источник',
    });
  });

  it('требует совпадения id и имени файла', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'plantago.yaml'), stringify(sampleHerb('plantago-major', 'Дубль')));
    const { errors } = await loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ file: 'herbs/plantago.yaml', path: 'id' });
    expect(errors[0]!.message).toMatch(/не совпадает с именем файла/);
  });

  it('файл с кириллическим именем даёт понятную ошибку, а не пропадает', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'ромашка.yaml'), stringify(sampleHerb('matricaria-chamomilla', 'Ромашка')));
    const { errors } = await loadContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('herbs/ромашка.yaml');
    expect(errors[0]!.message).toMatch(/не совпадает с именем файла/);
  });

  it('читает файлы с BOM и переводами строк CRLF (сохранённые в Windows)', async () => {
    const tree = sampleTree();
    const dir = await writeContentTree(tree);
    const windowsText = `\uFEFF${stringify(tree.sources).replace(/\n/g, '\r\n')}`;
    await writeFile(path.join(dir, 'sources.yaml'), windowsText);
    const { content, errors } = await loadContent(dir);
    expect(errors).toEqual([]);
    expect(content.sources.map((s) => s.id)).toEqual(['book-test', 'ema-plantago', 'rct-test']);
  });

  it('пустой файл списка — это пустой список', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'sources.yaml'), '');
    const { content, errors } = await loadContent(dir);
    expect(errors).toEqual([]);
    expect(content.sources).toEqual([]);
  });

  it('сообщает об отсутствующем файле словаря', async () => {
    const dir = await writeContentTree(sampleTree());
    await rm(path.join(dir, 'dictionaries', 'habitats.yaml'));
    const { errors } = await loadContent(dir);
    expect(errors).toEqual([{ file: 'dictionaries/habitats.yaml', message: 'файл не найден' }]);
  });

  it('ошибка в элементе списка указывает номер и id элемента', async () => {
    const tree = sampleTree();
    tree.sources[1]!.title = '';
    const { content, errors } = await loadContent(await writeContentTree(tree));
    expect(errors).toEqual([{ file: 'sources.yaml', path: '1 (ema-plantago).title', message: 'не должно быть пустым' }]);
    expect(content.sources.map((s) => s.id)).toEqual(['book-test', 'rct-test']);
  });

  it('список вместо словаря — понятная ошибка', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'sources.yaml'), 'id: book-test\n');
    const { errors } = await loadContent(dir);
    expect(errors[0]!.message).toMatch(/ожидался список/);
  });
});
```

- [ ] **Step 4: Запустить тест и убедиться, что он падает**

Run: `npx vitest run tools/test/load.test.ts`
Expected: FAIL — `Failed to resolve import "../src/load"`.

- [ ] **Step 5: Реализовать загрузчик**

`tools/src/load.ts`:

```ts
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse, YAMLError } from 'yaml';
import type { z } from 'zod';
import {
  DICTIONARY_FILES,
  inputSchemas,
  type Dictionaries,
  type DictionaryKey,
  type HerbInput,
  type PhotoMetaFile,
  type Recipe,
  type Source,
} from '@travy/shared';
import type { ContentError } from './errors';

export interface LoadedContent {
  herbs: HerbInput[];
  recipes: Recipe[];
  dictionaries: Dictionaries;
  sources: Source[];
  /** Метаданные фото по id травы — содержимое content/photos/<id>/photos.yaml */
  photoMeta: Record<string, PhotoMetaFile>;
}

export interface LoadResult {
  content: LoadedContent;
  errors: ContentError[];
}

type ReadResult = { ok: true; value: unknown } | { ok: false };

async function readYaml(contentDir: string, rel: string, errors: ContentError[]): Promise<ReadResult> {
  try {
    // BOM от Блокнота Windows: yaml спотыкается о него перед списком ("- id: …")
    const text = (await readFile(path.join(contentDir, rel), 'utf8')).replace(/^﻿/, '');
    return { ok: true, value: parse(text) ?? null };
  } catch (e) {
    const message =
      e instanceof YAMLError ? `ошибка YAML: ${e.message}` : `не удалось прочитать файл: ${(e as Error).message}`;
    errors.push({ file: rel, message });
    return { ok: false };
  }
}

function parseWith<T>(
  schema: z.ZodType<T>,
  value: unknown,
  file: string,
  errors: ContentError[],
  pathPrefix?: string,
): T | undefined {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  for (const issue of result.error.issues) {
    const fieldPath = [pathPrefix, ...issue.path.map(String)].filter(Boolean).join('.');
    errors.push(fieldPath ? { file, path: fieldPath, message: issue.message } : { file, message: issue.message });
  }
  return undefined;
}

async function loadList<T>(
  contentDir: string,
  rel: string,
  schema: z.ZodType<T>,
  errors: ContentError[],
): Promise<T[]> {
  if (!existsSync(path.join(contentDir, rel))) {
    errors.push({ file: rel, message: 'файл не найден' });
    return [];
  }
  const raw = await readYaml(contentDir, rel, errors);
  if (!raw.ok || raw.value === null) return [];
  if (!Array.isArray(raw.value)) {
    errors.push({ file: rel, message: 'ожидался список (каждый элемент начинается с "- ")' });
    return [];
  }
  const items: T[] = [];
  raw.value.forEach((item: unknown, index: number) => {
    const id =
      typeof item === 'object' && item !== null && 'id' in item && typeof item.id === 'string' ? item.id : undefined;
    const parsed = parseWith(schema, item, rel, errors, id ? `${index} (${id})` : String(index));
    if (parsed !== undefined) items.push(parsed);
  });
  return items;
}

async function listYamlFiles(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  return (await readdir(dir)).filter((name) => name.endsWith('.yaml')).sort();
}

async function loadEntities<T extends { id: string }>(
  contentDir: string,
  dir: 'herbs' | 'recipes',
  schema: z.ZodType<T>,
  errors: ContentError[],
): Promise<T[]> {
  const result: T[] = [];
  for (const name of await listYamlFiles(path.join(contentDir, dir))) {
    const rel = `${dir}/${name}`;
    const raw = await readYaml(contentDir, rel, errors);
    if (!raw.ok) continue;
    const entity = parseWith(schema, raw.value, rel, errors);
    if (!entity) continue;
    const expectedId = name.slice(0, -'.yaml'.length);
    if (entity.id !== expectedId) {
      errors.push({
        file: rel,
        path: 'id',
        message: `id "${entity.id}" не совпадает с именем файла — назовите файл ${entity.id}.yaml (только латиница) или исправьте id`,
      });
      continue;
    }
    result.push(entity);
  }
  return result;
}

async function loadDictionaries(contentDir: string, errors: ContentError[]): Promise<Dictionaries> {
  const dictionaries = {} as Record<DictionaryKey, unknown[]>;
  for (const key of Object.keys(DICTIONARY_FILES) as DictionaryKey[]) {
    dictionaries[key] = await loadList<unknown>(
      contentDir,
      `dictionaries/${DICTIONARY_FILES[key]}`,
      inputSchemas.dictionaryItems[key],
      errors,
    );
  }
  return dictionaries as Dictionaries;
}

async function loadPhotoMeta(contentDir: string, errors: ContentError[]): Promise<Record<string, PhotoMetaFile>> {
  const photosDir = path.join(contentDir, 'photos');
  if (!existsSync(photosDir)) return {};
  const result: Record<string, PhotoMetaFile> = {};
  const herbDirs = (await readdir(photosDir, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const herbId of herbDirs) {
    const rel = `photos/${herbId}/photos.yaml`;
    if (!existsSync(path.join(contentDir, rel))) continue;
    const raw = await readYaml(contentDir, rel, errors);
    if (!raw.ok) continue;
    const meta = parseWith(inputSchemas.photoMetaFile, raw.value ?? {}, rel, errors);
    if (meta) result[herbId] = meta;
  }
  return result;
}

export async function loadContent(contentDir: string): Promise<LoadResult> {
  const errors: ContentError[] = [];
  const sources = await loadList(contentDir, 'sources.yaml', inputSchemas.source, errors);
  const dictionaries = await loadDictionaries(contentDir, errors);
  const herbs = await loadEntities(contentDir, 'herbs', inputSchemas.herbInput, errors);
  const recipes = await loadEntities(contentDir, 'recipes', inputSchemas.recipe, errors);
  const photoMeta = await loadPhotoMeta(contentDir, errors);
  return { content: { herbs, recipes, dictionaries, sources, photoMeta }, errors };
}

export function photoExistsIn(contentDir: string): (herbId: string, file: string) => boolean {
  return (herbId, file) => existsSync(path.join(contentDir, 'photos', herbId, file));
}
```

- [ ] **Step 6: Запустить тесты и проверку типов**

Run: `npx vitest run tools/test/load.test.ts && npm run typecheck`
Expected: PASS (10 тестов), `tsc` без ошибок для обоих пакетов.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tools
git commit -m "feat(tools): load and schema-check YAML content" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Проверка ссылок и правил

**Files:**
- Create: `tools/src/validate.ts`, `tools/src/check.ts`, `tools/src/cli/check.ts`
- Modify: `package.json` (скрипт `content:check`)
- Test: `tools/test/validate.test.ts`, `tools/test/check.test.ts`

**Interfaces:**
- Consumes: `LoadedContent`, `loadContent`, `photoExistsIn` (Task 3); `ContentError`, `ContentValidationError` (Task 3); `REQUIRED_SOURCE_TYPES`, `DICTIONARY_FILES` из `@travy/shared`; `parseTree`, `sampleTree`, `emptyTree`, `writeContentTree` из helpers.
- Produces:
  - `tools/src/validate.ts`: `type PhotoExists = (herbId: string, file: string) => boolean`, `validateContent(content: LoadedContent, photoExists: PhotoExists): ContentError[]`
  - `tools/src/check.ts`: `checkContent(contentDir: string): Promise<LoadResult>` — load + validate; при ошибках загрузки валидатор не запускается (без каскадных ошибок)
  - npm-скрипт `content:check`

- [ ] **Step 1: Написать падающие тесты**

`tools/test/validate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { validateContent, type PhotoExists } from '../src/validate';
import { emptyTree, parseTree, sampleTree } from './helpers';

const allPhotosExist: PhotoExists = () => true;

function validate(tree = sampleTree(), photoExists = allPhotosExist) {
  return validateContent(parseTree(tree), photoExists);
}

describe('validateContent', () => {
  it('корректное дерево — без ошибок', () => {
    expect(validate()).toEqual([]);
  });

  it('пустая база — без ошибок', () => {
    expect(validate(emptyTree())).toEqual([]);
  });

  it('неизвестное семейство', () => {
    const tree = sampleTree();
    tree.herbs[0]!.family = 'no-such-family';
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'family',
        message: 'неизвестный id "no-such-family" — его нет в dictionaries/families.yaml',
      },
    ]);
  });

  it('неизвестный источник у показания', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.sources = [{ id: 'no-such-source' }];
    expect(validate(tree)).toContainEqual({
      file: 'herbs/plantago-major.yaml',
      path: 'indications.0.sources.0.id',
      message: 'неизвестный id "no-such-source" — его нет в sources.yaml',
    });
  });

  it('proven только с книгой — ошибка; с РКИ — нет', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.evidence.level = 'proven';
    tree.herbs[0]!.indications[0]!.sources = [{ id: 'book-test' }];
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'indications.0',
        message:
          'для уровня доказанности "proven" нужен хотя бы один источник типа: systematic_review, rct, article, monograph',
      },
    ]);
    tree.herbs[0]!.indications[0]!.sources = [{ id: 'book-test' }, { id: 'rct-test' }];
    expect(validate(tree)).toEqual([]);
  });

  it('refuted только с монографией — ошибка', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications[0]!.evidence.level = 'refuted';
    expect(validate(tree).map((e) => e.path)).toEqual(['indications.0']);
  });

  it('правило доказанности проверяется и у сборов', () => {
    const tree = sampleTree();
    tree.recipes[0]!.evidence.level = 'proven';
    expect(validate(tree)).toContainEqual(
      expect.objectContaining({ file: 'recipes/chest-blend.yaml', path: 'evidence' }),
    );
  });

  it('повторяющийся id источника', () => {
    const tree = sampleTree();
    tree.sources.push({ ...tree.sources[0]! });
    expect(validate(tree)).toEqual([{ file: 'sources.yaml', path: '3', message: 'id "book-test" повторяется' }]);
  });

  it('одно показание дважды в траве', () => {
    const tree = sampleTree();
    tree.herbs[0]!.indications.push({ ...tree.herbs[0]!.indications[0]! });
    expect(validate(tree)).toContainEqual({
      file: 'herbs/plantago-major.yaml',
      path: 'indications.1.indication',
      message: 'показание "cough" указано дважды — объедините записи',
    });
  });

  it('словарь показаний ссылается на неизвестную систему органов', () => {
    const tree = sampleTree();
    tree.dictionaries.indications[0]!.organ_system = 'no-such-system';
    expect(validate(tree)).toEqual([
      {
        file: 'dictionaries/indications.yaml',
        path: '0.organ_system',
        message: 'неизвестный id "no-such-system" — его нет в dictionaries/organ-systems.yaml',
      },
    ]);
  });

  it('файла фото нет на диске', () => {
    const errors = validate(sampleTree(), (herbId) => herbId !== 'plantago-major');
    expect(errors).toEqual([
      { file: 'herbs/plantago-major.yaml', path: 'photos.0', message: 'файл photos/plantago-major/plant.webp не найден' },
    ]);
  });

  it('нет автора и лицензии для фото', () => {
    const tree = sampleTree();
    tree.photos['plantago-major']!.meta = {};
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'photos.0',
        message: 'нет записи об авторе и лицензии для plant.webp в photos/plantago-major/photos.yaml',
      },
    ]);
  });

  it('трава не может быть двойником самой себя', () => {
    const tree = sampleTree();
    tree.herbs[0]!.lookalikes = [{ herb: 'plantago-major', poisonous: false, differences: 'Отличия' }];
    expect(validate(tree)).toEqual([
      {
        file: 'herbs/plantago-major.yaml',
        path: 'lookalikes.0.herb',
        message: 'трава не может быть двойником самой себя',
      },
    ]);
  });

  it('двойник ссылается на неизвестную траву, а его фото проверяется', () => {
    const tree = sampleTree();
    tree.herbs[0]!.lookalikes = [
      { herb: 'no-such-herb', poisonous: true, differences: 'Отличия', photo: { file: 'twin.webp', kind: 'plant' } },
    ];
    expect(validate(tree).map((e) => e.path)).toEqual(['lookalikes.0.herb', 'lookalikes.0.photo']);
  });

  it('сбор ссылается на неизвестную траву', () => {
    const tree = sampleTree();
    tree.recipes[0]!.components[0]!.herb = 'no-such-herb';
    expect(validate(tree)).toEqual([
      {
        file: 'recipes/chest-blend.yaml',
        path: 'components.0.herb',
        message: 'неизвестный id "no-such-herb" — его нет в herbs/',
      },
    ]);
  });

  it('способ применения ссылается на неизвестное показание', () => {
    const tree = sampleTree();
    Object.assign(tree.herbs[0]!.usage[0]!, { for_indications: ['no-such-indication'] });
    expect(validate(tree).map((e) => e.path)).toEqual(['usage.0.for_indications.0']);
  });
});
```

`tools/test/check.test.ts`:

```ts
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { checkContent } from '../src/check';
import { cleanupTempDirs, emptyTree, sampleTree, writeContentTree } from './helpers';

afterEach(cleanupTempDirs);

describe('checkContent', () => {
  it('корректное дерево — без ошибок', async () => {
    const { errors } = await checkContent(await writeContentTree(sampleTree()));
    expect(errors).toEqual([]);
  });

  it('пустая база — без ошибок', async () => {
    const { content, errors } = await checkContent(await writeContentTree(emptyTree()));
    expect(errors).toEqual([]);
    expect(content.herbs).toEqual([]);
  });

  it('при ошибке загрузки не показывает каскадных ошибок ссылок', async () => {
    const dir = await writeContentTree(sampleTree());
    await writeFile(path.join(dir, 'herbs', 'althaea-officinalis.yaml'), 'id: [сломано\n');
    const { errors } = await checkContent(dir);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.file).toBe('herbs/althaea-officinalis.yaml');
  });

  it('находит отсутствующий на диске файл фото', async () => {
    const dir = await writeContentTree(sampleTree());
    await rm(path.join(dir, 'photos', 'plantago-major', 'plant.webp'));
    const { errors } = await checkContent(dir);
    expect(errors.map((e) => e.message)).toEqual(['файл photos/plantago-major/plant.webp не найден']);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run tools/test/validate.test.ts tools/test/check.test.ts`
Expected: FAIL — `Failed to resolve import "../src/validate"`.

- [ ] **Step 3: Реализовать валидатор**

`tools/src/validate.ts`:

```ts
import {
  DICTIONARY_FILES,
  REQUIRED_SOURCE_TYPES,
  type DictionaryKey,
  type EvidenceLevel,
  type Source,
  type SourceRef,
} from '@travy/shared';
import type { ContentError } from './errors';
import type { LoadedContent } from './load';

export type PhotoExists = (herbId: string, file: string) => boolean;

const dictFile = (key: DictionaryKey) => `dictionaries/${DICTIONARY_FILES[key]}`;
const idSet = (items: { id: string }[]) => new Set(items.map((item) => item.id));

export function validateContent(content: LoadedContent, photoExists: PhotoExists): ContentError[] {
  const errors: ContentError[] = [];
  const { herbs, recipes, dictionaries: d, sources, photoMeta } = content;

  const herbIds = idSet(herbs);
  const sourceById = new Map<string, Source>(sources.map((s) => [s.id, s]));
  const dictIds = Object.fromEntries(
    (Object.keys(DICTIONARY_FILES) as DictionaryKey[]).map((key) => [key, idSet(d[key])]),
  ) as Record<DictionaryKey, Set<string>>;

  function ref(file: string, path: string, value: string, known: { has(id: string): boolean }, where: string) {
    if (!known.has(value)) errors.push({ file, path, message: `неизвестный id "${value}" — его нет в ${where}` });
  }
  function dictRef(file: string, path: string, value: string, key: DictionaryKey) {
    ref(file, path, value, dictIds[key], dictFile(key));
  }
  function sourceRefs(file: string, path: string, refs: SourceRef[]) {
    refs.forEach((r, i) => ref(file, `${path}.${i}.id`, r.id, sourceById, 'sources.yaml'));
  }
  function evidenceSources(file: string, path: string, level: EvidenceLevel, refs: SourceRef[]) {
    const required = REQUIRED_SOURCE_TYPES[level];
    if (!required) return;
    const satisfied = refs.some((r) => {
      const source = sourceById.get(r.id);
      return source !== undefined && required.includes(source.type);
    });
    if (!satisfied) {
      errors.push({
        file,
        path,
        message: `для уровня доказанности "${level}" нужен хотя бы один источник типа: ${required.join(', ')}`,
      });
    }
  }
  function checkPhoto(file: string, path: string, herbId: string, photoFile: string) {
    if (!photoExists(herbId, photoFile)) {
      errors.push({ file, path, message: `файл photos/${herbId}/${photoFile} не найден` });
    }
    if (!photoMeta[herbId]?.[photoFile]) {
      errors.push({
        file,
        path,
        message: `нет записи об авторе и лицензии для ${photoFile} в photos/${herbId}/photos.yaml`,
      });
    }
  }
  function checkUniqueIds(items: { id: string }[], file: string) {
    const seen = new Set<string>();
    items.forEach((item, i) => {
      if (seen.has(item.id)) errors.push({ file, path: String(i), message: `id "${item.id}" повторяется` });
      seen.add(item.id);
    });
  }

  // 1. Уникальность id в списках (у трав и сборов уникальность гарантирует имя файла)
  checkUniqueIds(sources, 'sources.yaml');
  for (const key of Object.keys(DICTIONARY_FILES) as DictionaryKey[]) checkUniqueIds(d[key], dictFile(key));

  // 2. Ссылки внутри словарей
  d.indications.forEach((x, i) => dictRef(dictFile('indications'), `${i}.organ_system`, x.organ_system, 'organSystems'));
  d.substances.forEach((x, i) => dictRef(dictFile('substances'), `${i}.class`, x.class, 'substanceClasses'));

  // 3. Травы
  for (const h of herbs) {
    const f = `herbs/${h.id}.yaml`;
    dictRef(f, 'family', h.family, 'families');
    h.habitats.forEach((x, i) => dictRef(f, `habitats.${i}`, x, 'habitats'));
    h.substances.forEach((x, i) => dictRef(f, `substances.${i}`, x, 'substances'));
    h.actions.forEach((x, i) => dictRef(f, `actions.${i}`, x, 'actions'));
    h.harvest.forEach((x, i) => {
      dictRef(f, `harvest.${i}.part`, x.part, 'plantParts');
      sourceRefs(f, `harvest.${i}.sources`, x.sources);
    });
    const seenIndications = new Set<string>();
    h.indications.forEach((x, i) => {
      dictRef(f, `indications.${i}.indication`, x.indication, 'indications');
      if (seenIndications.has(x.indication)) {
        errors.push({
          file: f,
          path: `indications.${i}.indication`,
          message: `показание "${x.indication}" указано дважды — объедините записи`,
        });
      }
      seenIndications.add(x.indication);
      sourceRefs(f, `indications.${i}.sources`, x.sources);
      evidenceSources(f, `indications.${i}`, x.evidence.level, x.sources);
    });
    h.usage.forEach((x, i) => {
      x.for_indications.forEach((ind, j) => dictRef(f, `usage.${i}.for_indications.${j}`, ind, 'indications'));
      sourceRefs(f, `usage.${i}.sources`, x.sources);
    });
    sourceRefs(f, 'safety.sources', h.safety.sources);
    sourceRefs(f, 'sources', h.sources);
    h.photos.forEach((p, i) => checkPhoto(f, `photos.${i}`, h.id, p.file));
    h.lookalikes.forEach((l, i) => {
      if (l.herb !== undefined) {
        if (l.herb === h.id) {
          errors.push({ file: f, path: `lookalikes.${i}.herb`, message: 'трава не может быть двойником самой себя' });
        } else {
          ref(f, `lookalikes.${i}.herb`, l.herb, herbIds, 'herbs/');
        }
      }
      if (l.photo) checkPhoto(f, `lookalikes.${i}.photo`, h.id, l.photo.file);
    });
  }

  // 4. Сборы
  for (const r of recipes) {
    const f = `recipes/${r.id}.yaml`;
    r.purpose.forEach((x, i) => dictRef(f, `purpose.${i}`, x, 'indications'));
    r.components.forEach((c, i) => {
      ref(f, `components.${i}.herb`, c.herb, herbIds, 'herbs/');
      if (c.part !== undefined) dictRef(f, `components.${i}.part`, c.part, 'plantParts');
    });
    sourceRefs(f, 'sources', r.sources);
    evidenceSources(f, 'evidence', r.evidence.level, r.sources);
  }

  return errors;
}
```

`tools/src/check.ts`:

```ts
import { loadContent, photoExistsIn, type LoadResult } from './load';
import { validateContent } from './validate';

/** Загрузка + проверка. Если файлы не загрузились, ссылки не проверяются — иначе будут каскадные ошибки. */
export async function checkContent(contentDir: string): Promise<LoadResult> {
  const { content, errors } = await loadContent(contentDir);
  if (errors.length > 0) return { content, errors };
  return { content, errors: validateContent(content, photoExistsIn(contentDir)) };
}
```

`tools/src/cli/check.ts`:

```ts
import { checkContent } from '../check';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR } from '../paths';

const { content, errors } = await checkContent(CONTENT_DIR);
if (errors.length > 0) {
  console.error(new ContentValidationError(errors).message);
  process.exit(1);
}
console.log(
  `Ошибок нет. Трав: ${content.herbs.length}, сборов: ${content.recipes.length}, источников: ${content.sources.length}`,
);
```

В корневом `package.json` в `scripts` добавить:

```json
    "content:check": "tsx tools/src/cli/check.ts"
```

- [ ] **Step 4: Запустить тесты и проверку типов**

Run: `npx vitest run tools && npm run typecheck`
Expected: PASS (тесты load, validate, check), `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add package.json tools
git commit -m "feat(tools): validate references, evidence sources and photos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Сборка базы в dist/

**Files:**
- Create: `tools/src/hash.ts`, `tools/src/build.ts`, `tools/src/cli/build.ts`
- Create: `content/sources.yaml`, `content/dictionaries/{indications,organ-systems,substances,substance-classes,actions,plant-parts,habitats,families}.yaml`, `content/herbs/.gitkeep`, `content/recipes/.gitkeep`, `content/photos/.gitkeep`
- Modify: `package.json` (скрипт `content:build`)
- Test: `tools/test/build.test.ts`

**Interfaces:**
- Consumes: `checkContent` (Task 4); `ContentValidationError` (Task 3); `bundleSchemas`, `manifestSchema`, `SCHEMA_VERSION`, типы `ContentBundle`, `Dictionaries`, `Herb`, `Manifest`, `ManifestFile`, `Photo`, `PhotoRef` из `@travy/shared`.
- Produces:
  - `tools/src/hash.ts`: `sha256(data: Buffer | string): string` (hex)
  - `tools/src/build.ts`: `formatContentVersion(date: Date): number`, `interface BuildOptions { contentDir: string; distDir: string; now?: Date }`, `interface BuildResult { manifest: Manifest; herbCount: number; recipeCount: number; photoCount: number }`, `buildContent(options: BuildOptions): Promise<BuildResult>`
  - результат в `dist/`: `content.json` (без отступов), `manifest.json` (с отступами), `photos/<sha256>.webp`
  - npm-скрипт `content:build`

- [ ] **Step 1: Написать падающий тест**

`tools/test/build.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bundleSchemas, manifestSchema } from '@travy/shared';
import { buildContent, formatContentVersion } from '../src/build';
import { ContentValidationError } from '../src/errors';
import { sha256 } from '../src/hash';
import { cleanupTempDirs, emptyTree, makeTempDir, sampleTree, writeContentTree, type ContentTree } from './helpers';

afterEach(cleanupTempDirs);

const NOW = new Date('2026-10-15T18:30:00Z');

async function build(tree: ContentTree) {
  const contentDir = await writeContentTree(tree);
  const distDir = path.join(await makeTempDir(), 'dist');
  const result = await buildContent({ contentDir, distDir, now: NOW });
  const contentJson = await readFile(path.join(distDir, 'content.json'), 'utf8');
  const manifestJson = await readFile(path.join(distDir, 'manifest.json'), 'utf8');
  return { distDir, result, contentJson, bundle: JSON.parse(contentJson), manifest: JSON.parse(manifestJson) };
}

describe('formatContentVersion', () => {
  it('YYYYMMDDHHmm по UTC', () => {
    expect(formatContentVersion(NOW)).toBe(202610151830);
    expect(formatContentVersion(new Date('2026-01-02T03:04:59Z'))).toBe(202601020304);
  });
});

describe('buildContent', () => {
  it('собирает корректную базу и манифест', async () => {
    const { distDir, result, contentJson, bundle, manifest } = await build(sampleTree());

    expect(bundleSchemas.contentBundle.safeParse(bundle).success).toBe(true);
    expect(manifestSchema.safeParse(manifest).success).toBe(true);
    expect(bundle.contentVersion).toBe(202610151830);
    expect(bundle.herbs.map((h: { id: string }) => h.id)).toEqual(['althaea-officinalis', 'plantago-major']);

    const plantagoHash = sha256('fake-webp:plantago-major');
    expect(bundle.herbs[1].photos[0]).toEqual({
      path: `photos/${plantagoHash}.webp`,
      kind: 'plant',
      author: 'Test Author',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    });
    expect(await readFile(path.join(distDir, 'photos', `${plantagoHash}.webp`), 'utf8')).toBe('fake-webp:plantago-major');

    expect(manifest.publishedAt).toBe('2026-10-15T18:30:00.000Z');
    expect(manifest.content).toEqual({
      path: 'content.json',
      sha256: sha256(contentJson),
      size: Buffer.byteLength(contentJson),
    });
    expect(manifest.photos).toHaveLength(2);
    expect(result).toMatchObject({ herbCount: 2, recipeCount: 1, photoCount: 2 });
  });

  it('одинаковое фото у двух трав попадает в dist один раз', async () => {
    const tree = sampleTree();
    tree.photos['althaea-officinalis']!.files['plant.webp'] = 'fake-webp:plantago-major';
    const { distDir, bundle, manifest } = await build(tree);
    expect(await readdir(path.join(distDir, 'photos'))).toHaveLength(1);
    expect(manifest.photos).toHaveLength(1);
    expect(bundle.herbs[0].photos[0].path).toBe(bundle.herbs[1].photos[0].path);
  });

  it('пустая база собирается', async () => {
    const { result, manifest } = await build(emptyTree());
    expect(result.herbCount).toBe(0);
    expect(manifest.photos).toEqual([]);
  });

  it('при ошибках не трогает прежний dist', async () => {
    const tree = sampleTree();
    tree.herbs[0]!.family = 'no-such-family';
    const contentDir = await writeContentTree(tree);
    const distDir = path.join(await makeTempDir(), 'dist');
    await mkdir(distDir, { recursive: true });
    await writeFile(path.join(distDir, 'marker.txt'), 'previous build');

    await expect(buildContent({ contentDir, distDir, now: NOW })).rejects.toBeInstanceOf(ContentValidationError);
    expect(existsSync(path.join(distDir, 'marker.txt'))).toBe(true);
  });

  it('повторная сборка тех же данных даёт тот же content.json', async () => {
    const tree = sampleTree();
    const first = await build(tree);
    const second = await build(tree);
    expect(second.contentJson).toBe(first.contentJson);
  });

  it('удаляет устаревшие файлы прежней сборки', async () => {
    const contentDir = await writeContentTree(sampleTree());
    const distDir = path.join(await makeTempDir(), 'dist');
    await mkdir(path.join(distDir, 'photos'), { recursive: true });
    await writeFile(path.join(distDir, 'photos', 'stale.webp'), 'old');
    await buildContent({ contentDir, distDir, now: NOW });
    expect(existsSync(path.join(distDir, 'photos', 'stale.webp'))).toBe(false);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run tools/test/build.test.ts`
Expected: FAIL — `Failed to resolve import "../src/build"`.

- [ ] **Step 3: Реализовать сборщик**

`tools/src/hash.ts`:

```ts
import { createHash } from 'node:crypto';

export function sha256(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}
```

`tools/src/build.ts`:

```ts
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  bundleSchemas,
  manifestSchema,
  SCHEMA_VERSION,
  type ContentBundle,
  type Dictionaries,
  type Herb,
  type Manifest,
  type ManifestFile,
  type Photo,
  type PhotoRef,
} from '@travy/shared';
import { checkContent } from './check';
import { ContentValidationError } from './errors';
import { sha256 } from './hash';

export interface BuildOptions {
  contentDir: string;
  distDir: string;
  now?: Date;
}

export interface BuildResult {
  manifest: Manifest;
  herbCount: number;
  recipeCount: number;
  photoCount: number;
}

/** contentVersion = YYYYMMDDHHmm по UTC (спецификация §5.7). */
export function formatContentVersion(date: Date): number {
  const pad = (n: number) => String(n).padStart(2, '0');
  return Number(
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
      `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}`,
  );
}

// Простое сравнение строк, не localeCompare: порядок не должен зависеть от локали машины.
const compareStrings = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byId = <T extends { id: string }>(a: T, b: T) => compareStrings(a.id, b.id);

function sortDictionaries(d: Dictionaries): Dictionaries {
  return Object.fromEntries(Object.entries(d).map(([key, list]) => [key, [...list].sort(byId)])) as Dictionaries;
}

export async function buildContent({ contentDir, distDir, now = new Date() }: BuildOptions): Promise<BuildResult> {
  const { content, errors } = await checkContent(contentDir);
  if (errors.length > 0) throw new ContentValidationError(errors);

  await rm(distDir, { recursive: true, force: true });
  await mkdir(path.join(distDir, 'photos'), { recursive: true });

  const photoFiles = new Map<string, ManifestFile>();
  async function resolvePhoto(herbId: string, ref: PhotoRef): Promise<Photo> {
    const bytes = await readFile(path.join(contentDir, 'photos', herbId, ref.file));
    const hash = sha256(bytes);
    const photoPath = `photos/${hash}.webp`;
    if (!photoFiles.has(photoPath)) {
      await writeFile(path.join(distDir, photoPath), bytes);
      photoFiles.set(photoPath, { path: photoPath, sha256: hash, size: bytes.length });
    }
    const meta = content.photoMeta[herbId]![ref.file]!; // наличие гарантирует validateContent
    return {
      path: photoPath,
      kind: ref.kind,
      caption: ref.caption,
      author: meta.author,
      license: meta.license,
      source_url: meta.source_url,
    };
  }

  const herbs: Herb[] = [];
  for (const h of [...content.herbs].sort(byId)) {
    const photos: Photo[] = [];
    for (const p of h.photos) photos.push(await resolvePhoto(h.id, p));
    const lookalikes: Herb['lookalikes'] = [];
    for (const l of h.lookalikes) {
      lookalikes.push({ ...l, photo: l.photo ? await resolvePhoto(h.id, l.photo) : undefined });
    }
    herbs.push({ ...h, photos, lookalikes });
  }

  const contentVersion = formatContentVersion(now);
  const bundle: ContentBundle = bundleSchemas.contentBundle.parse({
    schemaVersion: SCHEMA_VERSION,
    contentVersion,
    herbs,
    recipes: [...content.recipes].sort(byId),
    dictionaries: sortDictionaries(content.dictionaries),
    sources: [...content.sources].sort(byId),
  });
  const contentJson = JSON.stringify(bundle);
  await writeFile(path.join(distDir, 'content.json'), contentJson);

  const manifest: Manifest = manifestSchema.parse({
    schemaVersion: SCHEMA_VERSION,
    contentVersion,
    publishedAt: now.toISOString(),
    content: { path: 'content.json', sha256: sha256(contentJson), size: Buffer.byteLength(contentJson) },
    photos: [...photoFiles.values()].sort((a, b) => compareStrings(a.path, b.path)),
  });
  await writeFile(path.join(distDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  return { manifest, herbCount: herbs.length, recipeCount: bundle.recipes.length, photoCount: photoFiles.size };
}
```

`tools/src/cli/build.ts`:

```ts
import { buildContent } from '../build';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR, DIST_DIR } from '../paths';

try {
  const r = await buildContent({ contentDir: CONTENT_DIR, distDir: DIST_DIR });
  console.log(
    `База собрана в dist/: версия ${r.manifest.contentVersion}, трав ${r.herbCount}, сборов ${r.recipeCount}, фото ${r.photoCount}`,
  );
} catch (e) {
  if (e instanceof ContentValidationError) {
    console.error(e.message);
    process.exit(1);
  }
  throw e;
}
```

В корневом `package.json` в `scripts` добавить:

```json
    "content:build": "tsx tools/src/cli/build.ts"
```

- [ ] **Step 4: Запустить тесты и проверку типов**

Run: `npx vitest run tools/test/build.test.ts && npm run typecheck`
Expected: PASS (7 тестов), `tsc` без ошибок.

- [ ] **Step 5: Создать каркас реальной базы**

`content/sources.yaml`:

```yaml
# Список источников. Формат — README.md, раздел «Источники».
[]
```

Каждый из восьми файлов `content/dictionaries/indications.yaml`, `organ-systems.yaml`, `substances.yaml`, `substance-classes.yaml`, `actions.yaml`, `plant-parts.yaml`, `habitats.yaml`, `families.yaml`:

```yaml
# Словарь. Формат — README.md, раздел «Словари».
[]
```

```bash
touch content/herbs/.gitkeep content/recipes/.gitkeep content/photos/.gitkeep
```

- [ ] **Step 6: Проверить на реальной (пустой) базе**

Run: `npm run content:check && npm run content:build && cat dist/manifest.json`
Expected:
- `Ошибок нет. Трав: 0, сборов: 0, источников: 0`
- `База собрана в dist/: версия <YYYYMMDDHHmm>, трав 0, сборов 0, фото 0`
- `manifest.json` с `"schemaVersion": 1` и `"photos": []`

- [ ] **Step 7: Commit**

```bash
git add package.json tools content
git commit -m "feat(tools): build dist with content.json, manifest and hashed photos" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Загрузка фото с Wikimedia Commons

**Files:**
- Create: `tools/src/wikimedia.ts`, `tools/src/image.ts`, `tools/src/photo-meta.ts`, `tools/src/fetch-photo.ts`, `tools/src/cli/fetch-photo.ts`
- Modify: `package.json` (скрипт `photo:fetch`)
- Test: `tools/test/fetch-photo.test.ts`

**Interfaces:**
- Consumes: `ID_PATTERN`, `PHOTO_FILE_PATTERN`, `LICENSE_PATTERN`, тип `PhotoMeta` из `@travy/shared`; `CONTENT_DIR`, `REPO_ROOT` (Task 3); `makeTempDir`, `cleanupTempDirs` из helpers.
- Produces:
  - `tools/src/wikimedia.ts`: `USER_AGENT`, `interface WikimediaImageInfo { downloadUrl: string; author: string; license: string; sourceUrl: string }`, `normalizeFileTitle(title: string): string`, `imageInfoUrl(fileTitle: string): string`, `stripHtml(html: string): string`, `normalizeLicense(raw: string): string | null`, `parseImageInfo(json: unknown): WikimediaImageInfo`
  - `tools/src/image.ts`: `MAX_SIDE = 1080`, `TARGET_BYTES = 153600`, `compressToWebp(input: Buffer): Promise<Buffer>`
  - `tools/src/photo-meta.ts`: `upsertPhotoMeta(metaFile: string, photoFile: string, meta: PhotoMeta): Promise<void>`
  - `tools/src/fetch-photo.ts`: `interface FetchPhotoOptions { contentDir: string; herbId: string; fileTitle: string; outName: string }`, `interface FetchPhotoResult { file: string; bytes: number; author: string; license: string }`, `fetchPhoto(options, fetchFn?: typeof fetch): Promise<FetchPhotoResult>`
  - npm-скрипт `photo:fetch`

- [ ] **Step 1: Написать падающий тест**

`tools/test/fetch-photo.test.ts`:

```ts
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { afterEach, describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { fetchPhoto } from '../src/fetch-photo';
import { compressToWebp, MAX_SIDE, TARGET_BYTES } from '../src/image';
import { imageInfoUrl, normalizeFileTitle, normalizeLicense, parseImageInfo, stripHtml } from '../src/wikimedia';
import { cleanupTempDirs, makeTempDir } from './helpers';

afterEach(cleanupTempDirs);

function apiJson(license = 'CC BY-SA 4.0') {
  return {
    query: {
      pages: [
        {
          title: 'File:Plantago major.jpg',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/orig.jpg',
              thumburl: 'https://upload.wikimedia.org/thumb.jpg',
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Plantago_major.jpg',
              extmetadata: {
                Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Test">Test &amp; Co</a>' },
                LicenseShortName: { value: license },
              },
            },
          ],
        },
      ],
    },
  };
}

function solidImage(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: { r: 20, g: 140, b: 60 } } });
}

/** Подменяет fetch: отвечает по началу URL, на неожиданный URL падает. */
function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (!prefix) throw new Error(`неожиданный запрос: ${url}`);
    return routes[prefix]!();
  }) as typeof fetch;
}

describe('wikimedia', () => {
  it.each([
    ['CC BY-SA 4.0', 'CC BY-SA 4.0'],
    ['cc-by-sa-4.0', 'CC BY-SA 4.0'],
    ['CC BY 2.0', 'CC BY 2.0'],
    ['CC BY-SA 3.0 de', 'CC BY-SA 3.0 de'],
    ['Public domain', 'PD'],
    ['CC0', 'CC0'],
    ['CC0 1.0', 'CC0'],
    ['CC BY-NC 4.0', null],
    ['GFDL', null],
  ])('normalizeLicense(%s) = %s', (raw, expected) => {
    expect(normalizeLicense(raw)).toBe(expected);
  });

  it('stripHtml убирает теги и раскрывает сущности', () => {
    expect(stripHtml('<a href="x">Test &amp; Co</a>\n <span>2020</span>')).toBe('Test & Co 2020');
  });

  it('normalizeFileTitle добавляет префикс File:', () => {
    expect(normalizeFileTitle('Plantago major.jpg')).toBe('File:Plantago major.jpg');
    expect(normalizeFileTitle('file:Plantago major.jpg')).toBe('File:Plantago major.jpg');
  });

  it('imageInfoUrl запрашивает url и extmetadata', () => {
    const url = new URL(imageInfoUrl('Plantago major.jpg'));
    expect(url.searchParams.get('titles')).toBe('File:Plantago major.jpg');
    expect(url.searchParams.get('iiprop')).toBe('url|extmetadata');
    expect(url.searchParams.get('formatversion')).toBe('2');
  });

  it('parseImageInfo достаёт ссылку, автора, лицензию и страницу файла', () => {
    expect(parseImageInfo(apiJson())).toEqual({
      downloadUrl: 'https://upload.wikimedia.org/thumb.jpg',
      author: 'Test & Co',
      license: 'CC BY-SA 4.0',
      sourceUrl: 'https://commons.wikimedia.org/wiki/File:Plantago_major.jpg',
    });
  });

  it('parseImageInfo: файл не найден', () => {
    expect(() => parseImageInfo({ query: { pages: [{ title: 'File:X.jpg', missing: true }] } })).toThrow(/не найден/);
  });

  it('parseImageInfo: неподходящая лицензия', () => {
    expect(() => parseImageInfo(apiJson('CC BY-NC 4.0'))).toThrow(/не подходит/);
  });
});

describe('compressToWebp', () => {
  it('уменьшает большое фото до 1080 px по длинной стороне', async () => {
    const out = await compressToWebp(await solidImage(3000, 2000).jpeg().toBuffer());
    const meta = await sharp(out).metadata();
    expect(meta.format).toBe('webp');
    expect(Math.max(meta.width!, meta.height!)).toBe(MAX_SIDE);
    expect(out.length).toBeLessThanOrEqual(TARGET_BYTES);
  });

  it('не увеличивает маленькое фото', async () => {
    const out = await compressToWebp(await solidImage(500, 300).png().toBuffer());
    const meta = await sharp(out).metadata();
    expect([meta.width, meta.height]).toEqual([500, 300]);
  });
});

describe('fetchPhoto', () => {
  it('скачивает, сжимает и записывает фото и метаданные; второе фото не затирает первое', async () => {
    const contentDir = await makeTempDir();
    const jpeg = new Uint8Array(await solidImage(2000, 1500).jpeg().toBuffer());
    const fetchFn = fakeFetch({
      'https://commons.wikimedia.org/w/api.php': () => Response.json(apiJson()),
      'https://upload.wikimedia.org/thumb.jpg': () => new Response(jpeg),
    });

    const first = await fetchPhoto(
      { contentDir, herbId: 'plantago-major', fileTitle: 'Plantago major.jpg', outName: 'plant.webp' },
      fetchFn,
    );
    await fetchPhoto(
      { contentDir, herbId: 'plantago-major', fileTitle: 'Plantago major.jpg', outName: 'closeup.webp' },
      fetchFn,
    );

    expect(first).toMatchObject({ author: 'Test & Co', license: 'CC BY-SA 4.0' });
    const written = await sharp(await readFile(first.file)).metadata();
    expect(written.format).toBe('webp');

    const meta = parse(await readFile(path.join(contentDir, 'photos', 'plantago-major', 'photos.yaml'), 'utf8'));
    expect(Object.keys(meta)).toEqual(['plant.webp', 'closeup.webp']);
    expect(meta['plant.webp']).toEqual({
      author: 'Test & Co',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Plantago_major.jpg',
    });
  });

  it('проверяет имя файла до обращения к сети', async () => {
    const contentDir = await makeTempDir();
    const noNetwork = fakeFetch({});
    await expect(
      fetchPhoto({ contentDir, herbId: 'plantago-major', fileTitle: 'X.jpg', outName: 'Plant.JPG' }, noNetwork),
    ).rejects.toThrow(/Имя файла/);
    await expect(
      fetchPhoto({ contentDir, herbId: 'Подорожник', fileTitle: 'X.jpg', outName: 'plant.webp' }, noNetwork),
    ).rejects.toThrow(/id травы/);
  });

  it('сообщает об ошибке API', async () => {
    const contentDir = await makeTempDir();
    const fetchFn = fakeFetch({ 'https://commons.wikimedia.org/w/api.php': () => new Response('', { status: 503 }) });
    await expect(
      fetchPhoto({ contentDir, herbId: 'plantago-major', fileTitle: 'X.jpg', outName: 'plant.webp' }, fetchFn),
    ).rejects.toThrow(/503/);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run tools/test/fetch-photo.test.ts`
Expected: FAIL — `Failed to resolve import "../src/fetch-photo"`.

- [ ] **Step 3: Реализовать инструмент**

`tools/src/wikimedia.ts`:

```ts
import { LICENSE_PATTERN } from '@travy/shared';

export const USER_AGENT = 'TravyContentTool/0.1 (personal herb reference app)';
const API = 'https://commons.wikimedia.org/w/api.php';

export interface WikimediaImageInfo {
  downloadUrl: string;
  author: string;
  license: string;
  /** Страница файла на Commons — для указания авторства */
  sourceUrl: string;
}

export function normalizeFileTitle(title: string): string {
  const t = title.trim();
  return /^file:/i.test(t) ? `File:${t.slice(5)}` : `File:${t}`;
}

export function imageInfoUrl(fileTitle: string): string {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'imageinfo',
    iiprop: 'url|extmetadata',
    iiurlwidth: '1600',
    titles: normalizeFileTitle(fileTitle),
  });
  return `${API}?${params}`;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Приводит название лицензии к виду из спецификации; null — лицензия не допускается. */
export function normalizeLicense(raw: string): string | null {
  const s = raw.trim();
  let result = s;
  if (/^(public domain|pd)$/i.test(s)) {
    result = 'PD';
  } else if (/^cc0(?: 1\.0)?$/i.test(s)) {
    result = 'CC0';
  } else {
    const m = /^cc[- ]by(-sa)?[- ](\d\.\d)(?:[- ]([a-z]{2,3}))?$/i.exec(s);
    if (m) result = `CC BY${m[1] ? '-SA' : ''} ${m[2]}${m[3] ? ` ${m[3]}` : ''}`;
  }
  return LICENSE_PATTERN.test(result) ? result : null;
}

interface ApiResponse {
  query?: {
    pages?: Array<{
      title?: string;
      missing?: boolean;
      imageinfo?: Array<{
        url?: string;
        thumburl?: string;
        descriptionurl?: string;
        extmetadata?: Record<string, { value?: string } | undefined>;
      }>;
    }>;
  };
}

export function parseImageInfo(json: unknown): WikimediaImageInfo {
  const page = (json as ApiResponse).query?.pages?.[0];
  if (!page || page.missing) {
    throw new Error('Файл не найден на Wikimedia Commons — проверьте название (пример: "File:Plantago major.jpg")');
  }
  const info = page.imageinfo?.[0];
  const downloadUrl = info?.thumburl ?? info?.url;
  if (!info || !downloadUrl || !info.descriptionurl) {
    throw new Error('Wikimedia Commons вернула неполные данные о файле');
  }
  const meta = info.extmetadata ?? {};
  const author = stripHtml(meta.Artist?.value ?? '');
  if (!author) throw new Error('У файла не указан автор — выберите другое фото');
  const rawLicense = stripHtml(meta.LicenseShortName?.value ?? '');
  const license = normalizeLicense(rawLicense);
  if (!license) {
    throw new Error(`Лицензия "${rawLicense}" не подходит: допустимы CC0, PD, CC BY, CC BY-SA`);
  }
  return { downloadUrl, author, license, sourceUrl: info.descriptionurl };
}
```

`tools/src/image.ts`:

```ts
import sharp from 'sharp';

export const MAX_SIDE = 1080;
export const TARGET_BYTES = 150 * 1024;
const QUALITIES = [75, 60, 50];

/** WebP, длинная сторона ≤ 1080 px; качество снижается, пока файл больше 150 КБ (спецификация §5.5). */
export async function compressToWebp(input: Buffer): Promise<Buffer> {
  let out = Buffer.alloc(0);
  for (const quality of QUALITIES) {
    out = await sharp(input)
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    if (out.length <= TARGET_BYTES) break;
  }
  return out;
}
```

`tools/src/photo-meta.ts`:

```ts
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { Document, parseDocument } from 'yaml';
import type { PhotoMeta } from '@travy/shared';

/** Добавляет или заменяет запись о фото в photos.yaml, сохраняя остальные записи и комментарии. */
export async function upsertPhotoMeta(metaFile: string, photoFile: string, meta: PhotoMeta): Promise<void> {
  const doc = existsSync(metaFile) ? parseDocument(await readFile(metaFile, 'utf8')) : new Document({});
  doc.set(photoFile, meta);
  await writeFile(metaFile, String(doc));
}
```

`tools/src/fetch-photo.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ID_PATTERN, PHOTO_FILE_PATTERN } from '@travy/shared';
import { compressToWebp } from './image';
import { upsertPhotoMeta } from './photo-meta';
import { imageInfoUrl, parseImageInfo, USER_AGENT } from './wikimedia';

export interface FetchPhotoOptions {
  contentDir: string;
  herbId: string;
  /** Название файла на Commons, с префиксом "File:" или без */
  fileTitle: string;
  /** Имя файла в content/photos/<herbId>/, например plant.webp */
  outName: string;
}

export interface FetchPhotoResult {
  file: string;
  bytes: number;
  author: string;
  license: string;
}

export async function fetchPhoto(opts: FetchPhotoOptions, fetchFn: typeof fetch = fetch): Promise<FetchPhotoResult> {
  if (!ID_PATTERN.test(opts.herbId)) throw new Error(`Некорректный id травы: "${opts.herbId}"`);
  if (!PHOTO_FILE_PATTERN.test(opts.outName)) {
    throw new Error(`Имя файла должно быть вида plant.webp (латиница, цифры, дефисы): "${opts.outName}"`);
  }
  const headers = { 'User-Agent': USER_AGENT };

  const infoResponse = await fetchFn(imageInfoUrl(opts.fileTitle), { headers });
  if (!infoResponse.ok) throw new Error(`Wikimedia API ответил ошибкой ${infoResponse.status}`);
  const info = parseImageInfo(await infoResponse.json());

  const imageResponse = await fetchFn(info.downloadUrl, { headers });
  if (!imageResponse.ok) throw new Error(`Не удалось скачать изображение: ошибка ${imageResponse.status}`);
  const webp = await compressToWebp(Buffer.from(await imageResponse.arrayBuffer()));

  const herbDir = path.join(opts.contentDir, 'photos', opts.herbId);
  await mkdir(herbDir, { recursive: true });
  const file = path.join(herbDir, opts.outName);
  await writeFile(file, webp);
  await upsertPhotoMeta(path.join(herbDir, 'photos.yaml'), opts.outName, {
    author: info.author,
    license: info.license,
    source_url: info.sourceUrl,
  });
  return { file, bytes: webp.length, author: info.author, license: info.license };
}
```

`tools/src/cli/fetch-photo.ts`:

```ts
import path from 'node:path';
import { fetchPhoto } from '../fetch-photo';
import { CONTENT_DIR, REPO_ROOT } from '../paths';

const [herbId, fileTitle, outName] = process.argv.slice(2);
if (!herbId || !fileTitle || !outName) {
  console.error(
    'Использование: npm run photo:fetch -- <id-травы> "<File:Название.jpg>" <имя.webp>\n' +
      'Пример: npm run photo:fetch -- plantago-major "File:Plantago major.jpg" plant.webp',
  );
  process.exit(1);
}

try {
  const r = await fetchPhoto({ contentDir: CONTENT_DIR, herbId, fileTitle, outName });
  console.log(
    `Сохранено: ${path.relative(REPO_ROOT, r.file)} (${Math.round(r.bytes / 1024)} КБ), автор: ${r.author}, лицензия: ${r.license}`,
  );
  console.log(`Добавьте в content/herbs/${herbId}.yaml:\nphotos:\n  - file: ${outName}\n    kind: plant`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
```

В корневом `package.json` в `scripts` добавить:

```json
    "photo:fetch": "tsx tools/src/cli/fetch-photo.ts"
```

- [ ] **Step 4: Запустить тесты и проверку типов**

Run: `npx vitest run tools/test/fetch-photo.test.ts && npm run typecheck`
Expected: PASS (20 тестов), `tsc` без ошибок.

- [ ] **Step 5: Проверить на настоящей Wikimedia (вручную, сеть)**

Run: `npm run photo:fetch -- plantago-major "File:Plantago major.jpg" plant.webp`
Expected: `Сохранено: content/photos/plantago-major/plant.webp (… КБ), автор: …, лицензия: …` и файл `content/photos/plantago-major/photos.yaml`. Если файла с таким названием нет — сообщение «Файл не найден на Wikimedia Commons»; тогда возьмите любое существующее название файла со страницы https://commons.wikimedia.org/wiki/Category:Plantago_major. После проверки удалите тестовое фото — трав в базе пока нет, настоящие фото добавит план 2:

```bash
rm -r content/photos/plantago-major
```

- [ ] **Step 6: Commit**

```bash
git add package.json tools
git commit -m "feat(tools): fetch, compress and attribute photos from Wikimedia Commons" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Проверка DOI и PMID

**Files:**
- Create: `tools/src/verify-sources.ts`, `tools/src/cli/verify-sources.ts`
- Modify: `package.json` (скрипт `sources:verify`)
- Test: `tools/test/verify-sources.test.ts`

**Interfaces:**
- Consumes: тип `Source` из `@travy/shared`; `USER_AGENT` (Task 6); `loadContent` (Task 3); `CONTENT_DIR` (Task 3).
- Produces:
  - `tools/src/verify-sources.ts`: `type VerifyStatus = 'ok' | 'mismatch' | 'not_found' | 'error'`, `interface VerifyResult { sourceId: string; kind: 'doi' | 'pmid'; value: string; status: VerifyStatus; found?: string; detail?: string }`, `normalizeDoi(raw: string): string`, `normalizePmid(raw: string): string | null`, `titlesMatch(a: string, b: string): boolean`, `parseCrossrefTitle(json: unknown): string | null`, `parsePubmedTitle(json: unknown, pmid: string): string | null`, `verifySource(source: Source, fetchFn?: typeof fetch): Promise<VerifyResult[]>`, `verifySources(sources: Source[], fetchFn?: typeof fetch, delayMs?: number): Promise<VerifyResult[]>`
  - npm-скрипт `sources:verify` (всегда завершается с кодом 0 — это предупреждение, спецификация §8.3)

- [ ] **Step 1: Написать падающий тест**

`tools/test/verify-sources.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Source } from '@travy/shared';
import {
  normalizeDoi,
  normalizePmid,
  parseCrossrefTitle,
  parsePubmedTitle,
  titlesMatch,
  verifySource,
  verifySources,
} from '../src/verify-sources';

const TITLE = 'Chamomile extract for generalized anxiety disorder';

function source(extra: Partial<Source>): Source {
  return { id: 'test-2009', type: 'rct', title: TITLE, authors: ['Amsterdam J. D.'], year: 2009, ...extra };
}

function fakeFetch(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    const prefix = Object.keys(routes).find((p) => url.startsWith(p));
    if (!prefix) throw new Error(`неожиданный запрос: ${url}`);
    return routes[prefix]!();
  }) as typeof fetch;
}

const crossref = (title: string) => () => Response.json({ message: { title: [title] } });
const pubmed = (pmid: string, title: string) => () => Response.json({ result: { uids: [pmid], [pmid]: { title } } });

describe('нормализация идентификаторов', () => {
  it.each([
    ['10.1097/JCP.0b013e3181ac9348', '10.1097/jcp.0b013e3181ac9348'],
    ['https://doi.org/10.1097/JCP.0b013e3181ac9348', '10.1097/jcp.0b013e3181ac9348'],
    ['http://dx.doi.org/10.1/ABC', '10.1/abc'],
    ['doi: 10.1/ABC', '10.1/abc'],
  ])('normalizeDoi(%s)', (raw, expected) => {
    expect(normalizeDoi(raw)).toBe(expected);
  });

  it.each([
    ['19593179', '19593179'],
    ['PMID: 19593179', '19593179'],
    ['pmid19593179', '19593179'],
    ['abc', null],
  ])('normalizePmid(%s)', (raw, expected) => {
    expect(normalizePmid(raw)).toBe(expected);
  });
});

describe('titlesMatch', () => {
  it('регистр, пунктуация и точка в конце не важны', () => {
    expect(titlesMatch(TITLE, 'Chamomile Extract for Generalized Anxiety Disorder.')).toBe(true);
  });
  it('HTML-теги Crossref не мешают', () => {
    expect(titlesMatch('Effect of Matricaria chamomilla', 'Effect of <i>Matricaria chamomilla</i>')).toBe(true);
  });
  it('подзаголовок не мешает', () => {
    expect(titlesMatch(TITLE, `${TITLE}: a randomized, double-blind trial`)).toBe(true);
  });
  it('разные статьи не совпадают', () => {
    expect(titlesMatch(TITLE, 'Valerian for insomnia in older adults')).toBe(false);
  });
});

describe('разбор ответов', () => {
  it('Crossref', () => {
    expect(parseCrossrefTitle({ message: { title: [TITLE] } })).toBe(TITLE);
    expect(parseCrossrefTitle({ message: {} })).toBeNull();
  });
  it('PubMed', () => {
    expect(parsePubmedTitle({ result: { '1': { title: TITLE } } }, '1')).toBe(TITLE);
    expect(parsePubmedTitle({ result: { '1': { error: 'cannot get document summary' } } }, '1')).toBeNull();
  });
});

describe('verifySource', () => {
  it('DOI совпадает (DOI записан ссылкой)', async () => {
    const fetchFn = fakeFetch({ 'https://api.crossref.org/works/10.1097/jcp': crossref(`${TITLE}.`) });
    const results = await verifySource(source({ doi: 'https://doi.org/10.1097/JCP.0b013e3181ac9348' }), fetchFn);
    expect(results).toEqual([
      { sourceId: 'test-2009', kind: 'doi', value: '10.1097/jcp.0b013e3181ac9348', status: 'ok', found: `${TITLE}.` },
    ]);
  });

  it('DOI не найден', async () => {
    const fetchFn = fakeFetch({ 'https://api.crossref.org/works/': () => new Response('', { status: 404 }) });
    const [result] = await verifySource(source({ doi: '10.1/none' }), fetchFn);
    expect(result!.status).toBe('not_found');
  });

  it('PMID ведёт на другую статью (PMID записан с префиксом)', async () => {
    const fetchFn = fakeFetch({
      'https://eutils.ncbi.nlm.nih.gov/': pubmed('19593179', 'Valerian for insomnia in older adults.'),
    });
    const [result] = await verifySource(source({ pmid: 'PMID: 19593179' }), fetchFn);
    expect(result).toMatchObject({ kind: 'pmid', value: '19593179', status: 'mismatch' });
  });

  it('некорректный PMID — ошибка без запроса в сеть', async () => {
    const [result] = await verifySource(source({ pmid: 'abc' }), fakeFetch({}));
    expect(result).toMatchObject({ status: 'error', detail: 'PMID должен состоять из цифр' });
  });

  it('сетевая ошибка не роняет проверку', async () => {
    const fetchFn = (async () => {
      throw new Error('ECONNRESET');
    }) as typeof fetch;
    const [result] = await verifySource(source({ doi: '10.1/x' }), fetchFn);
    expect(result).toMatchObject({ status: 'error', detail: 'ECONNRESET' });
  });

  it('источник только с ISBN не проверяется', async () => {
    expect(await verifySource(source({ isbn: '978-5-00-000000-0' }), fakeFetch({}))).toEqual([]);
  });
});

describe('verifySources', () => {
  it('проверяет все источники по очереди', async () => {
    const fetchFn = fakeFetch({
      'https://api.crossref.org/works/': crossref(TITLE),
      'https://eutils.ncbi.nlm.nih.gov/': pubmed('1', TITLE),
    });
    const results = await verifySources(
      [source({ id: 'a', doi: '10.1/a' }), source({ id: 'b', pmid: '1' }), source({ id: 'c', isbn: 'x' })],
      fetchFn,
      0,
    );
    expect(results.map((r) => [r.sourceId, r.status])).toEqual([
      ['a', 'ok'],
      ['b', 'ok'],
    ]);
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run tools/test/verify-sources.test.ts`
Expected: FAIL — `Failed to resolve import "../src/verify-sources"`.

- [ ] **Step 3: Реализовать проверку**

`tools/src/verify-sources.ts`:

```ts
import type { Source } from '@travy/shared';
import { USER_AGENT } from './wikimedia';

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
): Promise<VerifyResult> {
  const base = { sourceId: source.id, kind, value };
  try {
    const response = await fetchFn(url, { headers: { 'User-Agent': USER_AGENT } });
    if (response.status === 404) return { ...base, status: 'not_found' };
    if (!response.ok) return { ...base, status: 'error', detail: `HTTP ${response.status}` };
    const found = parseTitle(await response.json());
    if (found === null) return { ...base, status: 'not_found' };
    return { ...base, status: titlesMatch(source.title, found) ? 'ok' : 'mismatch', found };
  } catch (e) {
    return { ...base, status: 'error', detail: (e as Error).message };
  }
}

export async function verifySource(source: Source, fetchFn: typeof fetch = fetch): Promise<VerifyResult[]> {
  const results: VerifyResult[] = [];
  if (source.doi) {
    const doi = normalizeDoi(source.doi);
    const encoded = doi.split('/').map(encodeURIComponent).join('/');
    results.push(
      await check(source, 'doi', doi, `https://api.crossref.org/works/${encoded}`, parseCrossrefTitle, fetchFn),
    );
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
      results.push(await check(source, 'pmid', pmid, url, (json) => parsePubmedTitle(json, pmid), fetchFn));
    }
  }
  return results;
}

/** Проверяет источники по очереди; пауза между запросами — чтобы не превысить лимиты PubMed (3 запроса/с). */
export async function verifySources(
  sources: Source[],
  fetchFn: typeof fetch = fetch,
  delayMs = 400,
): Promise<VerifyResult[]> {
  const all: VerifyResult[] = [];
  for (const source of sources) {
    const results = await verifySource(source, fetchFn);
    all.push(...results);
    if (results.length > 0 && delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return all;
}
```

`tools/src/cli/verify-sources.ts`:

```ts
import { loadContent } from '../load';
import { CONTENT_DIR } from '../paths';
import { verifySources, type VerifyStatus } from '../verify-sources';

const LABEL: Record<VerifyStatus, string> = {
  ok: '✓ совпадает',
  mismatch: '✗ другое название',
  not_found: '✗ не найден',
  error: '? не удалось проверить',
};

const { content, errors } = await loadContent(CONTENT_DIR);
if (errors.length > 0) {
  console.error('В данных есть ошибки — сначала выполните npm run content:check');
  process.exit(1);
}

const results = await verifySources(content.sources);
for (const r of results) {
  const extra = r.status === 'mismatch' ? ` — найдено: "${r.found}"` : r.detail ? ` — ${r.detail}` : '';
  console.log(`${LABEL[r.status]}  ${r.sourceId}  ${r.kind.toUpperCase()} ${r.value}${extra}`);
}
const problems = results.filter((r) => r.status !== 'ok').length;
console.log(`\nПроверено идентификаторов: ${results.length}, с проблемами: ${problems}`);
if (problems > 0) {
  console.log('Это предупреждение, публикацию оно не блокирует. Исправьте title/doi/pmid или проверьте источник вручную.');
}
```

В корневом `package.json` в `scripts` добавить:

```json
    "sources:verify": "tsx tools/src/cli/verify-sources.ts"
```

- [ ] **Step 4: Запустить тесты и проверку типов**

Run: `npx vitest run tools/test/verify-sources.test.ts && npm run typecheck`
Expected: PASS (21 тест), `tsc` без ошибок.

- [ ] **Step 5: Проверить на пустой реальной базе**

Run: `npm run sources:verify`
Expected: `Проверено идентификаторов: 0, с проблемами: 0`, код выхода 0.

- [ ] **Step 6: Commit**

```bash
git add package.json tools
git commit -m "feat(tools): verify source DOI and PMID against Crossref and PubMed" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: CI, публикация на GitHub Pages и README

**Files:**
- Create: `.github/workflows/content.yml`, `README.md`

**Interfaces:**
- Consumes: npm-скрипты `typecheck`, `test`, `content:build`, `sources:verify` (Tasks 1–7).
- Produces: workflow, который на каждый push/PR проверяет и собирает базу, а из `main` публикует `dist/` на GitHub Pages по адресу `https://<user>.github.io/<repo>/manifest.json`.

- [ ] **Step 1: Создать workflow**

`.github/workflows/content.yml`:

```yaml
name: content

on:
  push:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run content:build
      - name: Проверка DOI/PMID (только предупреждение)
        run: npm run sources:verify
        continue-on-error: true
      - uses: actions/upload-pages-artifact@v4
        if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
        with:
          path: dist

  deploy:
    needs: build
    if: github.ref == 'refs/heads/main' && github.event_name != 'pull_request'
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    concurrency:
      group: pages
      cancel-in-progress: false
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Написать README**

`README.md`:

````markdown
# Травы

Справочник лекарственных трав: данные, инструменты и (позже) Android-приложение.
Спецификация: `docs/superpowers/specs/2026-10-15-travy-design.md`.

## Структура

| Папка | Что внутри |
|---|---|
| `content/` | Данные в YAML — их правят люди |
| `shared/` | Схема данных (zod) и общие правила |
| `tools/` | Проверка и сборка базы, загрузка фото, проверка источников |
| `dist/` | Результат сборки (не хранится в git, публикуется на GitHub Pages) |

## Команды

```bash
npm install                 # один раз
npm run content:check       # проверить данные
npm run content:build       # собрать dist/
npm run sources:verify      # сверить DOI и PMID с Crossref и PubMed (только предупреждения)
npm run photo:fetch -- <id-травы> "<File:Название.jpg>" <имя.webp>
npm test                    # тесты
npm run typecheck           # проверка типов
```

## Как добавить траву

1. Убедитесь, что нужные записи есть в словарях (`content/dictionaries/*.yaml`) и источники — в `content/sources.yaml`.
2. Создайте `content/herbs/<id>.yaml`. `id` — латинское название латиницей через дефис (`matricaria-chamomilla`), имя файла совпадает с `id`.
3. Скачайте фото: `npm run photo:fetch -- matricaria-chamomilla "File:Matricaria chamomilla.jpg" plant.webp`. Автор и лицензия запишутся в `content/photos/<id>/photos.yaml` сами.
4. Укажите фото в карточке:
   ```yaml
   photos:
     - file: plant.webp
       kind: plant      # plant — растение целиком, closeup — цветок/лист, raw — сырьё
   ```
5. `npm run content:check` — исправьте все ошибки.
6. Новая трава получает `status: draft`. `status: checked` ставит только человек после проверки.

Полный перечень полей — спецификация, раздел 5.

## Уровни доказанности

| Уровень | Значение | Какой источник обязателен |
|---|---|---|
| `proven` | Подтверждено клиническими исследованиями | хотя бы один `systematic_review`, `rct`, `article` или `monograph` |
| `traditional` | Признанное традиционное применение (EMA, ВОЗ, фармакопея) | — |
| `folk` | Народная медицина, не проверялось | — |
| `refuted` | Исследования эффект не подтвердили | хотя бы один `systematic_review`, `rct` или `article` |

У каждого показания — свой уровень, пояснение (`evidence.note`) и хотя бы один источник.

## Источники

Запись в `content/sources.yaml`:

```yaml
- id: amsterdam-2009
  type: rct            # pharmacopoeia, monograph, systematic_review, rct, article, book, reference_book
  title: "Название в оригинале, как в статье"
  authors: ["Amsterdam J. D.", "Li Y."]
  year: 2009
  journal: "Journal of Clinical Psychopharmacology"
  doi: "10.1097/JCP.0b013e3181ac9348"
```

Обязателен хотя бы один из `isbn`, `doi`, `pmid`, `url`. Название (`title`) пишется на языке оригинала — по нему `sources:verify` сверяет DOI и PMID.
Допустимы: фармакопеи, монографии EMA и ВОЗ, систематические обзоры, рецензируемые статьи, авторитетные справочники и книги. Блоги, форумы и магазины — нет.

## Словари

Каждый файл в `content/dictionaries/` — список записей `id` + `name`. Дополнительные поля:
`indications.yaml` — `organ_system` (id из `organ-systems.yaml`), `synonyms`;
`substances.yaml` — `class` (id из `substance-classes.yaml`), `synonyms`;
`actions.yaml` — `synonyms`; `families.yaml` — `latin`.

## Публикация

Каждый push в `main` запускает GitHub Actions: проверка типов, тесты, сборка базы, проверка источников (предупреждение) и публикация `dist/` на GitHub Pages. Приложение скачивает `manifest.json` оттуда.

Один раз после создания репозитория: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
````

- [ ] **Step 3: Финальная проверка всего плана**

Run: `npm run typecheck && npm test && npm run content:check && npm run content:build`
Expected: `tsc` без ошибок; все тестовые файлы (`evidence`, `schema`, `load`, `validate`, `check`, `build`, `fetch-photo`, `verify-sources`) PASS; `Ошибок нет. Трав: 0, …`; `База собрана в dist/: …`.

Run: `git status --short`
Expected: только `README.md` и `.github/` (нет `node_modules/`, `dist/`).

- [ ] **Step 4: Commit**

```bash
git add README.md .github
git commit -m "ci: validate, build and publish content to GitHub Pages" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## После плана (делает пользователь, затем — план 2)

1. Создать на GitHub публичный репозиторий (например, `travy`) и прислать ссылку — тогда добавим `origin` и сделаем `git push -u origin main`.
2. В репозитории: **Settings → Pages → Source: GitHub Actions**.
3. Убедиться, что workflow `content` прошёл и `https://<user>.github.io/travy/manifest.json` открывается.
4. Перейти к плану 2 — пилотный контент из 10 трав.
