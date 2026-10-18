import { Image } from 'expo-image';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { herbOrganSystems, nameList, shortLabel, type Herb } from '@travy/shared';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { colors, herbLayout, listLayout, radius, spacing } from '@/theme';
import { AppText } from './AppText';
import { InkLine } from './InkLine';
import { PaperCard } from './PaperCard';
import { Tag } from './Tag';

export interface HerbCardProps {
  herb: Herb;
  onPress: () => void;
  /** Месяц «Собирать сейчас»: плашка — часть растения, которую собирают в этом месяце. */
  month?: number;
}

/**
 * Крупная бумажная карточка «Собирать сейчас», две на ширину экрана: большой рисунок сверху
 * (нет рисунка — фото), название, черта «пером», плашка «что собирать» и строка — от чего помогает.
 */
export function HerbCard({ herb, onPress, month }: HerbCardProps) {
  const { bundle, nameOf, photoSource } = useContent();
  const window = useWindowDimensions();
  // Две карточки на ширину содержимого: поля экрана по краям и промежуток между ними.
  const contentWidth = Math.min(window.width, herbLayout.maxContentWidth) - spacing.lg * 2;
  const width = (contentWidth - spacing.md * (listLayout.collectPerScreen - 1)) / listLayout.collectPerScreen;
  const art = herbArt(herb, photoSource);
  const harvest = herb.harvest.find((h) => month === undefined || h.months.includes(month)) ?? herb.harvest[0];
  const part = harvest ? shortLabel(nameOf('plantParts', harvest.part)) : null;
  const helps = nameList(herbOrganSystems(herb, bundle.dictionaries, 2).map((s) => s.name));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={herb.name}
      style={({ pressed }) => ({ width, opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard seed={`collect:${herb.id}`} padding={spacing.md} style={{ flex: 1, alignItems: 'center', gap: spacing.sm }}>
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
          <View style={{ width: '100%', height: listLayout.collectArtHeight, borderRadius: radius.sm, backgroundColor: colors.paperDeep }} />
        )}
        <AppText variant="subheading" style={{ textAlign: 'center' }}>
          {herb.name}
        </AppText>
        <InkLine width={listLayout.collectRule} seed={`collect:${herb.id}:rule`} color={colors.sage} />
        {part ? <Tag label={part} seed={`collect:${herb.id}:part`} /> : null}
        {helps ? (
          <AppText variant="caption" tone="muted" style={{ textAlign: 'center' }}>
            {helps}
          </AppText>
        ) : null}
      </PaperCard>
    </Pressable>
  );
}
