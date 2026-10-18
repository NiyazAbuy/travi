import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { collectNow, emptyFilter, filterForGroup, monthName } from '@travy/shared';
import {
  AppText,
  Banner,
  HerbCard,
  Icon,
  PaperCard,
  Screen,
  ScreenTitle,
  SearchField,
  SectionHeader,
  type IconName,
} from '@/components';
import { BANNER } from '@/content/banner';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, listLayout, spacing } from '@/theme';

/** Плитка раздела: клочок бумаги с контурной иконкой и подписью. */
function Tile({ icon, label, seed, onPress }: { icon: IconName; label: string; seed: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}
    >
      <PaperCard
        seed={seed}
        padding={spacing.sm}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.md }}
      >
        <Icon name={icon} size={listLayout.tileIcon} color={colors.ink} />
        <AppText variant="label" style={{ textAlign: 'center' }}>
          {label}
        </AppText>
      </PaperCard>
    </Pressable>
  );
}

/**
 * Главная (макет 02): «Травница» с веточкой, поиск, четыре бумажные плитки разделов,
 * картина-баннер «Природа — лучшая аптека» и лента «Собирать сейчас · <месяц>».
 */
export default function HomeScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const month = new Date().getMonth() + 1;
  const now = useMemo(() => collectNow(bundle, month), [bundle, month]);

  const openList = (filter = emptyFilter()) => {
    setFilter(filter);
    router.push('/herbs');
  };
  const go = (href: Href) => router.push(href);

  return (
    <Screen>
      <ScreenTitle title="Травница" variant="brand" />

      <SearchField placeholder="Поиск трав и знаний…" onPress={() => go('/search')} />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile icon="book" label="Каталог" seed="home:tile:catalog" onPress={() => go('/catalog')} />
        <Tile icon="plant" label="Все травы" seed="home:tile:herbs" onPress={() => openList()} />
        <Tile icon="heart" label="Избранное" seed="home:tile:favorites" onPress={() => go('/favorites')} />
        <Tile icon="info" label="О приложении" seed="home:tile:about" onPress={() => go('/settings')} />
      </View>

      <Banner
        source={BANNER.source}
        title="Природа — лучшая аптека"
        accessibilityLabel={`Картина: ${BANNER.author}, «${BANNER.title}». Открывает список всех трав`}
        seed="home:banner"
        onPress={() => openList()}
      />

      <SectionHeader
        title={`Собирать сейчас · ${monthName(month)}`}
        actionLabel={now.length ? 'Все' : undefined}
        onAction={now.length ? () => openList(filterForGroup('months', String(month))) : undefined}
      />
      {now.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // поля — под тень и рваный край карточек, иначе их обрезает прокрутка
          style={{ marginHorizontal: -spacing.lg, marginVertical: -spacing.sm }}
          contentContainerStyle={{ gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}
        >
          {now.map((h) => (
            <HerbCard
              key={h.id}
              herb={h}
              month={month}
              onPress={() => router.push({ pathname: '/herb/[id]', params: { id: h.id } })}
            />
          ))}
        </ScrollView>
      ) : (
        <AppText tone="muted">В этом месяце по базе ничего не собирают.</AppText>
      )}
    </Screen>
  );
}
