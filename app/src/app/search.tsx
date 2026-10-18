import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { filterForGroup, searchContent } from '@travy/shared';
import { AppText, Chip, HerbRow, Screen, SearchField } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

export default function SearchScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const { setFilter } = useListFilter();
  const [query, setQuery] = useState('');
  const result = useMemo(() => searchContent(bundle, query), [bundle, query]);

  return (
    <Screen safeTop={false}>
      <SearchField value={query} onChangeText={setQuery} autoFocus />
      {result.groups.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {result.groups.map((g) => (
            <Chip
              key={`${g.kind}:${g.id}`}
              label={g.name}
              onPress={() => {
                setFilter(filterForGroup(g.kind, g.id));
                router.push('/herbs');
              }}
            />
          ))}
        </View>
      )}
      {query.trim() && result.herbs.length === 0 && result.groups.length === 0 ? (
        <AppText tone="muted">Ничего не нашлось.</AppText>
      ) : null}
      {result.herbs.map((h) => (
        <HerbRow key={h.id} herb={h} />
      ))}
    </Screen>
  );
}
