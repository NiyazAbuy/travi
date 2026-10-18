import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { collectNow, emptyFilter, filterForGroup, monthName } from '@travy/shared';
import { AppText, Banner, HerbCard, Icon, Screen, ScreenTitle, SearchField, SectionHeader } from '@/components';
import { BANNER } from '@/content/banner';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, homeLayout, spacing } from '@/theme';

/**
 * Главная — как страница дневника: «Травница», поиск со ссылкой «Все травы», картина-баннер,
 * рукописная пометка о месяце и главный вход — «Собирать сейчас» крупными карточками по две в ряд.
 */
export default function HomeScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const today = new Date();
  const month = today.getMonth() + 1;
  const now = useMemo(() => collectNow(bundle, month), [bundle, month]);

  const openList = (filter = emptyFilter()) => {
    setFilter(filter);
    router.push('/herbs');
  };

  return (
    <Screen>
      <View style={{ gap: spacing.md }}>
        <ScreenTitle title="Травница" variant="brand" />
        <SearchField placeholder="Поиск трав и знаний…" onPress={() => router.push('/search')} />
        <Pressable
          onPress={() => openList()}
          accessibilityRole="link"
          style={({ pressed }) => ({
            alignSelf: 'flex-end',
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            paddingVertical: spacing.xs,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <AppText variant="label" tone="accent">
            Все травы
          </AppText>
          <Icon name="chevronRight" size={spacing.lg} color={colors.accent} />
        </Pressable>
      </View>

      <View style={{ gap: spacing.sm, marginTop: homeLayout.sectionGap }}>
        <Banner
          source={BANNER.source}
          title={'Природа —\nлучшая аптека'}
          accessibilityLabel={`Картина: ${BANNER.author}, «${BANNER.title}». Открывает список всех трав`}
          seed="home:banner"
          onPress={() => openList()}
        />
        <AppText variant="hand" tone="muted" style={{ alignSelf: 'flex-end', transform: [{ rotate: homeLayout.noteRotate }] }}>
          {monthName(month)} {today.getFullYear()} — {now.length > 0 ? 'самое время собирать' : 'время отдыхать от сбора'}
        </AppText>
      </View>

      <View style={{ gap: spacing.md, marginTop: homeLayout.sectionGap }}>
        <SectionHeader
          title={`Собирать сейчас · ${monthName(month)}`}
          actionLabel={now.length ? 'Все' : undefined}
          onAction={now.length ? () => openList(filterForGroup('months', String(month))) : undefined}
        />
        {now.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {now.map((h) => (
              <HerbCard
                key={h.id}
                herb={h}
                month={month}
                onPress={() => router.push({ pathname: '/herb/[id]', params: { id: h.id } })}
              />
            ))}
          </View>
        ) : (
          <AppText tone="muted">В этом месяце по базе ничего не собирают.</AppText>
        )}
      </View>
    </Screen>
  );
}
