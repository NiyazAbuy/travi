import { loadContent, photoExistsIn, type LoadResult } from './load';
import { validateContent } from './validate';

/** Загрузка + проверка. Если файлы не загрузились, ссылки не проверяются — иначе будут каскадные ошибки. */
export async function checkContent(contentDir: string): Promise<LoadResult> {
  const { content, errors } = await loadContent(contentDir);
  if (errors.length > 0) return { content, errors };
  return { content, errors: validateContent(content, photoExistsIn(contentDir)) };
}
