import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import { seededRandom } from '@/lib/tornEdge';
import { colors, fonts } from '@/theme';
import { AppText } from './AppText';
import { SPRIG_H, SPRIG_PATHS, SPRIG_W } from './Sprig';

export interface StampProps {
  /** Надпись: «проверено», «черновик». */
  label: string;
  /** Диаметр, px. */
  size?: number;
  /** Цвет чернил; по умолчанию `colors.ink`. */
  color?: string;
}

/** Окружность «от руки»: радиус чуть гуляет — как оттиск печати. Детерминирована по ключу. */
function inkCircle(seed: string, cx: number, cy: number, r: number, wobble: number): string {
  const rnd = seededRandom(seed);
  const n = 72;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const rr = r + (rnd() - 0.5) * wobble;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)} ${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M${pts.join('L')}Z`;
}

/** Круглая контурная печать с веточкой и надписью, слегка повёрнутая, — отметка «проверено» / «черновик». */
export function Stamp({ label, size = 96, color = colors.ink }: StampProps) {
  const c = size / 2;
  const rings = useMemo(
    () => ({
      outer: inkCircle(`${label}:outer`, c, c, c - 3, 2.6),
      inner: inkCircle(`${label}:inner`, c, c, c - 8, 1.8),
    }),
    [label, c],
  );
  // веточка над надписью: по центру верхней половины, наклонена вверх
  const sprigScale = (size * 0.4) / SPRIG_W;
  const sprig = `translate(${c} ${size * 0.33}) rotate(-12) scale(${sprigScale}) translate(${-SPRIG_W / 2} ${-SPRIG_H / 2})`;
  // надпись умещается во внутреннее кольцо: средняя ширина буквы Cormorant ≈ 0,48 кегля (с запасом — 0,5)
  const fontSize = Math.min(size * 0.21, (size * 0.74) / (Math.max(label.length, 1) * 0.5));

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size, opacity: 0.82, transform: [{ rotate: '-11deg' }] }}
    >
      <Svg width={size} height={size}>
        {/* штрихи с разрывами — неравномерно легла краска, как у настоящего оттиска */}
        <Path d={rings.outer} stroke={color} strokeWidth={2.2} fill="none" strokeLinejoin="round" strokeDasharray="34 3 13 2 22 4" />
        <Path d={rings.inner} stroke={color} strokeWidth={1.1} fill="none" strokeLinejoin="round" strokeDasharray="19 2.5 8 1.5" />
        <G transform={sprig}>
          <Path d={SPRIG_PATHS.stem} stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Path d={SPRIG_PATHS.leaves} stroke={color} strokeWidth={1.1} fill={color} fillOpacity={0.15} strokeLinejoin="round" />
        </G>
      </Svg>
      <AppText
        numberOfLines={1}
        style={{
          position: 'absolute',
          left: size * 0.11,
          right: size * 0.11,
          top: size * 0.62 - (fontSize * 1.25) / 2,
          textAlign: 'center',
          color,
          fontFamily: fonts.display,
          fontSize,
          lineHeight: fontSize * 1.25,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}
