import { useId, type ReactNode } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, paperEdge, radius, shadow, spacing } from '@/theme';
import { PaperShape, useLayoutSize } from './PaperShape';

export interface PaperCardProps {
  children?: ReactNode;
  /**
   * Ключ рваного края (например, id травы): тот же ключ и размер — тот же край.
   * Не задан — свой для каждого места в дереве, стабильный между перерисовками.
   */
  seed?: string;
  style?: StyleProp<ViewStyle>;
  /** Внутренний отступ; по умолчанию `spacing.lg`. */
  padding?: number;
  /** Цвет бумаги; по умолчанию `colors.card`. */
  color?: string;
  /** Цвет кромки; по умолчанию светлая кромка бумаги. Например, `colors.danger` — для предупреждения. */
  edgeColor?: string;
  /** Глубина рваного края, px; по умолчанию как у обычной карточки. Глубже — «оторванный лист». */
  depth?: number;
}

/**
 * Бумажная карточка: заливка `colors.card` с зерном, неровный рваный край (детерминированный по `seed`
 * и размеру) и мягкая тень. Край и тень рисуются под содержимым и не обрезают его.
 * До первой раскладки (размер ещё неизвестен) — обычный прямоугольник того же цвета.
 */
export function PaperCard({ children, seed, style, padding = spacing.lg, color = colors.card, edgeColor, depth = paperEdge.card.depth }: PaperCardProps) {
  const autoSeed = useId();
  const { size, onLayout } = useLayoutSize();
  return (
    <View onLayout={onLayout} style={[{ padding }, size ? null : { backgroundColor: color, borderRadius: radius.sm }, style]}>
      {size ? (
        <PaperShape
          seed={seed ?? autoSeed}
          width={size.width}
          height={size.height}
          fill={color}
          edge={edgeColor ?? colors.cardEdge}
          edgeWidth={edgeColor ? 2 : 1.2}
          depth={depth}
          radius={paperEdge.card.radius}
          shadow={shadow.paper}
          grain
        />
      ) : null}
      {children}
    </View>
  );
}
