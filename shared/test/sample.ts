/** Минимальный корректный набор данных для тестов shared и tools. Каждый вызов возвращает новые объекты. */

export function sampleSources() {
  return [
    {
      id: 'book-test',
      type: 'book',
      title: 'Лекарственные растения',
      authors: ['Петров П. П.'],
      year: 1990,
      isbn: '978-5-00-000000-0',
    },
    {
      id: 'ema-plantago',
      type: 'monograph',
      title: 'Community herbal monograph on Plantago lanceolata L., folium',
      authors: ['EMA HMPC'],
      year: 2011,
      url: 'https://www.ema.europa.eu/en/medicines/herbal/plantaginis-lanceolatae-folium',
    },
    {
      id: 'rct-test',
      type: 'rct',
      title: 'A randomized trial of a test herb',
      authors: ['Ivanov I.'],
      year: 2020,
      doi: '10.1000/test.2020.1',
    },
  ];
}

export function sampleDictionaries() {
  return {
    indications: [
      { id: 'cough', name: 'Кашель', organ_system: 'respiratory', synonyms: ['кашлять'] },
      { id: 'insomnia', name: 'Бессонница', organ_system: 'nervous' },
    ],
    organSystems: [
      { id: 'nervous', name: 'Нервная система' },
      { id: 'respiratory', name: 'Дыхательная система' },
    ],
    substances: [{ id: 'mucilage', name: 'Слизи', class: 'polysaccharides' }],
    substanceClasses: [{ id: 'polysaccharides', name: 'Полисахариды' }],
    actions: [{ id: 'expectorant', name: 'Отхаркивающее' }],
    plantParts: [
      { id: 'leaf', name: 'Лист' },
      { id: 'root', name: 'Корень' },
    ],
    habitats: [{ id: 'meadow', name: 'Луг' }],
    families: [
      { id: 'malvaceae', name: 'Мальвовые', latin: 'Malvaceae' },
      { id: 'plantaginaceae', name: 'Подорожниковые', latin: 'Plantaginaceae' },
    ],
  };
}

type SampleLookalike = {
  herb?: string;
  name?: string;
  latin?: string;
  poisonous: boolean;
  differences: string;
  photo?: { file: string; kind: string };
};

export function sampleHerb(id: string, name: string, family = 'plantaginaceae') {
  return {
    id,
    name,
    other_names: ['народное название'],
    latin: 'Testus herbus L.',
    family,
    status: 'draft',
    photos: [{ file: 'plant.webp', kind: 'plant' }],
    description: 'Описание внешнего вида',
    habitats: ['meadow'],
    harvest: [
      {
        part: 'leaf',
        months: [6, 7, 8],
        how: 'Срезать листья',
        drying: 'В тени',
        storage: 'В бумажных пакетах',
        sources: [{ id: 'book-test', page: '12' }],
      },
    ],
    substances: ['mucilage'],
    actions: ['expectorant'],
    indications: [
      {
        indication: 'cough',
        evidence: { level: 'traditional', note: 'Монография EMA, традиционное применение' },
        sources: [{ id: 'ema-plantago' }],
      },
    ],
    usage: [
      {
        form: 'infusion',
        recipe: '1 ст. л. на 200 мл кипятка',
        dosage: 'По 1/3 стакана 3 раза в день',
        sources: [{ id: 'book-test' }],
      },
    ],
    safety: {
      pregnancy: 'unknown',
      lactation: 'unknown',
      children: { status: 'ok', from_age: 3 },
      toxicity: 'none',
      sources: [{ id: 'book-test' }],
    },
    lookalikes: [] as SampleLookalike[],
  };
}

export function sampleRecipe() {
  return {
    id: 'chest-blend',
    name: 'Грудной сбор (тест)',
    purpose: ['cough'],
    components: [
      { herb: 'plantago-major', parts: 2, part: 'leaf' },
      { herb: 'althaea-officinalis', parts: 1, part: 'root' },
    ],
    preparation: '1 ст. л. сбора на 200 мл кипятка',
    dosage: '3 раза в день',
    evidence: { level: 'traditional', note: 'Традиционный сбор' },
    sources: [{ id: 'book-test' }],
  };
}

export function samplePhotoMeta() {
  return {
    'plant.webp': {
      author: 'Test Author',
      license: 'CC BY-SA 4.0',
      source_url: 'https://commons.wikimedia.org/wiki/File:Test.jpg',
    },
  };
}
