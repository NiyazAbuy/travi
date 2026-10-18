import { useEffect, useRef, useState } from 'react';
import { TextInput, type StyleProp, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '@/theme';

export interface NoteEditorProps {
  value: string;
  onSave: (text: string) => void;
  /** Фокус сразу при появлении — поле открыто нажатием на заметку. */
  autoFocus?: boolean;
  /** Поле потеряло фокус (черновик уже сохранён). */
  onBlur?: () => void;
  /** Стиль поля поверх обычного (например, рукописный шрифт заметки). */
  style?: StyleProp<TextStyle>;
}

const SAVE_DELAY_MS = 600;

/** Заметка: локальный черновик, сохранение через паузу после ввода и при уходе с поля. */
export function NoteEditor({ value, onSave, autoFocus = false, onBlur, style }: NoteEditorProps) {
  const [draft, setDraft] = useState(value);
  const saved = useRef(value);
  const draftRef = useRef(draft);
  const onSaveRef = useRef(onSave);
  draftRef.current = draft;
  onSaveRef.current = onSave;

  // При уходе с экрана досохраняем последние символы: таймер ниже при размонтировании сбрасывается.
  useEffect(
    () => () => {
      if (draftRef.current !== saved.current) {
        saved.current = draftRef.current;
        onSaveRef.current(draftRef.current);
      }
    },
    [],
  );

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
    onBlur?.();
  };

  return (
    <TextInput
      value={draft}
      onChangeText={setDraft}
      onBlur={flush}
      autoFocus={autoFocus}
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
        style,
      ]}
    />
  );
}
