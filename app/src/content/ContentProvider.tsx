import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { pickActiveContent, removeUnreferencedPhotos, type ContentBundle } from '@travy/shared';
import { createFileStore, type FileStore } from '@/update/fileStore';
import { BUNDLED_BUNDLE, createAppContent, type AppContent } from './content';

interface ContentControl {
  /** null на вебе: обновления по сети отключены. */
  store: FileStore | null;
  /** Подменяет активную базу скачанной; экраны перерисовываются. */
  replaceBundle: (bundle: ContentBundle) => void;
  /** Фото докачано: экраны показывают его вместо заглушки. */
  photoAdded: (path: string) => void;
}

const ContentContext = createContext<AppContent | null>(null);
const ContentControlContext = createContext<ContentControl | null>(null);

/** Выбор активной базы при запуске: скачанная, если она целая и новее встроенной. */
function initialContent(store: FileStore | null) {
  const picked = pickActiveContent(BUNDLED_BUNDLE, store?.readActiveSync() ?? null);
  // Список скачанных фото читается один раз и дальше держится в памяти.
  const downloaded = new Set((store?.listPhotosSync() ?? []).map((name) => `photos/${name}`));
  return { ...picked, downloaded };
}

const noPhotoUri = (fileName: string) => fileName;

export function ContentProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createFileStore);
  const [initial] = useState(() => initialContent(store));
  const [bundle, setBundle] = useState<ContentBundle>(initial.bundle);
  const [source, setSource] = useState<'bundled' | 'downloaded'>(initial.source);
  const [downloaded, setDownloaded] = useState<ReadonlySet<string>>(initial.downloaded);

  // Скачанная база повреждена или устарела после установки нового APK: убираем её и ненужные фото.
  useEffect(() => {
    if (!store || !initial.discardDownloaded) return;
    store.deleteActive();
    removeUnreferencedPhotos(store, initial.bundle).catch(() => undefined);
  }, [store, initial]);

  const replaceBundle = useCallback((next: ContentBundle) => {
    setBundle(next);
    setSource('downloaded');
  }, []);

  const photoAdded = useCallback((path: string) => {
    setDownloaded((prev) => (prev.has(path) ? prev : new Set(prev).add(path)));
  }, []);

  const content = useMemo(
    () => createAppContent(bundle, source, downloaded, store ? store.photoUri : noPhotoUri),
    [bundle, source, downloaded, store],
  );
  const control = useMemo<ContentControl>(
    () => ({ store, replaceBundle, photoAdded }),
    [store, replaceBundle, photoAdded],
  );

  return (
    <ContentControlContext.Provider value={control}>
      <ContentContext.Provider value={content}>{children}</ContentContext.Provider>
    </ContentControlContext.Provider>
  );
}

export function useContent(): AppContent {
  const content = useContext(ContentContext);
  if (!content) throw new Error('useContent вызван вне ContentProvider');
  return content;
}

export function useContentControl(): ContentControl {
  const control = useContext(ContentControlContext);
  if (!control) throw new Error('useContentControl вызван вне ContentProvider');
  return control;
}
