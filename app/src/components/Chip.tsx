import { Pressable } from 'react-native';
import { colors, paperEdge, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PaperShape, useLayoutSize } from './PaperShape';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** Маленькая иконка справа от подписи (как листок у «Все» на макете каталога). */
  icon?: IconName;
}

/**
 * Плашка-«клочок бумаги» с чуть неровным краем: обычная — светлая бумага с тонкой рамкой,
 * выбранная (или акцентная) — заливка шалфеем.
 */
export function Chip({ label, selected = false, onPress, icon }: ChipProps) {
  const { size, onLayout } = useLayoutSize();
  const fill = (pressed: boolean) =>
    selected ? (pressed ? colors.sagePressed : colors.sage) : pressed ? colors.paperDeep : colors.paperChip;
  const ink = selected ? colors.onSage : colors.text;
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        {
          maxWidth: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        },
        size ? null : { backgroundColor: fill(pressed), borderRadius: radius.md },
      ]}
    >
      {({ pressed }) => (
        <>
          {size ? (
            <PaperShape
              seed={label}
              width={size.width}
              height={size.height}
              fill={fill(pressed)}
              edge={selected ? colors.cardEdge : colors.divider}
              edgeWidth={selected ? 1 : 0.8}
              depth={paperEdge.chip.depth}
              radius={paperEdge.chip.radius}
              shadow={shadow.chip}
            />
          ) : null}
          <AppText variant="label" style={{ color: ink, flexShrink: 1 }}>
            {label}
          </AppText>
          {icon ? <Icon name={icon} size={14} color={ink} /> : null}
        </>
      )}
    </Pressable>
  );
}
