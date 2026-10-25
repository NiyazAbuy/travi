import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import { manifestSchema } from '../src/manifest';
import { bundleSchemas, inputSchemas, SCHEMA_VERSION } from '../src/schema';
import { sampleDictionaries, sampleHerb, samplePhotoMeta, sampleRecipe, sampleSources } from './sample';

function messages(schema: z.ZodType, value: unknown): string[] {
  const result = schema.safeParse(value);
  return result.success ? [] : result.error.issues.map((i) => `${i.path.map(String).join('.')}: ${i.message}`);
}

const HASH = 'a'.repeat(64);
const bundlePhoto = {
  path: `photos/${HASH}.webp`,
  kind: 'plant',
  author: 'A',
  license: 'CC0',
  source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg',
};

describe('source', () => {
  it('принимает корректные источники', () => {
    for (const source of sampleSources()) expect(messages(inputSchemas.source, source)).toEqual([]);
  });
  it('требует хотя бы один проверяемый идентификатор', () => {
    const { isbn: _isbn, ...noId } = sampleSources()[0]!;
    expect(messages(inputSchemas.source, noId).join('\n')).toMatch(/проверяемый идентификатор/);
  });
  it('строгая схема ловит опечатку в ключе, нестрогая — нет', () => {
    const typo = { ...sampleSources()[0]!, autors: ['X'] };
    expect(messages(inputSchemas.source, typo).join('\n')).toMatch(/autors/);
    expect(messages(bundleSchemas.source, typo)).toEqual([]);
  });
});

describe('id', () => {
  it.each(['Ромашка', 'Matricaria', 'matricaria_chamomilla', 'matricaria--chamomilla', ''])(
    'отклоняет "%s"',
    (id) => {
      expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), id }).join('\n')).toMatch(/id: только латиница/);
    },
  );
  it('принимает kebab-case', () => {
    expect(messages(inputSchemas.herbInput, sampleHerb('matricaria-chamomilla', 'Ромашка'))).toEqual([]);
  });
});

describe('license', () => {
  const meta = (license: string) => ({ author: 'A', license, source_url: 'https://commons.wikimedia.org/wiki/File:A.jpg' });
  it.each(['CC0', 'PD', 'CC BY 2.0', 'CC BY-SA 4.0', 'CC BY-SA 3.0 de'])('принимает %s', (license) => {
    expect(messages(inputSchemas.photoMeta, meta(license))).toEqual([]);
  });
  it.each(['CC BY-NC 4.0', 'GFDL', 'cc by-sa 4.0', 'CC BY-SA'])('отклоняет %s', (license) => {
    expect(messages(inputSchemas.photoMeta, meta(license)).join('\n')).toMatch(/лицензия должна быть/);
  });
  it('файл метаданных требует имена вида name.webp', () => {
    expect(messages(inputSchemas.photoMetaFile, samplePhotoMeta())).toEqual([]);
    expect(messages(inputSchemas.photoMetaFile, { 'Plant.JPG': samplePhotoMeta()['plant.webp'] })).not.toEqual([]);
  });
});

describe('herb', () => {
  it('принимает корректную траву и подставляет значения по умолчанию', () => {
    const { other_names: _names, ...herb } = sampleHerb('plantago-major', 'Подорожник большой');
    const parsed = inputSchemas.herbInput.parse(herb);
    expect(parsed.other_names).toEqual([]);
    expect(parsed.usage[0]!.for_indications).toEqual([]);
    expect(parsed.safety.contraindications).toEqual([]);
  });
  it('показание без источников — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.indications[0]!.sources = [];
    expect(messages(inputSchemas.herbInput, herb)).toContain('indications.0.sources: нужен хотя бы один источник');
  });
  it('пустое пояснение к доказанности — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.indications[0]!.evidence.note = '  ';
    expect(messages(inputSchemas.herbInput, herb)).toContain('indications.0.evidence.note: не должно быть пустым');
  });
  it('месяц вне 1–12 — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.harvest[0]!.months = [13];
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^harvest\.0\.months\.0:/m);
  });
  it('трава без фото — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.photos = [];
    expect(messages(inputSchemas.herbInput, herb)).toContain('photos: нужно хотя бы одно фото');
  });
  it('неизвестный уровень доказанности — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    herb.indications[0]!.evidence.level = 'maybe';
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^indications\.0\.evidence\.level:/m);
  });
  it('двойник: либо herb, либо name + latin', () => {
    const herb = sampleHerb('x', 'X');
    herb.lookalikes = [{ herb: 'y', poisonous: false, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb)).toEqual([]);
    herb.lookalikes = [{ name: 'Болиголов', latin: 'Conium maculatum L.', poisonous: true, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb)).toEqual([]);
    herb.lookalikes = [{ herb: 'y', name: 'Болиголов', poisonous: true, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/либо herb/);
    herb.lookalikes = [{ name: 'Болиголов', poisonous: true, differences: 'Отличия' }];
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/либо herb/);
  });
});

describe('recipe', () => {
  it('принимает корректный сбор', () => {
    expect(messages(inputSchemas.recipe, sampleRecipe())).toEqual([]);
  });
  it('сбор из одного компонента — ошибка', () => {
    const recipe = sampleRecipe();
    recipe.components = recipe.components.slice(0, 1);
    expect(messages(inputSchemas.recipe, recipe)).toContain('components: в сборе должно быть хотя бы 2 компонента');
  });
});

describe('bundle', () => {
  const bundle = () => ({
    schemaVersion: SCHEMA_VERSION,
    contentVersion: 202610151830,
    herbs: [{ ...sampleHerb('x', 'X'), photos: [bundlePhoto], future_field: 1 }],
    recipes: [sampleRecipe()],
    dictionaries: sampleDictionaries(),
    sources: sampleSources(),
  });
  it('нестрогая схема принимает неизвестные поля и отбрасывает их', () => {
    const parsed = bundleSchemas.contentBundle.parse(bundle());
    expect(parsed.herbs[0]).not.toHaveProperty('future_field');
  });
  it('отклоняет другую версию формата', () => {
    expect(messages(bundleSchemas.contentBundle, { ...bundle(), schemaVersion: SCHEMA_VERSION + 1 })).not.toEqual([]);
  });
  it('путь фото в сборке — photos/<sha256>.webp', () => {
    expect(messages(bundleSchemas.photo, { ...bundlePhoto, path: 'photos/plant.webp' })).not.toEqual([]);
  });
});

describe('manifest', () => {
  const manifest = {
    schemaVersion: 1,
    contentVersion: 202610151830,
    publishedAt: '2026-10-15T18:30:00.000Z',
    content: { path: 'content.json', sha256: HASH, size: 100 },
    photos: [{ path: `photos/${HASH}.webp`, sha256: HASH, size: 10 }],
  };
  it('принимает корректный манифест и будущие поля', () => {
    expect(messages(manifestSchema, { ...manifest, futureField: true })).toEqual([]);
  });
  it('принимает манифест с более новой версией формата (решение — на стороне приложения)', () => {
    expect(messages(manifestSchema, { ...manifest, schemaVersion: 7 })).toEqual([]);
  });
  it('отклоняет некорректный sha256', () => {
    expect(messages(manifestSchema, { ...manifest, content: { ...manifest.content, sha256: 'xyz' } })).not.toEqual([]);
  });
});

describe('числа в YAML без кавычек', () => {
  const base = { id: 'x-2009', type: 'rct', title: 'T', authors: ['A'], year: 2009 };
  it('pmid без кавычек принимается и становится строкой', () => {
    expect(inputSchemas.source.parse({ ...base, pmid: 19593179 }).pmid).toBe('19593179');
  });
  it('номер страницы без кавычек принимается и становится строкой', () => {
    expect(inputSchemas.sourceRef.parse({ id: 'book-test', page: 45 }).page).toBe('45');
  });
  it('ISBN без кавычек — подсказка взять его в кавычки', () => {
    expect(messages(inputSchemas.source, { ...base, isbn: 9785170000000 }).join('\n')).toMatch(/в кавычки/);
  });
});

describe('жизненная форма и где взять', () => {
  it('трава с life_form и sourcing принимается', () => {
    const parsed = inputSchemas.herbInput.parse(sampleHerb('x', 'X'));
    expect(parsed.life_form).toBe('herb');
    expect(parsed.sourcing).toEqual(['wild', 'pharmacy']);
  });
  it('life_form обязательна', () => {
    const { life_form: _lifeForm, ...herb } = sampleHerb('x', 'X');
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^life_form:/m);
  });
  it('неизвестная жизненная форма — ошибка', () => {
    expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), life_form: 'bush' }).join('\n')).toMatch(
      /^life_form:/m,
    );
  });
  it('sourcing: нужен хотя бы один вариант', () => {
    expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), sourcing: [] })).toContain(
      'sourcing: укажите, где взять: wild, garden или pharmacy',
    );
  });
  it('sourcing: неизвестное значение — ошибка', () => {
    expect(messages(inputSchemas.herbInput, { ...sampleHerb('x', 'X'), sourcing: ['market'] }).join('\n')).toMatch(
      /^sourcing\.0:/m,
    );
  });
});

describe('предостережения', () => {
  it('safety.warnings необязательно и по умолчанию пустое', () => {
    expect(inputSchemas.herbInput.parse(sampleHerb('x', 'X')).safety.warnings).toEqual([]);
  });
  it('safety.warnings принимает список строк', () => {
    const herb = sampleHerb('x', 'X');
    const parsed = inputSchemas.herbInput.parse({ ...herb, safety: { ...herb.safety, warnings: ['Избегать УФ-облучения'] } });
    expect(parsed.safety.warnings).toEqual(['Избегать УФ-облучения']);
  });
  it('пустая строка в safety.warnings — ошибка', () => {
    const herb = sampleHerb('x', 'X');
    expect(messages(inputSchemas.herbInput, { ...herb, safety: { ...herb.safety, warnings: [' '] } })).toContain(
      'safety.warnings.0: не должно быть пустым',
    );
  });
});

describe('ботанический рисунок (illustration)', () => {
  const illustrationRef = { file: 'illustration.webp', kind: 'plant' };
  const bundleOf = (herb: Record<string, unknown>) => ({
    schemaVersion: SCHEMA_VERSION,
    contentVersion: 202610151830,
    herbs: [herb],
    recipes: [],
    dictionaries: sampleDictionaries(),
    sources: sampleSources(),
  });

  it('входная трава с illustration принимается', () => {
    const parsed = inputSchemas.herbInput.parse({ ...sampleHerb('x', 'X'), illustration: illustrationRef });
    expect(parsed.illustration).toEqual(illustrationRef);
  });
  it('входная трава без illustration принимается — поле необязательно', () => {
    expect(inputSchemas.herbInput.parse(sampleHerb('x', 'X')).illustration).toBeUndefined();
  });
  it('имя файла рисунка проверяется как у фото', () => {
    const herb = { ...sampleHerb('x', 'X'), illustration: { file: 'Illustration.JPG', kind: 'plant' } };
    expect(messages(inputSchemas.herbInput, herb).join('\n')).toMatch(/^illustration\.file:/m);
  });
  it('собранная трава с illustration и без неё проходит нестрогую схему', () => {
    const base = { ...sampleHerb('x', 'X'), photos: [bundlePhoto] };
    expect(messages(bundleSchemas.herb, base)).toEqual([]);
    expect(messages(bundleSchemas.herb, { ...base, illustration: bundlePhoto })).toEqual([]);
  });
  it('путь рисунка в сборке — photos/<sha256>.webp', () => {
    const herb = { ...sampleHerb('x', 'X'), photos: [bundlePhoto], illustration: { ...bundlePhoto, path: 'photos/a.webp' } };
    expect(messages(bundleSchemas.herb, herb)).not.toEqual([]);
  });
  it('база с illustration и без неё проходит схему версии 1, рисунок сохраняется', () => {
    const base = { ...sampleHerb('x', 'X'), photos: [bundlePhoto] };
    const without = bundleSchemas.contentBundle.parse(bundleOf(base));
    expect(without.herbs[0]!.illustration).toBeUndefined();
    const withIllustration = bundleSchemas.contentBundle.parse(bundleOf({ ...base, illustration: bundlePhoto }));
    expect(withIllustration.herbs[0]!.illustration).toEqual(bundlePhoto);
  });
});

describe('коротко о растении (summary)', () => {
  it('входная трава принимается и с summary, и без него', () => {
    expect(inputSchemas.herbInput.parse({ ...sampleHerb('x', 'X'), summary: 'Коротко.' }).summary).toBe('Коротко.');
    expect(inputSchemas.herbInput.parse(sampleHerb('x', 'X')).summary).toBeUndefined();
  });
  it('пустой summary — ошибка', () => {
    expect(inputSchemas.herbInput.safeParse({ ...sampleHerb('x', 'X'), summary: '' }).success).toBe(false);
  });
});

describe('сбор без месяцев (пряности, выращиваемые за рубежом)', () => {
  it('пустой список месяцев допустим — сроки зависят от страны выращивания', () => {
    const h = sampleHerb('x', 'X');
    const herb = { ...h, harvest: [{ ...h.harvest[0]!, months: [] }] };
    expect(inputSchemas.herbInput.safeParse(herb).success).toBe(true);
  });
  it('версия схемы — 2 (пустые месяцы несовместимы со старыми приложениями)', () => {
    expect(SCHEMA_VERSION).toBe(2);
  });
});
