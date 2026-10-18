import { Image } from 'expo-image';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { herbOrganSystems, shortLabel, type Herb } from '@travy/shared';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { colors, herbLayout, listLayout, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { PaperCard } from './PaperCard';
import { Tag } from './Tag';

export interface HerbCardProps {
  herb: Herb;
  onPress: () => void;
  /** Месяц «Собирать сейчас»: первая плашка — часть растения, которую собирают в этом месяце. */
  month?: number;
}

/**
 * Бумажная карточка травы для ленты «Собирать сейчас» (макет 02), две на ширину экрана:
 * рисунок сверху (нет рисунка — фото), под ним название и 1–2 плашки — что собирать и главная система органов.
 * Рисунок сверху, а не слева: в половине экрана длинные названия («лекарственная») иначе рвутся посреди слова.
 */
export function HerbCard({ herb, onPress, month }: HerbCardProps) {
  const { bundle, nameOf, photoSource } = useContent();
  const window = useWindowDimensions();
  // Две карточки на ширину содержимого: поля экрана по краям и промежуток ленты между ними.
  const contentWidth = Math.min(window.width, herbLayout.maxContentWidth) - spacing.lg * 2;
  const width = (contentWidth - spacing.md * (listLayout.collectPerScreen - 1)) / listLayout.collectPerScreen;
  const art = herbArt(herb, photoSource);
  const harvest = herb.harvest.find((h) => month === undefined || h.months.includes(month)) ?? herb.harvest[0];
  const system = herbOrganSystems(herb, bundle.dictionaries, 1)[0];
  const tags = [...(harvest ? [shortLabel(nameOf('plantParts', harvest.part))] : []), ...(system ? [system.name] : [])];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={herb.name}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard
        seed={`collect:${herb.id}`}
        padding={spacing.sm}
        style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}
      >
        {art ? (
          <Image
            source={art.source}
            style={{
              width: art.drawing ? listLayout.collectArtWidth : '100%',
              height: listLayout.collectArtHeight,
              borderRadius: art.drawing ? 0 : radius.sm,
            }}
            contentFit={art.drawing ? 'contain' : 'cover'}
          />
        ) : (
          <View
            style={{ width: '100%', height: listLayout.collectArtHeight, borderRadius: radius.sm, backgroundColor: colors.paperDeep }}
          />
        )}
        <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="subheading" style={{ textAlign: 'center' }}>
            {herb.name}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs }}>
            {tags.map((t) => (
              <Tag key={t} label={t} seed={`collect:${herb.id}:${t}`} />
            ))}
          </View>
        </View>
      </PaperCard>
    </Pressable>
  );
}
