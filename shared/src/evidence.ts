import type { EvidenceLevel, SourceType } from './enums';

const RANK: Record<EvidenceLevel, number> = { proven: 3, traditional: 2, folk: 1, refuted: 0 };

export function evidenceRank(level: EvidenceLevel): number {
  return RANK[level];
}

/** Компаратор для сортировки по убыванию доказанности: proven первым. */
export function compareEvidenceDesc(a: EvidenceLevel, b: EvidenceLevel): number {
  return RANK[b] - RANK[a];
}

/** Уровень не ниже порога; refuted ниже любого порога (спецификация §6.3). */
export function meetsEvidenceThreshold(level: EvidenceLevel, threshold: EvidenceLevel): boolean {
  if (level === 'refuted') return false;
  return RANK[level] >= RANK[threshold];
}

/**
 * Типы источников, хотя бы один из которых обязателен для уровня (спецификация §5.2).
 * null — правило для уровня не проверяется.
 */
export const REQUIRED_SOURCE_TYPES: Record<EvidenceLevel, readonly SourceType[] | null> = {
  proven: ['systematic_review', 'rct', 'article', 'monograph'],
  traditional: null,
  folk: null,
  refuted: ['systematic_review', 'rct', 'article'],
};
