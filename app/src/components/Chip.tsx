import { Pressable } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}

export function Chip({ label, selected = false, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => ({
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: radius.pill,
        borderWidth: 1,
        borderColor: selected ? colors.accent : colors.border,
        backgroundColor: selected ? (pressed ? colors.accentPressed : colors.accent) : colors.chip,
        opacity: pressed && !selected ? 0.8 : 1,
      })}
    >
      <AppText variant="caption" style={{ color: selected ? colors.onAccent : colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}
