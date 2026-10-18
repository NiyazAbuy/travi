import Constants from 'expo-constants';
import { Pressable, View } from 'react-native';
import { compareNames, contentVersionDate, countRu, shortLabel, type Photo } from '@travy/shared';
import { AppText, Button, DISCLAIMER_TEXT, Screen, Section } from '@/components';
import { BANNER } from '@/content/banner';
import { useContent } from '@/content/ContentProvider';
import { openLink } from '@/lib/openLink';
import { spacing } from '@/theme';
import { useUpdates } from '@/update/UpdateProvider';

const APP_UPDATE_NEEDED_TEXT = 'Доступна новая база — обновите приложение';

/** Строка авторства: «что: автор · лицензия», нажатие — страница файла. */
function Credit({ what, author, license, url }: { what: string; author: string; license: string; url: string }) {
  return (
    <Pressable onPress={() => openLink(url)} accessibilityRole="link" hitSlop={spacing.xs}>
      <AppText variant="caption">
        <AppText variant="caption" tone="muted">
          {what}:{' '}
        </AppText>
        <AppText variant="caption" tone="accent">
          {author} · {license}
        </AppText>
      </AppText>
    </Pressable>
  );
}

const photoCredit = (what: string, p: Photo) => ({ what, author: p.author, license: p.license, url: p.source_url });

/** «О приложении»: версии, обновление базы, дисклеймер и авторство всех картинок — рисунков, фото и баннера. */
export default function SettingsScreen() {
  const { bundle, source } = useContent();
  const { status, checking, appUpdateNeeded, checkNow } = useUpdates();
  // по травам: рисунок, фото, фото двойников
  const herbs = [...bundle.herbs].sort((a, b) => compareNames(a.name, b.name));
  const credits = herbs.map((h) => ({
    id: h.id,
    name: h.name,
    items: [
      ...(h.illustration ? [photoCredit('Рисунок', h.illustration)] : []),
      ...h.photos.map((p, i) => photoCredit(h.photos.length > 1 ? `Фото ${i + 1}` : 'Фото', p)),
      ...h.lookalikes.flatMap((l) => {
        const name = l.name ?? (l.herb ? bundle.herbs.find((x) => x.id === l.herb)?.name : undefined);
        return l.photo ? [photoCredit(name ? `Двойник — ${shortLabel(name).toLowerCase()}` : 'Двойник', l.photo)] : [];
      }),
    ],
  }));

  return (
    <Screen safeTop={false}>
      <Section title="Приложение" seed="about:app">
        <AppText>Версия {Constants.expoConfig?.version}</AppText>
      </Section>
      <Section title="База трав" seed="about:base">
        <AppText>Версия: {contentVersionDate(bundle.contentVersion)}</AppText>
        <AppText tone="muted">
          {countRu(bundle.herbs.length, ['трава', 'травы', 'трав'])}, {countRu(bundle.recipes.length, ['сбор', 'сбора', 'сборов'])},{' '}
          {countRu(bundle.sources.length, ['источник', 'источника', 'источников'])}
        </AppText>
        <AppText tone="muted">{source === 'downloaded' ? 'Скачана из сети' : 'Встроенная'}</AppText>
        {appUpdateNeeded && <AppText tone="accent">{APP_UPDATE_NEEDED_TEXT}</AppText>}
        {checkNow ? (
          <Button seed="about:check" label="Проверить обновления" variant="secondary" onPress={checkNow} disabled={checking} />
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
      <Section title="Важно" seed="about:disclaimer">
        <AppText>{DISCLAIMER_TEXT}</AppText>
      </Section>
      <Section title="Авторы картинок" seed="about:credits">
        <AppText variant="caption" tone="muted">
          Нажмите на строку — откроется страница файла с полной лицензией.
        </AppText>
        <View style={{ gap: spacing.xxs }}>
          <AppText variant="subheading">Картина на главной</AppText>
          <Credit
            what={`«${BANNER.title}», ${BANNER.year}`}
            author={BANNER.author}
            license={BANNER.license}
            url={BANNER.sourceUrl}
          />
        </View>
        {credits.map((c) => (
          <View key={c.id} style={{ gap: spacing.xxs }}>
            <AppText variant="subheading">{c.name}</AppText>
            {c.items.map((item) => (
              <Credit key={`${item.what}:${item.url}`} {...item} />
            ))}
          </View>
        ))}
      </Section>
    </Screen>
  );
}
