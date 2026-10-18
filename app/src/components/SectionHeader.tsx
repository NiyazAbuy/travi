import { Pressable, View } from 'react-native';
import { colors, spacing } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Sprig } from './Sprig';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Заголовок раздела экрана с веточкой и тонкой чертой под ним; справа — необязательное действие. */
export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={{ gap: spacing.xxs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: spacing.md }}>
        <AppText variant="section" style={{ flexShrink: 1 }}>
          {title}
        </AppText>
        {actionLabel && onAction ? (
          <Pressable
            onPress={onAction}
            accessibilityRole="button"
            hitSlop={spacing.sm}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, paddingBottom: spacing.xxs }}
          >
            <AppText variant="label" tone="accent">
              {actionLabel}
            </AppText>
            <Icon name="chevronRight" size={16} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Sprig width={26} />
        <View style={{ width: 72, height: 1, backgroundColor: colors.divider, marginLeft: -2 }} />
      </View>
    </View>
  );
}
