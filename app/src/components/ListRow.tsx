import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { PhotoSource } from '@/content/content';
import { colors, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Tag } from './Tag';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Не передан — слота под фото нет; null — слот-заглушка того же размера. */
  image?: PhotoSource | null;
  tags?: string[];
  right?: ReactNode;
  onPress?: () => void;
}

export function ListRow({ title, subtitle, image, tags = [], right, onPress }: ListRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {image === null && (
        <View style={{ width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceRaised }} />
      )}
      {image != null && (
        <Image source={image} style={{ width: 56, height: 56, borderRadius: radius.md }} contentFit="cover" />
      )}
      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" tone="muted" style={{ fontStyle: 'italic' }}>
            {subtitle}
          </AppText>
        ) : null}
        {tags.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
            {tags.map((t) => (
              <Tag key={t} label={t} />
            ))}
          </View>
        )}
      </View>
      {right ?? (onPress ? <AppText tone="faint">›</AppText> : null)}
    </Pressable>
  );
}
