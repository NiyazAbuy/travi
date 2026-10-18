import { TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onSubmit?: () => void;
}

export function SearchField({ value, onChangeText, placeholder = 'Поиск трав, свойств, проблем…', onSubmit }: SearchFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={colors.textFaint}
      onSubmitEditing={onSubmit}
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
