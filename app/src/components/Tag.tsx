import { View } from 'react-native';
import { colors, paperEdge, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { PaperShape, useLayoutSize } from './PaperShape';

/** Маленькая метка в строке списка: бумажная плашка с тонкой рамкой, не нажимается. `seed` — ключ края (по умолчанию подпись). */
export function Tag({ label, seed }: { label: string; seed?: string }) {
  const { size, onLayout } = useLayoutSize();
  return (
    <View
      onLayout={onLayout}
      style={[
        { maxWidth: '100%', paddingHorizontal: spacing.xs + spacing.xxs, paddingVertical: spacing.xxs / 2 },
        size ? null : { backgroundColor: colors.paperChip, borderRadius: radius.sm },
      ]}
    >
      {size ? (
        <PaperShape
          seed={seed ?? label}
          width={size.width}
          height={size.height}
          fill={colors.paperChip}
          edge={colors.divider}
          edgeWidth={0.8}
          depth={paperEdge.tag.depth}
          radius={paperEdge.tag.radius}
        />
      ) : null}
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
