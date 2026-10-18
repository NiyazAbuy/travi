import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  acceptDisclaimer as accept,
  applyChanges,
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
  /** true, если хранилище не прочиталось: изменения живут только в памяти и не сохраняются. */
  readOnly: boolean;
  isFavorite: (herbId: string) => boolean;
  toggleFavorite: (herbId: string) => void;
  setNote: (herbId: string, text: string) => void;
  acceptDisclaimer: () => void;
}

const UserDataContext = createContext<UserDataApi | null>(null);

export function UserDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UserData>(emptyUserData);
  const [loaded, setLoaded] = useState(false);
  const [readOnly, setReadOnly] = useState(false);
  // Изменения, сделанные до окончания загрузки: применяются к сохранённым данным, когда они прочитаны.
  const pendingRef = useRef<Array<(d: UserData) => UserData>>([]);
  const loadedRef = useRef(false);
  const dirtyRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(USER_DATA_KEY)
      .then((raw) => {
        if (cancelled) return;
        const pending = pendingRef.current;
        pendingRef.current = [];
        loadedRef.current = true;
        if (pending.length > 0) dirtyRef.current = true;
        setData(applyChanges(parseUserData(raw), pending));
        setLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        // Хранилище недоступно: не пишем ничего, чтобы не затереть сохранённое; работаем в памяти.
        pendingRef.current = [];
        loadedRef.current = true;
        setReadOnly(true);
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Запись — только в эффекте, после загрузки и только если хранилище читалось успешно.
  useEffect(() => {
    if (!loaded || readOnly || !dirtyRef.current) return;
    dirtyRef.current = false;
    AsyncStorage.setItem(USER_DATA_KEY, serializeUserData(data)).catch(() => undefined);
  }, [data, loaded, readOnly]);

  const update = useCallback((change: (current: UserData) => UserData) => {
    if (!loadedRef.current) {
      pendingRef.current.push(change);
      setData(change); // оптимистично показываем в памяти; запись произойдёт после загрузки
      return;
    }
    dirtyRef.current = true;
    setData(change);
  }, []);

  const api = useMemo<UserDataApi>(
    () => ({
      data,
      loaded,
      readOnly,
      isFavorite: (herbId) => checkFavorite(data, herbId),
      toggleFavorite: (herbId) => update((d) => toggle(d, herbId)),
      setNote: (herbId, text) => update((d) => writeNote(d, herbId, text, new Date())),
      acceptDisclaimer: () => update(accept),
    }),
    [data, loaded, readOnly, update],
  );

  return <UserDataContext.Provider value={api}>{children}</UserDataContext.Provider>;
}

export function useUserData(): UserDataApi {
  const api = useContext(UserDataContext);
  if (!api) throw new Error('useUserData вызван вне UserDataProvider');
  return api;
}
