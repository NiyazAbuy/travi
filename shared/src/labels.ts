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
