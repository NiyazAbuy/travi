import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, tabBar } from '@/theme';
import { AppText } from './AppText';
import { PaperCard } from './PaperCard';

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
      accessibilityLiveRegion="polite"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        // Над панелью вкладок (та же высота, что в `(tabs)/_layout.tsx`) с небольшим зазором.
        bottom: insets.bottom + tabBar.height + spacing.md,
        pointerEvents: 'none',
      }}
    >
      <PaperCard seed="toast" padding={spacing.md} color={colors.paperChip}>
        <AppText>{message}</AppText>
      </PaperCard>
    </View>
  );
}
