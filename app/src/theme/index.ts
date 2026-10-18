import { Platform, type TextStyle } from 'react-native';
import type { EvidenceLevel } from '@travy/shared';

/** Единственное место с цветами, шрифтами и размерами. Смена стиля = правка этого файла. */
export const colors = {
  background: '#0B120E',
  surface: '#121B15',
  surfaceRaised: '#1A251E',
  border: '#26332B',
  text: '#E6EDE6',
  textMuted: '#9AAA9C',
  textFaint: '#6E7D71',
  accent: '#9BD49B',
  accentPressed: '#86C386',
  onAccent: '#0B120E',
  chip: '#18221C',
  danger: '#E26D6D',
  warning: '#E6B04A',
  overlay: 'rgba(11, 18, 14, 0.55)',
  evidence: {
    proven: '#7FC45A',
    traditional: '#E6B04A',
    folk: '#E08A5C',
    refuted: '#E26D6D',
  } satisfies Record<EvidenceLevel, string>,
} as const;

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

export const fonts = {
  display: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia, "Times New Roman", serif' }),
} as const;

export const typography = {
  hero: { fontFamily: fonts.display, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  caption: { fontSize: 13, lineHeight: 18 },
  tiny: { fontSize: 11, lineHeight: 14 },
} satisfies Record<string, TextStyle>;
