import { describe, expect, it } from 'vitest';
import { pickContentVersion } from '../src/content-version';

const NOW = new Date('2026-10-18T10:07:00Z');

describe('pickContentVersion', () => {
  it('чистое дерево — время последнего коммита в content/', () => {
    const seconds = Date.parse('2026-10-17T21:05:59Z') / 1000;
    expect(pickContentVersion({ dirty: false, lastCommitSeconds: seconds }, NOW)).toBe(202610172105);
  });
  it('незакоммиченные изменения — текущее время', () => {
    expect(pickContentVersion({ dirty: true, lastCommitSeconds: 1 }, NOW)).toBe(202610181007);
  });
  it('нет коммитов в content/ или нет git — текущее время', () => {
    expect(pickContentVersion({ dirty: false, lastCommitSeconds: null }, NOW)).toBe(202610181007);
    expect(pickContentVersion(null, NOW)).toBe(202610181007);
  });
});
