import { useId } from 'react';
import { Pressable } from 'react-native';
import { colors, paperEdge, radius, shadow, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PaperShape, useLayoutSize } from './PaperShape';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  /** Неактивная кнопка не нажимается и выглядит приглушённой. */
  disabled?: boolean;
  /** Иконка справа от подписи (например, «сердце» у «Добавить в избранное»). */
  icon?: IconName;
}

/** Кнопка — полоска рваной бумаги: главная залита шалфеем, второстепенная — бумага с рамкой. */
export function Button({ label, onPress, variant = 'primary', disabled = false, icon }: ButtonProps) {
  const primary = variant === 'primary';
  // край не зависит от подписи: у «Показать N трав» число меняется, а полоска остаётся той же
  const seed = useId();
  const { size, onLayout } = useLayoutSize();
  const fill = (pressed: boolean) =>
    primary ? (pressed ? colors.sagePressed : colors.sage) : pressed ? colors.paperDeep : colors.paperChip;
  const ink = primary ? colors.onSage : colors.text;
  return (
    <Pressable
      onPress={onPress}
      onLayout={onLayout}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          opacity: disabled ? 0.5 : 1,
        },
        size ? null : { backgroundColor: fill(pressed), borderRadius: radius.sm },
      ]}
    >
      {({ pressed }) => (
        <>
          {size ? (
            <PaperShape
              seed={seed}
              width={size.width}
              height={size.height}
              fill={fill(pressed)}
              edge={primary ? colors.cardEdge : colors.divider}
              edgeWidth={primary ? 1.2 : 1}
              depth={paperEdge.button.depth}
              radius={paperEdge.button.radius}
              shadow={shadow.paper}
              grain
            />
          ) : null}
          <AppText variant="heading" style={{ color: ink, textAlign: 'center', flexShrink: 1 }}>
            {label}
          </AppText>
          {icon ? <Icon name={icon} size={22} color={ink} /> : null}
        </>
      )}
    </Pressable>
  );
}
