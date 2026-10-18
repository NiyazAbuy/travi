import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { loadBundledContent, type AppContent } from './content';

const ContentContext = createContext<AppContent | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const content = useMemo(() => loadBundledContent(), []);
  return <ContentContext.Provider value={content}>{children}</ContentContext.Provider>;
}

export function useContent(): AppContent {
  const content = useContext(ContentContext);
  if (!content) throw new Error('useContent вызван вне ContentProvider');
  return content;
}
