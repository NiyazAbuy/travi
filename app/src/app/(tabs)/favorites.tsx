import { useMemo } from 'react';
import { View } from 'react-native';
import { favoriteEntries } from '@travy/shared';
import { AppText, EmptyState, HerbRow, PaperCard, Screen, ScreenTitle } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { colors, spacing } from '@/theme';
import { useUserData } from '@/user/UserDataProvider';

/**
 * Избранное (макет 06): строки как в каталоге, с «сердцем»; если есть заметка — «штамп» с её началом.
 * Травы, которых больше нет в базе, остаются (с заметкой), чтобы записи пользователя не пропадали.
 */
export default function FavoritesScreen() {
  const { herbById } = useContent();
  const { data, readOnly } = useUserData();
  const entries = useMemo(() => favoriteEntries(data, herbById), [data, herbById]);

  return (
    <Screen>
      <ScreenTitle title="Избранное" decoration="heart" />
      {readOnly && (
        <AppText tone="danger">Не удалось прочитать сохранённые данные — изменения сейчас не сохраняются.</AppText>
      )}
      {entries.length === 0 ? (
        <EmptyState
          seed="favorites:empty"
          icon="heart"
          text="Здесь появятся отмеченные травы и травы с заметками. Отметить траву: «сердце» в карточке или долгое нажатие в списке."
        />
      ) : (
        <View style={{ gap: spacing.md }}>
          {entries.map((e) =>
            e.herb ? (
              <HerbRow key={e.herbId} herb={e.herb} note={e.note?.text} />
            ) : (
              <PaperCard key={e.herbId} seed={`favorite:missing:${e.herbId}`} style={{ gap: spacing.xs }}>
                <AppText variant="heading">{e.herbId}</AppText>
                <AppText variant="caption" tone="danger">
                  Трава удалена из базы
                </AppText>
                {e.note ? (
                  <AppText variant="hand" style={{ color: colors.ink }}>
                    {e.note.text}
                  </AppText>
                ) : null}
              </PaperCard>
            ),
          )}
        </View>
      )}
    </Screen>
  );
}
