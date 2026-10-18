import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import {
  compareEvidenceDesc,
  EVIDENCE_LABELS,
  filterForGroup,
  herbOrganSystems,
  herbParts,
  nameList,
  shortLabel,
  usageSummary,
  type CatalogKey,
  type Herb,
} from '@travy/shared';
import {
  AppText,
  Button,
  Chip,
  EvidenceDot,
  Icon,
  IconButton,
  InkLine,
  NoteEditor,
  PaperCard,
  Screen,
  Sprig,
  Stamp,
} from '@/components';
import { useContent } from '@/content/ContentProvider';
import { herbArt, type HerbArt } from '@/content/herbArt';
import { useListFilter } from '@/state/ListFilterProvider';
import { colors, herbLayout, spacing, typography } from '@/theme';
import { useUserData } from '@/user/UserDataProvider';

/**
 * Краткая карточка травы в стиле «полевого дневника» (дизайн §4.3, макет 03): название и рисунок,
 * системы органов, описание, три карточки (части, вещества, применение), от чего помогает,
 * печать и заметка, избранное и переход в «Подробнее о траве» — там всё остальное.
 */

/** Шапка: круглые бумажные кнопки «назад» и «в избранное», как на макете. */
function TopBar({ onBack, favorite, onToggleFavorite }: { onBack: () => void; favorite?: boolean; onToggleFavorite?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <IconButton round icon="back" label="Назад" onPress={onBack} />
      {onToggleFavorite ? (
        <IconButton
          round
          icon="heart"
          filled={favorite}
          color={favorite ? colors.accent : colors.text}
          label={favorite ? 'Убрать из избранного' : 'В избранное'}
          onPress={onToggleFavorite}
        />
      ) : null}
    </View>
  );
}

interface HeaderProps {
  herb: Herb;
  /** Картинка справа от названия. */
  art: HerbArt | null;
  contentWidth: number;
  systems: { id: string; name: string }[];
  onSystem: (id: string) => void;
  onMore: () => void;
}

/**
 * Название, латынь, плашки систем органов и начало описания — слева; рисунок — справа, крупно, без рамки.
 * Рисунок начинается под последней строкой названия (цветки верхушки не сталкиваются с буквами),
 * его высота — по пропорциям картинки; описание обрезается по низу рисунка, целиком — в «Подробнее».
 */
function HerbHeader({ herb, art, contentWidth, systems, onSystem, onMore }: HeaderProps) {
  const [titleHeight, setTitleHeight] = useState(0);
  const [topHeight, setTopHeight] = useState(0);
  // высота / ширина рисунка — узнаём при загрузке; до неё — наибольшая высота
  const [ratio, setRatio] = useState<number | null>(null);
  const titleLine = typography.display.lineHeight;
  const artWidth = art ? Math.round(contentWidth * herbLayout.illustrationShare) : 0;
  const artHeight = !art
    ? 0
    : art.drawing
      ? Math.min(herbLayout.illustrationHeight, ratio ? Math.round(artWidth * ratio) : herbLayout.illustrationHeight)
      : herbLayout.photoFallbackHeight;
  const artTop = art ? Math.max(titleHeight, titleLine) - titleLine + herbLayout.illustrationTop : 0;
  // колонка текста кончается у левого края рисунка; название может заходить на его пустой верх
  const columnRight = art ? artWidth - herbLayout.illustrationBleed + spacing.sm : 0;
  const titleRight = art ? Math.round(artWidth * (1 - herbLayout.titleOverlap)) : 0;
  const room = artTop + artHeight - topHeight - spacing.md;
  const lines = Math.min(
    herbLayout.descriptionMaxLines,
    Math.max(herbLayout.descriptionMinLines, Math.floor(room / typography.body.lineHeight)),
  );

  return (
    <View style={{ minHeight: artTop + artHeight }}>
      {art ? (
        <View
          style={{ position: 'absolute', top: artTop, right: -herbLayout.illustrationBleed, width: artWidth, height: artHeight }}
          accessible
          accessibilityRole="image"
          accessibilityLabel={art.drawing ? `Рисунок: ${herb.name}` : `Фото: ${herb.name}`}
        >
          {art.drawing ? (
            <Image
              source={art.source}
              style={{ width: artWidth, height: artHeight }}
              contentFit="contain"
              contentPosition="top"
              onLoad={(e) => {
                const { width, height } = e.source;
                if (width > 0 && height > 0) setRatio(height / width);
              }}
            />
          ) : (
            <PaperCard seed={`${herb.id}:photo`} padding={spacing.xs}>
              <Image
                source={art.source}
                style={{ width: artWidth - spacing.xs * 2, height: artHeight - spacing.xs * 2 }}
                contentFit="cover"
              />
            </PaperCard>
          )}
        </View>
      ) : null}

      <View onLayout={(e) => setTopHeight(Math.round(e.nativeEvent.layout.height))} style={{ gap: spacing.md }}>
        <View style={{ gap: spacing.xxs }}>
          <AppText
            variant="display"
            accessibilityRole="header"
            onLayout={(e) => setTitleHeight(Math.round(e.nativeEvent.layout.height))}
            style={{ marginRight: titleRight }}
          >
            {herb.name}
          </AppText>
          <AppText variant="latin" tone="muted" style={{ marginRight: columnRight }}>
            {shortLabel(herb.latin)}
          </AppText>
        </View>
        {systems.length > 0 ? (
          <View style={{ marginRight: columnRight, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            {systems.map((s) => (
              <Chip key={s.id} filled dense seed={`${herb.id}:system:${s.id}`} label={s.name} onPress={() => onSystem(s.id)} />
            ))}
          </View>
        ) : null}
      </View>

      <Pressable
        onPress={onMore}
        accessibilityRole="button"
        accessibilityHint="Открывает «Подробнее о траве» с полным описанием"
        style={({ pressed }) => ({ marginRight: columnRight, marginTop: spacing.md, gap: spacing.xs, opacity: pressed ? 0.7 : 1 })}
      >
        <AppText numberOfLines={lines}>{herb.description}</AppText>
        <InkLine width={Math.round((contentWidth - columnRight) * herbLayout.descriptionRule)} seed={`${herb.id}:description`} />
      </Pressable>
    </View>
  );
}

/** Одна из трёх карточек в ряд: иконка, заголовок, текст и веточка-украшение внизу. */
function FactCard({
  seed,
  icon,
  title,
  weight,
  flip,
  children,
}: {
  seed: string;
  icon: ReactNode;
  title: string;
  /** Доля ширины ряда (`herbLayout.factWeights`). */
  weight: number;
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <PaperCard seed={seed} padding={spacing.sm} style={{ flex: weight, gap: spacing.xs }}>
      <View style={{ alignItems: 'center', gap: spacing.xs, paddingTop: spacing.xs, marginBottom: spacing.xs }}>
        {icon}
        <AppText variant="subheading" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
      </View>
      {children}
      <Sprig width={herbLayout.factSprig} flip={flip} style={{ marginTop: 'auto', alignSelf: flip ? 'flex-start' : 'flex-end' }} />
    </PaperCard>
  );
}

function FactText({ children, muted }: { children: ReactNode; muted?: boolean }) {
  return (
    <AppText variant="caption" tone={muted ? 'faint' : 'default'}>
      {children}
    </AppText>
  );
}

/** «Внутрь: чай, настой» — подпись приглушённая, способы обычным текстом. */
function UsageLine({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <AppText variant="caption">
      <AppText variant="caption" tone="muted">
        {label}:{' '}
      </AppText>
      {items.join(', ')}
    </AppText>
  );
}

/** Печать статуса и «Моя заметка» рукописным шрифтом: нажатие — правка, сохранение — само, как раньше. */
function StampAndNote({ herb }: { herb: Herb }) {
  const { data, loaded, readOnly, setNote } = useUserData();
  const [editing, setEditing] = useState(false);
  const saveNote = useCallback((text: string) => setNote(herb.id, text), [herb.id, setNote]);
  const note = data.notes[herb.id]?.text ?? '';

  let body: ReactNode;
  if (!loaded) {
    body = <AppText tone="muted">Загрузка…</AppText>;
  } else if (editing) {
    body = (
      <View style={{ alignSelf: 'stretch' }}>
        <NoteEditor
          key={herb.id}
          value={note}
          onSave={saveNote}
          autoFocus
          onBlur={() => setEditing(false)}
          style={[typography.hand, { backgroundColor: colors.paperDeep }]}
        />
      </View>
    );
  } else {
    body = (
      <Pressable
        onPress={() => setEditing(true)}
        accessibilityRole="button"
        accessibilityLabel={note ? `Моя заметка: ${note}. Изменить` : 'Добавить заметку'}
        hitSlop={spacing.sm}
        style={({ pressed }) => ({ alignSelf: 'stretch', alignItems: 'center', opacity: pressed ? 0.6 : 1 })}
      >
        {note ? (
          <AppText variant="hand" style={{ textAlign: 'center', color: colors.ink }}>
            {note.trim()}
          </AppText>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="note" size={herbLayout.inlineIcon} color={colors.textFaint} />
            <AppText variant="hand" tone="faint">
              Добавить заметку
            </AppText>
          </View>
        )}
      </Pressable>
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <Stamp label={herb.status === 'checked' ? 'проверено' : 'черновик'} size={herbLayout.stamp} />
      <View style={{ flex: 1, alignItems: 'center', gap: spacing.xs }}>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="handTitle" tone="muted">
            Моя заметка
          </AppText>
          <InkLine width={herbLayout.noteRule} seed={`${herb.id}:note`} />
        </View>
        {readOnly ? (
          <AppText variant="caption" tone="danger" style={{ textAlign: 'center' }}>
            Не удалось прочитать сохранённые данные — изменения сейчас не сохраняются.
          </AppText>
        ) : null}
        {body}
      </View>
    </View>
  );
}

export default function HerbScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { bundle, herbById, nameOf, photoSource } = useContent();
  const { setFilter } = useListFilter();
  const { isFavorite, toggleFavorite } = useUserData();
  const { width } = useWindowDimensions();
  const herb = id ? herbById.get(id) : undefined;

  // открыли по ссылке (веб, обновление страницы) — истории нет, «назад» ведёт на главную
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!herb) {
    return (
      <Screen>
        <TopBar onBack={goBack} />
        <AppText tone="muted">Трава не найдена — возможно, её убрали из базы.</AppText>
      </Screen>
    );
  }

  const openGroup = (key: CatalogKey, value: string) => {
    setFilter(filterForGroup(key, value));
    router.push('/herbs');
  };
  const openDetails = () => router.push({ pathname: '/herb/[id]/details', params: { id: herb.id } });
  const favorite = isFavorite(herb.id);
  const contentWidth = Math.min(width, herbLayout.maxContentWidth) - spacing.lg * 2;

  const systems = herbOrganSystems(herb, bundle.dictionaries);
  const parts = herbParts(herb, bundle.dictionaries).map((p) => p.name);
  const substances = herb.substances.map((s) => nameOf('substances', s));
  const usage = usageSummary(herb);
  const hasUsageSummary = usage.internal.length + usage.external.length > 0;
  // все показания, лучший уровень доказанности — выше (сортировка устойчивая: равные — как в базе)
  const indications = [...herb.indications].sort((a, b) => compareEvidenceDesc(a.evidence.level, b.evidence.level));

  return (
    <Screen>
      <TopBar onBack={goBack} favorite={favorite} onToggleFavorite={() => toggleFavorite(herb.id)} />

      <HerbHeader
        herb={herb}
        art={herbArt(herb, photoSource)}
        contentWidth={contentWidth}
        systems={systems}
        onSystem={(systemId) => openGroup('organSystems', systemId)}
        onMore={openDetails}
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm, marginHorizontal: -herbLayout.factsBleed }}>
        <FactCard
          seed={`${herb.id}:parts`}
          title="Части растения"
          weight={herbLayout.factWeights[0]}
          icon={<Sprig width={herbLayout.factIcon * 1.4} color={colors.ink} style={{ transform: [{ rotate: '-28deg' }] }} />}
        >
          <FactText muted={parts.length === 0}>{parts.length ? nameList(parts) : 'нет данных'}</FactText>
        </FactCard>
        <FactCard
          seed={`${herb.id}:substances`}
          title="Действующие вещества"
          weight={herbLayout.factWeights[1]}
          flip
          icon={<Icon name="flask" size={herbLayout.factIcon} color={colors.ink} />}
        >
          <FactText muted={substances.length === 0}>{substances.length ? nameList(substances) : 'нет данных'}</FactText>
        </FactCard>
        <FactCard
          seed={`${herb.id}:usage`}
          title="Применение"
          weight={herbLayout.factWeights[2]}
          icon={<Icon name="cup" size={herbLayout.factIcon} color={colors.ink} />}
        >
          {hasUsageSummary ? (
            <>
              <UsageLine label="Внутрь" items={usage.internal} />
              <UsageLine label="Наружно" items={usage.external} />
            </>
          ) : (
            <FactText muted>{herb.usage.length ? 'Способы — в «Подробнее о траве»' : 'нет данных'}</FactText>
          )}
        </FactCard>
      </View>

      <PaperCard seed={`${herb.id}:indications`} style={{ gap: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <AppText variant="heading" accessibilityRole="header">
            От чего помогает
          </AppText>
          <Sprig width={herbLayout.headingSprig} />
        </View>
        {indications.map((x) => (
          <Pressable
            key={x.indication}
            onPress={() => openGroup('indications', x.indication)}
            accessibilityRole="link"
            style={({ pressed }) => ({ flexDirection: 'row', gap: spacing.sm, opacity: pressed ? 0.6 : 1 })}
          >
            <View style={{ height: typography.body.lineHeight, justifyContent: 'center' }}>
              <EvidenceDot level={x.evidence.level} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText>{nameOf('indications', x.indication)}</AppText>
              <AppText variant="caption" tone="muted">
                {EVIDENCE_LABELS[x.evidence.level]}
              </AppText>
            </View>
            <View style={{ height: typography.body.lineHeight, justifyContent: 'center' }}>
              <Icon name="chevronRight" size={herbLayout.chevron} color={colors.textFaint} />
            </View>
          </Pressable>
        ))}
      </PaperCard>

      <StampAndNote herb={herb} />

      <View style={{ gap: spacing.md }}>
        <Button
          large
          seed={`${herb.id}:favorite`}
          variant={favorite ? 'secondary' : 'primary'}
          label={favorite ? 'В избранном' : 'Добавить в избранное'}
          icon="heart"
          iconWeight={favorite ? 'fill' : 'light'}
          onPress={() => toggleFavorite(herb.id)}
        />
        <Button seed={`${herb.id}:details`} variant="secondary" label="Подробнее о траве" icon="chevronRight" onPress={openDetails} />
      </View>
    </Screen>
  );
}
