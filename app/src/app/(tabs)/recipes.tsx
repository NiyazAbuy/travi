import { useRouter } from 'expo-router';
import { compareNames, countRu } from '@travy/shared';
import { AppText, ListRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';

export default function RecipesScreen() {
  const router = useRouter();
  const { bundle, nameOf } = useContent();
  const recipes = [...bundle.recipes].sort((a, b) => compareNames(a.name, b.name));
  return (
    <Screen>
      <AppText variant="title">Сборы</AppText>
      {recipes.length === 0 ? (
        <AppText tone="muted">Сборов пока нет — они появятся в следующих обновлениях базы.</AppText>
      ) : (
        recipes.map((r) => (
          <ListRow
            key={r.id}
            title={r.name}
            subtitle={`${countRu(r.components.length, ['компонент', 'компонента', 'компонентов'])} · ${r.purpose.map((p) => nameOf('indications', p)).join(', ')}`}
            onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: r.id } })}
          />
        ))
      )}
    </Screen>
  );
}
