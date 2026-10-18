import { View } from 'react-native';
import { colors, paperEdge, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { PaperShape, useLayoutSize } from './PaperShape';

/** Маленькая метка в строке списка: бумажная плашка с тонкой рамкой, не нажимается. */
export function Tag({ label }: { label: string }) {
  const { size, onLayout } = useLayoutSize();
  return (
    <View
      onLayout={onLayout}
      style={[
        { maxWidth: '100%', paddingHorizontal: spacing.sm, paddingVertical: spacing.xxs },
        size ? null : { backgroundColor: colors.paperChip, borderRadius: radius.sm },
      ]}
    >
      {size ? (
        <PaperShape
          seed={label}
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
