import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import { herbOrganSystems, shortLabel, type Herb } from '@travy/shared';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { colors, listLayout, radius, spacing } from '@/theme';
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
 * Бумажная карточка травы для горизонтальной ленты «Собирать сейчас» (макет 02):
 * рисунок слева (нет рисунка — фото), название и 1–2 плашки — что собирать и главная система органов.
 */
export function HerbCard({ herb, onPress, month }: HerbCardProps) {
  const { bundle, nameOf, photoSource } = useContent();
  const art = herbArt(herb, photoSource);
  const harvest = herb.harvest.find((h) => month === undefined || h.months.includes(month)) ?? herb.harvest[0];
  const system = herbOrganSystems(herb, bundle.dictionaries, 1)[0];
  const tags = [...(harvest ? [shortLabel(nameOf('plantParts', harvest.part))] : []), ...(system ? [system.name] : [])];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={herb.name}
      style={({ pressed }) => ({ width: listLayout.collectWidth, opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard
        seed={`collect:${herb.id}`}
        padding={spacing.sm}
        style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
      >
        {art ? (
          <Image
            source={art.source}
            style={{
              width: listLayout.collectArtWidth,
              height: art.drawing ? listLayout.collectArtHeight : listLayout.collectArtWidth,
              borderRadius: art.drawing ? 0 : radius.sm,
            }}
            contentFit={art.drawing ? 'contain' : 'cover'}
          />
        ) : (
          <View
            style={{ width: listLayout.collectArtWidth, height: listLayout.collectArtWidth, borderRadius: radius.sm, backgroundColor: colors.paperDeep }}
          />
        )}
        <View style={{ flex: 1, gap: spacing.sm }}>
          <AppText variant="subheading">{herb.name}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {tags.map((t) => (
              <Tag key={t} label={t} seed={`collect:${herb.id}:${t}`} />
            ))}
          </View>
        </View>
      </PaperCard>
    </Pressable>
  );
}
