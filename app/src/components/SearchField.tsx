import { Pressable, TextInput, View, type ViewStyle } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export interface SearchFieldProps {
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
  /** Задано — поле не редактируется, а целиком нажимается (главная, каталог: переход на экран поиска). */
  onPress?: () => void;
}

const DEFAULT_PLACEHOLDER = 'Поиск трав, свойств, проблем…';

/** Полоса поля: светлая, скруглённая, с тонким контуром «пером» и мягкой тенью. */
const BAR: ViewStyle[] = [
  {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.field,
    borderColor: colors.outline,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
  },
  shadow.soft,
];

/** Поле поиска: светлая скруглённая полоса с тонким контуром и лупой слева. */
export function SearchField({
  value = '',
  onChangeText,
  placeholder = DEFAULT_PLACEHOLDER,
  onSubmit,
  autoFocus = false,
  onPress,
}: SearchFieldProps) {
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={placeholder}
        style={({ pressed }) => [BAR, { paddingVertical: spacing.md, opacity: pressed ? 0.75 : 1 }]}
      >
        <Icon name="search" size={22} color={colors.textMuted} />
        <AppText tone="faint" numberOfLines={1} style={{ flex: 1 }}>
          {placeholder}
        </AppText>
      </Pressable>
    );
  }
  return (
    <View style={BAR}>
      <Icon name="search" size={22} color={colors.textMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        onSubmitEditing={onSubmit}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel="Поиск"
        style={[
          typography.body,
          // рамку фокуса рисует сама полоса; системная (на вебе) поверх скруглённого поля смотрится чужой
          { flex: 1, color: colors.text, paddingVertical: spacing.md, outlineWidth: 0 },
        ]}
      />
    </View>
  );
}
