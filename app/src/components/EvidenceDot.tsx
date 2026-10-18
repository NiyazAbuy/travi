import { View } from 'react-native';
import type { EvidenceLevel } from '@travy/shared';
import { EVIDENCE_LABELS } from '@travy/shared';
import { colors } from '@/theme';

export function EvidenceDot({ level, size = 10 }: { level: EvidenceLevel; size?: number }) {
  return (
    <View
      accessibilityLabel={EVIDENCE_LABELS[level]}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.evidence[level] }}
    />
  );
}
