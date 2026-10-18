import { View } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { colors, herbLayout } from '@/theme';

export type FactIconKind = 'sprig' | 'flask' | 'cup';

/**
 * Рисованные иконки трёх карточек травы (как на макете карточки): веточка с листьями, колба с жидкостью
 * и пузырьками, чашка на блюдце с паром. Тонкий «перьевой» контур цвета чернил, жидкость — шалфеем.
 * Сетка 40×40; `position: relative` — на вебе, чтобы рисунок был над бумагой карточки.
 */
export function FactIcon({ kind, size = herbLayout.factIcon * 1.35 }: { kind: FactIconKind; size?: number }) {
  const ink = colors.ink;
  const stroke = { stroke: ink, strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <View style={{ position: 'relative', width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 40 40">
        {kind === 'sprig' ? (
          <>
            <Path d="M9 33 C 15 26, 22 18, 31 7" {...stroke} />
            {/* листья попарно вдоль стебля, верхний — на кончике */}
            <Path d="M13 28.5 C 9 27, 6.5 23.5, 7 20 C 10.5 21, 13 24.5, 13 28.5 Z" {...stroke} fill={colors.sage} fillOpacity={0.25} />
            <Path d="M14.5 26.5 C 18.5 27.5, 22 26, 23.5 23 C 20 22, 16.5 23.5, 14.5 26.5 Z" {...stroke} fill={colors.sage} fillOpacity={0.25} />
            <Path d="M19 20.5 C 15.5 18.5, 14 14.5, 15 11.5 C 18.5 13, 20 16.5, 19 20.5 Z" {...stroke} fill={colors.sage} fillOpacity={0.25} />
            <Path d="M21 18.5 C 25 19, 28.5 17, 29.5 13.5 C 26 13, 22.5 15, 21 18.5 Z" {...stroke} fill={colors.sage} fillOpacity={0.25} />
            <Path d="M31 7 C 27.5 6.5, 25 8.5, 24.5 12 C 28 12, 30.5 10, 31 7 Z" {...stroke} fill={colors.sage} fillOpacity={0.25} />
            <Path d="M10.5 24.5 L 9.2 22.2 M 17.5 25.3 L 20 24.5 M 17.2 16 L 16.4 13.6 M 24.2 16.4 L 26.5 15.4" {...stroke} strokeWidth={0.8} />
          </>
        ) : null}
        {kind === 'flask' ? (
          <>
            {/* жидкость под чертой уровня */}
            <Path d="M10.5 24 L 7.6 30.6 C 6.9 32.4, 8 34, 10 34 H 30 C 32 34, 33.1 32.4, 32.4 30.6 L 29.5 24 Z" fill={colors.sage} fillOpacity={0.35} />
            <Path d="M16 6 H 24 M 17 6 V 15 L 7.6 30.6 C 6.9 32.4, 8 34, 10 34 H 30 C 32 34, 33.1 32.4, 32.4 30.6 L 23 15 V 6" {...stroke} />
            <Path d="M10.5 24 C 14 23, 17 25, 20 24 C 23 23, 26 25, 29.5 24" {...stroke} strokeWidth={1} />
            <Circle cx={17} cy={29} r={1.3} {...stroke} strokeWidth={0.9} />
            <Circle cx={22.5} cy={27.5} r={0.9} {...stroke} strokeWidth={0.8} />
            <Circle cx={20.5} cy={20} r={0.8} {...stroke} strokeWidth={0.8} />
            <Path d="M17 10 H 19.5 M 17 12.5 H 19" {...stroke} strokeWidth={0.8} />
          </>
        ) : null}
        {kind === 'cup' ? (
          <>
            {/* пар — три волнистых струйки */}
            <Path d="M14 12 C 12.5 10, 15.5 9, 14 6.5 M 19.5 12 C 18 10, 21 9, 19.5 6.5 M 25 12 C 23.5 10, 26.5 9, 25 6.5" {...stroke} strokeWidth={1} />
            <Ellipse cx={20} cy={32.5} rx={14} ry={2.6} {...stroke} />
            <Path d="M9 16 H 31 V 19 C 31 25.5, 26.5 30, 20 30 C 13.5 30, 9 25.5, 9 19 Z" {...stroke} fill={colors.paperChip} />
            <Path d="M10 18 H 30" {...stroke} strokeWidth={0.8} stroke={colors.sage} />
            <Path d="M31 18.5 C 35.5 18.5, 36 24.5, 30.2 24.8" {...stroke} />
          </>
        ) : null}
      </Svg>
    </View>
  );
}
