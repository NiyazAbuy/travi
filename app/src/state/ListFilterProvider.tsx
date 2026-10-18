import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { emptyFilter, type HerbFilter } from '@travy/shared';

interface ListFilterApi {
  filter: HerbFilter;
  setFilter: (filter: HerbFilter) => void;
}

const ListFilterContext = createContext<ListFilterApi | null>(null);

/** Текущий фильтр списка трав: его задают каталог, поиск, карточка травы и панель фильтров. */
export function ListFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<HerbFilter>(emptyFilter);
  const api = useMemo(() => ({ filter, setFilter }), [filter]);
  return <ListFilterContext.Provider value={api}>{children}</ListFilterContext.Provider>;
}

export function useListFilter(): ListFilterApi {
  const api = useContext(ListFilterContext);
  if (!api) throw new Error('useListFilter вызван вне ListFilterProvider');
  return api;
}
