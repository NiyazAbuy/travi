import { View } from 'react-native';
import { colors, listLayout, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon, type IconName } from './Icon';
import { PaperCard } from './PaperCard';
import { Sprig } from './Sprig';

export interface EmptyStateProps {
  text: string;
  icon: IconName;
  /** Ключ рваного края. */
  seed: string;
}

/** Пустое состояние экрана: бумажная карточка с контурной иконкой, текстом и веточкой — в стиле остальных карточек. */
export function EmptyState({ text, icon, seed }: EmptyStateProps) {
  return (
    <PaperCard seed={seed} style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <Icon name={icon} size={listLayout.emptyIcon} color={colors.ink} />
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </AppText>
      <View importantForAccessibility="no-hide-descendants">
        <Sprig width={listLayout.titleSprig} />
      </View>
    </PaperCard>
  );
}
