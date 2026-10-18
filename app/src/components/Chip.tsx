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
  /** Залита шалфеем, как выбранная, но без состояния «выбрано» — акцентная плашка (системы органов в карточке травы). */
  filled?: boolean;
  /** Ключ рваного края; по умолчанию — подпись. */
  seed?: string;
  /** Подпись для экранного диктора, если она отличается от видимой (например, «Убрать условие: …»). */
  accessibilityLabel?: string;
  /** Узкие поля — чтобы в узкой колонке (рядом с рисунком травы) помещалось по две плашки в ряд. */
  dense?: boolean;
}

/**
 * Плашка-«клочок бумаги» с чуть неровным краем: обычная — светлая бумага с тонкой рамкой,
 * выбранная (или акцентная) — заливка шалфеем.
 */
export function Chip({ label, selected = false, onPress, icon, filled = false, seed, accessibilityLabel, dense = false }: ChipProps) {
  const { size, onLayout } = useLayoutSize();
  const sage = selected || filled;
  const fill = (pressed: boolean) =>
    sage ? (pressed ? colors.sagePressed : colors.sage) : pressed ? colors.paperDeep : colors.paperChip;
  const ink = sage ? colors.onSage : colors.text;
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        {
          maxWidth: '100%',
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          paddingHorizontal: dense ? spacing.sm - spacing.xxs : spacing.md,
          paddingVertical: dense ? spacing.xs + spacing.xxs : spacing.sm,
        },
        size ? null : { backgroundColor: fill(pressed), borderRadius: radius.md },
      ]}
    >
      {({ pressed }) => (
        <>
          {size ? (
            <PaperShape
              seed={seed ?? label}
              width={size.width}
              height={size.height}
              fill={fill(pressed)}
              edge={sage ? colors.cardEdge : colors.divider}
              edgeWidth={sage ? 1 : 0.8}
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
