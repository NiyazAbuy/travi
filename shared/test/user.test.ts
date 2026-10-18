import { describe, expect, it } from 'vitest';
import {
  acceptDisclaimer,
  applyChanges,
  emptyUserData,
  isFavorite,
  parseUserData,
  serializeUserData,
  setNote,
  toggleFavorite,
  USER_DATA_KEY,
} from '../src/user';

const NOW = new Date('2026-10-18T12:00:00Z');

describe('избранное', () => {
  it('добавляет и убирает, не мутируя исходные данные', () => {
    const empty = emptyUserData();
    const added = toggleFavorite(empty, 'alpha');
    expect(isFavorite(added, 'alpha')).toBe(true);
    expect(isFavorite(empty, 'alpha')).toBe(false);
    expect(isFavorite(toggleFavorite(added, 'alpha'), 'alpha')).toBe(false);
  });
});

describe('заметки', () => {
  it('сохраняет текст как набран (с пробелами) и время', () => {
    const data = setNote(emptyUserData(), 'alpha', '  растёт у ручья  ', NOW);
    expect(data.notes.alpha).toEqual({ text: '  растёт у ручья  ', updatedAt: '2026-10-18T12:00:00.000Z' });
  });
  it('пустой текст удаляет заметку', () => {
    const data = setNote(setNote(emptyUserData(), 'alpha', 'текст', NOW), 'alpha', '   ', NOW);
    expect(data.notes).toEqual({});
  });
});

describe('applyChanges', () => {
  it('применяет изменения по порядку', () => {
    const result = applyChanges(emptyUserData(), [
      (d) => toggleFavorite(d, 'alpha'),
      (d) => toggleFavorite(d, 'beta'),
      (d) => toggleFavorite(d, 'alpha'),
      acceptDisclaimer,
    ]);
    expect(result.favorites).toEqual(['beta']);
    expect(result.disclaimerAccepted).toBe(true);
  });
  it('пустой список — тот же объект', () => {
    const data = emptyUserData();
    expect(applyChanges(data, [])).toBe(data);
  });
});

describe('дисклеймер', () => {
  it('отмечает принятие', () => {
    expect(acceptDisclaimer(emptyUserData()).disclaimerAccepted).toBe(true);
  });
});

describe('parseUserData', () => {
  it('нет данных — пустые данные', () => {
    expect(parseUserData(null)).toEqual(emptyUserData());
  });
  it('сохранённое читается обратно', () => {
    const data = acceptDisclaimer(setNote(toggleFavorite(emptyUserData(), 'alpha'), 'beta', 'x', NOW));
    expect(parseUserData(serializeUserData(data))).toEqual(data);
  });
  it('испорченный JSON — пустые данные, без исключения', () => {
    expect(parseUserData('{не json')).toEqual(emptyUserData());
  });
  it('неожиданная форма — сохраняются только валидные части', () => {
    const raw = JSON.stringify({ favorites: ['alpha', 5], notes: 'oops', disclaimerAccepted: true, extra: 1 });
    expect(parseUserData(raw)).toEqual({ favorites: ['alpha'], notes: {}, disclaimerAccepted: true });
  });
  it('дубли в избранном убираются', () => {
    expect(parseUserData(JSON.stringify({ favorites: ['a', 'a', 'b'] })).favorites).toEqual(['a', 'b']);
  });
  it('ключ хранения', () => {
    expect(USER_DATA_KEY).toBe('travy.user.v1');
  });
});
