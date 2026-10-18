# «Травница», план 5: дизайн «полевой дневник» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перевести приложение в стиль макетов `docs/design/travnitsa/` (светлая бумага, рваные края, ботанические рисунки, засечный и рукописный шрифты), разгрузить карточку травы (основное + экран «Подробнее»), переименовать в «Травницу» с новой иконкой.

**Architecture:** Логика сводок для карточек (системы органов, «внутрь/наружно», части, строка действий) — чистые функции в `shared` с тестами. Новое необязательное поле травы `illustration` проходит через схему, валидатор и сборщик, совместимо со схемой 1. Рисунки, баннер и иконка готовятся скриптами `tools` (Wikimedia → отделение от фона бумаги → WebP/PNG). Вся стилистика — в `app/src/theme/` и базовых компонентах; экраны переписываются под макеты.

**Tech Stack:** как раньше + `react-native-svg`, `expo-font` с `@expo-google-fonts/cormorant-garamond`, `@expo-google-fonts/caveat` и шрифтом текста (`@expo-google-fonts/lora` или `@expo-google-fonts/pt-serif`), по желанию `phosphor-react-native`.

**Spec:** `docs/superpowers/specs/2026-10-18-travnitsa-redesign-design.md` (+ `docs/superpowers/specs/2026-10-15-travy-design.md` §6). Макеты: `docs/design/travnitsa/*.webp`.

## Global Constraints

- Палитра: фон `#F5F0E8`, карточки `#EDE6DB`, текст `#3A3226`, вторичный текст `#5A4A3A`, шалфей `#8A9A7B`, мох `#5B6F4E`, разделители `#C8BFAF`. Цвета уровней доказанности — смысловые (зелёный/жёлтый/оранжевый/красный) под светлый фон; текст на цветной заливке — контраст ≥ 4.5:1.
- Шрифты: заголовки Cormorant Garamond; текст — Lora или PT Serif (с кириллицей); Caveat — только заметка пользователя и мелкие украшения.
- Цвета, шрифты, размеры — только из `app/src/theme/`; маршруты — только в `app/src/app/`; логика без UI — в `shared` с тестами; зависимости Expo — только `npx expo install`; тексты — по-русски.
- Совместимость базы: `SCHEMA_VERSION` = 1, перечисления не меняются (охранный тест `shared/test/compat.test.ts` не трогать); `illustration` — необязательное поле.
- `app.json`: `name` = «Травница», `version` = `1.1.0`, `android.versionCode` = 2, `userInterfaceStyle` = `light`; `slug`, `scheme`, `android.package`, `owner`, `extra.eas.projectId`, ключи `AsyncStorage`, адрес базы — **без изменений**.
- Лицензии: у каждого рисунка и баннера — автор, лицензия, ссылка; показываются в «О приложении».
- Веб-превью (`npm run app:web`) продолжает работать.

## Review Focus

- Трава без `illustration` (новая трава, старая база) → везде показывается первое фото, ничего не ломается — тест в Task 1 (схема) и проверка в Task 4/5.
- APK 1.0.0 (схема 1) получает базу с `illustration` → принимает её — тест «нестрогая схема с полем и без» (Task 1).
- Длинные названия («Зверобой продырявленный», «Трава (надземная часть)», «Простуда и иммунитет») на экране 375 px не вылезают за карточки — визуальная проверка Task 6.
- Пустые разделы (нет действий, нет применения наружно, нет заметки, нет сборов) → разумная замена или раздел скрыт — тесты сводок (Task 1) и визуальная проверка.
- Шрифты не загрузились (офлайн веб, сбой) → приложение показывает текст системным шрифтом, не висит на сплэше — Task 3.

---

### Task 1: Сводки для карточек и поле `illustration`

**Files:**
- Create: `shared/src/query/summary.ts`, `shared/test/summary.test.ts`
- Modify: `shared/src/query/index.ts`, `shared/src/schema.ts` (`illustration` в `herbInput`/`herb`), `tools/src/validate.ts` (у `illustration` должна быть запись в `photos.yaml`, как у фото), `tools/src/build.ts` (резолв `illustration` как у фото), `shared/test/schema.test.ts`, `tools/test/build.test.ts`, `tools/test/validate.test.ts`

**Interfaces (Produces):**
- `herbOrganSystems(herb: Herb, dictionaries: Dictionaries, limit = 3): { id: string; name: string }[]` — системы органов показаний травы; порядок: больше показаний в системе → выше; равенство → лучший уровень (`evidenceRank`) среди показаний этой системы; затем `compareNames` по названию.
- `usageSummary(herb: Herb): { internal: string[]; external: string[] }` — уникальные подписи `USAGE_FORM_LABELS` в порядке появления, со строчной буквы; внутрь: `infusion`, `decoction`, `tincture`, `tea`; наружно: `rinse`, `bath`, `compress`; `other` пропускается.
- `herbParts(herb: Herb, dictionaries: Dictionaries): { id: string; name: string }[]` — уникальные части из `harvest[].part` в порядке появления.
- `shortLabel(name: string): string` — убирает уточнение в скобках в конце: «Трава (надземная часть)» → «Трава»; без скобок — как есть.
- `herbLine(herb: Herb, dictionaries: Dictionaries): string` — названия действий через «, », первое с заглавной, остальные со строчной; нет действий → названия 2 первых показаний так же; нет и их → `''`.
- Схема: `illustration?: PhotoRef` во входной траве, `illustration?: Photo` в собранной (необязательно, нестрогая схема).

- [ ] **Step 1: Тесты** (`shared/test/summary.test.ts`, фикстуры `queryHerbs4`/`queryDictionaries`/`sampleHerb`):
  - `herbOrganSystems`: трава с показаниями `cough` (respiratory), `insomnia` (nervous), ещё одно respiratory → `[respiratory, nervous]`; `limit = 1` → один элемент; при равном числе выигрывает система с `proven`-показанием.
  - `usageSummary`: формы `[infusion, tea, rinse, infusion, other]` → `{ internal: ['настой', 'чай'], external: ['полоскание'] }`; без наружных → `external: []`.
  - `herbParts`: harvest `[leaf, leaf, root]` → `[leaf, root]` с названиями.
  - `shortLabel('Трава (надземная часть)') === 'Трава'`, `shortLabel('Листья') === 'Листья'`.
  - `herbLine`: действия `[expectorant]` → `'Отхаркивающее'`; два действия → `'Противовоспалительное, спазмолитическое'`; без действий → из показаний; пусто → `''`.
  - Схема (`shared/test/schema.test.ts`): собранная трава с `illustration` и без проходит `bundleSchemas.herb`; входная трава с `illustration: { file: 'illustration.webp', kind: 'plant' }` проходит `inputSchemas.herbInput`.
  - `tools`: валидатор ругается, если файла `illustration` нет в `photos.yaml`; сборщик кладёт `illustration` в `content.json` с `path: photos/<sha256>.webp` и авторством.
- [ ] **Step 2: Запустить — падает.** `npx vitest run shared/test/summary.test.ts shared/test/schema.test.ts tools/test`
- [ ] **Step 3: Реализация** по интерфейсам.
- [ ] **Step 4: Проверка** — `npx vitest run && npm run typecheck && npm run content:check`; Expected: всё PASS, охранный тест совместимости не тронут.
- [ ] **Step 5: Commit** — `feat(shared): card summaries and optional herb illustration`.

---

### Task 2: Рисунки, баннер и иконка

**Files:**
- Create: `tools/src/paper.ts` (отделение рисунка от фона старой бумаги), `tools/test/paper.test.ts`; файлы `content/photos/<herb>/illustration.webp` + записи в `photos.yaml` для 6 трав; `app/assets/images/banner.webp` + `app/src/content/banner.ts` (автор, лицензия, ссылка, `require`); `docs/design/travnitsa/README.md` (откуда что взято)
- Modify: `tools/src/fetch-photo.ts` / CLI (флаг для рисунка: обработка `paper.ts`, сохранение с прозрачностью), `content/herbs/*.yaml` (`illustration: { file: illustration.webp, kind: plant }`), `tools/src/app-icons.ts` + тест (иконка из `docs/design/travnitsa/01-icon.webp`), PNG в `app/assets/images/`

**Interfaces (Produces):**
- `paperToAlpha(input: Buffer): Promise<Buffer>` — PNG/WebP с альфа-каналом: цвет бумаги оценивается по краям изображения; пиксели близкие к нему → прозрачные, плавный переход по расстоянию цвета; рисунок сохраняет цвет.
- `writeAppIcons(outDir)` — те же 6 файлов и размеры, что сейчас, но из вырезки веточки шалфея `01-icon.webp`: `icon.png` — веточка на фоне `#F5F0E8`; `android-icon-foreground.png` — веточка на прозрачном, в безопасной зоне; `android-icon-background.png` — сплошной `#F5F0E8`; `android-icon-monochrome.png` — силуэт веточки белым на прозрачном; `splash-icon.png` — веточка на прозрачном; `favicon.png` — на `#F5F0E8`.

- [ ] **Step 1: Тесты** — `paperToAlpha`: синтетическая картинка «бумага #E8DCC0 + тёмно-зелёный квадрат в центре» → угол `alpha === 0`, центр `alpha === 255` и цвет сохранён; тест иконок обновить: угол `android-icon-foreground.png` прозрачный, угол `icon.png` ≈ `#F5F0E8`, в центре `icon.png` есть зелёный пиксель.
- [ ] **Step 2: Запустить — падает.**
- [ ] **Step 3: Реализация `paperToAlpha`, флаг рисунка в `photo:fetch`, `app-icons.ts`.**
- [ ] **Step 4: Рисунки.** Для каждой травы найти на Wikimedia Commons таблицу Köhler's Medizinal-Pflanzen (1887) — для `plantago-major`, если её там нет, — Thomé «Flora von Deutschland» (1885) или другой атлас, лицензия только PD; обрезать подписи и номер таблицы; `photo:fetch` с флагом рисунка; длинная сторона ≤ 1080. Посмотреть каждый результат глазами (Read показывает картинки): растение целиком, фон прозрачный, без мусора по краям.
- [ ] **Step 5: Баннер.** Картина в PD (русская живопись XIX века: лес, река, туман — как `02-home.webp`), Wikimedia, вырезать горизонтальный фрагмент ≈ 2:1, WebP ≤ 1080 по ширине; `banner.ts` с автором/названием/лицензией/ссылкой.
- [ ] **Step 6: Иконки** — `npm run app:icons`, посмотреть `icon.png` и `android-icon-foreground.png` глазами.
- [ ] **Step 7: Проверка** — `npx vitest run && npm run typecheck && npm run content:check && npm run content:app`.
- [ ] **Step 8: Commit** — `feat(content): botanical illustrations, banner painting and sage app icon`.

---

### Task 3: Тема, шрифты, бумага, базовые компоненты

**Files:**
- Modify: `app/src/theme/index.ts`, `app/app.json`, `app/src/app/_layout.tsx` (загрузка шрифтов; сплэш держится до загрузки или ошибки), `app/src/components/*` (AppText, Button, Card, Chip, Tag, SearchField, ListRow, Screen, Section, SectionHeader, IconButton, EvidenceDot, Toast, DisclaimerGate, FiltersSheet), `app/src/app/(tabs)/_layout.tsx`
- Create: `app/src/components/PaperCard.tsx` (рваный край SVG + тень), `app/src/components/Stamp.tsx` (круглая печать «проверено»/«черновик»), `app/assets/images/paper.png` (плитка текстуры) и генератор в `tools` (если генерируется)

**Interfaces (Produces):**
- Тема: `colors` (палитра из Global Constraints + `evidence`), `fonts` (`display`, `body`, `bodyItalic`, `bodyBold`, `hand`), `typography` (`hero`, `title`, `heading`, `body`, `caption`, `hand`), `radius`, `spacing`, `shadow`.
- `PaperCard({ children, seed?: string, style?, padding? })` — бумажная карточка: фон `colors.card`, неровный край (детерминированный по `seed` и размеру), мягкая тень.
- `Stamp({ label: string })` — круглая контурная печать с веточкой.
- `Chip` получает вид «бумажной плашки» (заливка шалфеем для выбранной/акцентной, бумага для обычной).
- Вкладки: Главная · Каталог · Сборы · Избранное, контурные иконки, активная — мох, фон — бумага.

- [ ] **Step 1: Зависимости** — `cd app && npx expo install react-native-svg expo-font @expo-google-fonts/cormorant-garamond @expo-google-fonts/caveat @expo-google-fonts/<lora|pt-serif> && cd ..` (+ `phosphor-react-native` через `npm i -w @travy/app`, если выбран).
- [ ] **Step 2: Тема, шрифты, `app.json`** (name, version, versionCode, light).
- [ ] **Step 3: `PaperCard`, `Stamp`, переоформление базовых компонентов и вкладок.**
- [ ] **Step 4: Проверка** — `npm run typecheck && npm test && (cd app && npx expo export --platform web --output-dir ../.app-web-check)`, удалить `.app-web-check`.
- [ ] **Step 5: Commit** — `feat(app): paper theme, fonts and torn-edge cards`.

---

### Task 4: Карточка травы и «Подробнее»

**Files:**
- Modify: `app/src/app/herb/[id].tsx` → краткая карточка (дизайн §4.3, макет `03-herb-card.webp`)
- Create: `app/src/app/herb/[id]/details.tsx` или `app/src/app/herb-details/[id].tsx` (выбрать то, что корректно работает в expo-router рядом с `herb/[id].tsx`), регистрация заголовка в `_layout.tsx`

**Interfaces (Consumes):** Task 1 (`herbOrganSystems`, `usageSummary`, `herbParts`, `shortLabel`), Task 3 (`PaperCard`, `Stamp`, тема), `useContent().photoSource`, `NoteEditor`, `useUserData`.

- [ ] **Step 1: Краткая карточка** — порядок и состав строго по дизайну §4.3: шапка, название + латынь + рисунок справа (нет рисунка → первое фото), 2–3 плашки систем органов (нажатие → список с фильтром `organSystems`), описание, три `PaperCard` (Части растения / Действующие вещества / Применение «Внутрь: … · Наружно: …»), «От чего помогает» со всеми показаниями и точками уровня (нажатие → фильтр по показанию), `Stamp`, «Моя заметка» рукописным шрифтом с редактированием, кнопки «Добавить в избранное»/«В избранном» и «Подробнее о траве».
- [ ] **Step 2: «Подробнее»** — всё из дизайна §4.4, в бумажных секциях; ничего из нынешней карточки не потеряно (сверить построчно со старым `herb/[id].tsx` до правки: фото с авторством, другие названия, метки, показания с источниками, применение полностью, сбор, действие, безопасность, двойники, источники).
- [ ] **Step 3: Проверка** — typecheck, тесты, web export.
- [ ] **Step 4: Commit** — `feat(app): herb card in field-journal style with details screen`.

---

### Task 5: Главная, каталог, списки, сборы, избранное, «О приложении»

**Files:**
- Modify: `app/src/app/(tabs)/index.tsx`, `(tabs)/catalog.tsx`, `catalog/[key].tsx`, `herbs.tsx`, `search.tsx`, `(tabs)/recipes.tsx`, `recipe/[id].tsx`, `(tabs)/favorites.tsx`, `settings.tsx`, `app/src/components/HerbRow.tsx`, `HerbCard.tsx`

**Interfaces (Consumes):** Task 1 (`herbLine`, `herbOrganSystems`, `herbParts`, `shortLabel`), Task 2 (`banner.ts`, `illustration`), Task 3.

- [ ] **Step 1: Главная** по `02-home.webp`: «Травница» крупно (Cormorant) с веточкой, поиск-«бумажная» строка, 4 бумажные плитки (Каталог · Все травы · Избранное · О приложении) с контурными иконками, баннер-картина с рваным краем и надписью «Природа — лучшая аптека», «Собирать сейчас · <месяц>» — бумажные карточки с рисунком, названием, 1–2 плашками.
- [ ] **Step 2: Строка травы** (`HerbRow`) по `04-catalog.webp`: рисунок слева без рамки, название (Cormorant), латынь курсивом, `herbLine`, плашки `shortLabel(первая часть)` + до 2 систем органов; при фильтре по показаниям — выбранные показания с точкой уровня вместо строки; контурное «сердце» справа для избранных. Каталог, список, поиск — заголовки и поиск в стиле макета.
- [ ] **Step 3: Сборы** по `05-recipes.webp` (рисунки до 2 компонентов, название, состав строкой, плашки назначения; пустое состояние в стиле), карточка сбора в теме.
- [ ] **Step 4: Избранное** по `06-favorites.webp`: строки как в каталоге + «штамп» с началом заметки рукописным шрифтом; удалённые из базы — как сейчас, в стиле.
- [ ] **Step 5: «О приложении»** — в теме; авторство рисунков и баннера рядом с фото.
- [ ] **Step 6: Проверка** — typecheck, тесты, web export.
- [ ] **Step 7: Commit** — `feat(app): home, catalog, recipes and favorites in field-journal style`.

---

### Task 6: Доводка до макетов (контроллер) и APK 1.1.0

- [ ] **Step 1:** Веб-превью 375×812, каждый экран рядом с его макетом (`02`…`06`), список расхождений (цвета, шрифты, отступы, размеры, рваные края, тени, плашки, иконки, обрезка рисунков).
- [ ] **Step 2:** Правки расхождений (исполнитель + проверка) → снова Step 1. Повторять, пока расхождения не сведутся к тому, что требует новых рисунков (рукописные иконки, акварель) — их перечислить пользователю.
- [ ] **Step 3:** Финальная проверка всей ветки, пуш, `eas build -p android --profile preview`, пользователь ставит 1.1.0 поверх 1.0.0 (избранное и заметки сохраняются), затем — проверка обновления базы на телефоне и релиз по `docs/release.md`.
