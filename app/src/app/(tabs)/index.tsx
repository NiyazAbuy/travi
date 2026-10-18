import { Image } from 'expo-image';
import { useRouter, type Href } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { collectNow, emptyFilter, filterForGroup, monthName } from '@travy/shared';
import { AppText, HerbCard, Icon, Screen, SectionHeader, type IconName } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, radius, spacing, typography } from '@/theme';

function Tile({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: spacing.xs, opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={28} color={colors.accent} />
      </View>
      <AppText variant="tiny" tone="muted" style={{ textAlign: 'center' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const { bundle, photoSource } = useContent();
  const { setFilter } = useListFilter();
  const month = new Date().getMonth() + 1;
  const now = useMemo(() => collectNow(bundle, month), [bundle, month]);
  const bannerPhoto = (now[0] ?? bundle.herbs[0])?.photos[0];
  const bannerSource = bannerPhoto ? photoSource(bannerPhoto.path) : null;

  const openList = (filter = emptyFilter()) => {
    setFilter(filter);
    router.push('/herbs');
  };
  const go = (href: Href) => router.push(href);

  return (
    <Screen>
      <View>
        <AppText variant="hero">Травы</AppText>
        <AppText tone="muted">Знания о травах. Гармония с природой.</AppText>
      </View>

      <Pressable
        onPress={() => go('/search')}
        accessibilityRole="search"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        }}
      >
        <Icon name="search" size={22} color={colors.textMuted} />
        <AppText style={[typography.body, { color: colors.textFaint }]}>Поиск трав, свойств, проблем…</AppText>
      </Pressable>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile icon="book" label="Каталог" onPress={() => go('/catalog')} />
        <Tile icon="plant" label="Все травы" onPress={() => openList()} />
        <Tile icon="heart" label="Избранное" onPress={() => go('/favorites')} />
        <Tile icon="info" label="О приложении" onPress={() => go('/settings')} />
      </View>

      <Pressable
        onPress={() => openList()}
        accessibilityRole="button"
        style={{ height: 150, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.surfaceRaised }}
      >
        {bannerSource && (
          <Image source={bannerSource} style={{ position: 'absolute', inset: 0 }} contentFit="cover" />
        )}
        <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'flex-end', backgroundColor: colors.overlay }}>
          <AppText variant="title">Природа — лучшая аптека</AppText>
          <AppText variant="caption" tone="muted">
            Здесь ты найдёшь силу в простых вещах
          </AppText>
        </View>
      </Pressable>

      <SectionHeader
        title={`Собирать сейчас · ${monthName(month)}`}
        actionLabel={now.length ? 'Все' : undefined}
        onAction={now.length ? () => openList(filterForGroup('months', String(month))) : undefined}
      />
      {now.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md }}>
          {now.map((h) => (
            <HerbCard key={h.id} herb={h} onPress={() => router.push({ pathname: '/herb/[id]', params: { id: h.id } })} />
          ))}
        </ScrollView>
      ) : (
        <AppText tone="muted">В этом месяце по базе ничего не собирают.</AppText>
      )}
    </Screen>
  );
}
