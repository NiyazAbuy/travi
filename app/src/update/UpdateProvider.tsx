import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import {
  checkContent,
  completesCheck,
  emptyUpdateState,
  isCheckDue,
  manualCheckMessage,
  parseUpdateState,
  reconcileUpdateState,
  SCHEMA_VERSION,
  serializeUpdateState,
  syncPhotos,
  UPDATE_STATE_KEY,
  updateMessage,
  type CheckResult,
  type ContentBundle,
  type Manifest,
  type UpdateDeps,
  type UpdateState,
} from '@travy/shared';
import { Toast } from '@/components';
import { BUNDLED_PHOTO_PATHS } from '@/content/content';
import { useContent, useContentControl } from '@/content/ContentProvider';
import { CONTENT_BASE_URL } from './config';
import { fetchBytes, sha256Hex } from './net';

interface UpdatesApi {
  /** Итог ручной проверки для «О приложении»; null — проверку вручную не запускали. */
  status: string | null;
  checking: boolean;
  /** Опубликована база, которой нужна более новая версия приложения. */
  appUpdateNeeded: boolean;
  /** undefined на вебе: обновления по сети там отключены. */
  checkNow?: () => void;
}

const UpdatesContext = createContext<UpdatesApi | null>(null);

/** Любой сбой самой проверки (например, expo-crypto) — как отсутствие связи: прежняя база остаётся. */
async function safeCheck(deps: UpdateDeps, current: ContentBundle): Promise<CheckResult> {
  try {
    return await checkContent(deps, current);
  } catch {
    return { kind: 'unreachable' };
  }
}

/** Сбой докачки фото не важен: недостающие фото пробуются при следующей завершённой проверке. */
async function safeSyncPhotos(
  deps: UpdateDeps,
  manifest: Manifest,
  active: ContentBundle,
  onPhoto: (path: string) => void,
): Promise<void> {
  try {
    await syncPhotos(deps, manifest, active, BUNDLED_PHOTO_PATHS, onPhoto);
  } catch {
    // Пропускаем.
  }
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const { bundle } = useContent();
  const { store, replaceBundle, photoAdded } = useContentControl();
  const [status, setStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [appUpdateNeeded, setAppUpdateNeeded] = useState(false);
  // key меняется на каждое сообщение, чтобы одинаковый текст показывался заново.
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);

  // null — состояние ещё не прочитано из AsyncStorage.
  const stateRef = useRef<UpdateState | null>(null);
  // Одновременно идёт не больше одной проверки.
  const runningRef = useRef(false);
  // Докачка фото идёт по очереди: уборка одной не должна пересекаться с загрузкой другой.
  const photosRef = useRef<Promise<void>>(Promise.resolve());
  const bundleRef = useRef(bundle);
  useEffect(() => {
    bundleRef.current = bundle;
  }, [bundle]);

  const saveState = useCallback((next: UpdateState) => {
    stateRef.current = next;
    AsyncStorage.setItem(UPDATE_STATE_KEY, serializeUpdateState(next)).catch(() => undefined);
  }, []);

  const runCheck = useCallback(
    async (manual: boolean) => {
      if (!store || runningRef.current) return;
      runningRef.current = true;
      setChecking(true);
      if (manual) setStatus('Проверяю…');

      const deps: UpdateDeps = { baseUrl: CONTENT_BASE_URL, fetchBytes, sha256Hex, store };
      const current = bundleRef.current;
      const result = await safeCheck(deps, current);

      let active = current;
      if (result.kind === 'applied') {
        active = result.bundle;
        bundleRef.current = active;
        replaceBundle(active);
      }
      if (completesCheck(result)) {
        const previous = stateRef.current ?? emptyUpdateState();
        const needed =
          result.kind === 'app-update-needed'
            ? { schemaVersion: result.schemaVersion }
            : result.kind === 'applied' || result.kind === 'up-to-date'
              ? null
              : previous.appUpdateNeeded;
        saveState({ lastCheckedAt: Date.now(), appUpdateNeeded: needed });
        setAppUpdateNeeded(needed !== null);
      }
      if (manual) setStatus(manualCheckMessage(result));
      if (result.kind === 'applied') {
        const message = updateMessage(result.summary);
        if (message) setToast((prev) => ({ message, key: (prev?.key ?? 0) + 1 }));
      }

      runningRef.current = false;
      setChecking(false);

      const syncManifest =
        result.kind === 'applied' ||
        (result.kind === 'up-to-date' && result.manifest.contentVersion === active.contentVersion)
          ? result.manifest
          : null;
      if (syncManifest) {
        photosRef.current = photosRef.current.then(() => safeSyncPhotos(deps, syncManifest, active, photoAdded));
      }
    },
    [store, replaceBundle, photoAdded, saveState],
  );

  // Автопроверка: после чтения состояния и при возврате на передний план, если прошли сутки.
  useEffect(() => {
    if (!store) return;
    let cancelled = false;
    // Приложение обновили до поддержки опубликованной схемы: проверяем сразу, не дожидаясь суток.
    let forceCheck = false;
    const checkIfDue = () => {
      const state = stateRef.current;
      if (!state) return;
      if (forceCheck || isCheckDue(state, Date.now())) {
        forceCheck = false;
        void runCheck(false);
      }
    };
    AsyncStorage.getItem(UPDATE_STATE_KEY)
      .then(parseUpdateState, () => emptyUpdateState())
      .then((state) => {
        if (cancelled) return;
        // Ручная проверка могла завершиться раньше чтения — её результат новее.
        if (stateRef.current === null) {
          const reconciled = reconcileUpdateState(state, SCHEMA_VERSION);
          // Очищенный флаг записывается вместе с результатом завершённой проверки; при отсутствии сети повторится при следующем запуске.
          stateRef.current = reconciled.state;
          forceCheck = reconciled.forceCheck;
          setAppUpdateNeeded(reconciled.state.appUpdateNeeded !== null);
        }
        checkIfDue();
      });
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') checkIfDue();
    });
    return () => {
      cancelled = true;
      subscription.remove();
    };
  }, [store, runCheck]);

  const checkNow = useMemo(() => (store ? () => void runCheck(true) : undefined), [store, runCheck]);
  const api = useMemo<UpdatesApi>(
    () => ({ status, checking, appUpdateNeeded, checkNow }),
    [status, checking, appUpdateNeeded, checkNow],
  );

  return (
    <UpdatesContext.Provider value={api}>
      {children}
      <Toast key={toast?.key} message={toast?.message ?? null} />
    </UpdatesContext.Provider>
  );
}

export function useUpdates(): UpdatesApi {
  const api = useContext(UpdatesContext);
  if (!api) throw new Error('useUpdates вызван вне UpdateProvider');
  return api;
}
