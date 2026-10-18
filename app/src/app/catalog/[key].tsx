import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';
import { CATALOG_SECTIONS, catalogGroups, filterForGroup, type CatalogKey } from '@travy/shared';
import { EmptyState, ListRow, Screen, Tag } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

/** Раздел каталога: группы — бумажные строки, справа плашка с числом трав; нажатие → список трав с фильтром. */
export default function CatalogSectionScreen() {
  const router = useRouter();
  const { key } = useLocalSearchParams<{ key: string }>();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const section = CATALOG_SECTIONS.find((s) => s.key === key);
  const groups = useMemo(() => (section ? catalogGroups(bundle, section.key as CatalogKey) : []), [bundle, section]);

  if (!section) {
    return (
      <Screen safeTop={false}>
        <EmptyState seed="catalog:missing" icon="book" text="Раздел не найден." />
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <Stack.Screen options={{ title: section.title }} />
      <View style={{ gap: spacing.md }}>
        {groups.map((g) => (
          <ListRow
            key={g.value}
            seed={`catalog:${section.key}:${g.value}`}
            title={g.label}
            right={<Tag label={String(g.count)} seed={`catalog:${section.key}:${g.value}:count`} />}
            onPress={() => {
              setFilter(filterForGroup(section.key, g.value));
              router.push('/herbs');
            }}
          />
        ))}
      </View>
    </Screen>
  );
}
