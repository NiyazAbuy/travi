import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import {
  compareEvidenceDesc,
  EVIDENCE_LABELS,
  filterForGroup,
  herbSourceIds,
  HERB_STATUS_LABELS,
  LIFE_FORM_LABELS,
  monthName,
  PHOTO_KIND_LABELS,
  SAFETY_STATUS_LABELS,
  sourceHref,
  SOURCING_LABELS,
  TOXICITY_LABELS,
  USAGE_FORM_LABELS,
  type CatalogKey,
  type Photo,
  type SourceRef,
} from '@travy/shared';
import { AppText, Chip, EvidenceDot, Icon, IconButton, PaperCard, Screen, Section, Sprig, Tag } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { openLink } from '@/lib/openLink';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, fonts, herbLayout, radius, spacing, typography } from '@/theme';

/**
 * «Подробнее о траве» (дизайн §4.4): всё, что не вошло в краткую карточку, — фото с авторством,
 * другие названия и метки, описание, показания с пояснениями и источниками, вещества, действие,
 * где растёт, сбор, применение полностью, безопасность, двойники и список источников.
 */

function photoCaption(p: Photo): string {
  return `${PHOTO_KIND_LABELS[p.kind]}${p.caption ? `: ${p.caption}` : ''} · ${p.author} · ${p.license}`;
}

function Line({ label, children }: { label: string; children: string }) {
  return (
    <AppText>
      <AppText tone="muted">{label}: </AppText>
      {children}
    </AppText>
  );
}

/** Плашки в строку с переносом. */
function ChipRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>{children}</View>;
}

/**
 * Ссылки на источники: кратко «[1: 4.2; 2]» (номера — как в списке «Источники» внизу),
 * нажатие раскрывает полные описания источников со ссылками.
 */
function Refs({ list, sourceIds }: { list: SourceRef[]; sourceIds: string[] }) {
  const { sourceById } = useContent();
  const [open, setOpen] = useState(false);
  if (list.length === 0) return null;
  const numberOf = (id: string) => sourceIds.indexOf(id) + 1;
  const short = list.map((r) => `${numberOf(r.id)}${r.page ? `: ${r.page}` : ''}`).join('; ');
  return (
    <View style={{ gap: spacing.xs }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={spacing.xs}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, opacity: pressed ? 0.6 : 1 })}
      >
        <AppText variant="caption" tone="accent" style={{ flexShrink: 1 }}>
          Источники [{short}]
        </AppText>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevronRight" size={typography.caption.fontSize} color={colors.accent} />
        </View>
      </Pressable>
      {open
        ? list.map((r, i) => {
            const s = sourceById.get(r.id);
            if (!s) return null;
            const href = sourceHref(s);
            return (
              <Pressable
                key={`${r.id}:${i}`}
                disabled={!href}
                onPress={() => href && openLink(href)}
                accessibilityRole={href ? 'link' : undefined}
                style={{ paddingLeft: spacing.sm, borderLeftWidth: 1, borderLeftColor: colors.divider }}
              >
                <AppText variant="caption" tone={href ? 'accent' : 'muted'}>
                  [{numberOf(r.id)}] {s.authors.join(', ')}. {s.title}. {s.year}.{r.page ? ` — ${r.page}` : ''}
                </AppText>
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

/** Тонкая черта между записями внутри раздела. */
function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs }} />;
}

export default function HerbDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { herbById, sourceById, nameOf, photoSource } = useContent();
  const { setFilter } = useListFilter();
  const { width } = useWindowDimensions();
  const herb = id ? herbById.get(id) : undefined;

  if (!herb) {
    return (
      <Screen safeTop={false}>
        {router.canGoBack() ? null : (
          // открыли по ссылке, истории нет — без стрелки отсюда не уйти
          <Stack.Screen
            options={{ headerLeft: () => <IconButton icon="back" label="На главную" onPress={() => router.replace('/')} /> }}
          />
        )}
        <AppText tone="muted">Трава не найдена — возможно, её убрали из базы.</AppText>
      </Screen>
    );
  }

  const sourceIds = herbSourceIds(herb);
  const seed = (part: string) => `${herb.id}:details:${part}`;
  const openGroup = (key: CatalogKey, value: string) => {
    setFilter(filterForGroup(key, value));
    router.push('/herbs');
  };
  const photoWidth = Math.min(width, herbLayout.maxContentWidth) - spacing.lg * 2;
  const children = herb.safety.children;
  const childrenText =
    children.status === 'ok' && children.from_age !== undefined
      ? `можно с ${children.from_age} ${children.from_age === 1 ? 'года' : 'лет'}`
      : SAFETY_STATUS_LABELS[children.status];

  return (
    <Screen safeTop={false} gap={spacing.xl}>
      {router.canGoBack() ? null : (
        // открыли по ссылке (веб, обновление страницы) — истории нет: стрелка ведёт в карточку травы
        <Stack.Screen
          options={{
            headerLeft: () => (
              <IconButton
                icon="back"
                label="К карточке травы"
                onPress={() => router.replace({ pathname: '/herb/[id]', params: { id: herb.id } })}
              />
            ),
          }}
        />
      )}
      {herb.photos.length > 0 ? <Gallery photos={herb.photos} photoWidth={photoWidth} seed={seed} /> : null}

      <View style={{ gap: spacing.xs }}>
        <AppText variant="title" accessibilityRole="header">
          {herb.name}
        </AppText>
        <AppText variant="latin" tone="muted" style={{ fontFamily: fonts.bodyItalic }}>
          {herb.latin}
        </AppText>
        {herb.other_names.length > 0 ? (
          <AppText variant="caption" tone="muted">
            Другие названия: {herb.other_names.join(', ')}
          </AppText>
        ) : null}
        <View style={{ marginTop: spacing.xs }}>
          <ChipRow>
            {herb.status === 'draft' ? <Tag label={HERB_STATUS_LABELS.draft} /> : null}
            <Chip seed={seed('family')} label={nameOf('families', herb.family)} onPress={() => openGroup('families', herb.family)} />
            <Chip
              seed={seed('life-form')}
              label={LIFE_FORM_LABELS[herb.life_form]}
              onPress={() => openGroup('lifeForms', herb.life_form)}
            />
            {herb.sourcing.map((s) => (
              <Chip key={s} seed={seed(`sourcing:${s}`)} label={SOURCING_LABELS[s]} onPress={() => openGroup('sourcing', s)} />
            ))}
          </ChipRow>
        </View>
      </View>

      <Section seed={seed('description')} title="Описание">
        <AppText>{herb.description}</AppText>
      </Section>

      <Section seed={seed('indications')} title="От чего помогает">
        {[...herb.indications]
          .sort((a, b) => compareEvidenceDesc(a.evidence.level, b.evidence.level))
          .map((x, i) => (
          <View key={x.indication} style={{ gap: spacing.xs }}>
            {i > 0 ? <Divider /> : null}
            <Pressable
              onPress={() => openGroup('indications', x.indication)}
              accessibilityRole="link"
              style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
            >
              {/* точка — по середине первой строки названия */}
              <View style={{ height: typography.heading.lineHeight, justifyContent: 'center' }}>
                <EvidenceDot level={x.evidence.level} />
              </View>
              <AppText variant="heading" tone="accent" style={{ flex: 1 }}>
                {nameOf('indications', x.indication)}
              </AppText>
            </Pressable>
            <AppText variant="caption" tone="muted">
              {EVIDENCE_LABELS[x.evidence.level]}. {x.evidence.note}
            </AppText>
            <Refs list={x.sources} sourceIds={sourceIds} />
          </View>
        ))}
      </Section>

      {herb.substances.length > 0 ? (
        <Section seed={seed('substances')} title="Действующие вещества">
          <ChipRow>
            {herb.substances.map((s) => (
              <Chip key={s} seed={seed(`substance:${s}`)} label={nameOf('substances', s)} onPress={() => openGroup('substances', s)} />
            ))}
          </ChipRow>
        </Section>
      ) : null}

      {herb.actions.length > 0 ? (
        <Section seed={seed('actions')} title="Действие">
          <ChipRow>
            {herb.actions.map((a) => (
              <Chip key={a} seed={seed(`action:${a}`)} label={nameOf('actions', a)} onPress={() => openGroup('actions', a)} />
            ))}
          </ChipRow>
        </Section>
      ) : null}

      {herb.habitats.length > 0 ? (
        <Section seed={seed('habitats')} title="Где растёт">
          <ChipRow>
            {herb.habitats.map((h) => (
              <Chip key={h} seed={seed(`habitat:${h}`)} label={nameOf('habitats', h)} onPress={() => openGroup('habitats', h)} />
            ))}
          </ChipRow>
        </Section>
      ) : null}

      {herb.harvest.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <GroupTitle title="Сбор и заготовка" />
          {herb.harvest.map((x, i) => (
            <PaperCard key={i} seed={seed(`harvest:${i}`)} style={{ gap: spacing.md }}>
              <ChipRow>
                <Chip seed={seed(`harvest:${i}:part`)} label={nameOf('plantParts', x.part)} onPress={() => openGroup('parts', x.part)} />
                {x.months.map((m) => (
                  <Chip key={m} seed={seed(`harvest:${i}:month:${m}`)} label={monthName(m)} onPress={() => openGroup('months', String(m))} />
                ))}
              </ChipRow>
              <Block title="Как собирать">{x.how}</Block>
              <Block title="Сушка">{x.drying}</Block>
              <Block title="Хранение">{x.storage}</Block>
              <Refs list={x.sources} sourceIds={sourceIds} />
            </PaperCard>
          ))}
        </View>
      ) : null}

      {herb.usage.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <GroupTitle title="Применение" />
          {herb.usage.map((u, i) => (
            <PaperCard key={i} seed={seed(`usage:${i}`)} style={{ gap: spacing.sm }}>
              <AppText variant="heading">{USAGE_FORM_LABELS[u.form]}</AppText>
              {u.for_indications.length ? (
                <AppText variant="caption" tone="muted" style={{ fontFamily: fonts.bodyItalic }}>
                  {u.for_indications.map((x) => nameOf('indications', x)).join(', ')}
                </AppText>
              ) : null}
              <AppText>{u.recipe}</AppText>
              <Block title="Дозировка">{u.dosage}</Block>
              {u.course ? <Block title="Курс">{u.course}</Block> : null}
              <Refs list={u.sources} sourceIds={sourceIds} />
            </PaperCard>
          ))}
        </View>
      ) : null}

      <Section seed={seed('safety')} title="Безопасность">
        <Line label="Беременность">{SAFETY_STATUS_LABELS[herb.safety.pregnancy]}</Line>
        <Line label="Кормление грудью">{SAFETY_STATUS_LABELS[herb.safety.lactation]}</Line>
        <Line label="Дети">{childrenText}</Line>
        <Line label="Токсичность">{TOXICITY_LABELS[herb.safety.toxicity]}</Line>
        {herb.safety.contraindications.length + herb.safety.warnings.length > 0 ? (
          // рукописная пометка на полях — как карандашом в дневнике
          <AppText variant="hand" tone="danger" style={{ marginTop: spacing.sm, transform: [{ rotate: '-3deg' }] }}>
            осторожно!
          </AppText>
        ) : null}
        {herb.safety.contraindications.map((x) => (
          <AppText key={x} tone="danger">
            Противопоказание: {x}
          </AppText>
        ))}
        {herb.safety.warnings.map((x) => (
          <View key={x} style={{ flexDirection: 'row', gap: spacing.xs }}>
            <View style={{ height: typography.body.lineHeight, justifyContent: 'center' }}>
              <Icon name="warning" size={herbLayout.inlineIcon} color={colors.warning} />
            </View>
            <AppText style={{ flex: 1 }}>{x}</AppText>
          </View>
        ))}
        {herb.safety.interactions.map((x) => (
          <AppText key={x}>Взаимодействие: {x}</AppText>
        ))}
        {herb.safety.side_effects.map((x) => (
          <AppText key={x} tone="muted">
            Побочное действие: {x}
          </AppText>
        ))}
        <Refs list={herb.safety.sources} sourceIds={sourceIds} />
      </Section>

      {herb.lookalikes.length > 0 ? (
        <View style={{ gap: spacing.md }}>
          <AppText variant="section" accessibilityRole="header">
            С чем можно спутать
          </AppText>
          {herb.lookalikes.map((l, i) => {
            const title = l.herb ? (herbById.get(l.herb)?.name ?? l.herb) : `${l.name ?? ''} (${l.latin ?? ''})`;
            const source = l.photo ? photoSource(l.photo.path) : null;
            const lookalikeId = l.herb && herbById.has(l.herb) ? l.herb : undefined;
            const heading = (
              <AppText variant="heading" tone={l.poisonous ? 'danger' : lookalikeId ? 'accent' : 'default'}>
                {title}
              </AppText>
            );
            return (
              // ядовитый двойник — красная кромка и пометка «Ядовит» на самой бумаге
              <PaperCard
                key={i}
                seed={seed(`lookalike:${i}`)}
                edgeColor={l.poisonous ? colors.danger : undefined}
                style={{ gap: spacing.sm }}
              >
                {l.poisonous ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                    <Icon name="warning" size={herbLayout.inlineIcon} color={colors.danger} weight="regular" />
                    <AppText variant="label" tone="danger">
                      Ядовит
                    </AppText>
                  </View>
                ) : null}
                {lookalikeId ? (
                  <Pressable
                    onPress={() => router.push({ pathname: '/herb/[id]', params: { id: lookalikeId } })}
                    accessibilityRole="link"
                  >
                    {heading}
                  </Pressable>
                ) : (
                  heading
                )}
                <AppText>{l.differences}</AppText>
                {source ? (
                  <Image
                    source={source}
                    style={{ width: '100%', height: herbLayout.lookalikePhotoHeight, borderRadius: radius.sm }}
                    contentFit="cover"
                  />
                ) : null}
                {l.photo ? (
                  <AppText variant="tiny" tone="faint">
                    {photoCaption(l.photo)}
                  </AppText>
                ) : null}
              </PaperCard>
            );
          })}
        </View>
      ) : null}

      <SourceList sourceIds={sourceIds} seed={seed('sources')} />
    </Screen>
  );
}

/** Общий список источников внизу — свёрнут: заголовок с числом, по нажатию — весь список. */
function SourceList({ sourceIds, seed }: { sourceIds: string[]; seed: string }) {
  const { sourceById } = useContent();
  const [open, setOpen] = useState(false);
  if (sourceIds.length === 0) return null;
  return (
    <PaperCard seed={seed} style={{ gap: spacing.sm }}>
      <Pressable
        onPress={() => setOpen(!open)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
      >
        <AppText variant="heading" style={{ flex: 1 }}>
          Источники ({sourceIds.length})
        </AppText>
        <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
          <Icon name="chevronRight" size={herbLayout.chevron} color={colors.textMuted} />
        </View>
      </Pressable>
      {open
        ? sourceIds.map((sid, i) => {
            const s = sourceById.get(sid);
            if (!s) return null;
            const href = sourceHref(s);
            return (
              <Pressable key={sid} disabled={!href} onPress={() => href && openLink(href)} accessibilityRole={href ? 'link' : undefined}>
                <AppText variant="caption" tone={href ? 'accent' : 'muted'}>
                  [{i + 1}] {s.authors.join(', ')}. {s.title}. {s.year}.{s.isbn ? ` ISBN ${s.isbn}.` : ''}
                </AppText>
              </Pressable>
            );
          })
        : null}
    </PaperCard>
  );
}

/**
 * Галерея фото, листается вбок по одному. Сразу под фото — точки (активная — текущее фото):
 * без них неочевидно, что фото несколько. Точки рисуются в каждом слайде со своей активной —
 * так им не нужно следить за прокруткой.
 */
function Gallery({ photos, photoWidth, seed }: { photos: Photo[]; photoWidth: number; seed: (part: string) => string }) {
  const { photoSource } = useContent();
  const pageWidth = photoWidth + spacing.lg * 2;
  const imageWidth = photoWidth - spacing.xs * 2;
  return (
    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
      {photos.map((p, index) => {
        const source = photoSource(p.path);
        return (
          <View key={p.path} style={{ width: pageWidth, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, gap: spacing.sm }}>
            <PaperCard seed={seed('photo:' + p.path)} padding={spacing.xs}>
              {source ? (
                <Image
                  source={source}
                  style={{ width: imageWidth, height: herbLayout.galleryHeight, borderRadius: radius.sm }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{ width: imageWidth, height: herbLayout.galleryHeight, borderRadius: radius.sm, backgroundColor: colors.paperDeep }}
                />
              )}
            </PaperCard>
            {photos.length > 1 ? (
              <View
                accessible
                accessibilityLabel={'Фото ' + (index + 1) + ' из ' + photos.length + ', листайте вбок'}
                style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xs }}
              >
                {photos.map((q, i) => (
                  <View
                    key={q.path}
                    style={{
                      width: herbLayout.galleryDot,
                      height: herbLayout.galleryDot,
                      borderRadius: herbLayout.galleryDot / 2,
                      backgroundColor: i === index ? colors.moss : colors.divider,
                    }}
                  />
                ))}
              </View>
            ) : null}
            <AppText variant="tiny" tone="faint">
              {photoCaption(p)}
            </AppText>
          </View>
        );
      })}
    </ScrollView>
  );
}

/** Заголовок группы карточек («Сбор и заготовка», «Применение») — как заголовок раздела, с веточкой. */
function GroupTitle({ title }: { title: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <AppText variant="section" accessibilityRole="header">
        {title}
      </AppText>
      <Sprig width={herbLayout.headingSprig} />
    </View>
  );
}

/** Короткий блок с подзаголовком: «Сушка», «Хранение», «Дозировка». */
function Block({ title, children }: { title: string; children: string }) {
  return (
    <View style={{ gap: spacing.xxs }}>
      <AppText variant="label" tone="muted">
        {title}
      </AppText>
      <AppText>{children}</AppText>
    </View>
  );
}
