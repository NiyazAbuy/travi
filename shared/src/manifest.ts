import { z } from 'zod';

// Нестрогая схема: старое приложение должно читать манифест с новыми полями.
const fileEntry = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  size: z.number().int().nonnegative(),
});

export const manifestSchema = z.object({
  schemaVersion: z.number().int().positive(),
  contentVersion: z.number().int().positive(),
  publishedAt: z.iso.datetime(),
  content: fileEntry,
  photos: z.array(fileEntry),
});

export type ManifestFile = z.infer<typeof fileEntry>;
export type Manifest = z.infer<typeof manifestSchema>;
