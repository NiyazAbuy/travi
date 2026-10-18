import { Platform, type TextStyle, type ViewStyle } from 'react-native';
import type { EvidenceLevel } from '@travy/shared';

/**
 * Единственное место с цветами, шрифтами и размерами. Смена стиля = правка этого файла.
 * Стиль «полевой дневник»: светлая бумага, засечные шрифты, приглушённые зелёные акценты.
 * Контраст текста на фонах `background`/`card` — не меньше 4,5:1 (проверено для всех пар ниже).
 */
export const colors = {
  /** Бумага экрана. */
  background: '#F5F0E8',
  /** Бумажная карточка (чуть темнее фона). */
  card: '#EDE6DB',
  /** Светлая кромка рваного края карточки. */
  cardEdge: '#FAF7F1',
  /** Тёмная бумага: заглушки картинок, поле заметки. */
  paperDeep: '#E4DACB',
  /** Плашка-метка на бумаге. */
  paperChip: '#F3EEE5',
  /** Поле ввода (поиск). */
  field: '#F9F6F0',
  /** Палитра: шалфей и мох. */
  sage: '#8A9A7B',
  moss: '#5B6F4E',
  /** Разделители и тонкие рамки. */
  divider: '#C8BFAF',
  /** Контур поля поиска — темнее разделителя. */
  outline: '#A89C88',
  /** Чернила печатей и украшений. */
  ink: '#5A4A3A',
  /** Цвет теней. */
  shadow: '#3A2E1F',
  /** Тонкое кольцо вокруг точки уровня доказанности: жёлтая точка иначе теряется на бумаге. */
  evidenceRing: 'rgba(58, 46, 31, 0.35)',

  // Имена ниже уже используются экранами — оставлены, значения под светлую тему.
  surface: '#EDE6DB',
  surfaceRaised: '#E4DACB',
  border: '#C8BFAF',
  text: '#3A3226',
  textMuted: '#5A4A3A',
  /** Самый бледный текст: 4,7:1 на карточке. */
  textFaint: '#726352',
  /** Мох для текста-ссылок: чуть темнее `moss`, чтобы держать 4,5:1 и на карточке. */
  accent: '#566A4A',
  accentPressed: '#46573C',
  /** Текст на заливке `accent`/`moss`. */
  onAccent: '#FBF8F2',
  /** Текст на заливке шалфеем (`sage`): 5,1:1. */
  onSage: '#2A241B',
  /** Нажатая заливка шалфеем: светлее, а не темнее — тёмный текст на ней так же читается (6:1). */
  sagePressed: '#98A78A',
  chip: '#F3EEE5',
  danger: '#A33A2E',
  warning: '#8A5D0E',
  /** Кремовая вуаль поверх картинки, чтобы на ней читался тёмный текст. */
  overlay: 'rgba(245, 240, 232, 0.72)',
  /** Уровни доказанности: зелёный / жёлтый / оранжевый / красный, подобраны под светлый фон. */
  evidence: {
    proven: '#3E7A30',
    traditional: '#BF8A17',
    folk: '#D9803F',
    refuted: '#B23A30',
  } satisfies Record<EvidenceLevel, string>,
  /** Текст на заливке цветом уровня: контраст ≥ 4,5:1. */
  onEvidence: {
    proven: '#FFFFFF',
    traditional: '#2A241B',
    folk: '#2A241B',
    refuted: '#FFFFFF',
  } satisfies Record<EvidenceLevel, string>,
} as const;

export const radius = { sm: 6, md: 10, lg: 14, pill: 999 } as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Имена шрифтов, под которыми они загружаются (`FONT_FILES` в `fonts.ts`).
 * На вебе к имени добавлен запасной ряд: пока шрифт грузится или если он не загрузился — системный с засечками.
 * На Android и iOS незнакомое имя само заменяется системным шрифтом.
 */
function family(name: string, fallback: string): string {
  return Platform.OS === 'web' ? `${name}, ${fallback}` : name;
}

const SERIF = 'Georgia, "Times New Roman", serif';
const HAND = '"Segoe Print", "Comic Sans MS", cursive';

export const fonts = {
  /** Заголовки — Cormorant Garamond. */
  display: family('CormorantGaramond_600SemiBold', SERIF),
  /** Основной текст — Lora (кириллица, хорошо читается мелко). */
  body: family('Lora_400Regular', SERIF),
  bodyItalic: family('Lora_400Regular_Italic', SERIF),
  bodyMedium: family('Lora_500Medium', SERIF),
  bodyBold: family('Lora_600SemiBold', SERIF),
  /** Рукописный — Caveat: только заметка пользователя и мелкие украшения. */
  hand: family('Caveat_500Medium', HAND),
} as const;

/** Начертание задаётся семейством шрифта, без `fontWeight`: на Android жирность у своих шрифтов дорисовывается грубо. */
export const typography = {
  /** Название приложения на главной — крупнее всего, как на макете 02. */
  brand: { fontFamily: fonts.display, fontSize: 58, lineHeight: 64 },
  /** Заголовок экрана-вкладки («Каталог», «Сборы», «Избранное»). */
  hero: { fontFamily: fonts.display, fontSize: 50, lineHeight: 56 },
  /** Название травы в карточке — крупно, как на макете 03. */
  display: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36 },
  /** Заголовок раздела экрана («Собирать сейчас»). */
  section: { fontFamily: fonts.display, fontSize: 25, lineHeight: 30 },
  /** Заголовок в шапке экранов стека («Травы», «Поиск», «О приложении»). */
  header: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  heading: { fontFamily: fonts.display, fontSize: 21, lineHeight: 26 },
  /** Заголовок маленькой карточки (три карточки в ряд на карточке травы). */
  subheading: { fontFamily: fonts.display, fontSize: 18, lineHeight: 21 },
  /** Латинское название под названием травы. */
  latin: { fontFamily: fonts.body, fontSize: 16, lineHeight: 21 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  tiny: { fontFamily: fonts.body, fontSize: 11, lineHeight: 15 },
  /** Подписи плашек, вкладок, мелких кнопок. */
  label: { fontFamily: fonts.bodyMedium, fontSize: 13, lineHeight: 17 },
  /** Подписи нижних вкладок. */
  tab: { fontFamily: fonts.bodyMedium, fontSize: 12, lineHeight: 15 },
  hand: { fontFamily: fonts.hand, fontSize: 21, lineHeight: 25 },
  /** Начало заметки на «штампе» в строке избранного. */
  handSmall: { fontFamily: fonts.hand, fontSize: 18, lineHeight: 20 },
  /** Надпись «МОЯ ЗАМЕТКА» на штампе — мелкие прописные с разрядкой. */
  stampCaption: { fontFamily: fonts.display, fontSize: 11, lineHeight: 13, letterSpacing: 1.2 },
  /** Рукописный заголовок заметки («Моя заметка»). */
  handTitle: { fontFamily: fonts.hand, fontSize: 25, lineHeight: 29 },
} satisfies Record<string, TextStyle>;

/** Размеры элементов карточки травы и экрана «Подробнее» (макет 03). */
export const herbLayout = {
  /** Рисунок справа от названия: доля ширины содержимого, высота и насколько он выходит к краю экрана, px. */
  illustrationShare: 0.44,
  illustrationHeight: 290,
  illustrationBleed: 8,
  /** Рисунок начинается чуть ниже верха названия: цветки на его верхушке не сталкиваются с буквами, px. */
  illustrationTop: 28,
  /** Фото вместо рисунка (рисунка нет): высота, px. */
  photoFallbackHeight: 190,
  /** Название может заходить на рисунок на эту долю его ширины: первая строка — над верхушкой рисунка. */
  titleOverlap: 0.5,
  /** Строк описания рядом с рисунком: не меньше / не больше (сколько влезает до низа рисунка). */
  descriptionMinLines: 3,
  descriptionMaxLines: 8,
  /** Три карточки в ряд: иконка, веточка-украшение, отступ ряда от краёв экрана меньше обычного на, px. */
  factIcon: 30,
  factSprig: 34,
  factsBleed: 8,
  /** Доли ширины трёх карточек: веществ обычно больше всего, их карточка шире (как на макете). */
  factWeights: [1, 1.35, 1.05],
  /** Веточка у заголовка «От чего помогает», черта под «Моя заметка», доля ширины колонки под чертой описания. */
  headingSprig: 30,
  noteRule: 120,
  descriptionRule: 0.8,
  /** Иконки в строку с текстом: стрелка строки списка, карандаш заметки, предупреждение, px. */
  chevron: 16,
  inlineIcon: 18,
  /** Печать «проверено» / «черновик», px. */
  stamp: 96,
  /** Галерея фото и фото двойника в «Подробнее», высота, px. */
  galleryHeight: 260,
  lookalikePhotoHeight: 180,
  /** Ширина экрана, больше которой содержимое не растягивается, px. */
  maxContentWidth: 640,
} as const;

/** Нижняя панель вкладок: сторона иконки и высота без системного отступа снизу (иконка, подпись, поля), px. */
export const tabBar = {
  icon: 24,
  height: 24 + typography.tab.lineHeight + spacing.sm * 2 + spacing.xs,
} as const;

/** Размеры главной, строк списков, сборов и избранного (макеты 02, 04–06). */
export const listLayout = {
  /** Рисунок слева в строке травы: ширина и высота, px; фото вместо рисунка — квадрат `rowPhoto`. */
  rowArtWidth: 84,
  rowArtHeight: 104,
  rowPhoto: 76,
  /** «Сердце» избранного в строке, px. */
  rowHeart: 22,
  /** Иконка раздела каталога в строке, px. */
  rowIcon: 26,
  /** Штамп заметки в строке избранного: наибольшая ширина, px, и наклон. */
  noteStampWidth: 172,
  noteStampRotate: '-4deg',
  noteStampSprig: 22,
  /** Веточка у названия приложения и у заголовков вкладок, px. */
  brandSprig: 54,
  titleSprig: 46,
  /** Плитки разделов на главной: иконка, px. */
  tileIcon: 32,
  /** Баннер-картина: высота / ширина (вырезка картины — 2:1). */
  bannerRatio: 0.5,
  /** Сияние под надписью баннера: непрозрачность бумаги в центре. */
  bannerGlow: 0.82,
  /** Карточка «Собирать сейчас»: ширина и рисунок слева, px. */
  collectWidth: 232,
  collectArtWidth: 64,
  collectArtHeight: 112,
  /** Рисунки компонентов в карточке сбора: ширина и высота каждого, px. */
  recipeArtWidth: 58,
  recipeArtHeight: 108,
  /** Иконка пустого состояния, px. */
  emptyIcon: 40,
} as const;

/** Параметры тени под рваным краем: рисуется в том же SVG двумя слоями (без фильтров размытия — дёшево). */
export interface PaperShadow {
  color: string;
  /** Сдвиг вниз, px. */
  offsetY: number;
  /** Непрозрачность ближнего слоя; дальний — вдвое бледнее. */
  opacity: number;
  /** Ширина размытия (обводка дальнего слоя), px. */
  blur: number;
}

/**
 * Тени. `paper`/`chip` — мягкая тень бумажной карточки и плашки (в SVG вместе с краем);
 * `soft`/`raised` — готовые стили для обычных элементов: поле поиска и круглые кнопки / то, что всплывает над экраном.
 */
export const shadow = {
  paper: { color: colors.shadow, offsetY: 2.5, opacity: 0.13, blur: 8 },
  chip: { color: colors.shadow, offsetY: 1, opacity: 0.1, blur: 2.5 },
  soft: { boxShadow: '0px 1px 3px rgba(58, 46, 31, 0.14)' },
  raised: { boxShadow: '0px 4px 12px rgba(58, 46, 31, 0.2)' },
} as const satisfies { paper: PaperShadow; chip: PaperShadow; soft: ViewStyle; raised: ViewStyle };

/**
 * Рваный край: наибольшая глубина зубцов и скругление углов, px — для карточки, кнопки, плашки и маленькой метки.
 * Край всегда внутри прямоугольника элемента, поэтому отступы содержимого от него не зависят.
 */
export const paperEdge = {
  card: { depth: 3, radius: 5 },
  button: { depth: 2.5, radius: 6 },
  chip: { depth: 1.2, radius: 9 },
  tag: { depth: 0.8, radius: 6 },
  /** Картина-баннер на главной: край глубже — как оборванный лист. */
  banner: { depth: 5, radius: 4 },
} as const;
