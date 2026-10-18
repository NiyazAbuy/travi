import { Text, type TextProps } from 'react-native';
import { colors, typography } from '@/theme';

const TONES = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  accent: colors.accent,
  danger: colors.danger,
} as const;

export interface AppTextProps extends TextProps {
  variant?: keyof typeof typography;
  tone?: keyof typeof TONES;
}

export function AppText({ variant = 'body', tone = 'default', style, ...rest }: AppTextProps) {
  return <Text {...rest} style={[typography[variant], { color: TONES[tone] }, style]} />;
}
