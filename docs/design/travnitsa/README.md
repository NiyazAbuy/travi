# «Травница» — макеты и картинки

Редизайн в стиле «полевого дневника» (кремовая бумага, ботанические рисунки). Спецификация —
`docs/superpowers/specs/2026-10-18-travnitsa-redesign-design.md`, план — `docs/superpowers/plans/2026-10-18-travnitsa-5-redesign.md`.

## Макеты (картинки пользователя)

| Файл | Что на нём |
|---|---|
| `01-icon.webp` | Иконка: веточка шалфея на кремовой бумаге и надпись «Травница». Из неё вырезается иконка приложения (без надписи). |
| `02-home.webp` | Главная: заголовок, поиск, плитки разделов, баннер-пейзаж «Природа — лучшая аптека», карточки трав. |
| `03-herb-card.webp` | Карточка травы: название, латынь, плашки, рисунок справа прямо на бумаге, три бумажные карточки, печать «проверено», заметка. |
| `04-catalog.webp` | Каталог: строки-карточки с рисунком слева, названием, латынью, строкой описания и плашками. |
| `05-recipes.webp` | Сборы: карточки сборов с рисунками компонентов. |
| `06-favorites.webp` | Избранное: как каталог, с «сердцем» и «штампом» заметки. |

Надписи на макетах (Obsidian, «Дневник», «Профиль» и т. п.) — условные; состав экранов — по спецификации.

## Ботанические рисунки трав

Все — таблицы старых атласов с Wikimedia Commons, лицензия — общественное достояние (`PD`). Скачаны и обработаны
командой `npm run photo:fetch -- <трава> "<File:…>" illustration.webp --illustration --keep-main [--crop …] [--erase …]`:
фон бумаги становится прозрачным (`tools/src/paper.ts`), отдельные фигуры таблицы (разрезы цветков, плоды), буквы,
номера и подписи убираются, WebP, длинная сторона 1080 px. Координаты `--crop`/`--erase` — в пикселях скачанной копии
(Commons отдаёт копию шириной 1920 px или оригинал, если он меньше). Автор, лицензия и ссылка записаны в
`content/photos/<трава>/photos.yaml` (ключ `illustration.webp`).

| Трава | Источник (атлас, год, таблица) | Файл на Commons | Автор в `photos.yaml` | Обработка |
|---|---|---|---|---|
| Ромашка аптечная | Köhler's Medizinal-Pflanzen, т. 1, 1887, табл. 64 (рисовал Walther Müller) | [Matricaria recutita - Köhler–s Medizinal-Pflanzen-091.jpg](https://commons.wikimedia.org/wiki/File:Matricaria_recutita_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-091.jpg) | Franz Eugen Köhler, in Köhler's Medizinal-Pflanzen | `--crop 230,20,1330,2310` |
| Мята перечная | Köhler's Medizinal-Pflanzen, т. 1, 1887, табл. 67 (рисовал Walther Müller); скан BHL | [Köhler's Medizinal-Pflanzen … (Plate 67) BHL303700.jpg](https://commons.wikimedia.org/wiki/File:K%C3%B6hler%27s_Medizinal-Pflanzen_in_naturgetreuen_Abbildungen_mit_kurz_erl%C3%A4uterndem_Texte_(Plate_67)_BHL303700.jpg) | Köhler's Medizinal-Pflanzen (1887) *(на Commons — шесть авторов издания: Brandt, Gürke, Köhler, Pabst, Schellenberg, Vogtherr; сокращено до издания и года)* | `--crop 330,200,1200,2120` |
| Зверобой продырявленный | В Köhler's его нет — J. Sturm, «Deutschlands Flora in Abbildungen», т. 6, табл. 60, 1796 по данным Commons (очищенная копия без подписи) | [Hypericum perforatum (Sturm 06, plate 060) clean, no-description.jpg](https://commons.wikimedia.org/wiki/File:Hypericum_perforatum_(Sturm_06,_plate_060)_clean,_no-description.jpg) | Jacob Sturm *(на Commons — «Johann Georg Sturm (Painter: Jacob Sturm )»; оставлен художник таблицы)* | `--crop 100,0,1350,2535 --erase 908,2452,72,48` (буква «a.» у корней) |
| Календула лекарственная | Köhler's Medizinal-Pflanzen, т. 3, 1898, табл. 61 (под ред. M. Vogtherr) | [Calendula officinalis - 001x.jpg](https://commons.wikimedia.org/wiki/File:Calendula_officinalis_-_001x.jpg) | Köhler's Medizinal-Pflanzen, Bd. 3 (1898); скан: Alice Chodura — *на Commons автором указана только сканировавшая (Oceancetaceen — Alice Chodura), поэтому поле уточнено вручную по строке Credit файла* | `--crop 180,240,1700,2360 --erase 430,1370,402,374 --erase 586,1740,18,9` (фигура 5 — соцветие с плодами — касается листа) |
| Тысячелистник обыкновенный | Köhler's Medizinal-Pflanzen, т. 1, 1887, табл. 70 (рисовал Walther Müller; очищенная копия без подписи) | [Achillea millefolium (Köhler’s Medizinal-Pflanzen Bd.1 1887, BHL-303704, Tafel 70) clean, no-description.jpg](https://commons.wikimedia.org/wiki/File:Achillea_millefolium_(K%C3%B6hler%E2%80%99s_Medizinal-Pflanzen_Bd.1_1887,_BHL-303704,_Tafel_70)_clean,_no-description.jpg) | Müller, Walther *(на Commons — «Müller, Walther;», убрана лишняя точка с запятой)* | `--crop 200,0,1400,2538` |
| Подорожник большой | В Köhler's его нет — O. W. Thomé, «Flora von Deutschland, Österreich und der Schweiz», 1885 (очищенная копия) | [Illustration Plantago major0 clean.jpg](https://commons.wikimedia.org/wiki/File:Illustration_Plantago_major0_clean.jpg) | Otto Wilhelm Thomé, Flora von Deutschland, Österreich und der Schweiz (1885) *(на Commons — «Original book source: Prof. Dr. Otto Wilhelm Thomé Flora von Deutschland…», сокращено)* | без `--crop`: подписи и номера убирает `--keep-main` |

## Баннер на главной

- Картина: **Иван Шишкин, «Туманное утро», 1885**; общественное достояние (`PD`).
- Файл: [Туманное утро. Шишкин И.И..jpg](https://commons.wikimedia.org/wiki/File:%D0%A2%D1%83%D0%BC%D0%B0%D0%BD%D0%BD%D0%BE%D0%B5_%D1%83%D1%82%D1%80%D0%BE._%D0%A8%D0%B8%D1%88%D0%BA%D0%B8%D0%BD_%D0%98.%D0%98..jpg)
  (оригинал на Commons — 1000×741).
- Вырезка 2:1: x 0, y 175, 1000×500 — туманные лесистые берега, река, луг на переднем плане; подпись художника
  в левом нижнем углу не попадает. WebP (`compressToWebp`), 1000×500.
- В приложении: `app/assets/images/banner.webp`, описание с автором, лицензией и ссылкой — `app/src/content/banner.ts`.

## Иконка приложения

- Источник: `01-icon.webp` — картинка пользователя (784×1168), берётся только веточка шалфея
  (прямоугольник x 105, y 150, 582×660; надпись «Травница» не попадает).
- `npm run app:icons` (`tools/src/app-icons.ts`): веточка отделяется от бумаги (`paperToAlpha`), кладётся по центру
  квадрата и увеличивается фильтром Ланцоша. Крупнее оригинала нет (веточка ≈ 520×600 px), поэтому в `icon.png`
  она немного мягкая.
- Файлы в `app/assets/images/`: `icon.png` (1024, веточка на `#F5F0E8`), `android-icon-foreground.png` (1024, веточка
  на прозрачном внутри безопасной зоны — круга 66/108), `android-icon-background.png` (1024, сплошной `#F5F0E8`),
  `android-icon-monochrome.png` (1024, белый силуэт на прозрачном), `splash-icon.png` (512, веточка на прозрачном),
  `favicon.png` (48, на `#F5F0E8`).
