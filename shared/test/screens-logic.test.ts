import { describe, expect, it } from 'vitest';
import { optionLabel } from '../src/query/catalog';
import { favoriteEntries } from '../src/query/favorites';
import { emptyFilter } from '../src/query/filter';
import { describeFilter, isFilterValueSelected, removeFilterChip, toggleFilterValue } from '../src/query/filter-edit';
import { herbSourceIds } from '../src/query/herb-sources';
import { sourceHref } from '../src/sources';
import { contentVersionDate, countRu, pluralRu } from '../src/text';
import { emptyUserData, setNote, toggleFavorite } from '../src/user';
import { queryContent, queryHerbs4 } from './query-fixtures';

const content = queryContent();

describe('pluralRu / countRu', () => {
  const forms = ['трава', 'травы', 'трав'] as const;
  it.each([
    [1, 'трава'],
    [2, 'травы'],
    [4, 'травы'],
    [5, 'трав'],
    [11, 'трав'],
    [12, 'трав'],
    [21, 'трава'],
    [22, 'травы'],
    [111, 'трав'],
    [0, 'трав'],
  ])('%i → %s', (n, word) => {
    expect(pluralRu(n, forms)).toBe(word);
  });
  it('countRu', () => expect(countRu(21, forms)).toBe('21 трава'));
});

describe('contentVersionDate', () => {
  it('YYYYMMDDHHmm → дата и время', () => {
    expect(contentVersionDate(202610180141)).toBe('18.10.2026 01:41 UTC');
  });
});

describe('редактирование фильтра', () => {
  it('toggleFilterValue добавляет и убирает, не меняя исходный фильтр', () => {
    const f = emptyFilter();
    const on = toggleFilterValue(f, 'indications', 'cough');
    expect(on.indications).toEqual(['cough']);
    expect(f.indications).toEqual([]);
    expect(toggleFilterValue(on, 'indications', 'cough').indications).toEqual([]);
  });
  it('месяцы хранятся числами', () => {
    const on = toggleFilterValue(emptyFilter(), 'months', '6');
    expect(on.months).toEqual([6]);
    expect(isFilterValueSelected(on, 'months', '6')).toBe(true);
  });
  it('describeFilter: подписи в порядке разделов каталога и порог доказанности', () => {
    const f = { ...emptyFilter(), months: [6], indications: ['cough'], safety: ['children-ok' as const], minEvidence: 'proven' as const };
    expect(describeFilter(f, content).map((c) => c.label)).toEqual([
      'Кашель',
      'июнь',
      'Можно детям',
      'Не ниже: доказано исследованиями',
    ]);
  });
  it('removeFilterChip убирает значение и порог', () => {
    const f = { ...emptyFilter(), indications: ['cough', 'gastritis'], minEvidence: 'proven' as const };
    const chips = describeFilter(f, content);
    expect(removeFilterChip(f, chips[0]!).indications).toEqual(['gastritis']);
    expect(removeFilterChip(f, chips[2]!).minEvidence).toBeNull();
  });
  it('optionLabel: неизвестное значение — как есть', () => {
    expect(optionLabel(content, 'indications', 'cough')).toBe('Кашель');
    expect(optionLabel(content, 'indications', 'nope')).toBe('nope');
  });
});

describe('favoriteEntries', () => {
  const herbById = new Map(queryHerbs4().map((h) => [h.id, h]));
  it('избранное и заметки вместе, по алфавиту; удалённые из базы — в конце', () => {
    let data = toggleFavorite(emptyUserData(), 'gamma');
    data = toggleFavorite(data, 'removed-herb');
    data = setNote(data, 'alpha', 'растёт у ручья', new Date('2026-10-18T00:00:00Z'));
    const entries = favoriteEntries(data, herbById);
    expect(entries.map((e) => [e.herbId, e.favorite, Boolean(e.note), Boolean(e.herb)])).toEqual([
      ['alpha', false, true, true],
      ['gamma', true, false, true],
      ['removed-herb', true, false, false],
    ]);
  });
  it('пусто — пустой список', () => {
    expect(favoriteEntries(emptyUserData(), herbById)).toEqual([]);
  });
});

describe('herbSourceIds', () => {
  it('уникальные источники в порядке появления', () => {
    const herb = queryHerbs4()[0]!;
    expect(herbSourceIds(herb)).toEqual(['book-test']);
  });
});

describe('sourceHref', () => {
  const base = { id: 's', type: 'rct' as const, title: 'T', authors: ['A'], year: 2020 };
  it('DOI, PMID, url, ISBN', () => {
    expect(sourceHref({ ...base, doi: 'doi:10.1/ABC' })).toBe('https://doi.org/10.1/abc');
    expect(sourceHref({ ...base, pmid: 'PMID: 7' })).toBe('https://pubmed.ncbi.nlm.nih.gov/7/');
    expect(sourceHref({ ...base, url: 'https://e.org' })).toBe('https://e.org');
    expect(sourceHref({ ...base, isbn: '978' })).toBeUndefined();
  });
});
