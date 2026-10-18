import { Caveat_500Medium } from '@expo-google-fonts/caveat/500Medium';
import { CormorantGaramond_600SemiBold } from '@expo-google-fonts/cormorant-garamond/600SemiBold';
import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_400Regular_Italic } from '@expo-google-fonts/lora/400Regular_Italic';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { useFonts } from 'expo-font';
import { useEffect, useState } from 'react';

/**
 * Файлы шрифтов темы. Ключ — имя семейства в `fonts` (`theme/index.ts`).
 * Импорт по одному начертанию: так в сборку попадают только нужные файлы, а не все начертания пакета.
 */
export const FONT_FILES = {
  CormorantGaramond_600SemiBold,
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_600SemiBold,
  Caveat_500Medium,
};

/** Дольше этого сплэш шрифты не ждёт: дальше текст показывается системным шрифтом. */
export const FONT_TIMEOUT_MS = 5000;

/**
 * true, когда можно показывать интерфейс: шрифты загрузились, загрузка упала или не уложилась в `FONT_TIMEOUT_MS`.
 * При сбое приложение не висит на сплэше — незагруженные семейства заменяются системными (см. `fonts`).
 */
export function useThemeFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), FONT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (error) console.warn('Шрифты не загрузились, текст будет системным шрифтом:', error.message);
  }, [error]);

  return loaded || error != null || timedOut;
}
