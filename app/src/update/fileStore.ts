import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';
import type { UpdateStore } from '@travy/shared';

/** Хранилище скачанной базы и фото в папке документов приложения. */
export interface FileStore extends UpdateStore {
  /** Текст content/active.json; нет файла или ошибка чтения — null. */
  readActiveSync(): string | null;
  /** Удаляет content/active.json; ошибки не выбрасывает. */
  deleteActive(): void;
  /** Имена скачанных фото "<sha256>.webp"; ошибка чтения — пустой список. */
  listPhotosSync(): string[];
  /** Адрес файла фото для expo-image. */
  photoUri(fileName: string): string;
}

const PHOTO_EXT = '.webp';

/** null на вебе: там обновления по сети отключены и база всегда встроенная. */
export function createFileStore(): FileStore | null {
  if (Platform.OS === 'web') return null;

  const contentDir = new Directory(Paths.document, 'content');
  const photosDir = new Directory(Paths.document, 'photos');
  // Новые экземпляры на каждый вызов: move() меняет uri у переносимого объекта.
  const activeFile = () => new File(contentDir, 'active.json');
  const incomingFile = () => new File(contentDir, 'incoming.json');
  const photoFile = (name: string) => new File(photosDir, name);

  // Папки создаются при первой записи.
  const ensureDir = (dir: Directory) => {
    if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  };
  const removeFile = (file: File) => {
    if (file.exists) file.delete();
  };
  const photoNames = (): string[] => {
    if (!photosDir.exists) return [];
    return photosDir
      .list()
      .filter((item): item is File => item instanceof File && item.name.endsWith(PHOTO_EXT))
      .map((f) => f.name);
  };

  return {
    readActiveSync() {
      try {
        const file = activeFile();
        return file.exists ? file.textSync() : null;
      } catch {
        return null;
      }
    },
    deleteActive() {
      try {
        removeFile(activeFile());
      } catch {
        // Не удалось удалить — при следующем запуске файл снова будет отброшен.
      }
    },
    listPhotosSync() {
      try {
        return photoNames();
      } catch {
        return [];
      }
    },
    photoUri(fileName) {
      return photoFile(fileName).uri;
    },

    async writeIncoming(text) {
      ensureDir(contentDir);
      const file = incomingFile();
      removeFile(file);
      await file.write(text);
    },
    async commitIncoming() {
      removeFile(activeFile());
      await incomingFile().move(activeFile());
    },
    async discardIncoming() {
      removeFile(incomingFile());
    },
    async listPhotos() {
      return photoNames();
    },
    async writePhoto(fileName, bytes) {
      ensureDir(photosDir);
      const tmp = photoFile(`${fileName}.tmp`);
      removeFile(tmp);
      await tmp.write(bytes);
      removeFile(photoFile(fileName));
      await tmp.move(photoFile(fileName));
    },
    async deletePhoto(fileName) {
      removeFile(photoFile(fileName));
    },
  };
}
