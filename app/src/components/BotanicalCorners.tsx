import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import type { PhotoSource } from '@/content/content';
import { listLayout } from '@/theme';

/**
 * Бледные ботанические рисунки по углам фона — как водяные знаки на бумаге (макет сборов).
 * Лежат под содержимым, нажатия не перехватывают, для экранного диктора не существуют.
 */
export function BotanicalCorners({ top, bottom }: { top?: PhotoSource | null; bottom?: PhotoSource | null }) {
  const art = { width: listLayout.cornerArtWidth, height: listLayout.cornerArtHeight, opacity: listLayout.cornerArtOpacity };
  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none', overflow: 'hidden' }]} importantForAccessibility="no-hide-descendants">
      {top ? (
        <Image
          source={top}
          contentFit="contain"
          style={[art, { position: 'absolute', top: listLayout.cornerArtHeight * 0.15, right: -listLayout.cornerArtWidth * 0.35, transform: [{ rotate: '-14deg' }] }]}
        />
      ) : null}
      {bottom ? (
        <Image
          source={bottom}
          contentFit="contain"
          style={[art, { position: 'absolute', bottom: listLayout.cornerArtHeight * 0.1, left: -listLayout.cornerArtWidth * 0.3, transform: [{ rotate: '12deg' }] }]}
        />
      ) : null}
    </View>
  );
}
