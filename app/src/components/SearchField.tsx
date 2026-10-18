import { TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
  autoFocus?: boolean;
}

export function SearchField({ value, onChangeText, placeholder = 'Поиск трав, свойств, проблем…', onSubmit, autoFocus = false }: SearchFieldProps) {
  return (
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
        {
          color: colors.text,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
          borderRadius: radius.pill,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
        },
      ]}
    />
  );
}
