import { Image, StyleSheet, type ImageStyle, type StyleProp } from 'react-native';

/** Плитка текстуры бумаги (генерируется `npm run app:paper`): полупрозрачное зерно поверх цвета фона. */
export const PAPER_TILE = require('../../assets/images/paper.png');

/**
 * Бумажная текстура на всю площадь родителя, под содержимым. Цвет задаёт фон родителя —
 * текстура лишь добавляет зерно, поэтому подходит и экрану, и карточке. Нажатия не перехватывает.
 */
export function PaperTexture({ style }: { style?: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={PAPER_TILE}
      resizeMode="repeat"
      style={[StyleSheet.absoluteFill, { width: undefined, height: undefined, pointerEvents: 'none' }, style]}
    />
  );
}
