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
import { SCHEMA_VERSION } from '../src/schema';

/**
 * Охранный тест совместимости базы.
 * Установленное приложение проверяет скачанный content.json схемой СВОЕЙ версии: новое значение
 * перечисления (например, форма применения "syrup") оно отвергнет целиком и молча останется на старой базе.
 * Поэтому изменение любого перечисления — несовместимое изменение: увеличьте SCHEMA_VERSION
 * (приложение покажет «обновите приложение») и только потом обновите снимок ниже.
 * LIFE_FORMS и SOURCING_OPTIONS добавлены до первой установки приложения, поэтому версия осталась 1.
 * Версия 2 (октябрь 2026): harvest.months может быть пустым (пряности, выращиваемые за рубежом) — схема 1 это отвергала.
 */
const PINNED = {
  schemaVersion: 2,
  enums: {
    EVIDENCE_LEVELS: ['proven', 'traditional', 'folk', 'refuted'],
    SOURCE_TYPES: ['pharmacopoeia', 'monograph', 'systematic_review', 'rct', 'article', 'book', 'reference_book'],
    HERB_STATUSES: ['draft', 'checked'],
    SAFETY_STATUSES: ['ok', 'caution', 'contraindicated', 'unknown'],
    TOXICITY_LEVELS: ['none', 'low', 'moderate', 'high'],
    USAGE_FORMS: ['infusion', 'decoction', 'tincture', 'rinse', 'bath', 'compress', 'tea', 'other'],
    PHOTO_KINDS: ['plant', 'closeup', 'raw'],
    LIFE_FORMS: ['herb', 'subshrub', 'shrub', 'tree', 'vine'],
    SOURCING_OPTIONS: ['wild', 'garden', 'pharmacy'],
  },
};

describe('совместимость базы', () => {
  it('перечисления меняются только вместе с SCHEMA_VERSION', () => {
    expect({
      schemaVersion: SCHEMA_VERSION,
      enums: {
        EVIDENCE_LEVELS,
        SOURCE_TYPES,
        HERB_STATUSES,
        SAFETY_STATUSES,
        TOXICITY_LEVELS,
        USAGE_FORMS,
        PHOTO_KINDS,
        LIFE_FORMS,
        SOURCING_OPTIONS,
      },
    }).toEqual(PINNED);
  });
});
