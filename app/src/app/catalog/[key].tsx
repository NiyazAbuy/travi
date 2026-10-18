import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { CATALOG_SECTIONS, catalogGroups, filterForGroup, type CatalogKey } from '@travy/shared';
import { AppText, ListRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';

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
        <AppText tone="muted">Раздел не найден.</AppText>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <Stack.Screen options={{ title: section.title }} />
      {groups.map((g) => (
        <ListRow
          key={g.value}
          title={g.label}
          right={
            <AppText variant="caption" tone="muted">
              {g.count}
            </AppText>
          }
          onPress={() => {
            setFilter(filterForGroup(section.key, g.value));
            router.push('/herbs');
          }}
        />
      ))}
    </Screen>
  );
}
