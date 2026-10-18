import { View } from 'react-native';
import type { EvidenceLevel } from '@travy/shared';
import { EVIDENCE_LABELS } from '@travy/shared';
import { colors } from '@/theme';

/** Точка уровня доказанности; тонкое кольцо — чтобы светлые цвета не терялись на бумаге. */
export function EvidenceDot({ level, size = 10 }: { level: EvidenceLevel; size?: number }) {
  return (
    <View
      accessibilityLabel={EVIDENCE_LABELS[level]}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 1,
        borderColor: colors.evidenceRing,
        backgroundColor: colors.evidence[level],
      }}
    />
  );
}
