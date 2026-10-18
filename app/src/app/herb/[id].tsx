import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import {
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
import { AppText, Card, Chip, EvidenceDot, IconButton, NoteEditor, Screen, Section, Tag } from '@/components';
import { useContent } from '@/content/ContentProvider';
import { openLink } from '@/lib/openLink';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, radius, spacing } from '@/theme';
import { useUserData } from '@/user/UserDataProvider';

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

export default function HerbScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { herbById, sourceById, nameOf, photoSource } = useContent();
  const { setFilter } = useListFilter();
  const { data, loaded, readOnly, isFavorite, toggleFavorite, setNote } = useUserData();
  const { width } = useWindowDimensions();
  const herb = id ? herbById.get(id) : undefined;

  const sourceIds = useMemo(() => (herb ? herbSourceIds(herb) : []), [herb]);
  const saveNote = useCallback((text: string) => herb && setNote(herb.id, text), [herb, setNote]);

  if (!herb) {
    return (
      <Screen safeTop={false}>
        <AppText tone="muted">Трава не найдена — возможно, её убрали из базы.</AppText>
      </Screen>
    );
  }

  // «[1: 11, 12; 2: 4.2]» — номер источника, двоеточие, страницы; без страницы — только номер.
  const refs = (list: SourceRef[]) =>
    list.length ? ` [${list.map((r) => `${sourceIds.indexOf(r.id) + 1}${r.page ? `: ${r.page}` : ''}`).join('; ')}]` : '';
  const openGroup = (key: CatalogKey, value: string) => {
    setFilter(filterForGroup(key, value));
    router.push('/herbs');
  };
  const favorite = isFavorite(herb.id);
  const photoWidth = Math.min(width, 640) - spacing.lg * 2;
  const children = herb.safety.children;
  const childrenText =
    children.status === 'ok' && children.from_age !== undefined
      ? `можно с ${children.from_age} ${children.from_age === 1 ? 'года' : 'лет'}`
      : SAFETY_STATUS_LABELS[children.status];

  return (
    <Screen safeTop={false}>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <IconButton
              icon={favorite ? 'heart' : 'heart-outline'}
              label={favorite ? 'Убрать из избранного' : 'В избранное'}
              color={favorite ? colors.accent : colors.text}
              onPress={() => toggleFavorite(herb.id)}
            />
          ),
        }}
      />

      <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.lg }}>
        {herb.photos.map((p) => {
          const source = photoSource(p.path);
          return (
            <View key={p.path} style={{ width: photoWidth + spacing.lg * 2, paddingHorizontal: spacing.lg, gap: spacing.xs }}>
              {source ? (
                <Image source={source} style={{ width: photoWidth, height: 260, borderRadius: radius.lg }} contentFit="cover" />
              ) : (
                <View style={{ width: photoWidth, height: 260, borderRadius: radius.lg, backgroundColor: colors.surfaceRaised }} />
              )}
              <AppText variant="tiny" tone="faint">
                {photoCaption(p)}
              </AppText>
            </View>
          );
        })}
      </ScrollView>

      <View style={{ gap: spacing.xs }}>
        <AppText variant="title">{herb.name}</AppText>
        <AppText tone="muted" style={{ fontStyle: 'italic' }}>
          {herb.latin}
        </AppText>
        {herb.other_names.length > 0 && (
          <AppText variant="caption" tone="muted">
            Другие названия: {herb.other_names.join(', ')}
          </AppText>
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
          {herb.status === 'draft' && <Tag label={HERB_STATUS_LABELS.draft} />}
          <Chip label={nameOf('families', herb.family)} onPress={() => openGroup('families', herb.family)} />
          <Chip label={LIFE_FORM_LABELS[herb.life_form]} onPress={() => openGroup('lifeForms', herb.life_form)} />
          {herb.sourcing.map((s) => (
            <Chip key={s} label={SOURCING_LABELS[s]} onPress={() => openGroup('sourcing', s)} />
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {herb.indications.map((x) => (
          <Chip key={x.indication} label={nameOf('indications', x.indication)} onPress={() => openGroup('indications', x.indication)} />
        ))}
      </View>

      <Section title="Кратко">
        <AppText>{herb.description}</AppText>
      </Section>

      <Section title="От чего помогает">
        {herb.indications.map((x) => (
          <Pressable key={x.indication} onPress={() => openGroup('indications', x.indication)} style={{ gap: 2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <EvidenceDot level={x.evidence.level} />
              <AppText variant="heading" style={{ flex: 1 }}>
                {nameOf('indications', x.indication)}
              </AppText>
            </View>
            <AppText variant="caption" tone="muted">
              {EVIDENCE_LABELS[x.evidence.level]}. {x.evidence.note}
              {refs(x.sources)}
            </AppText>
          </Pressable>
        ))}
      </Section>

      {herb.substances.length > 0 && (
        <Section title="Действующие вещества">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {herb.substances.map((s) => (
              <Chip key={s} label={nameOf('substances', s)} onPress={() => openGroup('substances', s)} />
            ))}
          </View>
        </Section>
      )}

      {herb.actions.length > 0 && (
        <Section title="Действие">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {herb.actions.map((a) => (
              <Chip key={a} label={nameOf('actions', a)} onPress={() => openGroup('actions', a)} />
            ))}
          </View>
        </Section>
      )}

      {herb.habitats.length > 0 && (
        <Section title="Где растёт">
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
            {herb.habitats.map((h) => (
              <Chip key={h} label={nameOf('habitats', h)} onPress={() => openGroup('habitats', h)} />
            ))}
          </View>
        </Section>
      )}

      <Section title="Сбор">
        {herb.harvest.map((x, i) => (
          <View key={i} style={{ gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
              <Chip label={nameOf('plantParts', x.part)} onPress={() => openGroup('parts', x.part)} />
              {x.months.map((m) => (
                <Chip key={m} label={monthName(m)} onPress={() => openGroup('months', String(m))} />
              ))}
            </View>
            <AppText>
              {x.how}
              {refs(x.sources)}
            </AppText>
            <Line label="Сушка">{x.drying}</Line>
            <Line label="Хранение">{x.storage}</Line>
          </View>
        ))}
      </Section>

      <Section title="Применение">
        {herb.usage.map((u, i) => (
          <View key={i} style={{ gap: 2 }}>
            <AppText variant="heading">
              {USAGE_FORM_LABELS[u.form]}
              {u.for_indications.length ? ` · ${u.for_indications.map((x) => nameOf('indications', x)).join(', ')}` : ''}
            </AppText>
            <AppText>{u.recipe}</AppText>
            <Line label="Дозировка">{u.dosage}</Line>
            {u.course ? <Line label="Курс">{u.course}</Line> : null}
            <AppText variant="tiny" tone="faint">
              {refs(u.sources).trim()}
            </AppText>
          </View>
        ))}
      </Section>

      <Section title="Безопасность">
        <Line label="Беременность">{SAFETY_STATUS_LABELS[herb.safety.pregnancy]}</Line>
        <Line label="Кормление грудью">{SAFETY_STATUS_LABELS[herb.safety.lactation]}</Line>
        <Line label="Дети">{childrenText}</Line>
        <Line label="Токсичность">{TOXICITY_LABELS[herb.safety.toxicity]}</Line>
        {herb.safety.contraindications.map((x) => (
          <AppText key={x} tone="danger">
            Противопоказание: {x}
          </AppText>
        ))}
        {herb.safety.warnings.map((x) => (
          <AppText key={x}>⚠ {x}</AppText>
        ))}
        {herb.safety.interactions.map((x) => (
          <AppText key={x}>Взаимодействие: {x}</AppText>
        ))}
        {herb.safety.side_effects.map((x) => (
          <AppText key={x} tone="muted">
            Побочное действие: {x}
          </AppText>
        ))}
        <AppText variant="tiny" tone="faint">
          {refs(herb.safety.sources).trim()}
        </AppText>
      </Section>

      {herb.lookalikes.length > 0 && (
        <Section title="С чем можно спутать">
          {herb.lookalikes.map((l, i) => {
            const title = l.herb ? (herbById.get(l.herb)?.name ?? l.herb) : `${l.name ?? ''} (${l.latin ?? ''})`;
            const source = l.photo ? photoSource(l.photo.path) : null;
            const lookalikeId = l.herb && herbById.has(l.herb) ? l.herb : undefined;
            const heading = (
              <AppText variant="heading" tone={l.poisonous ? 'danger' : lookalikeId ? 'accent' : 'default'}>
                {title}
                {l.poisonous ? ' — ядовит' : ''}
              </AppText>
            );
            return (
              <Card key={i} style={l.poisonous ? { borderColor: colors.danger, borderWidth: 2 } : undefined}>
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
                {source && <Image source={source} style={{ width: '100%', height: 180, borderRadius: radius.md }} contentFit="cover" />}
                {l.photo && (
                  <AppText variant="tiny" tone="faint">
                    {photoCaption(l.photo)}
                  </AppText>
                )}
              </Card>
            );
          })}
        </Section>
      )}

      <Section title="Мои заметки">
        {readOnly && (
          <AppText tone="danger">Не удалось прочитать сохранённые данные — изменения сейчас не сохраняются.</AppText>
        )}
        {loaded ? (
          <NoteEditor key={herb.id} value={data.notes[herb.id]?.text ?? ''} onSave={saveNote} />
        ) : (
          <AppText tone="muted">Загрузка…</AppText>
        )}
      </Section>

      <Section title="Источники">
        {sourceIds.map((sid, i) => {
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
        })}
      </Section>
    </Screen>
  );
}
