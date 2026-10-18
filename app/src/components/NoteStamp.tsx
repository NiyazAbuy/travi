import { View } from 'react-native';
import { colors, listLayout, paperEdge, spacing } from '@/theme';
import { AppText } from './AppText';
import { PaperShape, useLayoutSize } from './PaperShape';
import { Sprig } from './Sprig';

export interface NoteStampProps {
  /** Текст заметки: показывается начало, до трёх строк рукописным шрифтом. */
  text: string;
  /** Ключ рваного края (например, `note:<id травы>`). */
  seed: string;
}

/**
 * «Штамп» заметки в строке избранного (макет 06): наклонённый клочок бумаги с чернильной кромкой,
 * «МОЯ ЗАМЕТКА» мелкими прописными и начало заметки от руки.
 */
export function NoteStamp({ text, seed }: NoteStampProps) {
  const { size, onLayout } = useLayoutSize();
  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityLabel={`Моя заметка: ${text}`}
      style={{
        maxWidth: listLayout.noteStampWidth,
        paddingHorizontal: spacing.sm,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xs,
        transform: [{ rotate: listLayout.noteStampRotate }],
      }}
    >
      {size ? (
        <PaperShape
          seed={seed}
          width={size.width}
          height={size.height}
          fill={colors.paperChip}
          edge={colors.ink}
          edgeWidth={1.3}
          depth={paperEdge.chip.depth}
          radius={paperEdge.tag.radius}
        />
      ) : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <AppText variant="stampCaption" tone="muted">
          МОЯ ЗАМЕТКА
        </AppText>
        <Sprig width={listLayout.noteStampSprig} color={colors.ink} />
      </View>
      <AppText variant="hand" numberOfLines={3} style={{ color: colors.ink }}>
        {text.trim()}
      </AppText>
    </View>
  );
}
