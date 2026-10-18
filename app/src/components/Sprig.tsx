import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

/** Размер рисунка веточки в собственных единицах (viewBox). */
export const SPRIG_W = 64;
export const SPRIG_H = 28;

type Point = [number, number];

/** Стебель — квадратичная кривая снизу-слева вверх-вправо. */
const P0: Point = [3, 23];
const P1: Point = [30, 21];
const P2: Point = [60, 7];

function at(t: number): Point {
  const u = 1 - t;
  return [u * u * P0[0] + 2 * u * t * P1[0] + t * t * P2[0], u * u * P0[1] + 2 * u * t * P1[1] + t * t * P2[1]];
}

function tangent(t: number): Point {
  const dx = 2 * (1 - t) * (P1[0] - P0[0]) + 2 * t * (P2[0] - P1[0]);
  const dy = 2 * (1 - t) * (P1[1] - P0[1]) + 2 * t * (P2[1] - P1[1]);
  const len = Math.hypot(dx, dy);
  return [dx / len, dy / len];
}

/** Лист-«миндалина» от основания `base` в направлении `angle` (радианы). */
function leaf(base: Point, angle: number, length: number, width: number): string {
  const dir: Point = [Math.cos(angle), Math.sin(angle)];
  const perp: Point = [-dir[1], dir[0]];
  const tip: Point = [base[0] + dir[0] * length, base[1] + dir[1] * length];
  const mid: Point = [base[0] + dir[0] * length * 0.45, base[1] + dir[1] * length * 0.45];
  const c1: Point = [mid[0] + perp[0] * width, mid[1] + perp[1] * width];
  const c2: Point = [mid[0] - perp[0] * width, mid[1] - perp[1] * width];
  const f = (p: Point) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${f(base)}Q${f(c1)} ${f(tip)}Q${f(c2)} ${f(base)}Z`;
}

function buildLeaves(): string {
  const parts: string[] = [];
  // листья попеременно по обе стороны стебля, к верхушке — мельче
  [0.22, 0.4, 0.58, 0.76].forEach((t, i) => {
    const [tx, ty] = tangent(t);
    const side = i % 2 === 0 ? -1 : 1;
    const angle = Math.atan2(ty, tx) + side * 0.85;
    parts.push(leaf(at(t), angle, 13 - t * 5, 3.6 - t));
  });
  // верхушечный лист продолжает стебель
  const [tx, ty] = tangent(1);
  parts.push(leaf(P2, Math.atan2(ty, tx) - 0.1, 9, 2.8));
  return parts.join('');
}

/** Пути веточки — общие для украшений и печати. */
export const SPRIG_PATHS = {
  stem: `M${P0.join(' ')}Q${P1.join(' ')} ${P2.join(' ')}`,
  leaves: buildLeaves(),
};

export interface SprigProps {
  /** Ширина, px; высота — по пропорции рисунка. */
  width?: number;
  color?: string;
  /** Зеркально по горизонтали (веточка «смотрит» влево). */
  flip?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Тонкая контурная веточка-украшение (заголовки, печать, пустые состояния). */
export function Sprig({ width = 40, color = colors.sage, flip = false, style }: SprigProps) {
  const height = (width * SPRIG_H) / SPRIG_W;
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${SPRIG_W} ${SPRIG_H}`}
      // position: relative — на вебе, чтобы веточка внутри PaperCard не уходила под бумажную подложку
      style={[{ position: 'relative' }, flip ? { transform: [{ scaleX: -1 }] } : null, style]}
    >
      <Path d={SPRIG_PATHS.stem} stroke={color} strokeWidth={1.2} fill="none" strokeLinecap="round" />
      <Path d={SPRIG_PATHS.leaves} stroke={color} strokeWidth={1} fill={color} fillOpacity={0.18} strokeLinejoin="round" />
    </Svg>
  );
}
