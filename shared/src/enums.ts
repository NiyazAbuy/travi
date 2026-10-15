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
