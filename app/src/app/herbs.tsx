import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { countRu, describeFilter, queryHerbs, removeFilterChip, type HerbFilter } from '@travy/shared';
import { AppText, Chip, FiltersSheet, HerbRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

const FOUND_FORMS = ['трава', 'травы', 'трав'] as const;

export default function HerbListScreen() {
  const { bundle, index } = useContent();
  // Каждый экран списка хранит свой фильтр: общий задаёт лишь начальное значение при открытии.
  const { filter: initialFilter } = useListFilter();
  const [filter, setFilter] = useState<HerbFilter>(initialFilter);
  const [sheetOpen, setSheetOpen] = useState(false);
  const herbs = useMemo(() => queryHerbs(bundle.herbs, filter, index), [bundle, filter, index]);
  const chips = useMemo(() => describeFilter(filter, bundle), [filter, bundle]);

  return (
    <Screen safeTop={false}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {chips.map((c) => (
          <Chip
            key={`${c.key}:${c.value}`}
            label={`${c.label} ×`}
            selected
            onPress={() => setFilter(removeFilterChip(filter, c))}
          />
        ))}
        <Chip label="+ фильтр" onPress={() => setSheetOpen(true)} />
      </View>
      <AppText variant="caption" tone="muted">
        Найдено {countRu(herbs.length, FOUND_FORMS)}
        {filter.indications.length > 0 ? ' · по доказанности' : ' · по алфавиту'}
      </AppText>
      {herbs.length === 0 ? (
        <AppText tone="muted">Ничего не нашлось — уберите часть условий.</AppText>
      ) : (
        herbs.map((h) => <HerbRow key={h.id} herb={h} indications={filter.indications} />)
      )}
      <FiltersSheet
        visible={sheetOpen}
        filter={filter}
        onApply={(next) => {
          setFilter(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
