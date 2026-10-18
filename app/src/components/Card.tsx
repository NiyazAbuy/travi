import { View, type ViewProps } from 'react-native';
import { spacing } from '@/theme';
import { PaperCard } from './PaperCard';

/** Карточка-раздел: бумага с рваным краем (`PaperCard`), содержимое столбиком. */
export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest}>
      <PaperCard style={[{ gap: spacing.sm }, style]}>{children}</PaperCard>
    </View>
  );
}
