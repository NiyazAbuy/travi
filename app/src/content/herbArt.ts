import type { Herb } from '@travy/shared';
import type { PhotoSource } from './content';

/** Картинка травы для карточек и строк: ботанический рисунок, а если его нет — первое фото. */
export interface HerbArt {
  source: PhotoSource;
  /** true — рисунок на прозрачном фоне (вписывается целиком, без рамки); false — фото (обрезается по рамке). */
  drawing: boolean;
}

export function herbArt(herb: Herb, photoSource: (path: string) => PhotoSource | null): HerbArt | null {
  const drawing = herb.illustration ? photoSource(herb.illustration.path) : null;
  if (drawing) return { source: drawing, drawing: true };
  const photo = herb.photos[0] ? photoSource(herb.photos[0].path) : null;
  return photo ? { source: photo, drawing: false } : null;
}
