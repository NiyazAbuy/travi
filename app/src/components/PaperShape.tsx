import { useMemo, useState } from 'react';
import { Image, View, type LayoutChangeEvent } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { tornEdgePath } from '@/lib/tornEdge';
import type { PaperShadow } from '@/theme';
import { PAPER_TILE } from './PaperTexture';

/** Поле вокруг фигуры внутри SVG — под тень и светлую кромку, px. */
const PAD = 10;

export interface LayoutSize {
  width: number;
  height: number;
}

/**
 * Размер элемента по `onLayout`, округлённый до целых px. Пока размер неизвестен — null.
 * Новый объект — только при настоящем изменении размера: край не перерисовывается от лишних раскладок.
 */
export function useLayoutSize() {
  const [size, setSize] = useState<LayoutSize | null>(null);
  const onLayout = (e: LayoutChangeEvent) => {
    const width = Math.round(e.nativeEvent.layout.width);
    const height = Math.round(e.nativeEvent.layout.height);
    setSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
  };
  return { size, onLayout };
}

export interface PaperShapeProps extends LayoutSize {
  /** Ключ края: тот же ключ и размер — тот же край. */
  seed: string;
  fill: string;
  /** Цвет кромки (обводки края); не задан — без обводки. */
  edge?: string;
  edgeWidth?: number;
  /** Глубина зубцов и скругление углов (`paperEdge` из темы). */
  depth: number;
  radius: number;
  /** Тень под краем (`shadow.paper` / `shadow.chip`); не задана — без тени. */
  shadow?: PaperShadow;
  /** Бумажное зерно поверх заливки (для крупных карточек). */
  grain?: boolean;
}

/**
 * Фон «рваная бумага» под содержимым элемента: один SVG-путь (заливка + кромка) и он же, сдвинутый вниз, —
 * два слоя мягкой тени. Ставится первым ребёнком элемента известного размера; содержимое не обрезает
 * (край внутри прямоугольника элемента, тень рисуется за его пределами).
 */
export function PaperShape({ seed, width, height, fill, edge, edgeWidth = 1, depth, radius, shadow, grain = false }: PaperShapeProps) {
  const d = useMemo(
    () => tornEdgePath(seed, width, height, { depth, radius, offset: PAD }),
    [seed, width, height, depth, radius],
  );
  const outerW = width + PAD * 2;
  const outerH = height + PAD * 2;
  return (
    <View
      style={{ position: 'absolute', left: -PAD, top: -PAD, width: outerW, height: outerH, pointerEvents: 'none' }}
    >
      <Svg width={outerW} height={outerH}>
        {shadow ? (
          <>
            {/* дальний слой: широкая бледная обводка — «размытие» */}
            <G transform={`translate(0 ${shadow.offsetY * 1.5})`}>
              <Path
                d={d}
                fill={shadow.color}
                fillOpacity={shadow.opacity / 2}
                stroke={shadow.color}
                strokeOpacity={shadow.opacity / 2}
                strokeWidth={shadow.blur}
                strokeLinejoin="round"
              />
            </G>
            {/* ближний слой: плотнее и уже */}
            <G transform={`translate(0 ${shadow.offsetY})`}>
              <Path
                d={d}
                fill={shadow.color}
                fillOpacity={shadow.opacity}
                stroke={shadow.color}
                strokeOpacity={shadow.opacity}
                strokeWidth={shadow.blur / 3}
                strokeLinejoin="round"
              />
            </G>
          </>
        ) : null}
        <Path d={d} fill={fill} stroke={edge ?? 'none'} strokeWidth={edge ? edgeWidth : 0} strokeLinejoin="round" />
      </Svg>
      {grain ? (
        // Зерно — внутри прямоугольника, отступившего от края на глубину зубцов: за рваный край не вылезает.
        <Image
          source={PAPER_TILE}
          resizeMode="repeat"
          style={{
            position: 'absolute',
            left: PAD + depth,
            top: PAD + depth,
            width: Math.max(0, width - depth * 2),
            height: Math.max(0, height - depth * 2),
            borderRadius: radius,
          }}
        />
      ) : null}
    </View>
  );
}
