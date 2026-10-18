import { Pressable, View } from 'react-native';
import { AppText } from './AppText';

export interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <AppText variant="title">{title}</AppText>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button">
          <AppText variant="caption" tone="accent">
            {actionLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}
