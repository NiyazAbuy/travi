import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { compareNames, nameList, purposeLabels, type Herb, type Recipe } from '@travy/shared';
import { AppText, EmptyState, PaperCard, Screen, ScreenTitle, Tag } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { listLayout, radius, spacing } from '@/theme';

/** Рисунки первых двух компонентов: второй чуть ниже и заходит на первый — как букет на макете 05. */
function RecipeArt({ herbs }: { herbs: Herb[] }) {
  const { photoSource } = useContent();
  const arts = herbs.flatMap((h) => herbArt(h, photoSource) ?? []).slice(0, 2);
  if (arts.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      {arts.map((art, i) => (
        <Image
          key={i}
          source={art.source}
          style={{
            width: listLayout.recipeArtWidth,
            height: art.drawing ? listLayout.recipeArtHeight : listLayout.recipeArtWidth,
            borderRadius: art.drawing ? 0 : radius.sm,
            marginLeft: i > 0 ? -spacing.lg : 0,
            marginTop: i > 0 ? spacing.lg : 0,
          }}
          contentFit={art.drawing ? 'contain' : 'cover'}
        />
      ))}
    </View>
  );
}

/** Карточка сбора: рисунки компонентов, название, состав одной строкой, плашки назначения (системы органов). */
function RecipeCard({ recipe, onPress }: { recipe: Recipe; onPress: () => void }) {
  const { bundle, herbById } = useContent();
  const herbs = recipe.components.flatMap((c) => herbById.get(c.herb) ?? []);
  const composition = nameList(recipe.components.map((c) => herbById.get(c.herb)?.name ?? c.herb));
  const purposes = purposeLabels(recipe.purpose, bundle.dictionaries);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${recipe.name}. Состав: ${composition}`}
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <PaperCard seed={`recipe:${recipe.id}`} padding={spacing.md} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <RecipeArt herbs={herbs} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <AppText variant="heading">{recipe.name}</AppText>
          <AppText variant="caption" numberOfLines={3}>
            {composition}
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs }}>
            {purposes.map((p) => (
              <Tag key={p} label={p} seed={`recipe:${recipe.id}:${p}`} />
            ))}
          </View>
        </View>
      </PaperCard>
    </Pressable>
  );
}

/** Сборы (макет 05): крупный заголовок, карточки сборов; пока сборов нет — пустое состояние в том же стиле. */
export default function RecipesScreen() {
  const router = useRouter();
  const { bundle } = useContent();
  const recipes = useMemo(() => [...bundle.recipes].sort((a, b) => compareNames(a.name, b.name)), [bundle]);
  return (
    <Screen>
      <ScreenTitle title="Сборы" />
      {recipes.length === 0 ? (
        <EmptyState
          seed="recipes:empty"
          icon="cup"
          withSprig
          title="Здесь появятся готовые сборы"
          text="А пока можно сохранять травы в избранное и писать к ним свои заметки."
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {recipes.map((r) => (
            <RecipeCard key={r.id} recipe={r} onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })} />
          ))}
        </View>
      )}
    </Screen>
  );
}
