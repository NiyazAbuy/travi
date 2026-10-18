import { describe, expect, it } from 'vitest';
import { normalizeText, searchContent } from '../src/query/search';
import { queryContent } from './query-fixtures';

const content = queryContent();
const herbIds = (q: string) => searchContent(content, q).herbs.map((h) => h.id);

describe('normalizeText', () => {
  it('нижний регистр, ё → е, лишние пробелы', () => {
    expect(normalizeText('  Ёлочник   Большой ')).toBe('елочник большой');
  });
});

describe('searchContent', () => {
  it('ищет по названию без учёта регистра и «ё»', () => {
    expect(herbIds('ЕЛОЧ')).toEqual(['gamma']);
    expect(herbIds('берез')).toEqual(['beta']);
  });
  it('ищет по народным названиям и латыни', () => {
    expect(herbIds('просвир')).toEqual(['alpha']);
    expect(herbIds('betula')).toEqual(['beta']);
  });
  it('результаты по алфавиту', () => {
    expect(herbIds('testus')).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });
  it('находит группы по названию и синонимам', () => {
    expect(searchContent(content, 'каш').groups).toEqual([{ kind: 'indications', id: 'cough', name: 'Кашель' }]);
    expect(searchContent(content, 'кашлять').groups.map((g) => g.id)).toEqual(['cough']);
    expect(searchContent(content, 'танин').groups).toEqual([{ kind: 'substances', id: 'tannin', name: 'Танины' }]);
  });
  it('не предлагает группы, которых нет ни у одной травы', () => {
    const noTannin = queryContent(queryContent().herbs.filter((h) => !h.substances.includes('tannin')));
    expect(searchContent(noTannin, 'танин').groups).toEqual([]);
  });
  it('пустой запрос — пустой результат', () => {
    expect(searchContent(content, '   ')).toEqual({ herbs: [], groups: [] });
  });
});
