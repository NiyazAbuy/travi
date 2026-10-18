import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';
import { Pressable } from 'react-native';
import { colors, spacing } from '@/theme';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface IconButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  color?: string;
  size?: number;
}

export function IconButton({ icon, label, onPress, color = colors.text, size = 24 }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={spacing.sm}
      style={({ pressed }) => ({ padding: spacing.xs, opacity: pressed ? 0.6 : 1 })}
    >
      <MaterialCommunityIcons name={icon} size={size} color={color} />
    </Pressable>
  );
}
