import { describe, expect, it } from 'vitest';
import { herbLine, herbOrganSystems, herbParts, shortLabel, usageSummary } from '../src/query/summary';
import { bundleSchemas, type Dictionaries, type Herb } from '../src/schema';
import { queryDictionaries, queryHerbs4 } from './query-fixtures';

const herbs = queryHerbs4();
const alpha = herbs[0]!;
const dictionaries = (): Dictionaries => {
  const d = queryDictionaries();
  return bundleSchemas.dictionaries.parse({
    ...d,
    indications: [
      ...d.indications,
      { id: 'bronchitis', name: 'Бронхит', organ_system: 'respiratory' },
      { id: 'rash', name: 'Сыпь', organ_system: 'skin' },
    ],
    organSystems: [...d.organSystems, { id: 'skin', name: 'Кожа и раны' }],
    actions: [
      ...d.actions,
      { id: 'anti-inflammatory', name: 'Противовоспалительное' },
      { id: 'antispasmodic', name: 'Спазмолитическое' },
    ],
  });
};

const indication = (id: string, level: string) => ({
  indication: id,
  evidence: { level, note: 'Тест' },
  sources: [{ id: 'book-test' }],
});
const usage = (form: string) => ({
  form,
  recipe: 'Тест',
  dosage: 'Тест',
  sources: [{ id: 'book-test' }],
});
const harvestOf = (part: string) => ({
  part,
  months: [6],
  how: 'Тест',
  drying: 'Тест',
  storage: 'Тест',
  sources: [{ id: 'book-test' }],
});

function withPatch(patch: Record<string, unknown>, base: Herb = alpha): Herb {
  return bundleSchemas.herb.parse({ ...base, ...patch });
}

describe('herbOrganSystems', () => {
  it('больше показаний в системе — выше', () => {
    const herb = withPatch({
      indications: [
        indication('cough', 'traditional'),
        indication('insomnia', 'traditional'),
        indication('bronchitis', 'traditional'),
      ],
    });
    expect(herbOrganSystems(herb, dictionaries())).toEqual([
      { id: 'respiratory', name: 'Дыхательная система' },
      { id: 'nervous', name: 'Нервная система' },
    ]);
  });

  it('limit ограничивает число систем', () => {
    const herb = withPatch({
      indications: [
        indication('cough', 'traditional'),
        indication('insomnia', 'traditional'),
        indication('bronchitis', 'traditional'),
      ],
    });
    expect(herbOrganSystems(herb, dictionaries(), 1)).toEqual([{ id: 'respiratory', name: 'Дыхательная система' }]);
  });

  it('по умолчанию не больше трёх систем', () => {
    const herb = withPatch({
      indications: ['cough', 'insomnia', 'gastritis', 'rash'].map((id) => indication(id, 'traditional')),
    });
    expect(herbOrganSystems(herb, dictionaries())).toHaveLength(3);
    expect(herbOrganSystems(herb, dictionaries(), 4)).toHaveLength(4);
  });

  it('при равном числе выигрывает система с лучшим уровнем доказанности', () => {
    // нервная система идёт первой в списке показаний, но у дыхательной есть proven
    const herb = withPatch({ indications: [indication('insomnia', 'folk'), indication('cough', 'proven')] });
    expect(herbOrganSystems(herb, dictionaries()).map((s) => s.id)).toEqual(['respiratory', 'nervous']);
  });

  it('при равенстве числа и уровня — по названию', () => {
    const herb = withPatch({ indications: [indication('insomnia', 'traditional'), indication('cough', 'traditional')] });
    // «Дыхательная система» раньше «Нервная система» по алфавиту
    expect(herbOrganSystems(herb, dictionaries()).map((s) => s.name)).toEqual(['Дыхательная система', 'Нервная система']);
  });

  it('число показаний важнее уровня', () => {
    const herb = withPatch({
      indications: [indication('insomnia', 'proven'), indication('cough', 'folk'), indication('bronchitis', 'folk')],
    });
    expect(herbOrganSystems(herb, dictionaries()).map((s) => s.id)).toEqual(['respiratory', 'nervous']);
  });

  it('показание вне словаря пропускается', () => {
    const herb = withPatch({ indications: [indication('no-such', 'proven'), indication('cough', 'folk')] });
    expect(herbOrganSystems(herb, dictionaries()).map((s) => s.id)).toEqual(['respiratory']);
  });
});

describe('usageSummary', () => {
  it('уникальные подписи в порядке появления, со строчной буквы', () => {
    const herb = withPatch({
      usage: ['infusion', 'tea', 'rinse', 'infusion', 'other'].map(usage),
    });
    expect(usageSummary(herb)).toEqual({ internal: ['настой', 'чай'], external: ['полоскание'] });
  });

  it('без наружных форм — external пуст', () => {
    const herb = withPatch({ usage: ['decoction', 'tincture'].map(usage) });
    expect(usageSummary(herb)).toEqual({ internal: ['отвар', 'настойка'], external: [] });
  });

  it('наружные: ванна и компресс; other пропускается', () => {
    const herb = withPatch({ usage: ['other', 'bath', 'compress'].map(usage) });
    expect(usageSummary(herb)).toEqual({ internal: [], external: ['ванна', 'компресс'] });
  });
});

describe('herbParts', () => {
  it('уникальные части из сбора в порядке появления', () => {
    const herb = withPatch({ harvest: [harvestOf('leaf'), harvestOf('leaf'), harvestOf('root')] });
    expect(herbParts(herb, dictionaries())).toEqual([
      { id: 'leaf', name: 'Лист' },
      { id: 'root', name: 'Корень' },
    ]);
  });

  it('часть вне словаря пропускается', () => {
    const herb = withPatch({ harvest: [harvestOf('no-such'), harvestOf('root')] });
    expect(herbParts(herb, dictionaries())).toEqual([{ id: 'root', name: 'Корень' }]);
  });
});

describe('shortLabel', () => {
  it('убирает уточнение в скобках в конце', () => {
    expect(shortLabel('Трава (надземная часть)')).toBe('Трава');
  });
  it('без скобок — как есть', () => {
    expect(shortLabel('Листья')).toBe('Листья');
  });
  it('скобки в середине не трогает', () => {
    expect(shortLabel('Кора (молодая) ветвей')).toBe('Кора (молодая) ветвей');
  });
  it('название только из скобок не превращается в пустую строку', () => {
    expect(shortLabel('(надземная часть)')).toBe('(надземная часть)');
  });
});

describe('herbLine', () => {
  it('одно действие — с заглавной', () => {
    expect(herbLine(withPatch({ actions: ['expectorant'] }), dictionaries())).toBe('Отхаркивающее');
  });

  it('два действия — первое с заглавной, остальные со строчной', () => {
    const herb = withPatch({ actions: ['anti-inflammatory', 'antispasmodic'] });
    expect(herbLine(herb, dictionaries())).toBe('Противовоспалительное, спазмолитическое');
  });

  it('без действий — названия двух первых показаний', () => {
    const herb = withPatch({
      actions: [],
      indications: [indication('cough', 'proven'), indication('insomnia', 'folk'), indication('bronchitis', 'folk')],
    });
    expect(herbLine(herb, dictionaries())).toBe('Кашель, бессонница');
  });

  it('нет ни действий, ни показаний — пустая строка', () => {
    // схема требует хотя бы одно показание, поэтому собираем объект напрямую
    const herb = { ...alpha, actions: [], indications: [] } as Herb;
    expect(herbLine(herb, dictionaries())).toBe('');
  });
});
