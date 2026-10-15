# «Травы», план 2: пилотный контент — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить в модель данных поля `life_form` и `sourcing`, сделать страницу проверки `npm run content:report` и наполнить базу 10 пилотными травами (и 1–2 сборами, если найдётся источник) с проверенными источниками и фото.

**Architecture:** Код меняется в двух местах: `shared/` (новые перечисления, поля схемы, русские подписи для всех перечислений — их потом возьмёт и приложение) и `tools/` (генератор HTML-отчёта из уже загруженной и проверенной базы). Остальное — данные в `content/`: словари, источники, YAML трав и фото через существующий `photo:fetch`. Корректность данных обеспечивают `content:check` (схема и ссылки), `sources:verify` (DOI/PMID), ручная сверка каждого утверждения с открытым источником и страница отчёта для пользователя.

**Tech Stack:** то же, что в плане 1 (Node 22, TypeScript 7, zod 4, yaml, sharp, Vitest 5, tsx); для исследования — WebSearch/WebFetch или встроенный браузер.

**Spec:** `docs/superpowers/specs/2026-10-15-travy-design.md` (с дополнением от 2026-10-15: §5.1 `life_form`/`sourcing`, §6.2–6.3, §8 п. 7).

## Global Constraints

- Все Global Constraints плана 1 (`docs/superpowers/plans/2026-10-15-travy-1-data-foundation.md`) действуют.
- `life_form`: `herb` | `subshrub` | `shrub` | `tree` | `vine`; `sourcing`: массив из `wild` | `garden` | `pharmacy`, не пустой. Оба поля обязательны. `SCHEMA_VERSION` остаётся `1` (приложение ещё нигде не установлено).
- Пилот — ровно эти 10 трав и `id`: `matricaria-chamomilla` (ромашка аптечная), `mentha-piperita` (мята перечная), `hypericum-perforatum` (зверобой продырявленный), `calendula-officinalis` (календула лекарственная), `achillea-millefolium` (тысячелистник обыкновенный), `plantago-major` (подорожник большой), `valeriana-officinalis` (валериана лекарственная), `urtica-dioica` (крапива двудомная), `rosa-canina` (шиповник собачий), `tilia-cordata` (липа сердцевидная).
- **Ни одного источника по памяти.** Источник попадает в `sources.yaml` только после того, как документ открыт (WebFetch или браузер) и сверены название, авторы/организация, год и идентификатор. Каждое утверждение в карточке (показание, срок сбора, дозировка, противопоказание) подтверждается конкретным источником из `sources.yaml`; при возможности — со страницей или разделом в `page` (например, `"4.1"` для раздела монографии EMA).
- **Точность важнее полноты.** Нет надёжного источника — нет утверждения (и нет поля со значением «наугад»: для безопасности тогда `unknown`). Уровни доказанности не подгоняются под «все четыре цвета».
- Все тексты в карточках — на русском, своими словами (не копировать абзацы источников); латинские названия — с автором вида.
- Все новые травы и сборы — `status: draft`.
- Фото — только через `npm run photo:fetch`, 2–3 на траву (обязательно `plant`; плюс `closeup` и/или `raw`), только из категории Commons с латинским названием этого вида.
- Сообщения коммитов на английском, с `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

### Правила уровня доказанности (для всех задач с травами)

| Что говорит источник | Уровень | Тип источника | `evidence.note` (пример) |
|---|---|---|---|
| Монография EMA, раздел 4.1: well-established use | `proven` | `monograph` | «EMA (2015): хорошо изученное применение» |
| Систематический обзор/Кокрейн с ясным выводом о пользе | `proven` | `systematic_review` | «Обзор N РКИ (2019): эффект умеренный» |
| Монография EMA: traditional use; ВОЗ; ГФ РФ (показание без клинических данных) | `traditional` | `monograph` / `pharmacopoeia` | «EMA (2018): традиционное применение» |
| Систематический обзор с ясным выводом «эффекта нет» | `refuted` | `systematic_review` / `rct` | «Обзор 2015: не отличается от плацебо» |
| Противоречие (EMA WEU, но свежие обзоры не подтверждают) | более осторожный из двух | оба источника | «EMA — хорошо изученное, но обзоры 2015–2020 не подтверждают» |
| Только народное применение | `folk` — только при надёжном источнике (книга/справочник); без него показание не вносится | `book` / `reference_book` | — |

### Правила безопасности

- `pregnancy`/`lactation`: «не рекомендуется из-за отсутствия данных» (типичная формулировка EMA 4.6) → `caution`; прямое противопоказание (EMA 4.3) → `contraindicated`; `ok` — только если источник прямо называет применение безопасным; нет данных → `unknown`.
- `children`: «не рекомендуется детям до N лет» или «применять с N лет» → `status: ok`, `from_age: N`; прямое противопоказание детям → `contraindicated`; нет данных → `unknown`.
- `toxicity`: `none` — растение не ядовито и источники не описывают токсичности в обычных дозах; `low` — источники описывают токсические эффекты при передозировке/длительном приёме; `moderate`/`high` — ядовитые растения.
- `contraindications`, `side_effects`, `interactions` — из разделов 4.3, 4.8, 4.5 монографии EMA (и/или ВОЗ), своими словами.

## Review Focus

- Источник реальный, но не подтверждает приписанное ему утверждение (верный DOI, не тот факт) → в каждой задаче с травами шаг «Сверка утверждений»: каждое показание/дозировка/противопоказание перечитывается в открытом источнике; `page` указывает раздел.
- Завышенный уровень доказанности (традиционное выдано за доказанное) → шаг «Сверка утверждений» сверяет каждый уровень с таблицей правил выше; `note` называет основание.
- Пропущенные опасные взаимодействия и противопоказания (особенно зверобой: индуктор CYP3A4/P-gp, фотосенсибилизация) → шаг «Сверка безопасности» по разделам 4.3–4.6 и 4.8 монографии.
- Фото не того вида (похожий вид или род) → фото берутся только из `Category:<латинское название>`, и на странице файла проверяется, что подпись/категория — именно этот вид; отдельный шаг в каждой задаче с травами.
- Страница отчёта ломается на данных с HTML-символами или на кириллическом пути репозитория (`D:\Projects\Травы`) → тест экранирования в Task 2 и относительные пути к фото (`../content/photos/<id>/<file>`) в CLI.

---

## Файловая структура (результат плана)

```
shared/src/enums.ts          + LIFE_FORMS, SOURCING_OPTIONS
shared/src/schema.ts         + поля life_form, sourcing
shared/src/labels.ts         НОВЫЙ: русские подписи всех перечислений, месяцы
shared/src/index.ts          + export labels
shared/test/sample.ts        + life_form, sourcing в sampleHerb
shared/test/schema.test.ts   + тесты новых полей
shared/test/compat.test.ts   + новые перечисления в снимке
shared/test/labels.test.ts   НОВЫЙ
tools/src/report.ts          НОВЫЙ: renderReport, escapeHtml, sourceHref
tools/src/cli/report.ts      НОВЫЙ: npm run content:report → report/index.html
tools/test/report.test.ts    НОВЫЙ
.gitignore                   + report/
package.json                 + скрипт content:report
content/dictionaries/*.yaml  наполнены
content/sources.yaml         наполнен
content/herbs/*.yaml         10 трав
content/photos/<id>/         фото + photos.yaml
content/recipes/*.yaml       0–2 сбора
```

---

### Task 1: Поля «жизненная форма» и «где взять»

**Files:**
- Modify: `shared/src/enums.ts` (в конец файла)
- Modify: `shared/src/schema.ts:2-10` (импорт), `shared/src/schema.ts:170` (после `status`)
- Modify: `shared/test/sample.ts:73` (после `status: 'draft',`)
- Modify: `shared/test/schema.test.ts` (в конец файла)
- Replace: `shared/test/compat.test.ts`

**Interfaces:**
- Consumes: `makeSchemas`/`herbShape` в `shared/src/schema.ts` (план 1).
- Produces: `LIFE_FORMS`, `type LifeForm`, `SOURCING_OPTIONS`, `type Sourcing` из `@travy/shared`; поля `HerbInput.life_form: LifeForm`, `HerbInput.sourcing: Sourcing[]` (и то же в `Herb`).

- [ ] **Step 1: Добавить поля в тестовые данные и написать тесты**

В `shared/test/sample.ts` после строки `    status: 'draft',` вставить:

```ts
    life_form: 'herb',
    sourcing: ['wild', 'pharmacy'],
```

В конец `shared/test/schema.test.ts` добавить:

```ts
describe('жизненная форма и где взять', () => {
  it('трава с life_form и sourcing принимается', () => {
    const parsed = inputSchemas.herbInput.parse(sampleHerb('x', 'X'));
    expect(parsed.life_form).toBe('herb');
    expect(parsed.sourcing).toEqual(['wild', 'pharmacy']);
  });
  it('life_form обязательна', () => {
    const { life_form: _lifeForm, ...herb } = sampleHerb('x', 'X');
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^life_form:/m);
  });
  it('неизвестная жизненная форма — ошибка', () => {
    expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), life_form: 'bush' }).join('\n')).toMatch(
      /^life_form:/m,
    );
  });
  it('sourcing: нужен хотя бы один вариант', () => {
    expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), sourcing: [] })).toContain(
      'sourcing: укажите, где взять: wild, garden или pharmacy',
    );
  });
  it('sourcing: неизвестное значение — ошибка', () => {
    expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), sourcing: ['market'] }).join('\n')).toMatch(
      /^sourcing\.0:/m,
    );
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run shared/test/schema.test.ts`
Expected: FAIL — строгая схема отвергает неизвестные ключи `life_form`/`sourcing` (`Unrecognized key`), новые тесты «обязательна»/«ошибка» не находят ожидаемых сообщений.

- [ ] **Step 3: Реализовать перечисления и поля**

В конец `shared/src/enums.ts`:

```ts
export const LIFE_FORMS = ['herb', 'subshrub', 'shrub', 'tree', 'vine'] as const;
export type LifeForm = (typeof LIFE_FORMS)[number];

export const SOURCING_OPTIONS = ['wild', 'garden', 'pharmacy'] as const;
export type Sourcing = (typeof SOURCING_OPTIONS)[number];
```

В `shared/src/schema.ts` заменить блок импорта перечислений (строки 2–10) на:

```ts
import {
  EVIDENCE_LEVELS,
  HERB_STATUSES,
  LIFE_FORMS,
  PHOTO_KINDS,
  SAFETY_STATUSES,
  SOURCE_TYPES,
  SOURCING_OPTIONS,
  TOXICITY_LEVELS,
  USAGE_FORMS,
} from './enums';
```

В `herbShape` после строки `    status: z.enum(HERB_STATUSES),` вставить:

```ts
    life_form: z.enum(LIFE_FORMS),
    sourcing: z.array(z.enum(SOURCING_OPTIONS)).min(1, 'укажите, где взять: wild, garden или pharmacy'),
```

- [ ] **Step 4: Запустить тесты схемы**

Run: `npx vitest run shared/test/schema.test.ts`
Expected: PASS (все тесты, включая 5 новых).

- [ ] **Step 5: Обновить снимок совместимости**

Run: `npx vitest run shared/test/compat.test.ts`
Expected: PASS — перечисления в тесте пока не перечислены, поэтому он новых значений не видит. Это и чинится ниже.

Заменить `shared/test/compat.test.ts` целиком:

```ts
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_LEVELS,
  HERB_STATUSES,
  LIFE_FORMS,
  PHOTO_KINDS,
  SAFETY_STATUSES,
  SOURCE_TYPES,
  SOURCING_OPTIONS,
  TOXICITY_LEVELS,
  USAGE_FORMS,
} from '../src/enums';
import { SCHEMA_VERSION } from '../src/schema';

/**
 * Охранный тест совместимости базы.
 * Установленное приложение проверяет скачанный content.json схемой СВОЕЙ версии: новое значение
 * перечисления (например, форма применения "syrup") оно отвергнет целиком и молча останется на старой базе.
 * Поэтому изменение любого перечисления — несовместимое изменение: увеличьте SCHEMA_VERSION
 * (приложение покажет «обновите приложение») и только потом обновите снимок ниже.
 * LIFE_FORMS и SOURCING_OPTIONS добавлены до первой установки приложения, поэтому версия осталась 1.
 */
const PINNED = {
  schemaVersion: 1,
  enums: {
    EVIDENCE_LEVELS: ['proven', 'traditional', 'folk', 'refuted'],
    SOURCE_TYPES: ['pharmacopoeia', 'monograph', 'systematic_review', 'rct', 'article', 'book', 'reference_book'],
    HERB_STATUSES: ['draft', 'checked'],
    SAFETY_STATUSES: ['ok', 'caution', 'contraindicated', 'unknown'],
    TOXICITY_LEVELS: ['none', 'low', 'moderate', 'high'],
    USAGE_FORMS: ['infusion', 'decoction', 'tincture', 'rinse', 'bath', 'compress', 'tea', 'other'],
    PHOTO_KINDS: ['plant', 'closeup', 'raw'],
    LIFE_FORMS: ['herb', 'subshrub', 'shrub', 'tree', 'vine'],
    SOURCING_OPTIONS: ['wild', 'garden', 'pharmacy'],
  },
};

describe('совместимость базы', () => {
  it('перечисления меняются только вместе с SCHEMA_VERSION', () => {
    expect({
      schemaVersion: SCHEMA_VERSION,
      enums: {
        EVIDENCE_LEVELS,
        SOURCE_TYPES,
        HERB_STATUSES,
        SAFETY_STATUSES,
        TOXICITY_LEVELS,
        USAGE_FORMS,
        PHOTO_KINDS,
        LIFE_FORMS,
        SOURCING_OPTIONS,
      },
    }).toEqual(PINNED);
  });
});
```

- [ ] **Step 6: Полный прогон**

Run: `npm run typecheck && npm test && npm run content:check`
Expected: `tsc` без ошибок; все тесты PASS (в т.ч. tools — образцовые травы теперь с новыми полями); `Ошибок нет. Трав: 0, …`.

- [ ] **Step 7: Commit**

```bash
git add shared
git commit -m "feat(shared): add life_form and sourcing herb fields" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Страница проверки контента

**Files:**
- Create: `shared/src/labels.ts`, `shared/test/labels.test.ts`
- Modify: `shared/src/index.ts`
- Create: `tools/src/report.ts`, `tools/src/cli/report.ts`, `tools/test/report.test.ts`
- Modify: `.gitignore`, `package.json` (скрипт `content:report`)

**Interfaces:**
- Consumes: перечисления (Task 1); `LoadedContent` (`tools/src/load.ts`), `checkContent` (`tools/src/check.ts`), `normalizeDoi`, `normalizePmid` (`tools/src/verify-sources.ts`), `ContentValidationError`, `CONTENT_DIR`, `REPO_ROOT`; в тестах — `parseTree`, `sampleTree` (`tools/test/helpers.ts`).
- Produces:
  - `shared/src/labels.ts`: `EVIDENCE_LABELS`, `SOURCE_TYPE_LABELS`, `HERB_STATUS_LABELS`, `SAFETY_STATUS_LABELS`, `TOXICITY_LABELS`, `USAGE_FORM_LABELS`, `PHOTO_KIND_LABELS`, `LIFE_FORM_LABELS`, `SOURCING_LABELS` (все `Record<Перечисление, string>`), `MONTH_NAMES`, `monthName(month: number): string`
  - `tools/src/report.ts`: `interface ReportOptions { photoUrl: (herbId: string, file: string) => string; generatedAt: Date }`, `escapeHtml(value: string): string`, `sourceHref(source: Source): string | undefined`, `renderReport(content: LoadedContent, opts: ReportOptions): string`
  - npm-скрипт `content:report` → `report/index.html`

- [ ] **Step 1: Написать падающие тесты**

`shared/test/labels.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  EVIDENCE_LEVELS,
  HERB_STATUSES,
  LIFE_FORMS,
  PHOTO_KINDS,
  SAFETY_STATUSES,
  SOURCE_TYPES,
  SOURCING_OPTIONS,
  TOXICITY_LEVELS,
  USAGE_FORMS,
} from '../src/enums';
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
} from '../src/labels';

describe('labels', () => {
  it('у каждого значения перечисления есть русская подпись', () => {
    const pairs: [readonly string[], Record<string, string>][] = [
      [EVIDENCE_LEVELS, EVIDENCE_LABELS],
      [SOURCE_TYPES, SOURCE_TYPE_LABELS],
      [HERB_STATUSES, HERB_STATUS_LABELS],
      [SAFETY_STATUSES, SAFETY_STATUS_LABELS],
      [TOXICITY_LEVELS, TOXICITY_LABELS],
      [USAGE_FORMS, USAGE_FORM_LABELS],
      [PHOTO_KINDS, PHOTO_KIND_LABELS],
      [LIFE_FORMS, LIFE_FORM_LABELS],
      [SOURCING_OPTIONS, SOURCING_LABELS],
    ];
    for (const [values, labels] of pairs) {
      for (const value of values) expect(labels[value], value).toMatch(/[а-яё]/i);
    }
  });

  it('месяцы по-русски', () => {
    expect(monthName(1)).toBe('январь');
    expect(monthName(6)).toBe('июнь');
    expect(monthName(12)).toBe('декабрь');
  });
});
```

`tools/test/report.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { EVIDENCE_LABELS, type Source } from '@travy/shared';
import { escapeHtml, renderReport, sourceHref } from '../src/report';
import { parseTree, sampleTree } from './helpers';

const opts = {
  photoUrl: (herbId: string, file: string) => `../content/photos/${herbId}/${file}`,
  generatedAt: new Date('2026-10-15T18:30:00Z'),
};

function render(tree = sampleTree()) {
  return renderReport(parseTree(tree), opts);
}

describe('renderReport', () => {
  it('сводка вверху страницы', () => {
    const html = render();
    expect(html).toContain('Сформировано: 2026-10-15 18:30 UTC');
    expect(html).toContain('трав: 2');
    expect(html).toContain('сборов: 1');
    expect(html).toContain('источников: 3');
  });

  it('трава: название, латынь, семейство и плашка черновика', () => {
    const html = render();
    expect(html).toContain('<h2>Подорожник большой</h2>');
    expect(html).toContain('Testus herbus L. · Подорожниковые');
    expect(html).toContain('<span class="badge draft">Черновик — не проверено</span>');
  });

  it('названия из словарей вместо id', () => {
    const html = render();
    expect(html).toContain('<strong>Кашель</strong> <em>(Дыхательная система)</em>');
    expect(html).toContain('Слизи (Полисахариды)');
    expect(html).toContain('Отхаркивающее');
    expect(html).toContain('<dd>Луг</dd>');
  });

  it('жизненная форма и где взять', () => {
    const html = render();
    expect(html).toContain('<dd>Трава</dd>');
    expect(html).toContain('<dd>Дикорастущее, Аптечное</dd>');
  });

  it('уровень доказанности с цветом и пояснением', () => {
    const html = render();
    expect(html).toContain('class="ev ev-traditional"');
    expect(html).toContain(EVIDENCE_LABELS.traditional);
    expect(html).toContain('Монография EMA, традиционное применение');
  });

  it('сбор: месяцы по-русски и ссылка на источник со страницей', () => {
    const html = render();
    expect(html).toContain('июнь, июль, август');
    // источники нумеруются по id: book-test = 1, ema-plantago = 2, rct-test = 3
    expect(html).toContain('<a href="#src-book-test">[1, с. 12]</a>');
  });

  it('список источников: DOI и URL кликабельны, ISBN показан', () => {
    const html = render();
    expect(html).toContain('<li id="src-book-test" value="1">');
    expect(html).toContain('ISBN 978-5-00-000000-0');
    expect(html).toContain('href="https://doi.org/10.1000/test.2020.1"');
    expect(html).toContain('href="https://www.ema.europa.eu/en/medicines/herbal/plantaginis-lanceolatae-folium"');
  });

  it('фото: адрес из photoUrl, автор и лицензия', () => {
    const html = render();
    expect(html).toContain('src="../content/photos/plantago-major/plant.webp"');
    expect(html).toContain('Test Author · CC BY-SA 4.0');
  });

  it('двойник: ядовитый выделен, имя травы из базы', () => {
    const tree = sampleTree();
    tree.herbs[0]!.lookalikes = [{ herb: 'althaea-officinalis', poisonous: true, differences: 'Отличия' }];
    const html = render(tree);
    expect(html).toContain('<li class="poison"><strong>Алтей лекарственный</strong> <span class="poison-label">ядовит</span>');
  });

  it('сборы: состав с названиями трав и частей', () => {
    const html = render();
    expect(html).toContain('<h2>Грудной сбор (тест)</h2>');
    expect(html).toContain('Подорожник большой — 2 ч. (Лист)');
  });

  it('экранирует HTML из данных', () => {
    const tree = sampleTree();
    tree.herbs[0]!.description = '<script>alert(1)</script>';
    const html = render(tree);
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).not.toContain('<script>');
  });
});

describe('escapeHtml', () => {
  it('экранирует пять спецсимволов', () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  });
});

describe('sourceHref', () => {
  const base: Source = { id: 's', type: 'rct', title: 'T', authors: ['A'], year: 2020 };
  it('DOI в любой форме → doi.org', () => {
    expect(sourceHref({ ...base, doi: 'https://doi.org/10.1/ABC' })).toBe('https://doi.org/10.1/abc');
  });
  it('PMID → PubMed', () => {
    expect(sourceHref({ ...base, pmid: 'PMID: 123' })).toBe('https://pubmed.ncbi.nlm.nih.gov/123/');
  });
  it('иначе url, у книги с ISBN ссылки нет', () => {
    expect(sourceHref({ ...base, url: 'https://example.org/a' })).toBe('https://example.org/a');
    expect(sourceHref({ ...base, isbn: '978-5-00-000000-0' })).toBeUndefined();
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run shared/test/labels.test.ts tools/test/report.test.ts`
Expected: FAIL — `Cannot find module '../src/labels'` и `Cannot find module '../src/report'`.

- [ ] **Step 3: Реализовать подписи**

`shared/src/labels.ts`:

```ts
import type {
  EvidenceLevel,
  HerbStatus,
  LifeForm,
  PhotoKind,
  SafetyStatus,
  Sourcing,
  SourceType,
  ToxicityLevel,
  UsageForm,
} from './enums';

/** Русские подписи значений перечислений — для страницы проверки и приложения. */
export const EVIDENCE_LABELS: Record<EvidenceLevel, string> = {
  proven: 'Доказано исследованиями',
  traditional: 'Признанное традиционное применение',
  folk: 'Народная медицина, не проверялось',
  refuted: 'Исследования не подтвердили',
};

export const SOURCE_TYPE_LABELS: Record<SourceType, string> = {
  pharmacopoeia: 'Фармакопея',
  monograph: 'Монография',
  systematic_review: 'Систематический обзор',
  rct: 'Рандомизированное исследование',
  article: 'Научная статья',
  book: 'Книга',
  reference_book: 'Справочник',
};

export const HERB_STATUS_LABELS: Record<HerbStatus, string> = {
  draft: 'Черновик — не проверено',
  checked: 'Проверено',
};

export const SAFETY_STATUS_LABELS: Record<SafetyStatus, string> = {
  ok: 'можно',
  caution: 'с осторожностью',
  contraindicated: 'противопоказано',
  unknown: 'нет данных',
};

export const TOXICITY_LABELS: Record<ToxicityLevel, string> = {
  none: 'нетоксично',
  low: 'низкая',
  moderate: 'умеренная',
  high: 'высокая',
};

export const USAGE_FORM_LABELS: Record<UsageForm, string> = {
  infusion: 'Настой',
  decoction: 'Отвар',
  tincture: 'Настойка',
  rinse: 'Полоскание',
  bath: 'Ванна',
  compress: 'Компресс',
  tea: 'Чай',
  other: 'Другое',
};

export const PHOTO_KIND_LABELS: Record<PhotoKind, string> = {
  plant: 'Растение',
  closeup: 'Крупно',
  raw: 'Сырьё',
};

export const LIFE_FORM_LABELS: Record<LifeForm, string> = {
  herb: 'Трава',
  subshrub: 'Полукустарник',
  shrub: 'Кустарник',
  tree: 'Дерево',
  vine: 'Лиана',
};

export const SOURCING_LABELS: Record<Sourcing, string> = {
  wild: 'Дикорастущее',
  garden: 'Садовое',
  pharmacy: 'Аптечное',
};

export const MONTH_NAMES = [
  'январь',
  'февраль',
  'март',
  'апрель',
  'май',
  'июнь',
  'июль',
  'август',
  'сентябрь',
  'октябрь',
  'ноябрь',
  'декабрь',
] as const;

export function monthName(month: number): string {
  return MONTH_NAMES[month - 1] ?? String(month);
}
```

`shared/src/index.ts`:

```ts
export * from './enums';
export * from './evidence';
export * from './labels';
export * from './manifest';
export * from './schema';
```

- [ ] **Step 4: Реализовать отчёт**

`tools/src/report.ts`:

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
} from '@travy/shared';
import type { LoadedContent } from './load';
import { normalizeDoi, normalizePmid } from './verify-sources';

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

/** Куда ведёт источник: DOI → doi.org, PMID → PubMed, иначе url. У книги с одним ISBN ссылки нет. */
export function sourceHref(source: Source): string | undefined {
  if (source.doi) return `https://doi.org/${normalizeDoi(source.doi)}`;
  const pmid = source.pmid ? normalizePmid(source.pmid) : null;
  if (pmid) return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
  return source.url;
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

`tools/src/cli/report.ts`:

```ts
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkContent } from '../check';
import { ContentValidationError } from '../errors';
import { CONTENT_DIR, REPO_ROOT } from '../paths';
import { renderReport } from '../report';

const { content, errors } = await checkContent(CONTENT_DIR);
if (errors.length > 0) {
  console.error(new ContentValidationError(errors).message);
  process.exit(1);
}

const reportDir = path.join(REPO_ROOT, 'report');
await mkdir(reportDir, { recursive: true });
const file = path.join(reportDir, 'index.html');
// Относительный путь: так страница работает и из папки с кириллицей в имени
const html = renderReport(content, {
  photoUrl: (herbId, photoFile) => `../content/photos/${herbId}/${photoFile}`,
  generatedAt: new Date(),
});
await writeFile(file, html);
console.log(`Страница проверки: ${pathToFileURL(file).href}`);
```

В `.gitignore` добавить строку:

```gitignore
report/
```

В корневом `package.json` в `scripts` добавить:

```json
    "content:report": "tsx tools/src/cli/report.ts"
```

- [ ] **Step 5: Запустить тесты и проверку типов**

Run: `npx vitest run shared/test/labels.test.ts tools/test/report.test.ts && npm run typecheck`
Expected: PASS (2 + 15 тестов), `tsc` без ошибок.

- [ ] **Step 6: Проверить CLI на пустой базе**

Run: `npm run content:report && git status --short`
Expected: `Страница проверки: file:///D:/Projects/%D0%A2.../report/index.html`; в `git status` нет `report/`.

- [ ] **Step 7: Полный прогон и commit**

Run: `npm run typecheck && npm test`
Expected: всё PASS.

```bash
git add .gitignore package.json shared tools
git commit -m "feat(tools): add content review report (npm run content:report)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Базовые словари и первые источники

**Files:**
- Modify: `content/dictionaries/organ-systems.yaml`, `plant-parts.yaml`, `habitats.yaml`, `families.yaml`, `substance-classes.yaml`
- Modify: `content/sources.yaml`

**Interfaces:**
- Consumes: схема словарей и источников (`@travy/shared`), `npm run content:check`, `npm run sources:verify`.
- Produces: `id` словарей, на которые ссылаются задачи 4–9 (полный список ниже); источники-монографии с `id` вида `ema-<латинское-название-сырья>`, `gf-<сырьё>`, `who-<…>`.

`indications.yaml`, `substances.yaml`, `actions.yaml` здесь не наполняются: записи добавляются в задачах 4–8 по мере появления в травах (у каждой — точная русская формулировка; у показания — `organ_system` из списка ниже).

- [ ] **Step 1: Заполнить фиксированные словари**

`content/dictionaries/organ-systems.yaml`:

```yaml
# Системы органов. Показание (indications.yaml) ссылается на одну из них через organ_system.
- id: nervous
  name: Нервная система и сон
- id: digestive
  name: Пищеварение
- id: respiratory
  name: Дыхательная система
- id: oral
  name: Полость рта и горло
- id: skin
  name: Кожа и раны
- id: urinary
  name: Мочевыделительная система
- id: cardiovascular
  name: Сердце и сосуды
- id: musculoskeletal
  name: Суставы и мышцы
- id: immune
  name: Простуда и иммунитет
- id: reproductive
  name: Женское и мужское здоровье
```

`content/dictionaries/plant-parts.yaml`:

```yaml
# Части растения (лекарственное сырьё).
- id: flowers
  name: Цветки
- id: herb
  name: Трава (надземная часть)
- id: leaf
  name: Листья
- id: root
  name: Корни
- id: rhizome-roots
  name: Корневища с корнями
- id: fruit
  name: Плоды
- id: seeds
  name: Семена
- id: bark
  name: Кора
- id: buds
  name: Почки
```

`content/dictionaries/habitats.yaml`:

```yaml
# Где растёт.
- id: meadow
  name: Луг
- id: wet-meadow
  name: Сырой луг
- id: field
  name: Поле
- id: forest
  name: Лес
- id: forest-edge
  name: Опушка и поляна
- id: riverbank
  name: Берег водоёма
- id: roadside
  name: Обочина дороги
- id: wasteland
  name: Пустырь
- id: garden
  name: Огород и сад
```

`content/dictionaries/families.yaml` (названия семейств — по системе APG IV: валериана в жимолостных, липа в мальвовых):

```yaml
# Ботанические семейства.
- id: asteraceae
  name: Астровые (сложноцветные)
  latin: Asteraceae
- id: lamiaceae
  name: Яснотковые (губоцветные)
  latin: Lamiaceae
- id: hypericaceae
  name: Зверобойные
  latin: Hypericaceae
- id: plantaginaceae
  name: Подорожниковые
  latin: Plantaginaceae
- id: caprifoliaceae
  name: Жимолостные
  latin: Caprifoliaceae
- id: urticaceae
  name: Крапивные
  latin: Urticaceae
- id: rosaceae
  name: Розовые
  latin: Rosaceae
- id: malvaceae
  name: Мальвовые
  latin: Malvaceae
```

`content/dictionaries/substance-classes.yaml`:

```yaml
# Классы действующих веществ. Вещество (substances.yaml) ссылается на класс через class.
- id: essential-oils
  name: Эфирные масла и их компоненты
- id: flavonoids
  name: Флавоноиды
- id: tannins
  name: Дубильные вещества
- id: coumarins
  name: Кумарины
- id: polysaccharides
  name: Полисахариды и слизи
- id: phenolic-acids
  name: Фенолкарбоновые кислоты
- id: triterpenes
  name: Тритерпены и сапонины
- id: carotenoids
  name: Каротиноиды
- id: vitamins
  name: Витамины
- id: organic-acids
  name: Органические кислоты
- id: minerals
  name: Минеральные вещества
- id: naphthodianthrones
  name: Нафтодиантроны
- id: phloroglucinols
  name: Флороглюцины
- id: iridoids
  name: Иридоиды
- id: sesquiterpenes
  name: Сесквитерпеновые кислоты
- id: lignans
  name: Лигнаны
```

Run: `npm run content:check`
Expected: `Ошибок нет. Трав: 0, сборов: 0, источников: 0`.

- [ ] **Step 2: Найти и проверить монографии — по одной на каждое сырьё**

Для каждого сырья открыть документ и записать в `content/sources.yaml` только проверенные данные:

| Сырьё | Где искать | Ожидаемый `id` |
|---|---|---|
| Цветки ромашки | EMA: страница «Matricariae flos» на ema.europa.eu (раздел Herbal medicines) → «European Union herbal monograph» | `ema-matricariae-flos` |
| Листья мяты перечной | EMA «Menthae piperitae folium» | `ema-menthae-piperitae-folium` |
| Трава зверобоя | EMA «Hyperici herba» (монография включает well-established и traditional use) | `ema-hyperici-herba` |
| Цветки календулы | EMA «Calendulae flos» | `ema-calendulae-flos` |
| Трава тысячелистника | EMA «Millefolii herba» | `ema-millefolii-herba` |
| Корень валерианы | EMA «Valerianae radix» | `ema-valerianae-radix` |
| Листья крапивы | EMA «Urticae folium» | `ema-urticae-folium` |
| Плоды шиповника | EMA «Rosae pseudo-fructus» — если монографии нет, это фиксируется, и используется ГФ РФ/ВОЗ | `ema-rosae-pseudo-fructus` |
| Цветки липы | EMA «Tiliae flos» | `ema-tiliae-flos` |
| Листья подорожника большого | EMA монография только на *Plantago lanceolata* — для *P. major* основной источник ГФ РФ | — |
| Все 10 видов сырья (сроки и части сбора, сушка) | Государственная фармакопея РФ XV изд., фармакопейные статьи на сырьё (сайт pharmacopoeia.regmed.ru) | `gf15-<сырьё>`, например `gf15-chamomillae-flores` |

Запись монографии EMA:

```yaml
- id: ema-matricariae-flos
  type: monograph
  title: "<точное английское название документа, как на титуле PDF>"
  authors: ["European Medicines Agency, Committee on Herbal Medicinal Products (HMPC)"]
  year: <год принятия монографии, с титула>
  url: "<прямая ссылка на страницу или PDF монографии>"
```

Запись фармакопейной статьи ГФ РФ:

```yaml
- id: gf15-chamomillae-flores
  type: pharmacopoeia
  title: "<номер и название ФС, например «ФС.2.5.0037 Ромашки аптечной цветки»>"
  authors: ["Министерство здравоохранения Российской Федерации"]
  year: <год издания>
  url: "<ссылка на статью на pharmacopoeia.regmed.ru>"
```

Если документ не удалось открыть — источник не добавляется, а в отчёт задачи записывается, чего не хватает.

- [ ] **Step 3: Проверка**

Run: `npm run content:check && npm run sources:verify`
Expected: `Ошибок нет. Трав: 0, сборов: 0, источников: <N>`; `sources:verify` — `Проверено идентификаторов: 0` (у монографий нет DOI/PMID, они проверены открытием документа в шаге 2).

- [ ] **Step 4: Commit**

```bash
git add content
git commit -m "content: add base dictionaries and monograph sources for the pilot" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## Как делается задача с травами (общая процедура для Tasks 4–8)

Каждая задача 4–8 — две травы. Для **каждой** травы шаги одинаковые:

1. **Исследование.** Открыть монографию EMA (разделы 4.1–4.8), фармакопейную статью ГФ РФ (часть сырья, сроки сбора, сушка, хранение) и при необходимости монографию ВОЗ. Найти в PubMed систематические обзоры по основным показаниям за последние ~10 лет (поиск `"<латинское название>" AND (systematic review OR meta-analysis)`). Каждый использованный обзор/РКИ открыть и добавить в `sources.yaml` с `doi` и/или `pmid`.
2. **Словари.** Добавить недостающие записи в `indications.yaml` (с `organ_system`), `substances.yaml` (с `class`), `actions.yaml`. Формулировки — короткие русские («Кашель», «Воспаление слизистой рта и горла», «Противовоспалительное»). Перед добавлением проверить, нет ли уже подходящей записи (не плодить «кашель» и «кашель с мокротой» без необходимости).
3. **Карточка** `content/herbs/<id>.yaml` по шаблону ниже: все обязательные поля, `life_form`, `sourcing`, `status: draft`.
4. **Фото.** Открыть `https://commons.wikimedia.org/wiki/Category:<Латинское_название>`, выбрать 2–3 файла (растение целиком; цветок/лист крупно и/или сухое сырьё), на странице файла убедиться, что изображён именно этот вид, и скачать: `npm run photo:fetch -- <id> "File:<имя файла>" plant.webp` (затем `closeup.webp`, `raw.webp`). Неподходящая лицензия → инструмент откажет, взять другое фото.
5. **Двойники** — из списка задачи; фото двойника тоже из его категории Commons (`npm run photo:fetch -- <id травы> "File:…" twin-<латынь-двойника>.webp`), если найдётся с подходящей лицензией.
6. **Сверка утверждений.** Для каждого показания, срока сбора, дозировки: открыть указанный источник ещё раз и найти подтверждение; уровень доказанности сверить с таблицей правил из Global Constraints; в `page` — раздел/страница.
7. **Сверка безопасности.** Пройти разделы 4.3 (противопоказания), 4.4 (предупреждения, возраст), 4.5 (взаимодействия), 4.6 (беременность/кормление), 4.8 (побочные действия) монографии и сверить с карточкой по правилам безопасности.
8. **Проверки.** `npm run content:check` → `Ошибок нет`; `npm run sources:verify` → `с проблемами: 0` (при «другом названии» — исправить `title` на название оригинала; при «не найден» — перепроверить идентификатор); `npm run content:report` → открыть страницу и просмотреть карточку целиком.
9. **Commit** обеих трав: `git add content && git commit -m "content: add <трава 1> and <трава 2> (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.

Шаблон карточки (все ключи обязательны, кроме помеченных):

```yaml
id: <id>
name: <русское название>
other_names: [<народные названия>]          # необязательно
latin: <Род вид Автор>
family: <id семейства>
status: draft
life_form: <herb|subshrub|shrub|tree|vine>
sourcing: [<wild|garden|pharmacy>, …]
photos:
  - file: plant.webp
    kind: plant
  - file: closeup.webp
    kind: closeup
description: >-
  <как выглядит и как узнать: высота, листья, цветки, запах, время цветения — 2–4 предложения>
habitats: [<id мест>]
harvest:
  - part: <id части>
    months: [<номера месяцев>]
    how: <когда и как собирать>
    drying: <как сушить>
    storage: <как хранить>
    sources: [{id: gf15-…, page: "<раздел>"}]
substances: [<id веществ>]
actions: [<id действий>]
indications:
  - indication: <id показания>
    evidence:
      level: <proven|traditional|folk|refuted>
      note: <основание уровня: кто и когда, что именно>
    sources: [{id: <источник>, page: "<раздел>"}]
usage:
  - form: <infusion|decoction|tincture|rinse|bath|compress|tea|other>
    recipe: <как приготовить>
    dosage: <сколько и как часто>
    course: <длительность>                  # необязательно
    for_indications: [<id показаний>]       # необязательно
    sources: [{id: <источник>, page: "4.2"}]
safety:
  pregnancy: <ok|caution|contraindicated|unknown>
  lactation: <ok|caution|contraindicated|unknown>
  children: {status: <…>, from_age: <лет>}  # from_age необязательно
  toxicity: <none|low|moderate|high>
  contraindications: [<…>]
  side_effects: [<…>]
  interactions: [<…>]
  sources: [{id: <источник>, page: "4.3–4.8"}]
lookalikes:                                 # необязательно
  - name: <русское название двойника>
    latin: <латынь>
    poisonous: <true|false>
    differences: <как отличить>
    photo: {file: twin-<…>.webp, kind: plant}   # необязательно
sources: [{id: <источник>}]                 # необязательно: общие источники карточки
```

Ориентиры ниже — что ожидается найти; **значения в карточку пишутся только после подтверждения источником**, расхождение с ориентиром — норма, его не нужно «подгонять».

---

### Task 4: Ромашка аптечная и мята перечная

**Files:** Create `content/herbs/matricaria-chamomilla.yaml`, `content/herbs/mentha-piperita.yaml`, `content/photos/matricaria-chamomilla/*`, `content/photos/mentha-piperita/*`; Modify `content/dictionaries/{indications,substances,actions}.yaml`, `content/sources.yaml`.

**Interfaces:** Consumes словари и источники Task 3, процедуру выше. Produces `id` трав `matricaria-chamomilla`, `mentha-piperita` (на них могут ссылаться сборы в Task 9).

| | Ромашка аптечная | Мята перечная |
|---|---|---|
| latin | *Matricaria chamomilla* L. (син. *M. recutita* L.) | *Mentha × piperita* L. |
| family / life_form | asteraceae / herb | lamiaceae / herb |
| sourcing | wild, garden, pharmacy | garden, pharmacy (культурный гибрид, в дикой природе не собирается) |
| сырьё / сбор (сверить с ГФ) | цветки (корзинки), июнь–август | листья, июль–август, бутонизация — начало цветения |
| EMA (ожидается) | традиционное применение: ЖКТ-спазмы, простуда (ингаляции), воспаление кожи и слизистой рта | лист — традиционное применение (пищеварение); монография на масло мяты — **не путать** с листом |
| двойники | ромашка непахучая *Tripleurospermum inodorum* (не ядовита; цветоложе сплошное, нет запаха), нивяник *Leucanthemum vulgare* | — |
| безопасность (сверить) | аллергия на астровые | ГЭРБ/изжога; дети — возрастное ограничение по монографии |

- [ ] **Step 1:** Пройти процедуру (п. 1–8) для ромашки.
- [ ] **Step 2:** Пройти процедуру (п. 1–8) для мяты.
- [ ] **Step 3:** Run: `npm test && npm run content:check && npm run sources:verify` — Expected: тесты PASS; `Ошибок нет. Трав: 2, …`; `с проблемами: 0`.
- [ ] **Step 4:** Commit: `git add content && git commit -m "content: add chamomile and peppermint (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 5: Зверобой продырявленный и календула лекарственная

**Files:** Create `content/herbs/hypericum-perforatum.yaml`, `content/herbs/calendula-officinalis.yaml`, фото обоих; Modify словари и `content/sources.yaml`.

**Interfaces:** как в Task 4. Produces `hypericum-perforatum`, `calendula-officinalis`.

| | Зверобой продырявленный | Календула лекарственная |
|---|---|---|
| latin | *Hypericum perforatum* L. | *Calendula officinalis* L. |
| family / life_form | hypericaceae / herb | asteraceae / herb |
| sourcing | wild, pharmacy | garden, pharmacy |
| сырьё / сбор (сверить с ГФ) | трава (верхушки), июнь–август, цветение | цветки (корзинки), июнь–сентябрь |
| EMA (ожидается) | well-established: лёгкая и умеренная депрессия (определённые сухие экстракты) → `proven` **только для формы экстракта из монографии**, в `note` указать это; traditional: лёгкое беспокойство, наружно — мелкие раны | традиционное: мелкие воспаления кожи и слизистой рта, мелкие раны |
| двойники | зверобой пятнистый *Hypericum maculatum* (стебель без двух рёбер, листья без просвечивающих точек) | — |
| безопасность (**особое внимание**) | взаимодействия: индуктор CYP3A4 и P-гликопротеина — снижает действие оральных контрацептивов, варфарина, циклоспорина, ряда ВИЧ-препаратов, дигоксина; серотониновый синдром с антидепрессантами; фотосенсибилизация. Все взаимодействия из раздела 4.5 — в `interactions` | аллергия на астровые |

- [ ] **Step 1:** Процедура для зверобоя (в п. 7 — каждое взаимодействие из раздела 4.5 отдельной строкой).
- [ ] **Step 2:** Процедура для календулы.
- [ ] **Step 3:** Run: `npm test && npm run content:check && npm run sources:verify` — Expected: PASS; `Трав: 4`; `с проблемами: 0`.
- [ ] **Step 4:** Commit: `git add content && git commit -m "content: add St John's wort and calendula (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 6: Тысячелистник обыкновенный и подорожник большой

**Files:** Create `content/herbs/achillea-millefolium.yaml`, `content/herbs/plantago-major.yaml`, фото (включая фото ядовитых двойников); Modify словари и `content/sources.yaml`.

**Interfaces:** как в Task 4. Produces `achillea-millefolium`, `plantago-major`.

| | Тысячелистник обыкновенный | Подорожник большой |
|---|---|---|
| latin | *Achillea millefolium* L. | *Plantago major* L. |
| family / life_form | asteraceae / herb | plantaginaceae / herb |
| sourcing | wild, pharmacy | wild, pharmacy |
| сырьё / сбор (сверить с ГФ) | трава, июнь–август, цветение | листья, май–сентябрь |
| источники показаний | EMA «Millefolii herba» (традиционное: пищеварение, спазмы, мелкие раны) | EMA описывает только *P. lanceolata* — **не переносить** её на *P. major*; показания — по ГФ РФ (traditional) и обзорам именно по *P. major* |
| двойники | **ядовитые**: болиголов пятнистый *Conium maculatum* (пятнистый стебель, мышиный запах, листья — крупные перистые, не «тысячелистные»), вех ядовитый *Cicuta virosa* (растёт у воды, полое корневище с перегородками) — `poisonous: true`, с фото | подорожник ланцетолистный *Plantago lanceolata* (узкие листья; тоже лекарственный, не ядовит) |
| безопасность (сверить) | аллергия на астровые | — |

- [ ] **Step 1:** Процедура для тысячелистника (двойники с фото — обязательно; если фото с подходящей лицензией не нашлось — записать в отчёт задачи).
- [ ] **Step 2:** Процедура для подорожника.
- [ ] **Step 3:** Run: `npm test && npm run content:check && npm run sources:verify` — Expected: PASS; `Трав: 6`; `с проблемами: 0`.
- [ ] **Step 4:** Commit: `git add content && git commit -m "content: add yarrow and greater plantain (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 7: Валериана лекарственная и крапива двудомная

**Files:** Create `content/herbs/valeriana-officinalis.yaml`, `content/herbs/urtica-dioica.yaml`, фото; Modify словари и `content/sources.yaml`.

**Interfaces:** как в Task 4. Produces `valeriana-officinalis`, `urtica-dioica`.

| | Валериана лекарственная | Крапива двудомная |
|---|---|---|
| latin | *Valeriana officinalis* L. | *Urtica dioica* L. |
| family / life_form | caprifoliaceae / herb | urticaceae / herb |
| sourcing | wild, garden, pharmacy | wild, pharmacy |
| сырьё / сбор (сверить с ГФ) | корневища с корнями, сентябрь–октябрь (или ранняя весна) | листья, июнь–август; корни — отдельной записью `harvest`, если есть в источниках |
| EMA (ожидается) | well-established: лёгкое нервное напряжение и нарушения сна (сухие экстракты); **конфликт** с обзорами по бессоннице — применить правило «более осторожный уровень» и описать расхождение в `note` | лист — традиционное (мочегонное при лёгких жалобах, суставы); корень (`ema-urticae-radix`, если используется) — отдельный источник |
| двойники | — | яснотка белая *Lamium album* (не жжётся, белые цветки-«губы»; не ядовита) |
| безопасность (сверить) | совместно с седативными и алкоголем; вождение | состояния, требующие ограничения жидкости (сердечная/почечная недостаточность) |

- [ ] **Step 1:** Процедура для валерианы (в `note` к показанию «бессонница/сон» — оба источника и вывод).
- [ ] **Step 2:** Процедура для крапивы.
- [ ] **Step 3:** Run: `npm test && npm run content:check && npm run sources:verify` — Expected: PASS; `Трав: 8`; `с проблемами: 0`.
- [ ] **Step 4:** Commit: `git add content && git commit -m "content: add valerian and stinging nettle (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 8: Шиповник собачий и липа сердцевидная

**Files:** Create `content/herbs/rosa-canina.yaml`, `content/herbs/tilia-cordata.yaml`, фото; Modify словари и `content/sources.yaml`.

**Interfaces:** как в Task 4. Produces `rosa-canina`, `tilia-cordata`.

| | Шиповник собачий | Липа сердцевидная |
|---|---|---|
| latin | *Rosa canina* L. | *Tilia cordata* Mill. |
| family / life_form | rosaceae / **shrub** | malvaceae / **tree** |
| sourcing | wild, garden, pharmacy | wild, garden, pharmacy |
| сырьё / сбор (сверить с ГФ) | плоды, август–октябрь, до заморозков | цветки (соцветия с прицветным листом), июнь–июль |
| источники показаний | EMA «Rosae pseudo-fructus», если существует; обзоры по порошку плодов при остеоартрите (*R. canina*) — уровень по правилам; источник витамина C (ГФ РФ) | EMA «Tiliae flos» (традиционное: симптомы простуды, лёгкий стресс) |
| двойники | — | — |
| безопасность (сверить) | — | — |

- [ ] **Step 1:** Процедура для шиповника.
- [ ] **Step 2:** Процедура для липы.
- [ ] **Step 3:** Run: `npm test && npm run content:check && npm run sources:verify` — Expected: PASS; `Трав: 10`; `с проблемами: 0`.
- [ ] **Step 4:** Commit: `git add content && git commit -m "content: add dog rose and small-leaved lime (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 9: Сборы (1–2), только с проверяемым источником

**Files:** Create `content/recipes/<id>.yaml` (0–2 файла); Modify `content/sources.yaml`.

**Interfaces:** Consumes `id` трав из Tasks 4–8. Produces 0–2 сбора.

Критерий включения сбора: найден открытый источник (монография EMA на комбинацию, ГФ РФ, монография ВОЗ, рецензируемая статья или справочник), который **прямо описывает эту комбинацию из пилотных трав с пропорциями**. Пропорции, приготовление и дозировка — из этого источника. Уровень доказанности — по таблице правил.

- [ ] **Step 1: Поиск.** Кандидаты для проверки: валериана + мята (успокоительный), ромашка + мята (желудочный), липа + ромашка (при простуде), шиповник + крапива (витаминный). Для каждого — поиск в EMA (раздел комбинаций), ГФ РФ (официнальные сборы), PubMed.
- [ ] **Step 2: Запись.** Для каждого кандидата, прошедшего критерий, — файл по формату спецификации §5.6, `id` латиницей (например `calming-valerian-mint`), `evidence` и `sources` обязательны.
- [ ] **Step 3: Если ни один кандидат не прошёл** — файлов не создавать; в отчёт задачи записать, какие кандидаты проверены и почему отклонены (это сообщается пользователю).
- [ ] **Step 4:** Run: `npm test && npm run content:check && npm run sources:verify` — Expected: PASS; `сборов: <0–2>`; `с проблемами: 0`.
- [ ] **Step 5:** Commit (если есть файлы): `git add content && git commit -m "content: add pilot herbal blends (draft)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`

---

### Task 10: Сборка, страница проверки, передача пользователю

**Files:** нет новых.

**Interfaces:** Consumes всё выше. Produces `report/index.html` (локально) и собранный `dist/`.

- [ ] **Step 1: Полная проверка**

Run: `npm run typecheck && npm test && npm run content:check && npm run sources:verify && npm run content:build`
Expected: `tsc` без ошибок; все тесты PASS; `Ошибок нет. Трав: 10, сборов: <0–2>, источников: <N>`; `с проблемами: 0`; `База собрана в dist/: … трав 10 …`.

- [ ] **Step 2: Размер базы и фото**

Run: `du -sh content/photos dist && ls content/photos | wc -l`
Expected: 10 папок с фото (+ фото двойников внутри); `dist/` — порядка единиц мегабайт.

- [ ] **Step 3: Страница проверки**

Run: `npm run content:report`
Expected: `Страница проверки: file:///…/report/index.html`. Открыть страницу (браузер) и просмотреть: 10 карточек, у всех фото отображаются, плашка «черновик», все ссылки на источники ведут в список, ссылки в списке открываются.

- [ ] **Step 4: Передать пользователю** ссылку на страницу и короткую сводку: что проверить в первую очередь (уровни доказанности, безопасность, двойники), какие кандидаты в сборы отклонены и почему, какие документы не удалось открыть.

**Публикация** (`git push` → CI → GitHub Pages) — только после того, как пользователь просмотрит страницу и скажет «ок». До этого коммиты остаются локальными.
