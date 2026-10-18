import { AppText, ListRow, Screen } from '@/components';
import { photoSource } from '@/content/content';
import { useContent } from '@/content/ContentProvider';
import { useUserData } from '@/user/UserDataProvider';

export default function HomeScreen() {
  const { bundle } = useContent();
  const { isFavorite, toggleFavorite, loaded } = useUserData();
  return (
    <Screen>
      <AppText variant="hero">Травы</AppText>
      <AppText tone="muted">
        База {bundle.contentVersion}: трав {bundle.herbs.length}, сборов {bundle.recipes.length}
        {loaded ? '' : ' · загрузка избранного…'}
      </AppText>
      {bundle.herbs.map((h) => {
        const photo = h.photos[0];
        return (
          <ListRow
            key={h.id}
            title={h.name}
            subtitle={h.latin}
            image={photo ? photoSource(photo.path) : null}
            tags={isFavorite(h.id) ? ['в избранном'] : []}
            onPress={() => toggleFavorite(h.id)}
          />
        );
      })}
    </Screen>
  );
}
