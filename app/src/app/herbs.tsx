import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { countRu, describeFilter, pruneFilter, queryHerbs, removeFilterChip, type HerbFilter } from '@travy/shared';
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
  // После обновления базы условия с исчезнувшими id тихо выбрасываются.
  const active = useMemo(() => pruneFilter(filter, bundle), [filter, bundle]);
  const herbs = useMemo(() => queryHerbs(bundle.herbs, active, index), [bundle, active, index]);
  const chips = useMemo(() => describeFilter(active, bundle), [active, bundle]);

  return (
    <Screen safeTop={false}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {chips.map((c) => (
          <Chip
            key={`${c.key}:${c.value}`}
            label={`${c.label} ×`}
            selected
            onPress={() => setFilter(removeFilterChip(active, c))}
          />
        ))}
        <Chip label="+ фильтр" onPress={() => setSheetOpen(true)} />
      </View>
      <AppText variant="caption" tone="muted">
        Найдено {countRu(herbs.length, FOUND_FORMS)}
        {active.indications.length > 0 ? ' · по доказанности' : ' · по алфавиту'}
      </AppText>
      {herbs.length === 0 ? (
        <AppText tone="muted">Ничего не нашлось — уберите часть условий.</AppText>
      ) : (
        herbs.map((h) => <HerbRow key={h.id} herb={h} indications={active.indications} />)
      )}
      <FiltersSheet
        visible={sheetOpen}
        filter={active}
        onApply={(next) => {
          setFilter(next);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </Screen>
  );
}
