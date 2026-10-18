import { Stack, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import {
  CATALOG_SECTIONS,
  catalogGroups,
  countRu,
  emptyFilter,
  EVIDENCE_LABELS,
  isFilterValueSelected,
  queryHerbs,
  toggleFilterValue,
  type EvidenceLevel,
  type HerbFilter,
} from '@travy/shared';
import { AppText, Button, Chip, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useListFilter } from '@/state/ListFilterProvider';
import { spacing } from '@/theme';

const THRESHOLDS: { level: EvidenceLevel | null; label: string }[] = [
  { level: null, label: 'любая' },
  { level: 'traditional', label: EVIDENCE_LABELS.traditional.toLowerCase() },
  { level: 'proven', label: EVIDENCE_LABELS.proven.toLowerCase() },
];
const HERB_FORMS = ['траву', 'травы', 'трав'] as const;

export default function FiltersScreen() {
  const router = useRouter();
  const { bundle, index } = useContent();
  const { filter, setFilter } = useListFilter();
  const [draft, setDraft] = useState<HerbFilter>(filter);
  const sections = useMemo(
    () =>
      CATALOG_SECTIONS.map((s) => ({ ...s, groups: catalogGroups(bundle, s.key) })).filter((s) => s.groups.length > 0),
    [bundle],
  );
  const count = useMemo(() => queryHerbs(bundle.herbs, draft, index).length, [bundle, draft, index]);

  return (
    <Screen safeTop={false}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => setDraft(emptyFilter())} accessibilityRole="button" style={{ paddingHorizontal: spacing.md }}>
              <AppText tone="accent">Сбросить</AppText>
            </Pressable>
          ),
        }}
      />
      <View style={{ gap: spacing.sm }}>
        <AppText variant="heading">Доказанность не ниже</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
          {THRESHOLDS.map((t) => (
            <Chip
              key={t.label}
              label={t.label}
              selected={draft.minEvidence === t.level}
              onPress={() => setDraft({ ...draft, minEvidence: t.level })}
            />
          ))}
        </View>
      </View>
      {sections.map((s) => (
        <View key={s.key} style={{ gap: spacing.sm }}>
          <AppText variant="heading">{s.title}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {s.groups.map((g) => (
              <Chip
                key={g.value}
                label={g.label}
                selected={isFilterValueSelected(draft, s.key, g.value)}
                onPress={() => setDraft(toggleFilterValue(draft, s.key, g.value))}
              />
            ))}
          </View>
        </View>
      ))}
      <Button
        label={`Показать ${countRu(count, HERB_FORMS)}`}
        onPress={() => {
          setFilter(draft);
          router.back();
        }}
      />
    </Screen>
  );
}
