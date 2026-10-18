import { Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onPress, variant = 'primary' }: ButtonProps) {
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        alignItems: 'center',
        paddingVertical: spacing.md,
        borderRadius: radius.pill,
        borderWidth: primary ? 0 : 1,
        borderColor: colors.border,
        backgroundColor: primary ? (pressed ? colors.accentPressed : colors.accent) : colors.surface,
      })}
    >
      <AppText variant="heading" style={{ color: primary ? colors.onAccent : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
