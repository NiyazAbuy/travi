import { describe, expect, it } from 'vitest';
import { CATALOG_SECTIONS, catalogGroups, collectNow, filterForGroup } from '../src/query/catalog';
import { emptyFilter } from '../src/query/filter';
import { queryContent } from './query-fixtures';

const content = queryContent();
const groups = (key: Parameters<typeof catalogGroups>[1]) =>
  catalogGroups(content, key).map((g) => [g.value, g.label, g.count]);

describe('catalogGroups', () => {
  it('показания: по алфавиту, с количеством трав', () => {
    expect(groups('indications')).toEqual([
      ['insomnia', 'Бессонница', 2],
      ['gastritis', 'Гастрит', 2],
      ['cough', 'Кашель', 3],
    ]);
  });
  it('системы органов — через показания', () => {
    expect(groups('organSystems')).toEqual([
      ['respiratory', 'Дыхательная система', 3],
      ['nervous', 'Нервная система', 2],
      ['digestive', 'Пищеварение', 2],
    ]);
  });
  it('классы веществ', () => {
    expect(groups('substanceClasses')).toEqual([
      ['tannins', 'Дубильные вещества', 2],
      ['polysaccharides', 'Полисахариды', 3],
    ]);
  });
  it('месяцы — по порядку месяцев, только те, где что-то собирают', () => {
    expect(groups('months')).toEqual([
      ['5', 'май', 1],
      ['6', 'июнь', 3],
      ['7', 'июль', 1],
      ['9', 'сентябрь', 1],
      ['10', 'октябрь', 1],
    ]);
  });
  it('пустые группы не показываются', () => {
    expect(groups('habitats').map((g) => g[0])).not.toContain('swamp');
  });
  it('жизненная форма, где взять, безопасность — русские подписи', () => {
    expect(groups('lifeForms')).toEqual([
      ['tree', 'Дерево', 1],
      ['shrub', 'Кустарник', 1],
      ['herb', 'Трава', 2],
    ]);
    expect(groups('sourcing')).toEqual([
      ['pharmacy', 'Аптечное', 1],
      ['wild', 'Дикорастущее', 2],
      ['garden', 'Садовое', 2],
    ]);
    expect(groups('safety')).toEqual([
      ['children-ok', 'Можно детям', 1],
      ['pregnancy-ok', 'Можно при беременности', 1],
      ['lactation-ok', 'Можно при кормлении', 1],
      ['non-toxic', 'Нетоксично', 3],
    ]);
  });
  it('пустая база — пустой каталог', () => {
    const empty = queryContent([]);
    for (const section of CATALOG_SECTIONS) expect(catalogGroups(empty, section.key)).toEqual([]);
  });
});

describe('filterForGroup', () => {
  it('ставит одно значение в нужное поле', () => {
    expect(filterForGroup('months', '6')).toEqual({ ...emptyFilter(), months: [6] });
    expect(filterForGroup('lifeForms', 'tree')).toEqual({ ...emptyFilter(), lifeForms: ['tree'] });
    expect(filterForGroup('indications', 'cough')).toEqual({ ...emptyFilter(), indications: ['cough'] });
  });
});

describe('CATALOG_SECTIONS', () => {
  it('все 12 группировок с русскими названиями', () => {
    expect(CATALOG_SECTIONS.map((s) => s.title)).toEqual([
      'От чего помогает',
      'Действующие вещества',
      'Классы веществ',
      'Действие',
      'Система органов',
      'Месяц сбора',
      'Часть растения',
      'Где растёт',
      'Семейство',
      'Жизненная форма',
      'Где взять',
      'Безопасность',
    ]);
  });
});

describe('collectNow', () => {
  it('травы, которые собирают в этом месяце, по алфавиту', () => {
    expect(collectNow(content, 6).map((h) => h.id)).toEqual(['alpha', 'delta', 'gamma']);
    expect(collectNow(content, 1)).toEqual([]);
  });
});
