# «Травы», план 3a: основа приложения — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Приложение Expo в монорепозитории со встроенной базой трав, чистой логикой фильтров/поиска/каталога/избранного в `shared` (покрыта тестами), тёмной темой из макета, набором базовых компонентов и провайдерами данных — готовая основа для экранов (план 3b).

**Architecture:** `app/` — новый npm-воркспейс (Expo SDK 58, Expo Router, TypeScript). Вся логика без UI — в `shared/src/query/` и `shared/src/user.ts` (тестируется Vitest, используется приложением). `tools` получает команду `content:app`, которая копирует собранную базу и фото в `app/assets/content/` и генерирует таблицу `require()` для фото. В приложении: `theme/` (все цвета/шрифты/отступы), `components/` (базовые элементы), `content/` и `user/` (провайдеры React-контекста).

**Tech Stack:** Expo SDK 58 (expo 58.x, expo-router 58.x, react-native 0.88, React 19.3), expo-image, @react-native-async-storage/async-storage, TypeScript (в `app` — версия шаблона Expo), zod 4, Vitest 5.

**Spec:** `docs/superpowers/specs/2026-10-15-travy-design.md` (§4.3, §6) и `docs/design/2026-10-15-visual-reference.md`.

## Решения пользователя к этому плану (2026-10-17/18)

- Из макета в v1 входит **только главная с баннером**: вкладки **Главная / Каталог / Сборы / Избранное**; на главной — поиск, плитки, баннер, блок «Собирать сейчас» (вместо «Популярных»). Онбординга из 3 слайдов, отдельного раздела «Мои заметки» и своих сборов в v1 нет.
- Тема — **только тёмная**, как на макете.
- Обновление базы по сети и сборка APK — план 4.

## Global Constraints

- Все Global Constraints плана 1 действуют (`shared/` без Node API; сообщения пользователю на русском; strict TypeScript).
- Приложение: Expo SDK **58**; зависимости Expo ставятся только `npx expo install <пакет>` (из папки `app/`), не `npm install`.
- Маршруты — только в `app/src/app/` (Expo Router); компоненты, хуки и прочее — вне `src/app/`.
- Любая логика без UI (фильтры, сортировка, поиск, каталог, избранное/заметки) — в `shared/` с тестами Vitest; экраны её только вызывают.
- Все цвета, шрифты, радиусы, отступы — только из `app/src/theme/`; в компонентах и экранах никаких «сырых» `#hex`.
- Тексты интерфейса — на русском.
- Правила фильтра и сортировки — ровно спецификация §6.3–6.5: между группами «И»; внутри групп-признаков (показания, вещества, классы веществ, действия, системы органов, безопасность) — «И»; внутри групп-перечислений (месяц, часть растения, место, семейство, жизненная форма, где взять) — «ИЛИ»; месяц и часть растения проверяются в одной записи `harvest`; порог доказанности — по выбранным показаниям (каждое) или по любому показанию, `refuted` ниже любого порога; сортировка — по наименьшему уровню среди выбранных показаний, затем по названию (русская сортировка, «ё»); поиск — без учёта регистра, «ё» = «е», подстрока в названии, народных названиях и латыни, плюс совпавшие группы (показания, вещества, действия).
- Ключ хранения пользовательских данных: `travy.user.v1`.

## Review Focus

- Испорченные/старые пользовательские данные в хранилище (невалидный JSON, неожиданная форма) не должны ронять приложение и стирать валидные части → тесты `parseUserData` в Task 5.
- Пустая база (0 трав) и словарь со значениями, которых нет ни у одной травы, — каталог не показывает пустых групп, ничего не падает → тесты в Task 4.
- Сравнение и поиск с «ё» и разным регистром → тесты в Task 3 и Task 4.
- Сгенерированный модуль фото при пустом списке и при повторной синхронизации (лишние старые файлы удаляются) → тесты в Task 2.
- Кириллический путь репозитория (`D:\Projects\Травы`) и Windows-пути в генераторе `require()` → тест на «/» в путях модуля в Task 2.

---

## Файловая структура (результат плана)

```
package.json                      + воркспейс app, скрипты content:app, app:web; typecheck включает app
.gitignore                        + app/.expo/, app/dist/, app/web-build/, app/expo-env.d.ts
.claude/launch.json               конфигурация веб-превью приложения
shared/src/query/filter.ts        HerbFilter, emptyFilter, matchesFilter, sortHerbs, queryHerbs, buildFilterIndex, activeFilterCount
shared/src/query/search.ts        normalizeText, searchContent
shared/src/query/catalog.ts       CATALOG_SECTIONS, catalogGroups, filterForGroup, collectNow
shared/src/query/index.ts
shared/src/user.ts                пользовательские данные: избранное, заметки, дисклеймер
shared/src/labels.ts              + SAFETY_FLAG_LABELS
shared/test/query-fixtures.ts     вымышленные травы для тестов логики
shared/test/{filter,search,catalog,user}.test.ts
tools/src/app-content.ts          bundledPhotosModule, syncAppContent
tools/src/cli/app-content.ts
tools/test/app-content.test.ts
app/                              Expo-приложение
  package.json  app.json  tsconfig.json  AGENTS.md  assets/
  assets/content/                 (генерируется content:app, хранится в git)
  src/app/_layout.tsx             корневой стек + провайдеры
  src/app/(tabs)/_layout.tsx      4 вкладки
  src/app/(tabs)/index.tsx  catalog.tsx  recipes.tsx  favorites.tsx   (заглушки до плана 3b)
  src/theme/index.ts              цвета, радиусы, отступы, типографика
  src/components/                 AppText, Screen, Card, Chip, Tag, EvidenceDot, ListRow, SearchField, SectionHeader, Button
  src/content/bundled-photos.ts   (генерируется)
  src/content/content.ts          загрузка встроенной базы, photoSource
  src/content/ContentProvider.tsx
  src/user/UserDataProvider.tsx
```

Все команды — из корня `D:\Projects\Травы` в Git Bash, если не сказано иное.

---

### Task 1: Каркас приложения Expo

**Files:**
- Create: `app/` (шаблон Expo), `.claude/launch.json`
- Modify: `package.json`, `.gitignore`
- Create: `app/src/app/_layout.tsx`, `app/src/app/(tabs)/_layout.tsx`, `app/src/app/(tabs)/index.tsx`, `catalog.tsx`, `recipes.tsx`, `favorites.tsx`
- Delete: демо-файлы шаблона (список ниже)

**Interfaces:**
- Produces: воркспейс `@travy/app` (папка `app/`), зависящий от `@travy/shared`; маршруты вкладок `/`, `/catalog`, `/recipes`, `/favorites`; npm-скрипты `app:web`, `typecheck` (включая app).

- [ ] **Step 1: Создать приложение из шаблона**

```bash
npx -y create-expo-app@latest app --template default --no-install
```

Expected: папка `app/` с `package.json` (`"expo": "~58.…"`), `app.json`, `src/app/`, `src/components/`, `AGENTS.md`.

- [ ] **Step 2: Удалить демо-код шаблона**

```bash
rm -rf app/src/components app/src/hooks app/src/constants app/src/global.css app/src/app/explore.tsx app/src/app/index.tsx app/scripts
```

- [ ] **Step 3: Настроить package.json приложения**

В `app/package.json`: `"name": "@travy/app"`; в `dependencies` добавить `"@travy/shared": "*"`; `scripts` заменить на:

```json
  "scripts": {
    "start": "expo start",
    "web": "expo start --web",
    "android": "expo start --android",
    "typecheck": "tsc --noEmit",
    "lint": "expo lint"
  },
```

- [ ] **Step 4: Настроить app.json**

В `app/app.json` (остальные поля шаблона не трогать):
- `expo.name`: `"Травы"`; `expo.slug`: `"travy"`; `expo.scheme`: `"travy"`;
- `expo.userInterfaceStyle`: `"dark"`;
- `expo.android.adaptiveIcon.backgroundColor`: `"#0B120E"`;
- в плагине `expo-splash-screen`: `"backgroundColor": "#0B120E"`;
- `expo.web.output`: `"single"`.

- [ ] **Step 5: Корневой package.json, .gitignore, превью**

В корневом `package.json`: `"workspaces": ["shared", "tools", "app"]`; в `scripts`:

```json
    "typecheck": "tsc -p shared && tsc -p tools && npm run typecheck -w @travy/app",
    "app:web": "npm run web -w @travy/app"
```

В `.gitignore` добавить:

```gitignore
app/.expo/
app/dist/
app/web-build/
app/expo-env.d.ts
```

`.claude/launch.json`:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "app-web",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "web", "-w", "@travy/app"],
      "port": 8081
    }
  ]
}
```

```bash
npm install
```

Expected: `node_modules/@travy/app` → ссылка на `app/`.

- [ ] **Step 6: Маршруты-заглушки**

`app/src/app/_layout.tsx`:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </>
  );
}
```

`app/src/app/(tabs)/_layout.tsx`:

```tsx
import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное' }} />
    </Tabs>
  );
}
```

`app/src/app/(tabs)/index.tsx` (и по образцу `catalog.tsx`, `recipes.tsx`, `favorites.tsx` — с заголовками «Каталог», «Сборы», «Избранное»; каждый файл целиком, функции `CatalogScreen`, `RecipesScreen`, `FavoritesScreen`):

```tsx
import { Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Главная</Text>
    </View>
  );
}
```

`app/src/app/(tabs)/catalog.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function CatalogScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Каталог</Text>
    </View>
  );
}
```

`app/src/app/(tabs)/recipes.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function RecipesScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Сборы</Text>
    </View>
  );
}
```

`app/src/app/(tabs)/favorites.tsx`:

```tsx
import { Text, View } from 'react-native';

export default function FavoritesScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Избранное</Text>
    </View>
  );
}
```

- [ ] **Step 7: Проверка**

Run: `npm run typecheck && npm test && (cd app && npx expo export --platform web --output-dir ../.app-web-check) && rm -rf .app-web-check`
Expected: `tsc` без ошибок для shared, tools и app; все тесты PASS; экспорт веб-версии завершается `Exported`.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json .gitignore .claude/launch.json app
git commit -m "feat(app): scaffold Expo app workspace with four tabs" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Команда `content:app` — встроенная база в приложении

**Files:**
- Create: `tools/src/app-content.ts`, `tools/src/cli/app-content.ts`, `tools/test/app-content.test.ts`
- Modify: `package.json` (скрипт `content:app`)
- Generated (commit): `app/assets/content/content.json`, `app/assets/content/photos/*.webp`, `app/src/content/bundled-photos.ts`

**Interfaces:**
- Consumes: `buildContent` (`tools/src/build.ts`), `manifestSchema` (`@travy/shared`), `REPO_ROOT`, `DIST_DIR` (`tools/src/paths.ts`); в тестах `sampleTree`, `writeContentTree`, `makeTempDir`, `cleanupTempDirs` (`tools/test/helpers.ts`).
- Produces: `bundledPhotosModule(photoPaths: string[]): string`; `syncAppContent(opts: { distDir: string; appDir: string }): Promise<{ photoCount: number; contentVersion: number }>`; модуль `app/src/content/bundled-photos.ts` с `export const BUNDLED_PHOTOS: Record<string, number>` (ключ — путь `photos/<sha256>.webp` из базы).

- [ ] **Step 1: Написать падающий тест**

`tools/test/app-content.test.ts`:

```ts
import { existsSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { bundledPhotosModule, syncAppContent } from '../src/app-content';
import { buildContent } from '../src/build';
import { cleanupTempDirs, makeTempDir, sampleTree, writeContentTree } from './helpers';

afterEach(cleanupTempDirs);

const A = `photos/${'a'.repeat(64)}.webp`;
const B = `photos/${'b'.repeat(64)}.webp`;

describe('bundledPhotosModule', () => {
  it('генерирует отсортированную таблицу require с прямыми слэшами', () => {
    const code = bundledPhotosModule([B, A]);
    expect(code).toContain('export const BUNDLED_PHOTOS: Record<string, number> = {');
    expect(code.indexOf(A)).toBeLessThan(code.indexOf(B));
    expect(code).toContain(`  '${A}': require('../../assets/content/${A}'),`);
    expect(code).not.toContain('\\');
  });

  it('пустой список — пустая таблица', () => {
    expect(bundledPhotosModule([])).toContain('export const BUNDLED_PHOTOS: Record<string, number> = {};');
  });
});

describe('syncAppContent', () => {
  async function prepare() {
    const contentDir = await writeContentTree(sampleTree());
    const distDir = path.join(await makeTempDir(), 'dist');
    await buildContent({ contentDir, distDir, now: new Date('2026-10-18T10:00:00Z') });
    const appDir = await makeTempDir();
    return { distDir, appDir };
  }

  it('копирует базу и фото и пишет модуль фото', async () => {
    const { distDir, appDir } = await prepare();
    const result = await syncAppContent({ distDir, appDir });

    expect(result).toEqual({ photoCount: 2, contentVersion: 202610181000 });
    const copied = await readFile(path.join(appDir, 'assets', 'content', 'content.json'), 'utf8');
    expect(copied).toBe(await readFile(path.join(distDir, 'content.json'), 'utf8'));
    expect(await readdir(path.join(appDir, 'assets', 'content', 'photos'))).toHaveLength(2);
    const module = await readFile(path.join(appDir, 'src', 'content', 'bundled-photos.ts'), 'utf8');
    expect(module.match(/require\(/g)).toHaveLength(2);
  });

  it('удаляет устаревшие файлы прежней синхронизации', async () => {
    const { distDir, appDir } = await prepare();
    const stale = path.join(appDir, 'assets', 'content', 'photos', 'stale.webp');
    await mkdir(path.dirname(stale), { recursive: true });
    await writeFile(stale, 'old');
    await syncAppContent({ distDir, appDir });
    expect(existsSync(stale)).toBe(false);
  });

  it('без собранной базы — понятная ошибка', async () => {
    const appDir = await makeTempDir();
    await expect(syncAppContent({ distDir: path.join(appDir, 'no-dist'), appDir })).rejects.toThrow(
      /сначала соберите базу/,
    );
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run tools/test/app-content.test.ts`
Expected: FAIL — `Cannot find module '../src/app-content'`.

- [ ] **Step 3: Реализовать**

`tools/src/app-content.ts`:

```ts
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { manifestSchema } from '@travy/shared';

/** Модуль с таблицей require() для фото: Metro подключает ресурсы только статически. */
export function bundledPhotosModule(photoPaths: string[]): string {
  const header =
    '// Сгенерировано командой `npm run content:app` — не редактировать вручную.\n' +
    'export const BUNDLED_PHOTOS: Record<string, number> = ';
  if (photoPaths.length === 0) return `${header}{};\n`;
  const lines = [...photoPaths]
    .sort()
    .map((p) => `  '${p}': require('../../assets/content/${p}'),`);
  return `${header}{\n${lines.join('\n')}\n};\n`;
}

export interface SyncAppContentOptions {
  distDir: string;
  appDir: string;
}

/** Копирует собранную базу (dist/) в app/assets/content и генерирует app/src/content/bundled-photos.ts. */
export async function syncAppContent({ distDir, appDir }: SyncAppContentOptions) {
  const manifestFile = path.join(distDir, 'manifest.json');
  if (!existsSync(manifestFile)) {
    throw new Error(`Не найден ${manifestFile} — сначала соберите базу: npm run content:build`);
  }
  const manifest = manifestSchema.parse(JSON.parse(await readFile(manifestFile, 'utf8')));

  const target = path.join(appDir, 'assets', 'content');
  await rm(target, { recursive: true, force: true });
  await mkdir(path.join(target, 'photos'), { recursive: true });
  await copyFile(path.join(distDir, manifest.content.path), path.join(target, 'content.json'));
  for (const photo of manifest.photos) {
    await copyFile(path.join(distDir, photo.path), path.join(target, photo.path));
  }

  const moduleDir = path.join(appDir, 'src', 'content');
  await mkdir(moduleDir, { recursive: true });
  await writeFile(
    path.join(moduleDir, 'bundled-photos.ts'),
    bundledPhotosModule(manifest.photos.map((p) => p.path)),
  );
  return { photoCount: manifest.photos.length, contentVersion: manifest.contentVersion };
}
```

`tools/src/cli/app-content.ts`:

```ts
import path from 'node:path';
import { syncAppContent } from '../app-content';
import { DIST_DIR, REPO_ROOT } from '../paths';

try {
  const r = await syncAppContent({ distDir: DIST_DIR, appDir: path.join(REPO_ROOT, 'app') });
  console.log(`База ${r.contentVersion} и ${r.photoCount} фото скопированы в app/assets/content`);
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
```

В корневом `package.json` в `scripts` добавить:

```json
    "content:app": "npm run content:build && tsx tools/src/cli/app-content.ts"
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run tools/test/app-content.test.ts && npm run typecheck`
Expected: PASS (5 тестов), `tsc` без ошибок.

- [ ] **Step 5: Сгенерировать встроенную базу**

Run: `npm run content:app && ls app/assets/content/photos | wc -l && head -3 app/src/content/bundled-photos.ts`
Expected: `База … и 20 фото скопированы…` (по текущей базе: 6 трав, 20 фото); в модуле строки `require('../../assets/content/photos/…webp')`.

- [ ] **Step 6: Commit**

```bash
git add package.json tools app/assets/content app/src/content/bundled-photos.ts
git commit -m "feat(tools): sync built content into the app (npm run content:app)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Фильтр и сортировка трав (`shared/src/query/filter.ts`)

**Files:**
- Create: `shared/src/query/filter.ts`, `shared/src/query/index.ts`, `shared/test/query-fixtures.ts`, `shared/test/filter.test.ts`
- Modify: `shared/src/index.ts`

**Interfaces:**
- Consumes: `Herb`, `Dictionaries`, `bundleSchemas` (`shared/src/schema.ts`); `evidenceRank`, `meetsEvidenceThreshold` (`shared/src/evidence.ts`); `EvidenceLevel`, `LifeForm`, `Sourcing` (`shared/src/enums.ts`).
- Produces (из `@travy/shared`): `SAFETY_FLAGS`, `type SafetyFlag`; `interface HerbFilter`; `emptyFilter(): HerbFilter`; `activeFilterCount(f): number`; `interface FilterIndex`; `buildFilterIndex(d: Dictionaries): FilterIndex`; `matchesFilter(herb: Herb, f: HerbFilter, index: FilterIndex): boolean`; `compareNames(a: string, b: string): number`; `sortHerbs(herbs: readonly Herb[], f: HerbFilter): Herb[]`; `queryHerbs(herbs: readonly Herb[], f: HerbFilter, index: FilterIndex): Herb[]`. В тестах: `queryDictionaries()`, `queryHerbs4()`, `queryContent()` из `shared/test/query-fixtures.ts`.

- [ ] **Step 1: Тестовые данные**

`shared/test/query-fixtures.ts`:

```ts
import { SCHEMA_VERSION, bundleSchemas, type ContentBundle, type Dictionaries, type Herb } from '../src/schema';
import { sampleDictionaries, sampleHerb, sampleSources } from './sample';

/** Вымышленные травы и словари для тестов логики приложения. */

const PHOTO = {
  path: `photos/${'a'.repeat(64)}.webp`,
  kind: 'plant',
  author: 'A',
  license: 'CC0',
  source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
};

export function queryDictionaries(): Dictionaries {
  const d = sampleDictionaries();
  return bundleSchemas.dictionaries.parse({
    ...d,
    indications: [...d.indications, { id: 'gastritis', name: 'Гастрит', organ_system: 'digestive' }],
    organSystems: [...d.organSystems, { id: 'digestive', name: 'Пищеварение' }],
    substances: [...d.substances, { id: 'tannin', name: 'Танины', class: 'tannins' }],
    substanceClasses: [...d.substanceClasses, { id: 'tannins', name: 'Дубильные вещества' }],
    actions: [...d.actions, { id: 'sedative', name: 'Успокаивающее' }],
    plantParts: [...d.plantParts, { id: 'flowers', name: 'Цветки' }],
    habitats: [...d.habitats, { id: 'forest', name: 'Лес' }, { id: 'swamp', name: 'Болото' }],
    families: [...d.families, { id: 'asteraceae', name: 'Астровые', latin: 'Asteraceae' }],
  });
}

const ev = (indication: string, level: string) => ({
  indication,
  evidence: { level, note: 'Тест' },
  sources: [{ id: 'book-test' }],
});
const harvest = (part: string, months: number[]) => ({
  part,
  months,
  how: 'Тест',
  drying: 'Тест',
  storage: 'Тест',
  sources: [{ id: 'book-test' }],
});
const safety = (patch: Record<string, unknown> = {}) => ({
  pregnancy: 'unknown',
  lactation: 'unknown',
  children: { status: 'unknown' },
  toxicity: 'none',
  sources: [{ id: 'book-test' }],
  ...patch,
});

function makeHerb(id: string, name: string, patch: Record<string, unknown>): Herb {
  return bundleSchemas.herb.parse({ ...sampleHerb(id, name), photos: [PHOTO], ...patch });
}

/** alpha «Алтей», beta «Берёза», delta «Ежевика», gamma «Ёлочник». */
export function queryHerbs4(): Herb[] {
  return [
    makeHerb('alpha', 'Алтей', {
      latin: 'Althaea testus L.',
      other_names: ['просвирник'],
      family: 'malvaceae',
      life_form: 'herb',
      sourcing: ['wild'],
      habitats: ['meadow'],
      substances: ['mucilage'],
      actions: ['expectorant'],
      indications: [ev('cough', 'proven'), ev('insomnia', 'folk')],
      harvest: [harvest('leaf', [6, 7]), harvest('root', [9, 10])],
      safety: safety({ pregnancy: 'ok', children: { status: 'ok', from_age: 3 } }),
    }),
    makeHerb('beta', 'Берёза', {
      latin: 'Betula testus L.',
      other_names: [],
      family: 'asteraceae',
      life_form: 'tree',
      sourcing: ['wild', 'pharmacy'],
      habitats: ['forest'],
      substances: ['tannin'],
      actions: ['expectorant'],
      indications: [ev('cough', 'traditional'), ev('gastritis', 'traditional')],
      harvest: [harvest('leaf', [5])],
      safety: safety({ children: { status: 'caution' }, toxicity: 'low' }),
    }),
    makeHerb('delta', 'Ежевика', {
      latin: 'Rubus testus L.',
      other_names: [],
      family: 'plantaginaceae',
      life_form: 'herb',
      sourcing: ['garden'],
      habitats: ['meadow'],
      substances: ['mucilage'],
      actions: ['expectorant'],
      indications: [ev('gastritis', 'proven'), ev('cough', 'folk')],
      harvest: [harvest('root', [6])],
      safety: safety({ lactation: 'ok' }),
    }),
    makeHerb('gamma', 'Ёлочник', {
      latin: 'Gamma testus L.',
      other_names: [],
      family: 'asteraceae',
      life_form: 'shrub',
      sourcing: ['garden'],
      habitats: ['forest', 'meadow'],
      substances: ['tannin', 'mucilage'],
      actions: ['sedative'],
      indications: [ev('insomnia', 'refuted')],
      harvest: [harvest('flowers', [6])],
      safety: safety({ pregnancy: 'caution' }),
    }),
  ];
}

export function queryContent(herbs: Herb[] = queryHerbs4()): ContentBundle {
  return bundleSchemas.contentBundle.parse({
    schemaVersion: SCHEMA_VERSION,
    contentVersion: 202610180000,
    herbs,
    recipes: [],
    dictionaries: queryDictionaries(),
    sources: sampleSources(),
  });
}
```

- [ ] **Step 2: Написать падающий тест**

`shared/test/filter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  buildFilterIndex,
  compareNames,
  emptyFilter,
  queryHerbs,
  type HerbFilter,
} from '../src/query/filter';
import { queryDictionaries, queryHerbs4 } from './query-fixtures';

const herbs = queryHerbs4();
const index = buildFilterIndex(queryDictionaries());
const ids = (patch: Partial<HerbFilter>) => queryHerbs(herbs, { ...emptyFilter(), ...patch }, index).map((h) => h.id);

describe('queryHerbs: без фильтра', () => {
  it('все травы по алфавиту, «ё» рядом с «е»', () => {
    expect(ids({})).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });
});

describe('группы-признаки: «И»', () => {
  it('одно показание', () => expect(ids({ indications: ['cough'] }).sort()).toEqual(['alpha', 'beta', 'delta']));
  it('два показания — оба должны быть', () =>
    expect(ids({ indications: ['cough', 'gastritis'] }).sort()).toEqual(['beta', 'delta']));
  it('вещество', () => expect(ids({ substances: ['tannin'] }).sort()).toEqual(['beta', 'gamma']));
  it('класс веществ — через словарь веществ', () =>
    expect(ids({ substanceClasses: ['tannins'] }).sort()).toEqual(['beta', 'gamma']));
  it('действие', () => expect(ids({ actions: ['sedative'] })).toEqual(['gamma']));
  it('система органов — хотя бы одно показание травы из этой системы', () =>
    expect(ids({ organSystems: ['digestive'] }).sort()).toEqual(['beta', 'delta']));
  it('две системы органов — обе', () => expect(ids({ organSystems: ['digestive', 'nervous'] })).toEqual([]));
  it('безопасность: можно детям', () => expect(ids({ safety: ['children-ok'] })).toEqual(['alpha']));
  it('безопасность: при беременности и нетоксично — оба условия', () =>
    expect(ids({ safety: ['pregnancy-ok', 'non-toxic'] })).toEqual(['alpha']));
  it('безопасность: при кормлении', () => expect(ids({ safety: ['lactation-ok'] })).toEqual(['delta']));
});

describe('группы-перечисления: «ИЛИ»', () => {
  it('месяцы', () => expect(ids({ months: [5, 9] }).sort()).toEqual(['alpha', 'beta']));
  it('места', () => expect(ids({ habitats: ['forest'] }).sort()).toEqual(['beta', 'gamma']));
  it('семейства', () => expect(ids({ families: ['malvaceae', 'plantaginaceae'] }).sort()).toEqual(['alpha', 'delta']));
  it('жизненная форма', () => expect(ids({ lifeForms: ['tree', 'shrub'] }).sort()).toEqual(['beta', 'gamma']));
  it('где взять', () => expect(ids({ sourcing: ['pharmacy', 'wild'] }).sort()).toEqual(['alpha', 'beta']));
  it('значение, которого нет ни у одной травы', () => expect(ids({ habitats: ['swamp'] })).toEqual([]));
});

describe('месяц и часть растения — в одной записи сбора', () => {
  it('листья в сентябре: у alpha в сентябре корни — не подходит', () =>
    expect(ids({ parts: ['leaf'], months: [9] })).toEqual([]));
  it('листья в июне', () => expect(ids({ parts: ['leaf'], months: [6] })).toEqual(['alpha']));
  it('только часть растения', () => expect(ids({ parts: ['root'] }).sort()).toEqual(['alpha', 'delta']));
});

describe('порог доказанности', () => {
  it('без выбранных показаний — хотя бы одно показание не ниже порога', () =>
    expect(ids({ minEvidence: 'traditional' }).sort()).toEqual(['alpha', 'beta', 'delta']));
  it('с выбранными показаниями — каждое выбранное не ниже порога', () =>
    expect(ids({ indications: ['cough'], minEvidence: 'traditional' }).sort()).toEqual(['alpha', 'beta']));
  it('refuted ниже любого порога', () =>
    expect(ids({ indications: ['insomnia'], minEvidence: 'folk' })).toEqual(['alpha']));
});

describe('сортировка', () => {
  it('с показаниями — по доказанности выбранного показания, затем по названию', () =>
    expect(ids({ indications: ['cough'] })).toEqual(['alpha', 'beta', 'delta']));
  it('по наименьшему уровню среди нескольких выбранных', () =>
    expect(ids({ indications: ['cough', 'gastritis'] })).toEqual(['beta', 'delta']));
  it('compareNames: русский алфавит', () => {
    expect(['Ёлочник', 'Ежевика', 'Алтей', 'Берёза'].sort(compareNames)).toEqual([
      'Алтей',
      'Берёза',
      'Ежевика',
      'Ёлочник',
    ]);
  });
});

describe('activeFilterCount', () => {
  it('считает все выбранные значения и порог', () => {
    expect(activeFilterCount(emptyFilter())).toBe(0);
    expect(activeFilterCount({ ...emptyFilter(), indications: ['cough'], months: [5, 6], minEvidence: 'proven' })).toBe(4);
  });
  it('emptyFilter возвращает новый объект', () => {
    const a = emptyFilter();
    a.months.push(1);
    expect(emptyFilter().months).toEqual([]);
  });
});
```

- [ ] **Step 3: Запустить тест и убедиться, что он падает**

Run: `npx vitest run shared/test/filter.test.ts`
Expected: FAIL — `Cannot find module '../src/query/filter'`.

- [ ] **Step 4: Реализовать**

`shared/src/query/filter.ts`:

```ts
import type { EvidenceLevel, LifeForm, Sourcing } from '../enums';
import { evidenceRank, meetsEvidenceThreshold } from '../evidence';
import type { Dictionaries, Herb } from '../schema';

export const SAFETY_FLAGS = ['pregnancy-ok', 'lactation-ok', 'children-ok', 'non-toxic'] as const;
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

/** Выбранные условия фильтра (спецификация §6.3). Пустой список — условие не задано. */
export interface HerbFilter {
  indications: string[];
  substances: string[];
  substanceClasses: string[];
  actions: string[];
  organSystems: string[];
  safety: SafetyFlag[];
  months: number[];
  parts: string[];
  habitats: string[];
  families: string[];
  lifeForms: LifeForm[];
  sourcing: Sourcing[];
  minEvidence: EvidenceLevel | null;
}

export function emptyFilter(): HerbFilter {
  return {
    indications: [],
    substances: [],
    substanceClasses: [],
    actions: [],
    organSystems: [],
    safety: [],
    months: [],
    parts: [],
    habitats: [],
    families: [],
    lifeForms: [],
    sourcing: [],
    minEvidence: null,
  };
}

export function activeFilterCount(f: HerbFilter): number {
  const lists = [
    f.indications,
    f.substances,
    f.substanceClasses,
    f.actions,
    f.organSystems,
    f.safety,
    f.months,
    f.parts,
    f.habitats,
    f.families,
    f.lifeForms,
    f.sourcing,
  ];
  return lists.reduce((sum, list) => sum + list.length, 0) + (f.minEvidence ? 1 : 0);
}

/** Связи из словарей, нужные фильтру: показание → система органов, вещество → класс. */
export interface FilterIndex {
  organSystemOf: Map<string, string>;
  classOf: Map<string, string>;
}

export function buildFilterIndex(d: Dictionaries): FilterIndex {
  return {
    organSystemOf: new Map(d.indications.map((x) => [x.id, x.organ_system])),
    classOf: new Map(d.substances.map((x) => [x.id, x.class])),
  };
}

function matchesSafety(herb: Herb, flag: SafetyFlag): boolean {
  switch (flag) {
    case 'pregnancy-ok':
      return herb.safety.pregnancy === 'ok';
    case 'lactation-ok':
      return herb.safety.lactation === 'ok';
    case 'children-ok':
      return herb.safety.children.status === 'ok';
    case 'non-toxic':
      return herb.safety.toxicity === 'none';
  }
}

const isString = (x: string | undefined): x is string => x !== undefined;
const hasAny = <T>(values: readonly T[], selected: readonly T[]) => values.some((v) => selected.includes(v));

export function matchesFilter(herb: Herb, f: HerbFilter, index: FilterIndex): boolean {
  const indicationIds = new Set(herb.indications.map((x) => x.indication));
  if (!f.indications.every((id) => indicationIds.has(id))) return false;
  if (!f.substances.every((id) => herb.substances.includes(id))) return false;

  const classes = new Set(herb.substances.map((id) => index.classOf.get(id)).filter(isString));
  if (!f.substanceClasses.every((c) => classes.has(c))) return false;
  if (!f.actions.every((id) => herb.actions.includes(id))) return false;

  const systems = new Set(herb.indications.map((x) => index.organSystemOf.get(x.indication)).filter(isString));
  if (!f.organSystems.every((s) => systems.has(s))) return false;
  if (!f.safety.every((flag) => matchesSafety(herb, flag))) return false;

  if (f.months.length > 0 || f.parts.length > 0) {
    const inOneRecord = herb.harvest.some(
      (h) =>
        (f.parts.length === 0 || f.parts.includes(h.part)) && (f.months.length === 0 || hasAny(h.months, f.months)),
    );
    if (!inOneRecord) return false;
  }
  if (f.habitats.length > 0 && !hasAny(herb.habitats, f.habitats)) return false;
  if (f.families.length > 0 && !f.families.includes(herb.family)) return false;
  if (f.lifeForms.length > 0 && !f.lifeForms.includes(herb.life_form)) return false;
  if (f.sourcing.length > 0 && !hasAny(herb.sourcing, f.sourcing)) return false;

  if (f.minEvidence) {
    const threshold = f.minEvidence;
    const ok = (level: EvidenceLevel) => meetsEvidenceThreshold(level, threshold);
    if (f.indications.length > 0) {
      const selected = herb.indications.filter((x) => f.indications.includes(x.indication));
      if (!selected.every((x) => ok(x.evidence.level))) return false;
    } else if (!herb.indications.some((x) => ok(x.evidence.level))) {
      return false;
    }
  }
  return true;
}

const collator = new Intl.Collator('ru');

/** Сравнение названий по русскому алфавиту («ё» рядом с «е»). */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

function lowestSelectedRank(herb: Herb, indicationIds: readonly string[]): number {
  const ranks = herb.indications
    .filter((x) => indicationIds.includes(x.indication))
    .map((x) => evidenceRank(x.evidence.level));
  return ranks.length > 0 ? Math.min(...ranks) : -1;
}

/** Спецификация §6.4: с выбранными показаниями — по наименьшему их уровню (по убыванию), затем по названию. */
export function sortHerbs(herbs: readonly Herb[], f: HerbFilter): Herb[] {
  return [...herbs].sort((a, b) => {
    if (f.indications.length > 0) {
      const diff = lowestSelectedRank(b, f.indications) - lowestSelectedRank(a, f.indications);
      if (diff !== 0) return diff;
    }
    return compareNames(a.name, b.name);
  });
}

export function queryHerbs(herbs: readonly Herb[], f: HerbFilter, index: FilterIndex): Herb[] {
  return sortHerbs(
    herbs.filter((h) => matchesFilter(h, f, index)),
    f,
  );
}
```

`shared/src/query/index.ts`:

```ts
export * from './filter';
```

В `shared/src/index.ts` добавить строку:

```ts
export * from './query';
```

- [ ] **Step 5: Запустить тесты**

Run: `npx vitest run shared/test/filter.test.ts && npm run typecheck`
Expected: PASS (27 тестов), `tsc` без ошибок.

- [ ] **Step 6: Commit**

```bash
git add shared
git commit -m "feat(shared): herb filter and sorting per spec 6.3-6.4" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Поиск и каталог (`search.ts`, `catalog.ts`)

**Files:**
- Create: `shared/src/query/search.ts`, `shared/src/query/catalog.ts`, `shared/test/search.test.ts`, `shared/test/catalog.test.ts`
- Modify: `shared/src/query/index.ts`, `shared/src/labels.ts`

**Interfaces:**
- Consumes: `HerbFilter`, `emptyFilter`, `matchesFilter`, `buildFilterIndex`, `compareNames`, `SAFETY_FLAGS`, `SafetyFlag` (Task 3); `ContentBundle`, `Herb`; `LIFE_FORMS`, `SOURCING_OPTIONS`; `LIFE_FORM_LABELS`, `SOURCING_LABELS`, `MONTH_NAMES`, `monthName`.
- Produces (из `@travy/shared`): `SAFETY_FLAG_LABELS: Record<SafetyFlag, string>`; `normalizeText(s: string): string`; `interface SearchGroupHit { kind: 'indications' | 'substances' | 'actions'; id: string; name: string }`; `interface SearchResult { herbs: Herb[]; groups: SearchGroupHit[] }`; `searchContent(content: ContentBundle, query: string): SearchResult`; `type CatalogKey`; `CATALOG_SECTIONS: { key: CatalogKey; title: string }[]`; `interface CatalogGroup { key: CatalogKey; value: string; label: string; count: number }`; `catalogGroups(content: ContentBundle, key: CatalogKey): CatalogGroup[]`; `filterForGroup(key: CatalogKey, value: string): HerbFilter`; `collectNow(content: ContentBundle, month: number): Herb[]`.

- [ ] **Step 1: Написать падающие тесты**

`shared/test/search.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeText, searchContent } from '../src/query/search';
import { queryContent } from './query-fixtures';

const content = queryContent();
const herbIds = (q: string) => searchContent(content, q).herbs.map((h) => h.id);

describe('normalizeText', () => {
  it('нижний регистр, ё → е, лишние пробелы', () => {
    expect(normalizeText('  Ёлочник   Большой ')).toBe('елочник большой');
  });
});

describe('searchContent', () => {
  it('ищет по названию без учёта регистра и «ё»', () => {
    expect(herbIds('ЕЛОЧ')).toEqual(['gamma']);
    expect(herbIds('берез')).toEqual(['beta']);
  });
  it('ищет по народным названиям и латыни', () => {
    expect(herbIds('просвир')).toEqual(['alpha']);
    expect(herbIds('betula')).toEqual(['beta']);
  });
  it('результаты по алфавиту', () => {
    expect(herbIds('testus')).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });
  it('находит группы по названию и синонимам', () => {
    expect(searchContent(content, 'каш').groups).toEqual([{ kind: 'indications', id: 'cough', name: 'Кашель' }]);
    expect(searchContent(content, 'кашлять').groups.map((g) => g.id)).toEqual(['cough']);
    expect(searchContent(content, 'танин').groups).toEqual([{ kind: 'substances', id: 'tannin', name: 'Танины' }]);
  });
  it('не предлагает группы, которых нет ни у одной травы', () => {
    const noTannin = queryContent(queryContent().herbs.filter((h) => !h.substances.includes('tannin')));
    expect(searchContent(noTannin, 'танин').groups).toEqual([]);
  });
  it('пустой запрос — пустой результат', () => {
    expect(searchContent(content, '   ')).toEqual({ herbs: [], groups: [] });
  });
});
```

`shared/test/catalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { CATALOG_SECTIONS, catalogGroups, collectNow, filterForGroup } from '../src/query/catalog';
import { emptyFilter } from '../src/query/filter';
import { queryContent } from './query-fixtures';

const content = queryContent();
const groups = (key: Parameters<typeof catalogGroups>[1]) =>
  catalogGroups(content, key).map((g) => [g.value, g.label, g.count]);

describe('catalogGroups', () => {
  it('показания: по алфавиту, с количеством трав', () => {
    expect(groups('indications')).toEqual([
      ['insomnia', 'Бессонница', 2],
      ['gastritis', 'Гастрит', 2],
      ['cough', 'Кашель', 3],
    ]);
  });
  it('системы органов — через показания', () => {
    expect(groups('organSystems')).toEqual([
      ['respiratory', 'Дыхательная система', 3],
      ['nervous', 'Нервная система', 2],
      ['digestive', 'Пищеварение', 2],
    ]);
  });
  it('классы веществ', () => {
    expect(groups('substanceClasses')).toEqual([
      ['tannins', 'Дубильные вещества', 2],
      ['polysaccharides', 'Полисахариды', 3],
    ]);
  });
  it('месяцы — по порядку месяцев, только те, где что-то собирают', () => {
    expect(groups('months')).toEqual([
      ['5', 'май', 1],
      ['6', 'июнь', 3],
      ['7', 'июль', 1],
      ['9', 'сентябрь', 1],
      ['10', 'октябрь', 1],
    ]);
  });
  it('пустые группы не показываются', () => {
    expect(groups('habitats').map((g) => g[0])).not.toContain('swamp');
  });
  it('жизненная форма, где взять, безопасность — русские подписи', () => {
    expect(groups('lifeForms')).toEqual([
      ['tree', 'Дерево', 1],
      ['shrub', 'Кустарник', 1],
      ['herb', 'Трава', 2],
    ]);
    expect(groups('sourcing')).toEqual([
      ['pharmacy', 'Аптечное', 1],
      ['wild', 'Дикорастущее', 2],
      ['garden', 'Садовое', 2],
    ]);
    expect(groups('safety')).toEqual([
      ['children-ok', 'Можно детям', 1],
      ['pregnancy-ok', 'Можно при беременности', 1],
      ['lactation-ok', 'Можно при кормлении', 1],
      ['non-toxic', 'Нетоксично', 3],
    ]);
  });
  it('пустая база — пустой каталог', () => {
    const empty = queryContent([]);
    for (const section of CATALOG_SECTIONS) expect(catalogGroups(empty, section.key)).toEqual([]);
  });
});

describe('filterForGroup', () => {
  it('ставит одно значение в нужное поле', () => {
    expect(filterForGroup('months', '6')).toEqual({ ...emptyFilter(), months: [6] });
    expect(filterForGroup('lifeForms', 'tree')).toEqual({ ...emptyFilter(), lifeForms: ['tree'] });
    expect(filterForGroup('indications', 'cough')).toEqual({ ...emptyFilter(), indications: ['cough'] });
  });
});

describe('CATALOG_SECTIONS', () => {
  it('все 12 группировок с русскими названиями', () => {
    expect(CATALOG_SECTIONS.map((s) => s.title)).toEqual([
      'От чего помогает',
      'Действующие вещества',
      'Классы веществ',
      'Действие',
      'Система органов',
      'Месяц сбора',
      'Часть растения',
      'Где растёт',
      'Семейство',
      'Жизненная форма',
      'Где взять',
      'Безопасность',
    ]);
  });
});

describe('collectNow', () => {
  it('травы, которые собирают в этом месяце, по алфавиту', () => {
    expect(collectNow(content, 6).map((h) => h.id)).toEqual(['alpha', 'delta', 'gamma']);
    expect(collectNow(content, 1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Запустить тесты и убедиться, что они падают**

Run: `npx vitest run shared/test/search.test.ts shared/test/catalog.test.ts`
Expected: FAIL — `Cannot find module '../src/query/search'` / `'../src/query/catalog'`.

- [ ] **Step 3: Реализовать**

В конец `shared/src/labels.ts` добавить:

```ts
import type { SafetyFlag } from './query/filter';

export const SAFETY_FLAG_LABELS: Record<SafetyFlag, string> = {
  'pregnancy-ok': 'Можно при беременности',
  'lactation-ok': 'Можно при кормлении',
  'children-ok': 'Можно детям',
  'non-toxic': 'Нетоксично',
};
```

(Импорт `import type` разместить вверху файла рядом с остальными импортами.)

`shared/src/query/search.ts`:

```ts
import type { ContentBundle, Herb } from '../schema';
import { compareNames } from './filter';

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

export interface SearchGroupHit {
  kind: 'indications' | 'substances' | 'actions';
  id: string;
  name: string;
}

export interface SearchResult {
  herbs: Herb[];
  groups: SearchGroupHit[];
}

/** Спецификация §6.5: подстрока в названии, народных названиях и латыни + совпавшие группы. */
export function searchContent(content: ContentBundle, query: string): SearchResult {
  const q = normalizeText(query);
  if (!q) return { herbs: [], groups: [] };
  const hit = (...texts: string[]) => texts.some((t) => normalizeText(t).includes(q));

  const herbs = content.herbs
    .filter((h) => hit(h.name, h.latin, ...h.other_names))
    .sort((a, b) => compareNames(a.name, b.name));

  const used = {
    indications: new Set(content.herbs.flatMap((h) => h.indications.map((x) => x.indication))),
    substances: new Set(content.herbs.flatMap((h) => h.substances)),
    actions: new Set(content.herbs.flatMap((h) => h.actions)),
  };
  const groups: SearchGroupHit[] = [];
  for (const kind of ['indications', 'substances', 'actions'] as const) {
    for (const item of content.dictionaries[kind]) {
      if (used[kind].has(item.id) && hit(item.name, ...item.synonyms)) {
        groups.push({ kind, id: item.id, name: item.name });
      }
    }
  }
  return { herbs, groups };
}
```

`shared/src/query/catalog.ts`:

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

function candidates(content: ContentBundle, key: CatalogKey): { value: string; label: string }[] {
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
  const groups = candidates(content, key)
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

`shared/src/query/index.ts`:

```ts
export * from './catalog';
export * from './filter';
export * from './search';
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run shared && npm run typecheck`
Expected: PASS (все тесты shared, включая 7 search + 11 catalog), `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add shared
git commit -m "feat(shared): search, catalog groups and collect-now" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Пользовательские данные (`shared/src/user.ts`)

**Files:**
- Create: `shared/src/user.ts`, `shared/test/user.test.ts`
- Modify: `shared/src/index.ts`

**Interfaces:**
- Produces (из `@travy/shared`): `USER_DATA_KEY = 'travy.user.v1'`; `interface UserNote { text: string; updatedAt: string }`; `interface UserData { favorites: string[]; notes: Record<string, UserNote>; disclaimerAccepted: boolean }`; `emptyUserData(): UserData`; `parseUserData(raw: string | null): UserData`; `serializeUserData(data: UserData): string`; `isFavorite(data, herbId): boolean`; `toggleFavorite(data, herbId): UserData`; `setNote(data, herbId, text, now: Date): UserData`; `acceptDisclaimer(data): UserData`. Все функции не мутируют входные данные.

- [ ] **Step 1: Написать падающий тест**

`shared/test/user.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  acceptDisclaimer,
  emptyUserData,
  isFavorite,
  parseUserData,
  serializeUserData,
  setNote,
  toggleFavorite,
  USER_DATA_KEY,
} from '../src/user';

const NOW = new Date('2026-10-18T12:00:00Z');

describe('избранное', () => {
  it('добавляет и убирает, не мутируя исходные данные', () => {
    const empty = emptyUserData();
    const added = toggleFavorite(empty, 'alpha');
    expect(isFavorite(added, 'alpha')).toBe(true);
    expect(isFavorite(empty, 'alpha')).toBe(false);
    expect(isFavorite(toggleFavorite(added, 'alpha'), 'alpha')).toBe(false);
  });
});

describe('заметки', () => {
  it('сохраняет текст без лишних пробелов и время', () => {
    const data = setNote(emptyUserData(), 'alpha', '  растёт у ручья  ', NOW);
    expect(data.notes.alpha).toEqual({ text: 'растёт у ручья', updatedAt: '2026-10-18T12:00:00.000Z' });
  });
  it('пустой текст удаляет заметку', () => {
    const data = setNote(setNote(emptyUserData(), 'alpha', 'текст', NOW), 'alpha', '   ', NOW);
    expect(data.notes).toEqual({});
  });
});

describe('дисклеймер', () => {
  it('отмечает принятие', () => {
    expect(acceptDisclaimer(emptyUserData()).disclaimerAccepted).toBe(true);
  });
});

describe('parseUserData', () => {
  it('нет данных — пустые данные', () => {
    expect(parseUserData(null)).toEqual(emptyUserData());
  });
  it('сохранённое читается обратно', () => {
    const data = acceptDisclaimer(setNote(toggleFavorite(emptyUserData(), 'alpha'), 'beta', 'x', NOW));
    expect(parseUserData(serializeUserData(data))).toEqual(data);
  });
  it('испорченный JSON — пустые данные, без исключения', () => {
    expect(parseUserData('{не json')).toEqual(emptyUserData());
  });
  it('неожиданная форма — сохраняются только валидные части', () => {
    const raw = JSON.stringify({ favorites: ['alpha', 5], notes: 'oops', disclaimerAccepted: true, extra: 1 });
    expect(parseUserData(raw)).toEqual({ favorites: ['alpha'], notes: {}, disclaimerAccepted: true });
  });
  it('дубли в избранном убираются', () => {
    expect(parseUserData(JSON.stringify({ favorites: ['a', 'a', 'b'] })).favorites).toEqual(['a', 'b']);
  });
  it('ключ хранения', () => {
    expect(USER_DATA_KEY).toBe('travy.user.v1');
  });
});
```

- [ ] **Step 2: Запустить тест и убедиться, что он падает**

Run: `npx vitest run shared/test/user.test.ts`
Expected: FAIL — `Cannot find module '../src/user'`.

- [ ] **Step 3: Реализовать**

`shared/src/user.ts`:

```ts
import { z } from 'zod';

/** Ключ хранения избранного, заметок и согласия с дисклеймером на устройстве. */
export const USER_DATA_KEY = 'travy.user.v1';

export interface UserNote {
  text: string;
  updatedAt: string;
}

export interface UserData {
  favorites: string[];
  notes: Record<string, UserNote>;
  disclaimerAccepted: boolean;
}

export function emptyUserData(): UserData {
  return { favorites: [], notes: {}, disclaimerAccepted: false };
}

const noteSchema = z.object({ text: z.string(), updatedAt: z.string() });

/** Терпимо к старым и испорченным данным: всё невалидное заменяется пустым, валидное сохраняется. */
export function parseUserData(raw: string | null): UserData {
  if (!raw) return emptyUserData();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyUserData();
  }
  if (typeof value !== 'object' || value === null) return emptyUserData();
  const obj = value as Record<string, unknown>;

  const favorites = Array.isArray(obj.favorites)
    ? [...new Set(obj.favorites.filter((x): x is string => typeof x === 'string'))]
    : [];
  const notes: Record<string, UserNote> = {};
  if (typeof obj.notes === 'object' && obj.notes !== null && !Array.isArray(obj.notes)) {
    for (const [id, note] of Object.entries(obj.notes)) {
      const parsed = noteSchema.safeParse(note);
      if (parsed.success) notes[id] = parsed.data;
    }
  }
  return { favorites, notes, disclaimerAccepted: obj.disclaimerAccepted === true };
}

export function serializeUserData(data: UserData): string {
  return JSON.stringify(data);
}

export function isFavorite(data: UserData, herbId: string): boolean {
  return data.favorites.includes(herbId);
}

export function toggleFavorite(data: UserData, herbId: string): UserData {
  const favorites = isFavorite(data, herbId)
    ? data.favorites.filter((id) => id !== herbId)
    : [...data.favorites, herbId];
  return { ...data, favorites };
}

export function setNote(data: UserData, herbId: string, text: string, now: Date): UserData {
  const notes = { ...data.notes };
  const trimmed = text.trim();
  if (trimmed) notes[herbId] = { text: trimmed, updatedAt: now.toISOString() };
  else delete notes[herbId];
  return { ...data, notes };
}

export function acceptDisclaimer(data: UserData): UserData {
  return { ...data, disclaimerAccepted: true };
}
```

В `shared/src/index.ts` добавить:

```ts
export * from './user';
```

- [ ] **Step 4: Запустить тесты**

Run: `npx vitest run shared/test/user.test.ts && npm run typecheck`
Expected: PASS (10 тестов), `tsc` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add shared
git commit -m "feat(shared): user data for favorites, notes and disclaimer" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Тема и базовые компоненты

**Files:**
- Create: `app/src/theme/index.ts`
- Create: `app/src/components/AppText.tsx`, `Screen.tsx`, `Card.tsx`, `Chip.tsx`, `Tag.tsx`, `EvidenceDot.tsx`, `ListRow.tsx`, `SearchField.tsx`, `SectionHeader.tsx`, `Button.tsx`, `index.ts`
- Modify: `app/src/app/(tabs)/_layout.tsx` (цвета панели вкладок из темы)

**Interfaces:**
- Consumes: `EvidenceLevel` из `@travy/shared`.
- Produces: `colors`, `radius`, `spacing`, `typography`, `fonts` из `@/theme`; компоненты из `@/components`: `AppText` (`variant`: `hero | title | heading | body | caption | tiny`, `tone`: `default | muted | faint | accent | danger`), `Screen` (`scroll?: boolean`, `padded?: boolean`), `Card`, `Chip` (`label`, `selected?`, `onPress?`), `Tag` (`label`), `EvidenceDot` (`level`), `ListRow` (`title`, `subtitle?`, `image?: number`, `tags?: string[]`, `right?: ReactNode`, `onPress?`), `SearchField` (`value`, `onChangeText`, `placeholder?`, `onSubmit?`), `SectionHeader` (`title`, `actionLabel?`, `onAction?`), `Button` (`label`, `onPress`, `variant?: 'primary' | 'secondary'`).

Тема — по `docs/design/2026-10-15-visual-reference.md`: почти чёрный фон с зелёным оттенком, светло-зелёный (шалфейный) акцент, тёмный текст на акценте, тёмные чипы с тонкой обводкой, заголовки с засечками, крупные скругления.

- [ ] **Step 1: Тема**

`app/src/theme/index.ts`:

```ts
import { Platform, type TextStyle } from 'react-native';
import type { EvidenceLevel } from '@travy/shared';

/** Единственное место с цветами, шрифтами и размерами. Смена стиля = правка этого файла. */
export const colors = {
  background: '#0B120E',
  surface: '#121B15',
  surfaceRaised: '#1A251E',
  border: '#26332B',
  text: '#E6EDE6',
  textMuted: '#9AAA9C',
  textFaint: '#6E7D71',
  accent: '#9BD49B',
  accentPressed: '#86C386',
  onAccent: '#0B120E',
  chip: '#18221C',
  danger: '#E26D6D',
  warning: '#E6B04A',
  overlay: 'rgba(11, 18, 14, 0.55)',
  evidence: {
    proven: '#7FC45A',
    traditional: '#E6B04A',
    folk: '#E08A5C',
    refuted: '#E26D6D',
  } satisfies Record<EvidenceLevel, string>,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }),
} as const;

export const typography = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
  tiny: { fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;
```

- [ ] **Step 2: Компоненты**

`app/src/components/AppText.tsx`:

```tsx
import { Text, type TextProps } from 'react-native';
import { colors, typography } from '@/theme';

const TONES = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  accent: colors.accent,
  danger: colors.danger,
} as const;

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  tone?: keyof typeof TONES;
}

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], { color: TONES[tone] }, style]} />;
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
}

export function Screen({ children, scroll = true, padded = true }: ScreenProps) {
  const padding = padded ? spacing.lg : 0;
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      {scroll ? (
        <ScrollView contentContainerStyle={{ padding, paddingBottom: spacing.xxl, gap: spacing.lg }}>{children}</ScrollView>
      ) : (
        <View style={{ flex: 1, padding, gap: spacing.lg }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
```

`app/src/components/Card.tsx`:

```tsx
import { View, type ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/theme';

export function Card({ style, ...rest }: ViewProps) {
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.lg,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        style,
      ]}
    />
  );
}
```

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

`app/src/components/Tag.tsx`:

```tsx
import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export function Tag({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <AppText variant="tiny" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
```

`app/src/components/EvidenceDot.tsx`:

```tsx
import { View } from 'react-native';
import type { EvidenceLevel } from '@travy/shared';
import { EVIDENCE_LABELS } from '@travy/shared';
import { colors } from '@/theme';

export function EvidenceDot({ level, size = 10 }: { level: EvidenceLevel; size?: number }) {
  return (
    <View
      accessibilityLabel={EVIDENCE_LABELS[level]}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.evidence[level] }}
    />
  );
}
```

`app/src/components/ListRow.tsx`:

```tsx
import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Tag } from './Tag';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  image?: number;
  tags?: string[];
  right?: ReactNode;
  onPress?: () => void;
}

export function ListRow({ title, subtitle, image, tags = [], right, onPress }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
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
      {image !== undefined && (
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

`app/src/components/SearchField.tsx`:

```tsx
import { TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function SearchField({ value, onChangeText, placeholder = 'Поиск трав, свойств, проблем…', onSubmit }: SearchFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      onSubmitEditing={onSubmit}
      returnKeyType="search"
      accessibilityLabel="Поиск"
      style={[
        typography.body,
        {
          color: colors.text,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
    />
  );
}
```

`app/src/components/SectionHeader.tsx`:

```tsx
import { Pressable, View } from 'react-native';
import { AppText } from './AppText';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <AppText variant="title">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <AppText variant="caption" tone="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
```

`app/src/components/Button.tsx`:

```tsx
import { Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onPress, variant = 'primary' }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: radius.pill,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.surface,
      })}
    >
      <AppText variant="heading" style={{ color: primary ? colors.onAccent : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
```

`app/src/components/index.ts`:

```ts
export * from './AppText';
export * from './Button';
export * from './Card';
export * from './Chip';
export * from './EvidenceDot';
export * from './ListRow';
export * from './Screen';
export * from './SearchField';
export * from './SectionHeader';
export * from './Tag';
```

- [ ] **Step 3: Вкладки в цветах темы**

`app/src/app/(tabs)/_layout.tsx` — целиком:

```tsx
import { Tabs } from 'expo-router';
import { colors } from '@/theme';

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
      <Tabs.Screen name="index" options={{ title: 'Главная' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Каталог' }} />
      <Tabs.Screen name="recipes" options={{ title: 'Сборы' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Избранное' }} />
    </Tabs>
  );
}
```

- [ ] **Step 4: Демонстрация компонентов на главной (временно, до плана 3b)**

`app/src/app/(tabs)/index.tsx` — целиком:

```tsx
import { useState } from 'react';
import { View } from 'react-native';
import { AppText, Button, Card, Chip, EvidenceDot, ListRow, Screen, SearchField, SectionHeader } from '@/components';
import { spacing } from '@/theme';

export default function HomeScreen() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(false);
  return (
    <Screen>
      <AppText variant="hero">Травы</AppText>
      <AppText tone="muted">Знания о травах. Гармония с природой.</AppText>
      <SearchField value={query} onChangeText={setQuery} />
      <SectionHeader title="Компоненты" actionLabel="Все" onAction={() => setSelected(!selected)} />
      <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
        <Chip label="все" selected />
        <Chip label="сон" selected={selected} onPress={() => setSelected(!selected)} />
        <Chip label="дыхание" />
      </View>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <EvidenceDot level="proven" />
          <EvidenceDot level="traditional" />
          <EvidenceDot level="folk" />
          <EvidenceDot level="refuted" />
        </View>
        <ListRow title="Ромашка аптечная" subtitle="Matricaria chamomilla" tags={['спокойствие']} onPress={() => {}} />
      </Card>
      <Button label="Добавить в избранное" onPress={() => {}} />
    </Screen>
  );
}
```

- [ ] **Step 5: Проверка**

Run: `npm run typecheck && (cd app && npx expo export --platform web --output-dir ../.app-web-check) && rm -rf .app-web-check`
Expected: `tsc` без ошибок; `Exported`.

Визуальная проверка (делает контроллер): `preview_start` с конфигурацией `app-web`, скриншот главной — тёмный фон, светло-зелёный акцент, заголовок с засечками, чипы, точки доказанности, панель из 4 вкладок.

- [ ] **Step 6: Commit**

```bash
git add app/src
git commit -m "feat(app): dark forest theme and base UI components" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Провайдеры данных — встроенная база и пользовательские данные

**Files:**
- Create: `app/src/content/content.ts`, `app/src/content/ContentProvider.tsx`, `app/src/user/UserDataProvider.tsx`
- Modify: `app/src/app/_layout.tsx`, `app/src/app/(tabs)/index.tsx`, `app/package.json` (AsyncStorage через `npx expo install`)

**Interfaces:**
- Consumes: `bundleSchemas`, `buildFilterIndex`, `type ContentBundle`, `type FilterIndex`, `type Herb`, `type Recipe`, `type DictionaryKey`, `USER_DATA_KEY`, `parseUserData`, `serializeUserData`, `toggleFavorite`, `setNote`, `acceptDisclaimer`, `isFavorite`, `emptyUserData`, `type UserData` (`@travy/shared`); `BUNDLED_PHOTOS` (`app/src/content/bundled-photos.ts`, Task 2).
- Produces:
  - `app/src/content/content.ts`: `interface AppContent { bundle: ContentBundle; index: FilterIndex; herbById: Map<string, Herb>; recipeById: Map<string, Recipe>; nameOf: (key: DictionaryKey, id: string) => string }`; `loadBundledContent(): AppContent`; `photoSource(path: string): number | undefined`.
  - `app/src/content/ContentProvider.tsx`: `ContentProvider`, `useContent(): AppContent`.
  - `app/src/user/UserDataProvider.tsx`: `UserDataProvider`, `useUserData(): { data: UserData; loaded: boolean; isFavorite(id): boolean; toggleFavorite(id): void; setNote(id, text): void; acceptDisclaimer(): void }`.

- [ ] **Step 1: Установить хранилище**

```bash
cd app && npx expo install @react-native-async-storage/async-storage && cd ..
```

Expected: в `app/package.json` появилась зависимость `@react-native-async-storage/async-storage` с версией, совместимой с SDK 58.

- [ ] **Step 2: Загрузка встроенной базы**

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
```

`app/src/content/ContentProvider.tsx`:

```tsx
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadBundledContent, type AppContent } from './content';

const ContentContext = createContext<AppContent | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const content = useMemo(() => loadBundledContent(), []);
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): AppContent {
  const content = useContext(ContentContext);
  if (!content) throw new Error('useContent вызван вне ContentProvider');
  return content;
}
```

- [ ] **Step 3: Пользовательские данные**

`app/src/user/UserDataProvider.tsx`:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  acceptDisclaimer as accept,
  emptyUserData,
  isFavorite as checkFavorite,
  parseUserData,
  serializeUserData,
  setNote as writeNote,
  toggleFavorite as toggle,
  USER_DATA_KEY,
  type UserData,
} from '@travy/shared';

interface UserDataApi {
  data: UserData;
  loaded: boolean;
  isFavorite: (herbId: string) => boolean;
  toggleFavorite: (herbId: string) => void;
  setNote: (herbId: string, text: string) => void;
  acceptDisclaimer: () => void;
}

const UserDataContext = createContext<UserDataApi | null>(null);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UserData>(emptyUserData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_DATA_KEY)
      .then((raw) => setData(parseUserData(raw)))
      .catch(() => setData(emptyUserData()))
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((change: (current: UserData) => UserData) => {
    setData((current) => {
      const next = change(current);
      AsyncStorage.setItem(USER_DATA_KEY, serializeUserData(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const api = useMemo<UserDataApi>(
    () => ({
      data,
      loaded,
      isFavorite: (herbId) => checkFavorite(data, herbId),
      toggleFavorite: (herbId) => update((d) => toggle(d, herbId)),
      setNote: (herbId, text) => update((d) => writeNote(d, herbId, text, new Date())),
      acceptDisclaimer: () => update(accept),
    }),
    [data, loaded, update],
  );

  return <UserDataContext.Provider value={api}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataApi {
  const api = useContext(UserDataContext);
  if (!api) throw new Error('useUserData вызван вне UserDataProvider');
  return api;
}
```

- [ ] **Step 4: Подключить провайдеры**

`app/src/app/_layout.tsx` — целиком:

```tsx
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ContentProvider } from '@/content/ContentProvider';
import { colors } from '@/theme';
import { UserDataProvider } from '@/user/UserDataProvider';

export default function RootLayout() {
  return (
    <ContentProvider>
      <UserDataProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
          <Stack.Screen name="(tabs)" />
        </Stack>
      </UserDataProvider>
    </ContentProvider>
  );
}
```

- [ ] **Step 5: Проверка цепочки на главной (временно, до плана 3b)**

`app/src/app/(tabs)/index.tsx` — целиком:

```tsx
import { AppText, ListRow, Screen } from '@/components';
import { photoSource } from '@/content/content';
import { useContent } from '@/content/ContentProvider';
import { useUserData } from '@/user/UserDataProvider';

export default function HomeScreen() {
  const { bundle } = useContent();
  const { isFavorite, toggleFavorite, loaded } = useUserData();
  return (
    <Screen>
      <AppText variant="hero">Травы</AppText>
      <AppText tone="muted">
        База {bundle.contentVersion}: трав {bundle.herbs.length}, сборов {bundle.recipes.length}
        {loaded ? '' : ' · загрузка избранного…'}
      </AppText>
      {bundle.herbs.map((h) => {
        const photo = h.photos[0];
        return (
          <ListRow
            key={h.id}
            title={h.name}
            subtitle={h.latin}
            image={photo ? photoSource(photo.path) : undefined}
            tags={isFavorite(h.id) ? ['в избранном'] : []}
            onPress={() => toggleFavorite(h.id)}
          />
        );
      })}
    </Screen>
  );
}
```

- [ ] **Step 6: Проверка**

Run: `npm run typecheck && npm test && (cd app && npx expo export --platform web --output-dir ../.app-web-check) && rm -rf .app-web-check`
Expected: `tsc` без ошибок; все тесты PASS; `Exported`.

Визуальная проверка (делает контроллер): в веб-превью главная показывает «База …: трав 6» и шесть строк с фото; нажатие на строку добавляет метку «в избранном», после перезагрузки страницы метка сохраняется (AsyncStorage в вебе пишет в localStorage).

- [ ] **Step 7: Commit**

```bash
git add app
git commit -m "feat(app): content and user data providers" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## После плана

План 3b: экраны — главная (поиск, плитки, баннер, «Собирать сейчас»), каталог (разделы → группы → список), список трав с панелью фильтров, карточка травы (галерея, разделы, источники, заметка, избранное), сборы, избранное, настройки (версия базы, авторы фото, дисклеймер) и дисклеймер при первом запуске. Пишется после выполнения 3a — по реальным интерфейсам.
