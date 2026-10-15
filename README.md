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
