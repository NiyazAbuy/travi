import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { seededRandom } from '@/lib/tornEdge';
import { colors } from '@/theme';

/** Высота области штриха, px: линия гуляет вверх-вниз в её пределах. */
const HEIGHT = 8;

export interface InkLineProps {
  /** Длина штриха, px. */
  width: number;
  /** Ключ неровности: тот же ключ и длина — та же линия. */
  seed: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Неровная черта «пером» — подчёркивание рукописного заголовка или абзаца, как на макете карточки. */
export function InkLine({ width, seed, color = colors.ink, style }: InkLineProps) {
  const d = useMemo(() => {
    const rnd = seededRandom(`${seed}|${Math.round(width)}`);
    const mid = HEIGHT / 2;
    const y = (spread: number) => (mid + (rnd() - 0.5) * spread).toFixed(1);
    const steps = Math.max(2, Math.round(width / 28));
    const step = (width - 2) / steps;
    let path = `M1 ${y(2)}`;
    for (let i = 1; i <= steps; i++) {
      const x = 1 + step * i;
      path += `Q${(x - step / 2).toFixed(1)} ${y(4)} ${x.toFixed(1)} ${y(2)}`;
    }
    return path;
  }, [seed, width]);
  return (
    // position: relative — на вебе, чтобы черта внутри бумажной карточки не уходила под подложку
    <Svg width={width} height={HEIGHT} style={[{ position: 'relative' }, style]}>
      <Path d={d} stroke={color} strokeWidth={1.3} strokeOpacity={0.75} strokeLinecap="round" fill="none" />
    </Svg>
  );
}
