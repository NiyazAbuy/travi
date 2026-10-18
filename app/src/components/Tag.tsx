import { View } from 'react-native';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

export function Tag({ label }: { label: string }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: radius.pill,
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <AppText variant="tiny" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
