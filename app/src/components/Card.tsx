import { View, type ViewProps } from 'react-native';
import { spacing } from '@/theme';
import { PaperCard } from './PaperCard';

/** Карточка-раздел: бумага с рваным краем (`PaperCard`), содержимое столбиком. `seed` — ключ края. */
export function Card({ style, children, seed, ...rest }: ViewProps & { seed?: string }) {
  return (
    <View {...rest}>
      <PaperCard seed={seed} style={[{ gap: spacing.sm }, style]}>{children}</PaperCard>
    </View>
  );
}
