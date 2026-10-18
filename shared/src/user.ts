import { z } from 'zod';

/** Ключ хранения избранного, заметок и согласия с дисклеймером на устройстве. */
export const USER_DATA_KEY = 'travy.user.v1';

export interface UserNote {
  text: string;
  updatedAt: string;
}

export interface UserData {
  favorites: string[];
  notes: Record<string, UserNote>;
  disclaimerAccepted: boolean;
}

export function emptyUserData(): UserData {
  return { favorites: [], notes: {}, disclaimerAccepted: false };
}

const noteSchema = z.object({ text: z.string(), updatedAt: z.string() });

/** Терпимо к старым и испорченным данным: всё невалидное заменяется пустым, валидное сохраняется. */
export function parseUserData(raw: string | null): UserData {
  if (!raw) return emptyUserData();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyUserData();
  }
  if (typeof value !== 'object' || value === null) return emptyUserData();
  const obj = value as Record<string, unknown>;

  const favorites = Array.isArray(obj.favorites)
    ? [...new Set(obj.favorites.filter((x): x is string => typeof x === 'string'))]
    : [];
  const notes: Record<string, UserNote> = {};
  if (typeof obj.notes === 'object' && obj.notes !== null && !Array.isArray(obj.notes)) {
    for (const [id, note] of Object.entries(obj.notes)) {
      const parsed = noteSchema.safeParse(note);
      if (parsed.success) notes[id] = parsed.data;
    }
  }
  return { favorites, notes, disclaimerAccepted: obj.disclaimerAccepted === true };
}

export function serializeUserData(data: UserData): string {
  return JSON.stringify(data);
}

export function isFavorite(data: UserData, herbId: string): boolean {
  return data.favorites.includes(herbId);
}

export function toggleFavorite(data: UserData, herbId: string): UserData {
  const favorites = isFavorite(data, herbId)
    ? data.favorites.filter((id) => id !== herbId)
    : [...data.favorites, herbId];
  return { ...data, favorites };
}

export function setNote(data: UserData, herbId: string, text: string, now: Date): UserData {
  const notes = { ...data.notes };
  const trimmed = text.trim();
  if (trimmed) notes[herbId] = { text: trimmed, updatedAt: now.toISOString() };
  else delete notes[herbId];
  return { ...data, notes };
}

export function acceptDisclaimer(data: UserData): UserData {
  return { ...data, disclaimerAccepted: true };
}
