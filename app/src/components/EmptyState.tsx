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
  /** Крупная строка над текстом — тёплое «здесь появится…». */
  title?: string;
  /** Веточка рядом с иконкой — как пучок трав у чашки. */
  withSprig?: boolean;
}

/** Пустое состояние экрана: бумажная карточка с контурной иконкой, текстом и веточкой — в стиле остальных карточек. */
export function EmptyState({ text, icon, seed, title, withSprig }: EmptyStateProps) {
  return (
    <PaperCard seed={seed} style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end' }} importantForAccessibility="no-hide-descendants">
        <Icon name={icon} size={withSprig ? listLayout.emptyIcon * 1.5 : listLayout.emptyIcon} color={colors.ink} />
        {withSprig ? (
          <Sprig width={listLayout.titleSprig * 1.4} color={colors.sage} style={{ marginLeft: -spacing.sm, transform: [{ rotate: '-35deg' }] }} />
        ) : null}
      </View>
      {title ? (
        <AppText variant="heading" style={{ textAlign: 'center' }}>
          {title}
        </AppText>
      ) : null}
      <AppText tone="muted" style={{ textAlign: 'center' }}>
        {text}
      </AppText>
      <View importantForAccessibility="no-hide-descendants">
        <Sprig width={listLayout.titleSprig} />
      </View>
    </PaperCard>
  );
}
