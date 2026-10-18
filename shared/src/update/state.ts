/** Ключ хранения состояния проверки обновлений на устройстве. */
export const UPDATE_STATE_KEY = 'travy.update.v1';

/** Автопроверка — не чаще раза в сутки. */
export const CHECK_INTERVAL_MS = 86_400_000;

export interface UpdateState {
  /** Время последней успешно завершённой проверки (мс с эпохи); null — ещё не проверяли. */
  lastCheckedAt: number | null;
  /** Опубликованная база требует более новой версии приложения. */
  appUpdateNeeded: { schemaVersion: number } | null;
}

export function emptyUpdateState(): UpdateState {
  return { lastCheckedAt: null, appUpdateNeeded: null };
}

/** Терпимо к мусору: всё невалидное заменяется пустым, верные поля сохраняются. */
export function parseUpdateState(raw: string | null): UpdateState {
  if (!raw) return emptyUpdateState();
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return emptyUpdateState();
  }
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return emptyUpdateState();
  const obj = value as Record<string, unknown>;

  const lastCheckedAt =
    typeof obj.lastCheckedAt === 'number' && Number.isFinite(obj.lastCheckedAt) ? obj.lastCheckedAt : null;
  const needed = obj.appUpdateNeeded;
  const schemaVersion =
    typeof needed === 'object' && needed !== null ? (needed as Record<string, unknown>).schemaVersion : undefined;
  const appUpdateNeeded =
    typeof schemaVersion === 'number' && Number.isFinite(schemaVersion) ? { schemaVersion } : null;
  return { lastCheckedAt, appUpdateNeeded };
}

export function serializeUpdateState(s: UpdateState): string {
  return JSON.stringify(s);
}

/** Пора ли проверять: ни разу не проверяли, прошли сутки или часы переведены назад. */
export function isCheckDue(s: UpdateState, now: number): boolean {
  if (s.lastCheckedAt === null) return true;
  return now < s.lastCheckedAt || now - s.lastCheckedAt >= CHECK_INTERVAL_MS;
}
