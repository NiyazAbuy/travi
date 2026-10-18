import { Pressable } from 'react-native';
import { colors, radius, shadow, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
  /** Залитое начертание (например, «сердце» травы в избранном). */
  filled?: boolean;
  /** Круглая бумажная подложка с тенью — как кнопки «назад» и «ещё» на макете карточки. */
  round?: boolean;
}

export function IconButton({ icon, label, onPress, color = colors.text, size = 24, filled = false, round = false }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      style={({ pressed }) => [
        { padding: spacing.xs, opacity: pressed ? 0.6 : 1, alignItems: 'center', justifyContent: 'center' },
        round && [
          {
            width: size + spacing.lg,
            height: size + spacing.lg,
            borderRadius: radius.pill,
            backgroundColor: colors.field,
          },
          shadow.soft,
        ],
      ]}
    >
      <Icon name={icon} size={size} color={color} weight={filled ? 'fill' : 'light'} />
    </Pressable>
  );
}
