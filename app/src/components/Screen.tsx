import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme';
import { PaperTexture } from './PaperTexture';

export interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** false — экран под заголовком стека: верхний отступ уже есть. */
  safeTop?: boolean;
}

/** Экран на бумаге: кремовый фон с зерном (неподвижным при прокрутке) и отступы по краям. */
export function Screen({ children, scroll = true, padded = true, safeTop = true }: ScreenProps) {
  const padding = padded ? spacing.lg : 0;
  return (
    <SafeAreaView edges={safeTop ? ['top'] : ['bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <PaperTexture />
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding, paddingBottom: spacing.xxl, gap: spacing.lg }}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={{ flex: 1, padding, gap: spacing.lg }}>{children}</View>
      )}
    </SafeAreaView>
  );
}
