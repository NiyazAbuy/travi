import { describe, expect, it } from 'vitest';
import {
  bundleReferenceErrors,
  emptyFilter,
  emptyUpdateState,
  isCheckDue,
  parseContentBundle,
  parseUpdateState,
  photoPaths,
  pickActiveContent,
  pruneFilter,
  serializeUpdateState,
  summarizeChanges,
  updateMessage,
} from '../src';
import { queryContent, queryHerbs4 } from './query-fixtures';

const DAY = 86_400_000;

describe('состояние проверки', () => {
  it('пустое и мусор → пустое', () => {
    expect(parseUpdateState(null)).toEqual({ lastCheckedAt: null, appUpdateNeeded: null });
    expect(parseUpdateState('{oops')).toEqual(emptyUpdateState());
    expect(parseUpdateState('{"lastCheckedAt":"x","appUpdateNeeded":{"schemaVersion":2}}')).toEqual({
      lastCheckedAt: null,
      appUpdateNeeded: { schemaVersion: 2 },
    });
  });
  it('туда и обратно', () => {
    const s = { lastCheckedAt: 5, appUpdateNeeded: null };
    expect(parseUpdateState(serializeUpdateState(s))).toEqual(s);
  });
  it('isCheckDue: никогда, сутки, меньше суток, часы назад', () => {
    expect(isCheckDue(emptyUpdateState(), 1000)).toBe(true);
    expect(isCheckDue({ lastCheckedAt: 0, appUpdateNeeded: null }, DAY)).toBe(true);
    expect(isCheckDue({ lastCheckedAt: 0, appUpdateNeeded: null }, DAY - 1)).toBe(false);
    expect(isCheckDue({ lastCheckedAt: 10 * DAY, appUpdateNeeded: null }, DAY)).toBe(true);
  });
});

describe('разбор и выбор базы', () => {
  const bundled = queryContent();
  const newer = { ...bundled, contentVersion: bundled.contentVersion + 1 };
  it('parseContentBundle: json / schema / references / ok', () => {
    expect(parseContentBundle('{"herbs":')).toEqual({ ok: false, reason: 'json' });
    expect(parseContentBundle('{"herbs":[]}')).toEqual({ ok: false, reason: 'schema' });
    const broken = { ...newer, herbs: [{ ...newer.herbs[0]!, family: 'nope' }, ...newer.herbs.slice(1)] };
    expect(parseContentBundle(JSON.stringify(broken))).toEqual({ ok: false, reason: 'references' });
    expect(parseContentBundle(JSON.stringify(newer))).toMatchObject({ ok: true });
  });
  it('bundleReferenceErrors: целая база — пусто, битая ссылка — сообщение', () => {
    expect(bundleReferenceErrors(bundled)).toEqual([]);
    const broken = { ...bundled, herbs: [{ ...bundled.herbs[0]!, family: 'nope' }] };
    expect(bundleReferenceErrors(broken)[0]).toContain('nope');
  });
  it('pickActiveContent', () => {
    expect(pickActiveContent(bundled, null)).toEqual({ bundle: bundled, source: 'bundled', discardDownloaded: false });
    expect(pickActiveContent(bundled, JSON.stringify(newer))).toMatchObject({
      source: 'downloaded',
      discardDownloaded: false,
    });
    expect(pickActiveContent(bundled, JSON.stringify(newer)).bundle.contentVersion).toBe(newer.contentVersion);
    // встроенная новее или равна (поставили новый APK) — скачанная выбрасывается
    expect(pickActiveContent(newer, JSON.stringify(bundled))).toMatchObject({
      source: 'bundled',
      discardDownloaded: true,
    });
    expect(pickActiveContent(bundled, JSON.stringify(bundled))).toMatchObject({
      source: 'bundled',
      discardDownloaded: true,
    });
    // обрезанный файл
    expect(pickActiveContent(bundled, JSON.stringify(newer).slice(0, 100))).toMatchObject({
      source: 'bundled',
      discardDownloaded: true,
    });
  });
  it('photoPaths включает фото двойников', () => {
    const h = bundled.herbs[0]!;
    const withLookalike = {
      ...bundled,
      herbs: [
        {
          ...h,
          lookalikes: [
            {
              name: 'Двойник',
              poisonous: true,
              differences: 'x',
              photo: { ...h.photos[0]!, path: `photos/${'b'.repeat(64)}.webp` },
            },
          ],
        },
      ],
    };
    expect(photoPaths(withLookalike)).toEqual(new Set([h.photos[0]!.path, `photos/${'b'.repeat(64)}.webp`]));
  });
});

describe('сводка изменений', () => {
  const prev = queryContent();
  const [a, b, c, d] = queryHerbs4();
  it('добавлено, удалено, изменено', () => {
    const next = queryContent([{ ...a!, description: 'новое' }, b!, c!, { ...d!, id: 'new-herb' }]);
    expect(summarizeChanges(prev, next)).toEqual({ added: 1, removed: 1, changed: 1, otherChanged: false });
  });
  it('только версия — ничего', () => {
    expect(summarizeChanges(prev, { ...prev, contentVersion: prev.contentVersion + 1 })).toEqual({
      added: 0,
      removed: 0,
      changed: 0,
      otherChanged: false,
    });
  });
  it('updateMessage', () => {
    expect(updateMessage({ added: 2, removed: 1, changed: 3, otherChanged: true })).toBe(
      'База обновлена: +2 травы, изменено 3, удалено 1',
    );
    expect(updateMessage({ added: 0, removed: 0, changed: 5, otherChanged: false })).toBe('База обновлена: изменено 5');
    expect(updateMessage({ added: 1, removed: 0, changed: 0, otherChanged: false })).toBe('База обновлена: +1 трава');
    expect(updateMessage({ added: 0, removed: 0, changed: 0, otherChanged: true })).toBe('База обновлена');
    expect(updateMessage({ added: 0, removed: 0, changed: 0, otherChanged: false })).toBeNull();
  });
});

describe('pruneFilter', () => {
  const content = queryContent();
  it('убирает исчезнувшие id и не трогает остальное', () => {
    const f = {
      ...emptyFilter(),
      indications: ['insomnia', 'gone'],
      parts: ['gone-part'],
      months: [6],
      minEvidence: 'traditional' as const,
    };
    expect(pruneFilter(f, content)).toEqual({ ...f, indications: ['insomnia'], parts: [] });
  });
  it('нечего убирать — тот же объект', () => {
    const f = { ...emptyFilter(), indications: ['insomnia'] };
    expect(pruneFilter(f, content)).toBe(f);
  });
});
