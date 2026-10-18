import type { ReactNode } from 'react';
import { AppText } from './AppText';
import { Card } from './Card';

/** Раздел карточки травы: заголовок и содержимое в рамке. */
export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <AppText variant="heading">{title}</AppText>
      {children}
    </Card>
  );
}
