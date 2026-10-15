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
