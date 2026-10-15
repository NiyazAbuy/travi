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
