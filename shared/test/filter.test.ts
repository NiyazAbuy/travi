import { describe, expect, it } from 'vitest';
import {
  activeFilterCount,
  buildFilterIndex,
  compareNames,
  emptyFilter,
  queryHerbs,
  type HerbFilter,
} from '../src/query/filter';
import { queryDictionaries, queryHerbs4 } from './query-fixtures';

const herbs = queryHerbs4();
const index = buildFilterIndex(queryDictionaries());
const ids = (patch: Partial<HerbFilter>) => queryHerbs(herbs, { ...emptyFilter(), ...patch }, index).map((h) => h.id);

describe('queryHerbs: без фильтра', () => {
  it('все травы по алфавиту, «ё» рядом с «е»', () => {
    expect(ids({})).toEqual(['alpha', 'beta', 'delta', 'gamma']);
  });
});

describe('группы-признаки: «И»', () => {
  it('одно показание', () => expect(ids({ indications: ['cough'] }).sort()).toEqual(['alpha', 'beta', 'delta']));
  it('два показания — оба должны быть', () =>
    expect(ids({ indications: ['cough', 'gastritis'] }).sort()).toEqual(['beta', 'delta']));
  it('вещество', () => expect(ids({ substances: ['tannin'] }).sort()).toEqual(['beta', 'gamma']));
  it('класс веществ — через словарь веществ', () =>
    expect(ids({ substanceClasses: ['tannins'] }).sort()).toEqual(['beta', 'gamma']));
  it('действие', () => expect(ids({ actions: ['sedative'] })).toEqual(['gamma']));
  it('система органов — хотя бы одно показание травы из этой системы', () =>
    expect(ids({ organSystems: ['digestive'] }).sort()).toEqual(['beta', 'delta']));
  it('две системы органов — обе', () => expect(ids({ organSystems: ['digestive', 'nervous'] })).toEqual([]));
  it('безопасность: можно детям', () => expect(ids({ safety: ['children-ok'] })).toEqual(['alpha']));
  it('безопасность: при беременности и нетоксично — оба условия', () =>
    expect(ids({ safety: ['pregnancy-ok', 'non-toxic'] })).toEqual(['alpha']));
  it('безопасность: при кормлении', () => expect(ids({ safety: ['lactation-ok'] })).toEqual(['delta']));
});

describe('группы-перечисления: «ИЛИ»', () => {
  it('месяцы', () => expect(ids({ months: [5, 9] }).sort()).toEqual(['alpha', 'beta']));
  it('места', () => expect(ids({ habitats: ['forest'] }).sort()).toEqual(['beta', 'gamma']));
  it('семейства', () => expect(ids({ families: ['malvaceae', 'plantaginaceae'] }).sort()).toEqual(['alpha', 'delta']));
  it('жизненная форма', () => expect(ids({ lifeForms: ['tree', 'shrub'] }).sort()).toEqual(['beta', 'gamma']));
  it('где взять', () => expect(ids({ sourcing: ['pharmacy', 'wild'] }).sort()).toEqual(['alpha', 'beta']));
  it('значение, которого нет ни у одной травы', () => expect(ids({ habitats: ['swamp'] })).toEqual([]));
});

describe('месяц и часть растения — в одной записи сбора', () => {
  it('листья в сентябре: у alpha в сентябре корни — не подходит', () =>
    expect(ids({ parts: ['leaf'], months: [9] })).toEqual([]));
  it('листья в июне', () => expect(ids({ parts: ['leaf'], months: [6] })).toEqual(['alpha']));
  it('только часть растения', () => expect(ids({ parts: ['root'] }).sort()).toEqual(['alpha', 'delta']));
});

describe('порог доказанности', () => {
  it('без выбранных показаний — хотя бы одно показание не ниже порога', () =>
    expect(ids({ minEvidence: 'traditional' }).sort()).toEqual(['alpha', 'beta', 'delta']));
  it('с выбранными показаниями — каждое выбранное не ниже порога', () =>
    expect(ids({ indications: ['cough'], minEvidence: 'traditional' }).sort()).toEqual(['alpha', 'beta']));
  it('refuted ниже любого порога', () =>
    expect(ids({ indications: ['insomnia'], minEvidence: 'folk' })).toEqual(['alpha']));
});

describe('сортировка', () => {
  it('с показаниями — по доказанности выбранного показания, затем по названию', () =>
    expect(ids({ indications: ['cough'] })).toEqual(['alpha', 'beta', 'delta']));
  it('по наименьшему уровню среди нескольких выбранных', () =>
    expect(ids({ indications: ['cough', 'gastritis'] })).toEqual(['beta', 'delta']));
  it('compareNames: русский алфавит', () => {
    expect(['Ёлочник', 'Ежевика', 'Алтей', 'Берёза'].sort(compareNames)).toEqual([
      'Алтей',
      'Берёза',
      'Ежевика',
      'Ёлочник',
    ]);
  });
});

describe('activeFilterCount', () => {
  it('считает все выбранные значения и порог', () => {
    expect(activeFilterCount(emptyFilter())).toBe(0);
    expect(activeFilterCount({ ...emptyFilter(), indications: ['cough'], months: [5, 6], minEvidence: 'proven' })).toBe(4);
  });
  it('emptyFilter возвращает новый объект', () => {
    const a = emptyFilter();
    a.months.push(1);
    expect(emptyFilter().months).toEqual([]);
  });
});
