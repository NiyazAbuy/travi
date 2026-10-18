import { View } from 'react-native';
import { colors, listLayout, spacing, typography } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';
import { Sprig } from './Sprig';

export interface ScreenTitleProps {
  title: string;
  /** Украшение справа от заголовка: веточка (по умолчанию) или контурное «сердце» с веточкой (избранное). */
  decoration?: 'sprig' | 'heart';
  /** `brand` — название приложения на главной, крупнее заголовков вкладок. */
  variant?: 'hero' | 'brand';
}

/**
 * Крупный заголовок экрана-вкладки по центру с украшением справа сверху — как «Каталог» и «Избранное»
 * на макетах 04 и 06 и «Травница» на главной (02).
 */
export function ScreenTitle({ title, decoration = 'sprig', variant = 'hero' }: ScreenTitleProps) {
  const brand = variant === 'brand';
  const sprig = brand ? listLayout.brandSprig : listLayout.titleSprig;
  // украшение — у верха прописных букв: веточка «растёт» из последней буквы, как на макетах
  const top = typography[variant].lineHeight * 0.08;
  return (
    <View
      accessibilityRole="header"
      style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', paddingTop: spacing.sm }}
    >
      <AppText variant={variant} style={{ flexShrink: 1 }}>
        {title}
      </AppText>
      <View
        style={{ marginLeft: brand ? -spacing.sm : spacing.xxs, marginTop: top }}
        importantForAccessibility="no-hide-descendants"
      >
        {decoration === 'heart' ? (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
            <Icon name="heart" size={sprig * 0.62} color={colors.ink} />
            <Sprig width={sprig * 0.7} color={colors.sage} style={{ marginLeft: -spacing.sm, transform: [{ rotate: '-20deg' }] }} />
          </View>
        ) : (
          <Sprig width={sprig} color={colors.sage} style={{ transform: [{ rotate: '-24deg' }] }} />
        )}
      </View>
    </View>
  );
}
