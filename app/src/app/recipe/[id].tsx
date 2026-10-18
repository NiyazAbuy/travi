import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';
import { EVIDENCE_LABELS, recipeSourceIds, shortLabel, sourceHref } from '@travy/shared';
import { AppText, EmptyState, EvidenceDot, ListRow, Screen, Section, Tag } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { openLink } from '@/lib/openLink';
import { spacing, typography } from '@/theme';

/** Карточка сбора: название, плашки назначения, состав (строки с рисунками трав), приготовление, доказанность, источники. */
export default function RecipeScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipeById, herbById, sourceById, nameOf, photoSource } = useContent();
  const recipe = id ? recipeById.get(id) : undefined;

  if (!recipe) {
    return (
      <Screen safeTop={false}>
        <EmptyState seed="recipe:missing" icon="bowl" text="Сбор не найден — возможно, его убрали из базы." />
      </Screen>
    );
  }

  return (
    <Screen safeTop={false}>
      <View style={{ gap: spacing.sm }}>
        <AppText variant="display" accessibilityRole="header">
          {recipe.name}
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
          {recipe.purpose.map((p) => (
            <Tag key={p} label={shortLabel(nameOf('indications', p))} seed={`recipe:${recipe.id}:${p}`} />
          ))}
        </View>
      </View>
      <Section title="Состав" seed={`recipe:${recipe.id}:components`}>
        {recipe.components.map((c) => {
          const herb = herbById.get(c.herb);
          const art = herb ? herbArt(herb, photoSource) : null;
          return (
            <ListRow
              key={c.herb}
              seed={`recipe:${recipe.id}:component:${c.herb}`}
              title={herb?.name ?? c.herb}
              subtitle={`${c.parts} ч.${c.part ? ` · ${nameOf('plantParts', c.part)}` : ''}`}
              image={art?.source ?? null}
              imageFit={art?.drawing ? 'contain' : 'cover'}
              onPress={herb ? () => router.push({ pathname: '/herb/[id]', params: { id: c.herb } }) : undefined}
            />
          );
        })}
      </Section>
      <Section title="Приготовление" seed={`recipe:${recipe.id}:preparation`}>
        <AppText>{recipe.preparation}</AppText>
        <AppText>
          <AppText tone="muted">Дозировка: </AppText>
          {recipe.dosage}
        </AppText>
        {recipe.safety_note ? <AppText tone="danger">{recipe.safety_note}</AppText> : null}
      </Section>
      <Section title="Доказанность" seed={`recipe:${recipe.id}:evidence`}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
          {/* точка — по центру первой строки подписи, а не всей (подпись бывает в две строки) */}
          <View style={{ height: typography.heading.lineHeight, justifyContent: 'center' }}>
            <EvidenceDot level={recipe.evidence.level} />
          </View>
          <AppText variant="heading" style={{ flex: 1 }}>
            {EVIDENCE_LABELS[recipe.evidence.level]}
          </AppText>
        </View>
        <AppText variant="caption" tone="muted">
          {recipe.evidence.note}
        </AppText>
      </Section>
      <Section title="Источники" seed={`recipe:${recipe.id}:sources`}>
        {recipeSourceIds(recipe).map((sid, i) => {
          const s = sourceById.get(sid);
          if (!s) return null;
          const href = sourceHref(s);
          return (
            <Pressable key={sid} disabled={!href} onPress={() => href && openLink(href)} accessibilityRole={href ? 'link' : undefined}>
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
