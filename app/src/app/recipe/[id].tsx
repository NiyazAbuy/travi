import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { EVIDENCE_LABELS, recipeSourceIds, sourceHref } from '@travy/shared';
import { AppText, EvidenceDot, ListRow, Screen, Section } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { openLink } from '@/lib/openLink';
import { spacing } from '@/theme';

export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipeById, herbById, sourceById, nameOf } = useContent();
  const recipe = id ? recipeById.get(id) : undefined;

  if (!recipe) {
    return (
      <Screen safeTop={false}>
        <AppText tone="muted">Сбор не найден.</AppText>
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <AppText variant="title">{recipe.name}</AppText>
      <AppText tone="muted">При: {recipe.purpose.map((p) => nameOf('indications', p)).join(', ')}</AppText>
      <Section title="Состав">
        {recipe.components.map((c) => (
          <ListRow
            key={c.herb}
            title={herbById.get(c.herb)?.name ?? c.herb}
            subtitle={`${c.parts} ч.${c.part ? ` · ${nameOf('plantParts', c.part)}` : ''}`}
            onPress={herbById.has(c.herb) ? () => router.push({ pathname: '/herb/[id]', params: { id: c.herb } }) : undefined}
          />
        ))}
      </Section>
      <Section title="Приготовление">
        <AppText>{recipe.preparation}</AppText>
        <AppText>
          <AppText tone="muted">Дозировка: </AppText>
          {recipe.dosage}
        </AppText>
        {recipe.safety_note ? <AppText tone="danger">{recipe.safety_note}</AppText> : null}
      </Section>
      <Section title="Доказанность">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <EvidenceDot level={recipe.evidence.level} />
          <AppText variant="heading">{EVIDENCE_LABELS[recipe.evidence.level]}</AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {recipe.evidence.note}
        </AppText>
      </Section>
      <Section title="Источники">
        {recipeSourceIds(recipe).map((sid, i) => {
          const s = sourceById.get(sid);
          if (!s) return null;
          const href = sourceHref(s);
          return (
            <Pressable key={sid} disabled={!href} onPress={() => href && openLink(href)}>
              <AppText variant="caption" tone={href ? 'accent' : 'muted'}>
                [{i + 1}] {s.authors.join(', ')}. {s.title}. {s.year}.
              </AppText>
            </Pressable>
          );
        })}
      </Section>
    </Screen>
  );
}
