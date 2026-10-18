import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import {
  CATALOG_SECTIONS,
  catalogGroups,
  collectNow,
  countRu,
  emptyFilter,
  filterForGroup,
  monthName,
  type CatalogKey,
} from '@travy/shared';
import { AppText, Chip, Icon, PaperCard, Screen, ScreenTitle, SearchField, type IconName } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { catalogLayout, colors, fonts, spacing } from '@/theme';

const GROUP_FORMS = ['группа', 'группы', 'групп'] as const;
const HERB_FORMS = ['трава', 'травы', 'трав'] as const;

/** Главные разделы — крупными плитками 2×2; остальные — плашками в «Ещё разделы». */
const MAIN_SECTIONS: { key: CatalogKey; icon: IconName }[] = [
  { key: 'indications', icon: 'heart' },
  { key: 'organSystems', icon: 'plant' },
  { key: 'parts', icon: 'flower' },
  { key: 'safety', icon: 'warning' },
];

/** Бумажная плитка раздела: крупная иконка, название, число групп курсивом. */
function SectionTile({ icon, title, subtitle, seed, onPress }: { icon: IconName; title: string; subtitle: string; seed: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => ({ flexBasis: '47%', flexGrow: 1, opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard seed={seed} padding={spacing.md} style={{ flex: 1, gap: spacing.sm, minHeight: catalogLayout.tileHeight }}>
        <Icon name={icon} size={catalogLayout.tileIcon} color={colors.moss} />
        <AppText variant="heading">{title}</AppText>
        <AppText variant="caption" tone="muted" style={{ fontFamily: fonts.bodyItalic }}>
          {subtitle}
        </AppText>
      </PaperCard>
    </Pressable>
  );
}

/** Широкая бумажная строка: иконка, название и подпись, стрелка справа. */
function WideRow({ icon, title, subtitle, seed, onPress }: { icon: IconName; title: string; subtitle: string; seed: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
      <PaperCard seed={seed} padding={spacing.md} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Icon name={icon} size={catalogLayout.tileIcon} color={colors.moss} />
        <View style={{ flex: 1, gap: spacing.xxs }}>
          <AppText variant="heading">{title}</AppText>
          <AppText variant="caption" tone="muted" style={{ fontFamily: fonts.bodyItalic }}>
            {subtitle}
          </AppText>
        </View>
        <Icon name="chevronRight" size={spacing.lg} color={colors.textMuted} />
      </PaperCard>
    </Pressable>
  );
}

/**
 * Каталог: поиск, «Собирать сейчас» — широкой карточкой, четыре главных раздела плитками,
 * «Все травы по алфавиту», а редкие разделы (вещества, действие, семейство…) — плашками ниже.
 */
export default function CatalogScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const month = new Date().getMonth() + 1;
  const nowCount = useMemo(() => collectNow(bundle, month).length, [bundle, month]);
  const counts = useMemo(
    () => new Map(CATALOG_SECTIONS.map((s) => [s.key, catalogGroups(bundle, s.key).length])),
    [bundle],
  );
  const titleOf = (key: CatalogKey) => CATALOG_SECTIONS.find((s) => s.key === key)?.title ?? key;
  const mainKeys = new Set(MAIN_SECTIONS.map((s) => s.key));
  const more = CATALOG_SECTIONS.filter((s) => !mainKeys.has(s.key) && (counts.get(s.key) ?? 0) > 0);

  const openGroup = (key: CatalogKey) => router.push({ pathname: '/catalog/[key]', params: { key } });
  const openList = (filter = emptyFilter()) => {
    setFilter(filter);
    router.push('/herbs');
  };

  return (
    <Screen>
      <ScreenTitle title="Каталог" />
      <SearchField placeholder="Поиск трав и свойств…" onPress={() => router.push('/search')} />

      <View style={{ gap: spacing.md, marginTop: catalogLayout.blockGap }}>
        <WideRow
          seed="catalog:now"
          icon="calendar"
          title={`Собирать сейчас · ${monthName(month)}`}
          subtitle={countRu(nowCount, HERB_FORMS)}
          onPress={() => openList(filterForGroup('months', String(month)))}
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {MAIN_SECTIONS.filter((s) => (counts.get(s.key) ?? 0) > 0).map((s) => (
            <SectionTile
              key={s.key}
              seed={`catalog:${s.key}`}
              icon={s.icon}
              title={titleOf(s.key)}
              subtitle={countRu(counts.get(s.key) ?? 0, GROUP_FORMS)}
              onPress={() => openGroup(s.key)}
            />
          ))}
        </View>
        <WideRow
          seed="catalog:all"
          icon="book"
          title="Все травы"
          subtitle={`по алфавиту · ${countRu(bundle.herbs.length, HERB_FORMS)}`}
          onPress={() => openList()}
        />
      </View>

      {more.length > 0 ? (
        <View style={{ gap: spacing.sm, marginTop: catalogLayout.blockGap }}>
          <AppText variant="hand" tone="muted">
            Ещё разделы
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {more.map((s) => (
              <Chip key={s.key} seed={`catalog:more:${s.key}`} label={s.title} onPress={() => openGroup(s.key)} />
            ))}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}
