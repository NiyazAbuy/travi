import Constants from 'expo-constants';
import { Pressable } from 'react-native';
import { contentVersionDate, countRu } from '@travy/shared';
import { AppText, Button, DISCLAIMER_TEXT, Screen, Section } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { openLink } from '@/lib/openLink';
import { useUpdates } from '@/update/UpdateProvider';

const APP_UPDATE_NEEDED_TEXT = 'Доступна новая база — обновите приложение';

export default function SettingsScreen() {
  const { bundle, source } = useContent();
  const { status, checking, appUpdateNeeded, checkNow } = useUpdates();
  const photos = bundle.herbs.flatMap((h) => [
    ...h.photos.map((p) => ({ label: h.name, ...p })),
    ...h.lookalikes.flatMap((l) => (l.photo ? [{ label: `${h.name} — двойник`, ...l.photo }] : [])),
  ]);

  return (
    <Screen safeTop={false}>
      <Section title="Приложение">
        <AppText>Версия {Constants.expoConfig?.version}</AppText>
      </Section>
      <Section title="База трав">
        <AppText>Версия: {contentVersionDate(bundle.contentVersion)}</AppText>
        <AppText tone="muted">
          {countRu(bundle.herbs.length, ['трава', 'травы', 'трав'])}, {countRu(bundle.recipes.length, ['сбор', 'сбора', 'сборов'])},{' '}
          {countRu(bundle.sources.length, ['источник', 'источника', 'источников'])}
        </AppText>
        <AppText tone="muted">{source === 'downloaded' ? 'Скачана из сети' : 'Встроенная'}</AppText>
        {appUpdateNeeded && <AppText tone="accent">{APP_UPDATE_NEEDED_TEXT}</AppText>}
        {checkNow ? (
          <Button label="Проверить обновления" variant="secondary" onPress={checkNow} disabled={checking} />
        ) : (
          <AppText variant="caption" tone="muted">
            Обновление базы доступно в приложении для Android
          </AppText>
        )}
        {/* Итог ручной проверки; не повторяем постоянную строку о новой версии приложения. */}
        {status && !(appUpdateNeeded && status === APP_UPDATE_NEEDED_TEXT) && (
          <AppText variant="caption" tone="muted">
            {status}
          </AppText>
        )}
      </Section>
      <Section title="Важно">
        <AppText>{DISCLAIMER_TEXT}</AppText>
      </Section>
      <Section title="Авторы фотографий">
        {photos.map((p) => (
          <Pressable key={`${p.label}:${p.path}`} onPress={() => openLink(p.source_url)} accessibilityRole="link">
            <AppText variant="caption" tone="accent">
              {p.label}: {p.author} · {p.license}
            </AppText>
          </Pressable>
        ))}
      </Section>
    </Screen>
  );
}
