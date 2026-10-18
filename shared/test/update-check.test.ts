// Типы Node нужны только тестам (node:crypto); в shared/src Node API не используется.
/// <reference types="node" />
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  SCHEMA_VERSION,
  UPDATE_TIMEOUTS,
  checkContent,
  completesCheck,
  manualCheckMessage,
  removeUnreferencedPhotos,
  syncPhotos,
  type CheckResult,
  type ContentBundle,
  type Manifest,
  type UpdateDeps,
  type UpdateStore,
} from '../src';
import { queryContent } from './query-fixtures';

const BASE = 'https://example.test/travi/';
const enc = (s: string) => new TextEncoder().encode(s);
const sha = (b: Uint8Array | string) => createHash('sha256').update(typeof b === 'string' ? b : b).digest('hex');

type Files = Record<string, Uint8Array | 'fail'>;

/** fetchBytes по таблице файлов; запросы записываются в requested. */
function fakeServer(files: Files) {
  const requested: { url: string; timeoutMs: number }[] = [];
  const fetchBytes = async (url: string, timeoutMs: number): Promise<Uint8Array> => {
    requested.push({ url, timeoutMs });
    // Параметр запроса (например, ?v=) сервер статических файлов игнорирует.
    const key = (url.startsWith(BASE) ? url.slice(BASE.length) : url).split('?')[0]!;
    const file = files[key];
    if (file === undefined || file === 'fail') throw new Error(`fetch failed: ${key}`);
    return file;
  };
  return { fetchBytes, requested, files };
}

function memoryStore(init: { active?: string | null; photos?: string[] } = {}) {
  const state = {
    incoming: null as string | null,
    active: (init.active ?? null) as string | null,
    photos: new Map<string, Uint8Array>((init.photos ?? []).map((n) => [n, new Uint8Array([0])])),
    failCommit: false,
    writePhotoCalls: 0,
  };
  const store: UpdateStore = {
    async writeIncoming(text) {
      state.incoming = text;
    },
    async commitIncoming() {
      if (state.failCommit) throw new Error('disk full');
      state.active = state.incoming;
      state.incoming = null;
    },
    async discardIncoming() {
      state.incoming = null;
    },
    async listPhotos() {
      return [...state.photos.keys()];
    },
    async writePhoto(name, bytes) {
      state.writePhotoCalls += 1;
      state.photos.set(name, bytes);
    },
    async deletePhoto(name) {
      state.photos.delete(name);
    },
  };
  return { store, state };
}

const photoOf = (seed: string) => enc(`photo-${seed}`);
const photoPathOf = (bytes: Uint8Array) => `photos/${sha(bytes)}.webp`;

/** База queryContent с версией и (если заданы) своими путями фото у первой травы; иначе общее фото фикстур. */
function bundleWith(contentVersion: number, photos: string[] = [], patch: Partial<ContentBundle> = {}): ContentBundle {
  const base = queryContent();
  const herbs = base.herbs.map((h, i) =>
    i === 0 && photos.length > 0 ? { ...h, photos: photos.map((p) => ({ ...h.photos[0]!, path: p })) } : h,
  );
  return { ...base, contentVersion, herbs, ...patch };
}

/** Собирает manifest.json и content.json так же, как tools/src/build.ts. */
function publish(bundle: ContentBundle, photos: Uint8Array[] = [], manifestPatch: Partial<Manifest> = {}) {
  const contentJson = JSON.stringify(bundle);
  const manifest: Manifest = {
    schemaVersion: bundle.schemaVersion,
    contentVersion: bundle.contentVersion,
    publishedAt: '2026-10-18T00:00:00.000Z',
    content: { path: 'content.json', sha256: sha(contentJson), size: enc(contentJson).length },
    photos: photos.map((p) => ({ path: photoPathOf(p), sha256: sha(p), size: p.length })),
    ...manifestPatch,
  };
  const files: Files = { 'manifest.json': enc(JSON.stringify(manifest)), 'content.json': enc(contentJson) };
  for (const p of photos) files[photoPathOf(p)] = p;
  return { manifest, files, contentJson };
}

const V0 = 202610180000;
const V1 = 202610190000;

function setup(files: Files, storeInit: { active?: string | null; photos?: string[] } = {}) {
  const server = fakeServer(files);
  const mem = memoryStore({ active: 'OLD', ...storeInit });
  const deps: UpdateDeps = {
    baseUrl: BASE,
    fetchBytes: server.fetchBytes,
    sha256Hex: async (b) => sha(b),
    store: mem.store,
  };
  return { deps, server, ...mem };
}

describe('checkContent', () => {
  const current = bundleWith(V0);

  it('нет сети', async () => {
    const { deps, state, server } = setup({ 'manifest.json': 'fail' });
    const r = await checkContent(deps, current);
    expect(r).toEqual({ kind: 'unreachable' });
    expect(completesCheck(r)).toBe(false);
    expect(state.active).toBe('OLD');
    expect(state.incoming).toBeNull();
    expect(server.requested).toEqual([{ url: `${BASE}manifest.json`, timeoutMs: UPDATE_TIMEOUTS.manifest }]);
  });

  it('манифест не JSON и не по схеме', async () => {
    expect(await checkContent(setup({ 'manifest.json': enc('<html>') }).deps, current)).toEqual({ kind: 'unreachable' });
    expect(await checkContent(setup({ 'manifest.json': enc('{"a":1}') }).deps, current)).toEqual({ kind: 'unreachable' });
  });

  it('новая схема', async () => {
    const next = bundleWith(V1);
    const { files } = publish(next, [], { schemaVersion: SCHEMA_VERSION + 1 });
    const { deps, server } = setup(files);
    const r = await checkContent(deps, current);
    expect(r).toEqual({ kind: 'app-update-needed', schemaVersion: SCHEMA_VERSION + 1 });
    expect(completesCheck(r)).toBe(true);
    expect(server.requested.some((x) => x.url.includes('content.json'))).toBe(false);
  });

  it('та же версия и текущая новее манифеста', async () => {
    for (const v of [V0, V0 - 1]) {
      const { files, manifest } = publish(bundleWith(v));
      const { deps, server, state } = setup(files);
      const r = await checkContent(deps, current);
      expect(r).toEqual({ kind: 'up-to-date', manifest });
      expect(completesCheck(r)).toBe(true);
      expect(server.requested.some((x) => x.url.includes('content.json'))).toBe(false);
      expect(state.active).toBe('OLD');
    }
  });

  it('новая версия', async () => {
    const next = bundleWith(V1, [], { herbs: current.herbs.slice(1) });
    const { files, contentJson, manifest } = publish(next);
    const { deps, server, state } = setup(files);
    const r = await checkContent(deps, current);
    expect(r.kind).toBe('applied');
    if (r.kind !== 'applied') return;
    expect(r.manifest).toEqual(manifest);
    expect(r.bundle).toEqual(next);
    expect(r.summary).toEqual({ added: 0, removed: 1, changed: 0, otherChanged: false });
    expect(state.active).toBe(contentJson);
    expect(state.incoming).toBeNull();
    // Версия в адресе: кэш CDN или OkHttp не подсунет старый content.json к свежему манифесту.
    expect(server.requested[1]).toEqual({
      url: `${BASE}content.json?v=${V1}`,
      timeoutMs: UPDATE_TIMEOUTS.content,
    });
    // У манифеста и фото параметра нет: фото адресуются по содержимому.
    expect(server.requested[0]!.url).toBe(`${BASE}manifest.json`);
  });

  it('content.json не скачался', async () => {
    const { files } = publish(bundleWith(V1));
    files['content.json'] = 'fail';
    const { deps, state } = setup(files);
    expect(await checkContent(deps, current)).toEqual({ kind: 'unreachable' });
    expect(state.active).toBe('OLD');
  });

  describe('отказы, прежняя база остаётся', () => {
    const next = bundleWith(V1);
    const cases: [string, (p: ReturnType<typeof publish>) => void, CheckResult][] = [
      [
        'неверный размер',
        (p) => {
          p.files['manifest.json'] = enc(
            JSON.stringify({ ...p.manifest, content: { ...p.manifest.content, size: p.manifest.content.size + 1 } }),
          );
        },
        { kind: 'rejected', reason: 'size' },
      ],
      [
        'битый sha256',
        (p) => {
          p.files['manifest.json'] = enc(
            JSON.stringify({ ...p.manifest, content: { ...p.manifest.content, sha256: '0'.repeat(64) } }),
          );
        },
        { kind: 'rejected', reason: 'sha256' },
      ],
    ];
    for (const [name, mutate, expected] of cases) {
      it(name, async () => {
        const p = publish(next);
        mutate(p);
        const { deps, state } = setup(p.files);
        expect(await checkContent(deps, current)).toEqual(expected);
        expect(state.active).toBe('OLD');
        expect(state.incoming).toBeNull();
      });
    }

    /** Подменяет content.json на text и пересчитывает размер и sha в манифесте. */
    function withContentText(text: string, manifestPatch: Partial<Manifest> = {}) {
      const p = publish(next, [], manifestPatch);
      const manifest = {
        ...p.manifest,
        content: { path: 'content.json', sha256: sha(text), size: enc(text).length },
      };
      p.files['manifest.json'] = enc(JSON.stringify(manifest));
      p.files['content.json'] = enc(text);
      return p;
    }

    it('невалидный JSON при верном sha', async () => {
      const { deps, state } = setup(withContentText('{oops').files);
      expect(await checkContent(deps, current)).toEqual({ kind: 'rejected', reason: 'json' });
      expect(state.active).toBe('OLD');
    });

    it('не проходит схему при верном sha', async () => {
      const { deps, state } = setup(withContentText('{"schemaVersion":1}').files);
      expect(await checkContent(deps, current)).toEqual({ kind: 'app-update-needed', schemaVersion: SCHEMA_VERSION });
      expect(state.active).toBe('OLD');
    });

    it('битая ссылка', async () => {
      const broken = bundleWith(V1);
      broken.herbs = broken.herbs.map((h, i) => (i === 0 ? { ...h, family: 'no-such-family' } : h));
      const { deps, state } = setup(withContentText(JSON.stringify(broken)).files);
      expect(await checkContent(deps, current)).toEqual({ kind: 'rejected', reason: 'references' });
      expect(state.active).toBe('OLD');
    });

    it('версия в content.json не равна манифесту', async () => {
      const other = bundleWith(V1 + 1);
      const { deps, state } = setup(withContentText(JSON.stringify(other)).files);
      expect(await checkContent(deps, current)).toEqual({ kind: 'rejected', reason: 'version' });
      expect(state.active).toBe('OLD');
    });
  });

  it('сбой записи', async () => {
    const { files } = publish(bundleWith(V1));
    const { deps, state } = setup(files);
    state.failCommit = true;
    expect(await checkContent(deps, current)).toEqual({ kind: 'rejected', reason: 'storage' });
    expect(state.incoming).toBeNull();
    expect(state.active).toBe('OLD');
  });
});

describe('manualCheckMessage', () => {
  const manifest = publish(bundleWith(V0)).manifest;
  const bundle = bundleWith(V1);
  const applied = (summary: { added: number; removed: number; changed: number; otherChanged: boolean }): CheckResult => ({
    kind: 'applied',
    bundle,
    manifest,
    summary,
  });

  it('по одному тексту на каждый вид', () => {
    expect(manualCheckMessage({ kind: 'unreachable' })).toBe('Нет связи с сервером, попробуйте позже');
    expect(manualCheckMessage({ kind: 'up-to-date', manifest })).toBe('База актуальна');
    expect(manualCheckMessage({ kind: 'rejected', reason: 'sha256' })).toBe('Скачанная база повреждена, оставлена текущая');
    expect(manualCheckMessage({ kind: 'app-update-needed', schemaVersion: 2 })).toBe(
      'Доступна новая база — обновите приложение',
    );
    expect(manualCheckMessage(applied({ added: 2, removed: 1, changed: 3, otherChanged: false }))).toBe(
      'База обновлена: +2 травы, изменено 3, удалено 1',
    );
    expect(manualCheckMessage(applied({ added: 0, removed: 0, changed: 0, otherChanged: false }))).toBe('База актуальна');
  });
});

describe('syncPhotos', () => {
  const p1 = photoOf('1');
  const p2 = photoOf('2');
  const bundled = photoOf('bundled');
  const stored = photoOf('stored');

  it('докачка: одно фото недоступно, встроенные и скачанные не запрашиваются', async () => {
    const active = bundleWith(V1, [photoPathOf(p1), photoPathOf(p2), photoPathOf(bundled), photoPathOf(stored)]);
    const { manifest, files } = publish(active, [p1, p2, bundled, stored]);
    files[photoPathOf(p1)] = 'fail';
    const storedName = `${sha(stored)}.webp`;
    const { deps, server, state } = setup(files, { photos: [storedName] });
    const seen: string[] = [];
    const r = await syncPhotos(deps, manifest, active, new Set([photoPathOf(bundled)]), (p) => seen.push(p));
    expect(r.downloaded).toEqual([photoPathOf(p2)]);
    expect(r.failed).toEqual([photoPathOf(p1)]);
    expect(r.deleted).toEqual([]);
    expect(seen).toEqual([photoPathOf(p2)]);
    expect(server.requested.map((x) => x.url).sort()).toEqual([`${BASE}${photoPathOf(p1)}`, `${BASE}${photoPathOf(p2)}`].sort());
    expect(server.requested.every((x) => x.timeoutMs === UPDATE_TIMEOUTS.photo)).toBe(true);
    expect(state.photos.has(`${sha(p2)}.webp`)).toBe(true);
    expect(state.photos.has(`${sha(p1)}.webp`)).toBe(false);
    expect(state.photos.has(storedName)).toBe(true);
  });

  it('битое фото не записывается', async () => {
    const active = bundleWith(V1, [photoPathOf(p1)]);
    const { manifest, files } = publish(active, [p1]);
    files[photoPathOf(p1)] = enc('другие байты'); // sha256 не совпадает
    const { deps, state } = setup(files);
    const r = await syncPhotos(deps, manifest, active, new Set());
    expect(r).toEqual({ downloaded: [], failed: [photoPathOf(p1)], deleted: [] });
    expect(state.writePhotoCalls).toBe(0);
  });

  it('неверный размер → failed', async () => {
    const active = bundleWith(V1, [photoPathOf(p1)]);
    const { manifest, files } = publish(active, [p1]);
    manifest.photos[0]!.size += 1;
    const { deps, state } = setup(files);
    const r = await syncPhotos(deps, manifest, active, new Set());
    expect(r.failed).toEqual([photoPathOf(p1)]);
    expect(state.writePhotoCalls).toBe(0);
  });

  it('ошибка записи одного фото не прерывает остальные', async () => {
    const active = bundleWith(V1, [photoPathOf(p1), photoPathOf(p2)]);
    const { manifest, files } = publish(active, [p1, p2]);
    const { deps } = setup(files);
    const realWrite = deps.store.writePhoto;
    deps.store.writePhoto = async (name, bytes) => {
      if (name === `${sha(p1)}.webp`) throw new Error('disk full');
      return realWrite(name, bytes);
    };
    const r = await syncPhotos(deps, manifest, active, new Set());
    expect(r.failed).toEqual([photoPathOf(p1)]);
    expect(r.downloaded).toEqual([photoPathOf(p2)]);
  });

  it('уборка: лишнее фото удаляется, нужные остаются', async () => {
    const active = bundleWith(V1, [photoPathOf(p1)]);
    const { manifest, files } = publish(active, [p1]);
    const extra = `${sha(photoOf('extra'))}.webp`;
    const { deps, state } = setup(files, { photos: [extra] });
    const r = await syncPhotos(deps, manifest, active, new Set());
    expect(r.downloaded).toEqual([photoPathOf(p1)]);
    expect(r.deleted).toEqual([`photos/${extra}`]);
    expect([...state.photos.keys()]).toEqual([`${sha(p1)}.webp`]);
  });

  it('уборка выполняется и когда качать нечего; ошибка удаления глушится', async () => {
    const active = bundleWith(V1, []);
    const extra = `${sha(photoOf('extra'))}.webp`;
    const { store, state } = memoryStore({ photos: [extra] });
    store.deletePhoto = async () => {
      throw new Error('locked');
    };
    expect(await removeUnreferencedPhotos(store, active)).toEqual([]);
    expect(state.photos.has(extra)).toBe(true);
  });
});
