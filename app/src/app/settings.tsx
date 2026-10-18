import { Linking, Pressable } from 'react-native';
import { contentVersionDate, countRu } from '@travy/shared';
import { AppText, DISCLAIMER_TEXT, Screen, Section } from '@/components';
import { useContent } from '@/content/ContentProvider';

export default function SettingsScreen() {
  const { bundle } = useContent();
  const photos = bundle.herbs.flatMap((h) => h.photos.map((p) => ({ herb: h.name, ...p })));

  return (
    <Screen safeTop={false}>
      <Section title="База трав">
        <AppText>Версия: {contentVersionDate(bundle.contentVersion)}</AppText>
        <AppText tone="muted">
          {countRu(bundle.herbs.length, ['трава', 'травы', 'трав'])}, {countRu(bundle.recipes.length, ['сбор', 'сбора', 'сборов'])},{' '}
          {countRu(bundle.sources.length, ['источник', 'источника', 'источников'])}
        </AppText>
        <AppText variant="caption" tone="muted">
          Обновление базы по сети появится в следующей версии приложения.
        </AppText>
      </Section>
      <Section title="Важно">
        <AppText>{DISCLAIMER_TEXT}</AppText>
      </Section>
      <Section title="Авторы фотографий">
        {photos.map((p) => (
          <Pressable key={p.path + p.herb} onPress={() => Linking.openURL(p.source_url)} accessibilityRole="link">
            <AppText variant="caption" tone="accent">
              {p.herb}: {p.author} · {p.license}
            </AppText>
          </Pressable>
        ))}
      </Section>
    </Screen>
  );
}
