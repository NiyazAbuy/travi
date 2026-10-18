import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import { compareNames, nameList, purposeLabels, type Herb, type Recipe } from '@travy/shared';
import { AppText, BotanicalCorners, Ornament, PaperCard, Screen, ScreenTitle, Tag } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { herbArt } from '@/content/herbArt';
import { colors, fonts, listLayout, paperEdge, radius, spacing } from '@/theme';

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

/** Травы для «букета» на пустом листе и рисунков по углам фона. */
const BOUQUET = ['matricaria-chamomilla', 'mentha-piperita'];
const CORNERS = ['achillea-millefolium', 'hypericum-perforatum'];

/**
 * Пустые сборы (макет сборов): узкий светлый лист с глубоко рваным краем по центру,
 * «букет» из ботанических рисунков, тёплый текст и орнамент с сердцем.
 */
function EmptySheet() {
  const { herbById, photoSource } = useContent();
  const arts = BOUQUET.flatMap((id) => {
    const h = herbById.get(id);
    return h ? (herbArt(h, photoSource) ?? []) : [];
  });
  return (
    <PaperCard
      seed="recipes:empty"
      color={colors.paperChip}
      depth={paperEdge.sheet.depth}
      padding={spacing.xl}
      style={{ alignSelf: 'center', width: '100%', maxWidth: listLayout.sheetWidth, alignItems: 'center', gap: spacing.md, marginTop: spacing.xl }}
    >
      {arts.length > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} importantForAccessibility="no-hide-descendants">
          {arts.map((art, i) => (
            <Image
              key={i}
              source={art.source}
              contentFit="contain"
              style={{
                width: listLayout.sheetArtHeight * 0.6,
                height: listLayout.sheetArtHeight,
                marginLeft: i > 0 ? -spacing.xl : 0,
                transform: [{ rotate: i > 0 ? '14deg' : '-10deg' }],
              }}
            />
          ))}
        </View>
      ) : null}
      <AppText variant="heading" style={{ textAlign: 'center' }}>
        Здесь появятся готовые сборы.
      </AppText>
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        Пока можно сохранять травы{' '}
        <AppText tone="default" style={{ fontFamily: fonts.bodyBold }}>
          в избранное
        </AppText>{' '}
        и писать свои заметки.
      </AppText>
      <Ornament seed="recipes:empty:ornament" icon="heart" />
    </PaperCard>
  );
}

/** Сборы (макет 05): крупный заголовок, карточки сборов; пока сборов нет — светлый лист по центру. */
export default function RecipesScreen() {
  const router = useRouter();
  const { bundle, herbById, photoSource } = useContent();
  const recipes = useMemo(() => [...bundle.recipes].sort((a, b) => compareNames(a.name, b.name)), [bundle]);
  const corner = (id: string | undefined) => {
    const h = id ? herbById.get(id) : undefined;
    return h ? (herbArt(h, photoSource)?.source ?? null) : null;
  };
  return (
    <Screen background={recipes.length === 0 ? <BotanicalCorners top={corner(CORNERS[0])} bottom={corner(CORNERS[1])} /> : null}>
      {recipes.length === 0 ? <ScreenTitle title="Сборы" kicker="Травница" /> : <ScreenTitle title="Сборы" />}
      {recipes.length === 0 ? (
        <EmptySheet />
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
