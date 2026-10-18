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
      // width/height 100%: в вебе картинка с absoluteFill иначе остаётся размером с плитку (384 px).
      style={[StyleSheet.absoluteFill, { width: '100%', height: '100%', pointerEvents: 'none' }, style]}
    />
  );
}
