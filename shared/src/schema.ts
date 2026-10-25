import { z } from 'zod';
import {
  EVIDENCE_LEVELS,
  HERB_STATUSES,
  LIFE_FORMS,
  PHOTO_KINDS,
  SAFETY_STATUSES,
  SOURCE_TYPES,
  SOURCING_OPTIONS,
  TOXICITY_LEVELS,
  USAGE_FORMS,
} from './enums';

/**
 * Версия формата базы. Увеличивать при несовместимом изменении схемы (спецификация §5.7).
 * Совместимо: новое необязательное поле. Несовместимо: новое значение перечисления, новое обязательное поле,
 * смена типа, ослабление или ужесточение правил (min, regex, refine) — старое приложение отвергнет такую базу.
 * Перечисления закреплены охранным тестом shared/test/compat.test.ts.
 */
export const SCHEMA_VERSION = 2;

export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PHOTO_FILE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*\.webp$/;
export const PHOTO_PATH_PATTERN = /^photos\/[0-9a-f]{64}\.webp$/;
export const LICENSE_PATTERN = /^(CC0|PD|CC BY(?:-SA)? \d\.\d(?: [A-Za-z]{2,3})?)$/;

type ObjectMaker = <T extends z.ZodRawShape>(shape: T) => z.ZodObject<T>;
// Типы вывода у строгой и нестрогой схемы одинаковые, отличается только реакция на неизвестные ключи.
const strictObject: ObjectMaker = (shape) => z.object(shape).strict() as unknown as z.ZodObject<typeof shape>;
const looseObject: ObjectMaker = (shape) => z.object(shape);

const idSchema = z
  .string()
  .regex(ID_PATTERN, 'id: только латиница в нижнем регистре, цифры и одиночные дефисы (пример: matricaria-chamomilla)');
const text = z.string().trim().min(1, 'не должно быть пустым');
// В YAML `pmid: 19593179` и `page: 45` без кавычек — числа; принимаем их как строку.
const textOrNumber = z.union([text, z.number().int().nonnegative().transform(String)]);
// ISBN числом приводить нельзя: YAML отбросит ведущий ноль у ISBN-10.
const isbnSchema = z
  .string({
    error: (issue) =>
      typeof issue.input === 'number'
        ? 'ISBN без кавычек читается как число и может потерять ведущий ноль — возьмите его в кавычки: isbn: "978-5-…"'
        : undefined,
  })
  .trim()
  .min(1, 'не должно быть пустым');
const licenseSchema = z.string().regex(LICENSE_PATTERN, 'лицензия должна быть CC0, PD, CC BY x.y или CC BY-SA x.y');
const photoFileSchema = z
  .string()
  .regex(PHOTO_FILE_PATTERN, 'имя фото: латиница в нижнем регистре, цифры, дефисы и расширение .webp');

interface LookalikeIdentity {
  herb?: string;
  name?: string;
  latin?: string;
}
function isValidLookalike(l: LookalikeIdentity): boolean {
  const byRef = Boolean(l.herb) && !l.name && !l.latin;
  const byName = !l.herb && Boolean(l.name) && Boolean(l.latin);
  return byRef || byName;
}
const LOOKALIKE_RULE = { message: 'укажите либо herb (id травы из базы), либо name и latin', path: ['herb'] };

function makeSchemas(o: ObjectMaker) {
  const sourceRef = o({ id: idSchema, page: textOrNumber.optional() });
  const sourceRefs = z.array(sourceRef).min(1, 'нужен хотя бы один источник');
  const evidence = o({ level: z.enum(EVIDENCE_LEVELS), note: text });
  const synonyms = z.array(text).default([]);

  const source = o({
    id: idSchema,
    type: z.enum(SOURCE_TYPES),
    title: text,
    authors: z.array(text).min(1, 'нужен хотя бы один автор'),
    year: z.number().int().min(1500).max(2100),
    publisher: text.optional(),
    journal: text.optional(),
    isbn: isbnSchema.optional(),
    doi: text.optional(),
    pmid: textOrNumber.optional(),
    url: z.url().optional(),
    note: text.optional(),
  }).refine((s) => Boolean(s.isbn || s.doi || s.pmid || s.url), {
    message: 'источник должен иметь хотя бы один проверяемый идентификатор: isbn, doi, pmid или url',
    path: ['isbn'],
  });

  const named = o({ id: idSchema, name: text });
  const indication = o({ id: idSchema, name: text, organ_system: idSchema, synonyms });
  const substance = o({ id: idSchema, name: text, class: idSchema, synonyms });
  const action = o({ id: idSchema, name: text, synonyms });
  const family = o({ id: idSchema, name: text, latin: text });
  const dictionaryItems = {
    indications: indication,
    organSystems: named,
    substances: substance,
    substanceClasses: named,
    actions: action,
    plantParts: named,
    habitats: named,
    families: family,
  };
  const dictionaries = o({
    indications: z.array(indication),
    organSystems: z.array(named),
    substances: z.array(substance),
    substanceClasses: z.array(named),
    actions: z.array(action),
    plantParts: z.array(named),
    habitats: z.array(named),
    families: z.array(family),
  });

  const photoRef = o({ file: photoFileSchema, kind: z.enum(PHOTO_KINDS), caption: text.optional() });
  const photoMeta = o({ author: text, license: licenseSchema, source_url: z.url() });
  const photoMetaFile = z.record(photoFileSchema, photoMeta);
  const photo = o({
    path: z.string().regex(PHOTO_PATH_PATTERN, 'путь фото в сборке: photos/<sha256>.webp'),
    kind: z.enum(PHOTO_KINDS),
    caption: text.optional(),
    author: text,
    license: licenseSchema,
    source_url: z.url(),
  });

  const harvest = o({
    part: idSchema,
    // Пусто — сроки зависят от страны выращивания (пряности из тропиков). С версии схемы 2: схема 1 требовала хотя бы один месяц.
    months: z.array(z.number().int().min(1).max(12)),
    how: text,
    drying: text,
    storage: text,
    sources: sourceRefs,
  });
  const herbIndication = o({ indication: idSchema, evidence, sources: sourceRefs });
  const usage = o({
    form: z.enum(USAGE_FORMS),
    recipe: text,
    dosage: text,
    course: text.optional(),
    for_indications: z.array(idSchema).default([]),
    sources: sourceRefs,
  });
  const safetyStatus = z.enum(SAFETY_STATUSES);
  const safety = o({
    pregnancy: safetyStatus,
    lactation: safetyStatus,
    children: o({ status: safetyStatus, from_age: z.number().int().min(0).max(18).optional() }),
    toxicity: z.enum(TOXICITY_LEVELS),
    contraindications: z.array(text).default([]),
    warnings: z.array(text).default([]),
    side_effects: z.array(text).default([]),
    interactions: z.array(text).default([]),
    sources: sourceRefs,
  });

  const lookalikeShape = {
    herb: idSchema.optional(),
    name: text.optional(),
    latin: text.optional(),
    poisonous: z.boolean(),
    differences: text,
  };
  const lookalikeInput = o({ ...lookalikeShape, photo: photoRef.optional() }).refine(isValidLookalike, LOOKALIKE_RULE);
  const lookalike = o({ ...lookalikeShape, photo: photo.optional() }).refine(isValidLookalike, LOOKALIKE_RULE);

  const herbShape = {
    id: idSchema,
    name: text,
    other_names: z.array(text).default([]),
    latin: text,
    family: idSchema,
    status: z.enum(HERB_STATUSES),
    life_form: z.enum(LIFE_FORMS),
    sourcing: z.array(z.enum(SOURCING_OPTIONS)).min(1, 'укажите, где взять: wild, garden или pharmacy'),
    /** Коротко о растении (1–2 предложения) для краткой карточки; нет — показывается начало описания. */
    summary: text.optional(),
    description: text,
    habitats: z.array(idSchema),
    harvest: z.array(harvest).min(1, 'нужна хотя бы одна запись о сборе'),
    substances: z.array(idSchema),
    actions: z.array(idSchema),
    indications: z.array(herbIndication).min(1, 'нужно хотя бы одно показание'),
    usage: z.array(usage).min(1, 'нужен хотя бы один способ применения'),
    safety,
    sources: z.array(sourceRef).default([]),
  };
  const herbInput = o({
    ...herbShape,
    photos: z.array(photoRef).min(1, 'нужно хотя бы одно фото'),
    // Ботанический рисунок: необязательное поле (совместимо со схемой 1); автор и лицензия — в photos.yaml, как у фото.
    illustration: photoRef.optional(),
    lookalikes: z.array(lookalikeInput).default([]),
  });
  const herb = o({
    ...herbShape,
    photos: z.array(photo).min(1, 'нужно хотя бы одно фото'),
    illustration: photo.optional(),
    lookalikes: z.array(lookalike).default([]),
  });

  const recipe = o({
    id: idSchema,
    name: text,
    purpose: z.array(idSchema).min(1, 'укажите хотя бы одно показание'),
    components: z
      .array(o({ herb: idSchema, parts: z.number().positive(), part: idSchema.optional() }))
      .min(2, 'в сборе должно быть хотя бы 2 компонента'),
    preparation: text,
    dosage: text,
    evidence,
    sources: sourceRefs,
    safety_note: text.optional(),
  });

  const contentBundle = o({
    schemaVersion: z.literal(SCHEMA_VERSION),
    contentVersion: z.number().int().positive(),
    herbs: z.array(herb),
    recipes: z.array(recipe),
    dictionaries,
    sources: z.array(source),
  });

  return {
    sourceRef,
    source,
    dictionaryItems,
    dictionaries,
    photoRef,
    photoMeta,
    photoMetaFile,
    photo,
    herbInput,
    herb,
    recipe,
    contentBundle,
  };
}

/** Строгие схемы для YAML-исходников: неизвестный ключ (опечатка) — ошибка. */
export const inputSchemas = makeSchemas(strictObject);
/** Нестрогие схемы для собранной базы: неизвестные поля отбрасываются, чтобы старое приложение принимало совместимые обновления. */
export const bundleSchemas = makeSchemas(looseObject);

export type SourceRef = z.infer<typeof bundleSchemas.sourceRef>;
export type Source = z.infer<typeof bundleSchemas.source>;
export type Dictionaries = z.infer<typeof bundleSchemas.dictionaries>;
export type DictionaryKey = keyof Dictionaries;
export type PhotoRef = z.infer<typeof bundleSchemas.photoRef>;
export type PhotoMeta = z.infer<typeof bundleSchemas.photoMeta>;
export type PhotoMetaFile = z.infer<typeof bundleSchemas.photoMetaFile>;
export type Photo = z.infer<typeof bundleSchemas.photo>;
export type HerbInput = z.infer<typeof bundleSchemas.herbInput>;
export type Herb = z.infer<typeof bundleSchemas.herb>;
export type Recipe = z.infer<typeof bundleSchemas.recipe>;
export type ContentBundle = z.infer<typeof bundleSchemas.contentBundle>;

/** Файлы словарей в content/dictionaries/. */
export const DICTIONARY_FILES = {
  indications: 'indications.yaml',
  organSystems: 'organ-systems.yaml',
  substances: 'substances.yaml',
  substanceClasses: 'substance-classes.yaml',
  actions: 'actions.yaml',
  plantParts: 'plant-parts.yaml',
  habitats: 'habitats.yaml',
  families: 'families.yaml',
} as const satisfies Record<DictionaryKey, string>;
