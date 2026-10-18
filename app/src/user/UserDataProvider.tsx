import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  acceptDisclaimer as accept,
  emptyUserData,
  isFavorite as checkFavorite,
  parseUserData,
  serializeUserData,
  setNote as writeNote,
  toggleFavorite as toggle,
  USER_DATA_KEY,
  type UserData,
} from '@travy/shared';

interface UserDataApi {
  data: UserData;
  loaded: boolean;
  isFavorite: (herbId: string) => boolean;
  toggleFavorite: (herbId: string) => void;
  setNote: (herbId: string, text: string) => void;
  acceptDisclaimer: () => void;
}

const UserDataContext = createContext<UserDataApi | null>(null);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UserData>(emptyUserData);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(USER_DATA_KEY)
      .then((raw) => setData(parseUserData(raw)))
      .catch(() => setData(emptyUserData()))
      .finally(() => setLoaded(true));
  }, []);

  const update = useCallback((change: (current: UserData) => UserData) => {
    setData((current) => {
      const next = change(current);
      AsyncStorage.setItem(USER_DATA_KEY, serializeUserData(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const api = useMemo<UserDataApi>(
    () => ({
      data,
      loaded,
      isFavorite: (herbId) => checkFavorite(data, herbId),
      toggleFavorite: (herbId) => update((d) => toggle(d, herbId)),
      setNote: (herbId, text) => update((d) => writeNote(d, herbId, text, new Date())),
      acceptDisclaimer: () => update(accept),
    }),
    [data, loaded, update],
  );

  return <UserDataContext.Provider value={api}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataApi {
  const api = useContext(UserDataContext);
  if (!api) throw new Error('useUserData вызван вне UserDataProvider');
  return api;
}
