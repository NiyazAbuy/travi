import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Image } from 'expo-image';
import type { PhotoSource } from '@/content/content';
import { colors, fonts, listLayout, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PaperCard } from './PaperCard';
import { Tag } from './Tag';

/** Сторона картинки в строке, px. */
const IMAGE = 72;

export interface ListRowProps {
  title: string;
  subtitle?: string;
  /** Не передан — слота под фото нет; null — слот-заглушка того же размера. */
  image?: PhotoSource | null;
  /** Как вписать картинку: фото — `cover` (по умолчанию), рисунок на прозрачном фоне — `contain`. */
  imageFit?: 'cover' | 'contain';
  /** Контурная иконка слева вместо картинки (разделы каталога). */
  icon?: IconName;
  tags?: string[];
  right?: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Ключ рваного края карточки; по умолчанию — заголовок. */
  seed?: string;
}

/** Строка списка — бумажная карточка: картинка слева, название, подпись курсивом, метки. */
export function ListRow({ title, subtitle, image, imageFit = 'cover', icon, tags = [], right, onPress, onLongPress, seed }: ListRowProps) {
  const imageRadius = imageFit === 'cover' ? radius.sm : 0;
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard seed={seed ?? title} padding={spacing.md} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {icon ? <Icon name={icon} size={listLayout.rowIcon} color={colors.ink} /> : null}
        {image === null && (
          <View style={{ width: IMAGE, height: IMAGE, borderRadius: radius.sm, backgroundColor: colors.paperDeep }} />
        )}
        {image != null && (
          <Image source={image} style={{ width: IMAGE, height: IMAGE, borderRadius: imageRadius }} contentFit={imageFit} />
        )}
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="heading">{title}</AppText>
          {subtitle ? (
            <AppText variant="caption" tone="muted" style={{ fontFamily: fonts.bodyItalic }}>
              {subtitle}
            </AppText>
          ) : null}
          {tags.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
              {tags.map((t) => (
                <Tag key={t} label={t} seed={`${seed ?? title}:${t}`} />
              ))}
            </View>
          )}
        </View>
        {right ?? (onPress ? <Icon name="chevronRight" size={18} color={colors.textFaint} /> : null)}
      </PaperCard>
    </Pressable>
  );
}
