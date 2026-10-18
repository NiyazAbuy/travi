import { SCHEMA_VERSION, bundleSchemas, type ContentBundle, type Dictionaries, type Herb } from '../src/schema';
import { sampleDictionaries, sampleHerb, sampleSources } from './sample';

/** Вымышленные травы и словари для тестов логики приложения. */

const PHOTO = {
  path: `photos/${'a'.repeat(64)}.webp`,
  kind: 'plant',
  author: 'A',
  license: 'CC0',
  source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
};

export function queryDictionaries(): Dictionaries {
  const d = sampleDictionaries();
  return bundleSchemas.dictionaries.parse({
    ...d,
    indications: [...d.indications, { id: 'gastritis', name: 'Гастрит', organ_system: 'digestive' }],
    organSystems: [...d.organSystems, { id: 'digestive', name: 'Пищеварение' }],
    substances: [...d.substances, { id: 'tannin', name: 'Танины', class: 'tannins' }],
    substanceClasses: [...d.substanceClasses, { id: 'tannins', name: 'Дубильные вещества' }],
    actions: [...d.actions, { id: 'sedative', name: 'Успокаивающее' }],
    plantParts: [...d.plantParts, { id: 'flowers', name: 'Цветки' }],
    habitats: [...d.habitats, { id: 'forest', name: 'Лес' }, { id: 'swamp', name: 'Болото' }],
    families: [...d.families, { id: 'asteraceae', name: 'Астровые', latin: 'Asteraceae' }],
  });
}

const ev = (indication: string, level: string) => ({
  indication,
  evidence: { level, note: 'Тест' },
  sources: [{ id: 'book-test' }],
});
const harvest = (part: string, months: number[]) => ({
  part,
  months,
  how: 'Тест',
  drying: 'Тест',
  storage: 'Тест',
  sources: [{ id: 'book-test' }],
});
const safety = (patch: Record<string, unknown> = {}) => ({
  pregnancy: 'unknown',
  lactation: 'unknown',
  children: { status: 'unknown' },
  toxicity: 'none',
  sources: [{ id: 'book-test' }],
  ...patch,
});

function makeHerb(id: string, name: string, patch: Record<string, unknown>): Herb {
  return bundleSchemas.herb.parse({ ...sampleHerb(id, name), photos: [PHOTO], ...patch });
}

/** alpha «Алтей», beta «Берёза», delta «Ежевика», gamma «Ёлочник». */
export function queryHerbs4(): Herb[] {
  return [
    makeHerb('alpha', 'Алтей', {
      latin: 'Althaea testus L.',
      other_names: ['просвирник'],
      family: 'malvaceae',
      life_form: 'herb',
      sourcing: ['wild'],
      habitats: ['meadow'],
      substances: ['mucilage'],
      actions: ['expectorant'],
      indications: [ev('cough', 'proven'), ev('insomnia', 'folk')],
      harvest: [harvest('leaf', [6, 7]), harvest('root', [9, 10])],
      safety: safety({ pregnancy: 'ok', children: { status: 'ok', from_age: 3 } }),
    }),
    makeHerb('beta', 'Берёза', {
      latin: 'Betula testus L.',
      other_names: [],
      family: 'asteraceae',
      life_form: 'tree',
      sourcing: ['wild', 'pharmacy'],
      habitats: ['forest'],
      substances: ['tannin'],
      actions: ['expectorant'],
      indications: [ev('cough', 'traditional'), ev('gastritis', 'traditional')],
      harvest: [harvest('leaf', [5])],
      safety: safety({ children: { status: 'caution' }, toxicity: 'low' }),
    }),
    makeHerb('delta', 'Ежевика', {
      latin: 'Rubus testus L.',
      other_names: [],
      family: 'plantaginaceae',
      life_form: 'herb',
      sourcing: ['garden'],
      habitats: ['meadow'],
      substances: ['mucilage'],
      actions: ['expectorant'],
      indications: [ev('gastritis', 'proven'), ev('cough', 'folk')],
      harvest: [harvest('root', [6])],
      safety: safety({ lactation: 'ok' }),
    }),
    makeHerb('gamma', 'Ёлочник', {
      latin: 'Gamma testus L.',
      other_names: [],
      family: 'asteraceae',
      life_form: 'shrub',
      sourcing: ['garden'],
      habitats: ['forest', 'meadow'],
      substances: ['tannin', 'mucilage'],
      actions: ['sedative'],
      indications: [ev('insomnia', 'refuted')],
      harvest: [harvest('flowers', [6])],
      safety: safety({ pregnancy: 'caution' }),
    }),
  ];
}

export function queryContent(herbs: Herb[] = queryHerbs4()): ContentBundle {
  return bundleSchemas.contentBundle.parse({
    schemaVersion: SCHEMA_VERSION,
    contentVersion: 202610180000,
    herbs,
    recipes: [],
    dictionaries: queryDictionaries(),
    sources: sampleSources(),
  });
}
