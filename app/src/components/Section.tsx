import type { ReactNode } from 'react';
import { AppText } from './AppText';
import { Card } from './Card';

/** Раздел карточки травы: заголовок и содержимое на бумажной карточке. `seed` — ключ рваного края. */
export function Section({ title, children, seed }: { title: string; children: ReactNode; seed?: string }) {
  return (
    <Card seed={seed}>
      <AppText variant="heading">{title}</AppText>
      {children}
    </Card>
  );
}
