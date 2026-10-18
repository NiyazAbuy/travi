import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { Herb } from '@travy/shared';
import { photoSource } from '@/content/content';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';

/** Карточка травы для горизонтальных лент: фото и название. */
export function HerbCard({ herb, onPress }: { herb: Herb; onPress: () => void }) {
  const photo = herb.photos[0];
  const source = photo ? photoSource(photo.path) : null;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={herb.name}
      style={({ pressed }) => ({ width: 140, gap: spacing.xs, opacity: pressed ? 0.7 : 1 })}
    >
      {source ? (
        <Image source={source} style={{ width: 140, height: 140, borderRadius: radius.lg }} contentFit="cover" />
      ) : (
        <View style={{ width: 140, height: 140, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised }} />
      )}
      <AppText variant="caption" numberOfLines={2}>
        {herb.name}
      </AppText>
    </Pressable>
  );
}
