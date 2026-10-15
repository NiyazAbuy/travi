export interface ContentError {
  /** Путь файла относительно content/, через "/" */
  file: string;
  /** Путь к полю внутри файла, через точку: indications.0.sources */
  path?: string;
  message: string;
}

export function formatError(e: ContentError): string {
  return `${e.file}${e.path ? ` → ${e.path}` : ''}: ${e.message}`;
}

export class ContentValidationError extends Error {
  constructor(readonly errors: ContentError[]) {
    super(`Найдено ошибок: ${errors.length}\n${errors.map(formatError).join('\n')}`);
    this.name = 'ContentValidationError';
  }
}
