import { useMemo } from 'react';
import { favoriteEntries } from '@travy/shared';
import { AppText, Card, HerbRow, Screen } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { useUserData } from '@/user/UserDataProvider';

export default function FavoritesScreen() {
  const { herbById } = useContent();
  const { data, readOnly } = useUserData();
  const entries = useMemo(() => favoriteEntries(data, herbById), [data, herbById]);

  return (
    <Screen>
      <AppText variant="title">Избранное</AppText>
      {readOnly && (
        <AppText tone="danger">Не удалось прочитать сохранённые данные — изменения сейчас не сохраняются.</AppText>
      )}
      {entries.length === 0 ? (
        <AppText tone="muted">
          Здесь появятся травы со звёздочкой и травы с заметками. Отметить траву: сердечко в карточке или долгое нажатие в списке.
        </AppText>
      ) : (
        entries.map((e) =>
          e.herb ? (
            <HerbRow key={e.herbId} herb={e.herb} />
          ) : (
            <Card key={e.herbId}>
              <AppText variant="heading">{e.herbId}</AppText>
              <AppText tone="danger">Трава удалена из базы</AppText>
              {e.note ? <AppText>{e.note.text}</AppText> : null}
            </Card>
          ),
        )
      )}
    </Screen>
  );
}
