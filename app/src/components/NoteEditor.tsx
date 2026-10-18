import { useEffect, useRef, useState } from 'react';
import { TextInput } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface NoteEditorProps {
  value: string;
  onSave: (text: string) => void;
}

const SAVE_DELAY_MS = 600;

/** Заметка: локальный черновик, сохранение через паузу после ввода и при уходе с поля. */
export function NoteEditor({ value, onSave }: NoteEditorProps) {
  const [draft, setDraft] = useState(value);
  const saved = useRef(value);

  useEffect(() => {
    if (draft === saved.current) return;
    const timer = setTimeout(() => {
      saved.current = draft;
      onSave(draft);
    }, SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, onSave]);

  const flush = () => {
    if (draft !== saved.current) {
      saved.current = draft;
      onSave(draft);
    }
  };

  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onBlur={flush}
      multiline
      placeholder="Например: растёт за дачей у ручья"
      placeholderTextColor={colors.textFaint}
      accessibilityLabel="Моя заметка"
      style={[
        typography.body,
        {
          minHeight: 88,
          color: colors.text,
          backgroundColor: colors.surfaceRaised,
          borderRadius: radius.md,
          padding: spacing.md,
          textAlignVertical: 'top',
        },
      ]}
    />
  );
}
