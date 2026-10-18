import { TextInput, View } from 'react-native';
import { colors, radius, shadow, spacing, typography } from '@/theme';
import { Icon } from './Icon';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

/** Поле поиска: светлая скруглённая полоса с тонким контуром и лупой слева. */
export function SearchField({ value, onChangeText, placeholder = 'Поиск трав, свойств, проблем…', onSubmit, autoFocus = false }: SearchFieldProps) {
  return (
    <View
      style={[
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
      ]}
    >
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
