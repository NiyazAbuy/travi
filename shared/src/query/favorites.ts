import type { Herb } from '../schema';
import type { UserData, UserNote } from '../user';
import { compareNames } from './filter';

/** Строка экрана «Избранное»: трава со звёздочкой и/или с заметкой (спецификация §6.6). */
export interface FavoriteEntry {
  herbId: string;
  /** undefined — трава удалена из базы, но заметка или звёздочка остались. */
  herb: Herb | undefined;
  favorite: boolean;
  note: UserNote | undefined;
}

export function favoriteEntries(data: UserData, herbById: ReadonlyMap<string, Herb>): FavoriteEntry[] {
  const ids = [...new Set([...data.favorites, ...Object.keys(data.notes)])];
  return ids
    .map((herbId) => ({
      herbId,
      herb: herbById.get(herbId),
      favorite: data.favorites.includes(herbId),
      note: data.notes[herbId],
    }))
    .sort((a, b) => {
      if (Boolean(a.herb) !== Boolean(b.herb)) return a.herb ? -1 : 1;
      return a.herb && b.herb ? compareNames(a.herb.name, b.herb.name) : compareNames(a.herbId, b.herbId);
    });
}
