import { View } from 'react-native';
import { colors, listLayout, spacing } from '@/theme';
import { Icon, type IconName } from './Icon';
import { InkLine } from './InkLine';

/** Орнамент-разделитель «от руки»: черта — маленький значок — черта (под заголовком, внизу листа). */
export function Ornament({ seed, icon = 'leaf', color = colors.ink }: { seed: string; icon?: IconName; color?: string }) {
  return (
    <View
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }}
    >
      <InkLine width={listLayout.ornamentRule} seed={`${seed}:left`} color={color} />
      <Icon name={icon} size={spacing.md + spacing.xxs} color={color} />
      <InkLine width={listLayout.ornamentRule} seed={`${seed}:right`} color={color} />
    </View>
  );
}
