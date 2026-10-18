import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { herbLine, herbOrganSystems, herbParts, shortLabel, type Dictionaries, type Herb } from '@travy/shared';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { colors, fonts, listLayout, radius, spacing, typography } from '@/theme';
import { useUserData } from '@/user/UserDataProvider';
import { AppText } from './AppText';
import { EvidenceDot } from './EvidenceDot';
import { Icon } from './Icon';
import { NoteStamp } from './NoteStamp';
import { PaperCard } from './PaperCard';
import { Tag } from './Tag';

export interface HerbRowProps {
  herb: Herb;
  /** Выбранные в фильтре показания: вместо строки действий — они, каждое с точкой уровня доказанности. */
  indications?: readonly string[];
  /** Заметка пользователя (избранное): её начало — на «штампе» внизу строки. */
  note?: string;
}

/** Плашки строки: первая часть растения без уточнения в скобках и до двух систем органов (дизайн §4.5). */
function rowTags(herb: Herb, dictionaries: Dictionaries): string[] {
  const part = herbParts(herb, dictionaries)[0];
  const systems = herbOrganSystems(herb, dictionaries, 2).map((s) => s.name);
  return [...(part ? [shortLabel(part.name)] : []), ...systems];
}

/**
 * Строка травы в списках (макет 04): бумажная карточка, рисунок слева без рамки (нет рисунка — фото),
 * название, латынь курсивом, строка действий, плашки; у избранных — контурное «сердце» справа.
 * Долгое нажатие — в избранное / из избранного.
 */
export function HerbRow({ herb, indications = [], note }: HerbRowProps) {
  const router = useRouter();
  const { bundle, nameOf, photoSource } = useContent();
  const { isFavorite, toggleFavorite } = useUserData();
  const art = herbArt(herb, photoSource);
  const favorite = isFavorite(herb.id);

  const selected = herb.indications.filter((x) => indications.includes(x.indication));
  const line = selected.length ? null : herbLine(herb, bundle.dictionaries);
  const tags = rowTags(herb, bundle.dictionaries);

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/herb/[id]', params: { id: herb.id } })}
      onLongPress={() => toggleFavorite(herb.id)}
      accessibilityRole="button"
      accessibilityLabel={favorite ? `${herb.name}, в избранном` : herb.name}
      accessibilityHint="Долгое нажатие — добавить в избранное или убрать"
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard seed={`row:${herb.id}`} padding={spacing.md} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        {art?.drawing ? (
          <Image
            source={art.source}
            style={{ width: listLayout.rowArtWidth, height: listLayout.rowArtHeight }}
            contentFit="contain"
          />
        ) : (
          <View style={{ width: listLayout.rowArtWidth, alignItems: 'center' }}>
            {art ? (
              <Image
                source={art.source}
                style={{ width: listLayout.rowPhoto, height: listLayout.rowPhoto, borderRadius: radius.sm }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{ width: listLayout.rowPhoto, height: listLayout.rowPhoto, borderRadius: radius.sm, backgroundColor: colors.paperDeep }}
              />
            )}
          </View>
        )}

        <View style={{ flex: 1, gap: spacing.xxs }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
            <AppText variant="heading" style={{ flex: 1 }}>
              {herb.name}
            </AppText>
            {favorite ? (
              <View style={{ paddingTop: spacing.xxs }}>
                <Icon name="heart" size={listLayout.rowHeart} color={colors.ink} />
              </View>
            ) : null}
          </View>
          <AppText variant="caption" tone="muted" style={{ fontFamily: fonts.bodyItalic }}>
            {shortLabel(herb.latin)}
          </AppText>

          {line ? (
            <AppText variant="caption" numberOfLines={2} style={{ marginTop: spacing.xxs }}>
              {line}
            </AppText>
          ) : (
            <View style={{ gap: spacing.xxs, marginTop: spacing.xxs }}>
              {selected.map((x) => (
                <View key={x.indication} style={{ flexDirection: 'row', gap: spacing.xs }}>
                  <View style={{ height: typography.caption.lineHeight, justifyContent: 'center' }}>
                    <EvidenceDot level={x.evidence.level} />
                  </View>
                  <AppText variant="caption" style={{ flex: 1 }}>
                    {nameOf('indications', x.indication)}
                  </AppText>
                </View>
              ))}
            </View>
          )}

          {tags.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
              {tags.map((t) => (
                <Tag key={t} label={t} seed={`row:${herb.id}:${t}`} />
              ))}
            </View>
          ) : null}

          {note?.trim() ? (
            <View style={{ alignSelf: 'flex-end', marginTop: spacing.sm, marginRight: -spacing.xs }}>
              <NoteStamp text={note} seed={`note:${herb.id}`} />
            </View>
          ) : null}
        </View>
      </PaperCard>
    </Pressable>
  );
}
