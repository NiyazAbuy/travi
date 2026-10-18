import { execFileSync } from 'node:child_process';
import { formatContentVersion } from './build';

export interface GitContentState {
  /** В content/ есть незакоммиченные изменения. */
  dirty: boolean;
  /** Время последнего коммита, затронувшего content/ (unix-секунды), или null, если коммитов нет. */
  lastCommitSeconds: number | null;
}

/**
 * Версия базы: чистое дерево — UTC-время последнего коммита в content/ (одинаковое при любой пересборке),
 * иначе (незакоммиченные правки, нет коммитов, нет git) — текущее время.
 */
export function pickContentVersion(git: GitContentState | null, now: Date): number {
  if (git && !git.dirty && git.lastCommitSeconds !== null) {
    return formatContentVersion(new Date(git.lastCommitSeconds * 1000));
  }
  return formatContentVersion(now);
}

/** Состояние content/ в git; null, если git недоступен или каталог не в репозитории. */
export function readGitState(contentDir: string): GitContentState | null {
  try {
    const run = (args: string[]) => execFileSync('git', args, { cwd: contentDir, encoding: 'utf8' }).trim();
    const dirty = run(['status', '--porcelain', '--', '.']) !== '';
    const last = run(['log', '-1', '--format=%ct', '--', '.']);
    const seconds = Number(last);
    return { dirty, lastCommitSeconds: last === '' || !Number.isFinite(seconds) ? null : seconds };
  } catch {
    return null;
  }
}

/** Версия базы для сборки из каталога content/ (спрашивает git; при любой ошибке — текущее время). */
export function resolveContentVersion(contentDir: string, now: Date): number {
  return pickContentVersion(readGitState(contentDir), now);
}
