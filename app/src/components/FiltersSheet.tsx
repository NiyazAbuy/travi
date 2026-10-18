import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import { useContent } from '@/content/ContentProvider';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { PaperTexture } from './PaperTexture';

const THRESHOLDS: { level: EvidenceLevel | null; label: string }[] = [
  { level: null, label: 'любая' },
  { level: 'traditional', label: EVIDENCE_LABELS.traditional.toLowerCase() },
  { level: 'proven', label: EVIDENCE_LABELS.proven.toLowerCase() },
];
const HERB_FORMS = ['траву', 'травы', 'трав'] as const;

export interface FiltersSheetProps {
  visible: boolean;
  /** Фильтр списка, с которого начинается редактирование. */
  filter: HerbFilter;
  /** Применить черновик к списку. */
  onApply: (filter: HerbFilter) => void;
  /** Закрыть без применения (кнопка «Закрыть» и системная «назад»). */
  onClose: () => void;
}

/** Панель фильтров: свой черновик, «Сбросить» и кнопка «Показать N трав» внизу. */
export function FiltersSheet({ visible, filter, onApply, onClose }: FiltersSheetProps) {
  const { bundle, index } = useContent();
  const [draft, setDraft] = useState<HerbFilter>(filter);
  const sections = useMemo(
    () =>
      CATALOG_SECTIONS.map((s) => ({ ...s, groups: catalogGroups(bundle, s.key) })).filter((s) => s.groups.length > 0),
    [bundle],
  );
  const count = useMemo(() => queryHerbs(bundle.herbs, draft, index).length, [bundle, draft, index]);

  // Каждое открытие начинается с текущего фильтра списка.
  useEffect(() => {
    if (visible) setDraft(filter);
  }, [visible, filter]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <PaperTexture />
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: spacing.lg,
            borderBottomWidth: 1,
            borderBottomColor: colors.divider,
          }}
        >
          <AppText variant="title">Фильтры</AppText>
          <View style={{ flexDirection: 'row', gap: spacing.lg }}>
            <Pressable onPress={() => setDraft(emptyFilter())} accessibilityRole="button" hitSlop={spacing.sm}>
              <AppText tone="accent">Сбросить</AppText>
            </Pressable>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={spacing.sm}>
              <AppText tone="muted">Закрыть</AppText>
            </Pressable>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
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
        </ScrollView>
        <View style={{ padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.divider }}>
          <Button label={`Показать ${countRu(count, HERB_FORMS)}`} onPress={() => onApply(draft)} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
