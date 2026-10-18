import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

const TOAST_MS = 4000;

/** Плашка над панелью вкладок; скрывается сама через 4 с. Новое сообщение показывается заново. */
export function Toast({ message }: { message: string | null }) {
  const insets = useSafeAreaInsets();
  // Последнее сообщение, время показа которого истекло.
  const [expired, setExpired] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setExpired(message), TOAST_MS);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message || expired === message) return null;
  return (
    <View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        // Выше панели вкладок (её высота меньше spacing.xxl * 2).
        bottom: insets.bottom + spacing.xxl * 2,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surfaceRaised,
      }}
    >
      <AppText>{message}</AppText>
    </View>
  );
}
