import {
  DICTIONARY_FILES,
  REQUIRED_SOURCE_TYPES,
  type DictionaryKey,
  type EvidenceLevel,
  type Source,
  type SourceRef,
} from '@travy/shared';
import type { ContentError } from './errors';
import type { LoadedContent } from './load';

export type PhotoExists = (herbId: string, file: string) => boolean;

const dictFile = (key: DictionaryKey) => `dictionaries/${DICTIONARY_FILES[key]}`;
const idSet = (items: { id: string }[]) => new Set(items.map((item) => item.id));

export function validateContent(content: LoadedContent, photoExists: PhotoExists): ContentError[] {
  const errors: ContentError[] = [];
  const { herbs, recipes, dictionaries: d, sources, photoMeta } = content;

  const herbIds = idSet(herbs);
  const sourceById = new Map<string, Source>(sources.map((s) => [s.id, s]));
  const dictIds = Object.fromEntries(
    (Object.keys(DICTIONARY_FILES) as DictionaryKey[]).map((key) => [key, idSet(d[key])]),
  ) as Record<DictionaryKey, Set<string>>;

  function ref(file: string, path: string, value: string, known: { has(id: string): boolean }, where: string) {
    if (!known.has(value)) errors.push({ file, path, message: `неизвестный id "${value}" — его нет в ${where}` });
  }
  function dictRef(file: string, path: string, value: string, key: DictionaryKey) {
    ref(file, path, value, dictIds[key], dictFile(key));
  }
  function sourceRefs(file: string, path: string, refs: SourceRef[]) {
    refs.forEach((r, i) => ref(file, `${path}.${i}.id`, r.id, sourceById, 'sources.yaml'));
  }
  function evidenceSources(file: string, path: string, level: EvidenceLevel, refs: SourceRef[]) {
    const required = REQUIRED_SOURCE_TYPES[level];
    if (!required) return;
    const satisfied = refs.some((r) => {
      const source = sourceById.get(r.id);
      return source !== undefined && required.includes(source.type);
    });
    if (!satisfied) {
      errors.push({
        file,
        path,
        message: `для уровня доказанности "${level}" нужен хотя бы один источник типа: ${required.join(', ')}`,
      });
    }
  }
  function checkPhoto(file: string, path: string, herbId: string, photoFile: string) {
    if (!photoExists(herbId, photoFile)) {
      errors.push({ file, path, message: `файл photos/${herbId}/${photoFile} не найден` });
    }
    if (!photoMeta[herbId]?.[photoFile]) {
      errors.push({
        file,
        path,
        message: `нет записи об авторе и лицензии для ${photoFile} в photos/${herbId}/photos.yaml`,
      });
    }
  }
  function checkUniqueIds(items: { id: string }[], file: string) {
    const seen = new Set<string>();
    items.forEach((item, i) => {
      if (seen.has(item.id)) errors.push({ file, path: String(i), message: `id "${item.id}" повторяется` });
      seen.add(item.id);
    });
  }

  // 1. Уникальность id в списках (у трав и сборов уникальность гарантирует имя файла)
  checkUniqueIds(sources, 'sources.yaml');
  for (const key of Object.keys(DICTIONARY_FILES) as DictionaryKey[]) checkUniqueIds(d[key], dictFile(key));

  // 2. Ссылки внутри словарей
  d.indications.forEach((x, i) => dictRef(dictFile('indications'), `${i}.organ_system`, x.organ_system, 'organSystems'));
  d.substances.forEach((x, i) => dictRef(dictFile('substances'), `${i}.class`, x.class, 'substanceClasses'));

  // 3. Травы
  for (const h of herbs) {
    const f = `herbs/${h.id}.yaml`;
    dictRef(f, 'family', h.family, 'families');
    h.habitats.forEach((x, i) => dictRef(f, `habitats.${i}`, x, 'habitats'));
    h.substances.forEach((x, i) => dictRef(f, `substances.${i}`, x, 'substances'));
    h.actions.forEach((x, i) => dictRef(f, `actions.${i}`, x, 'actions'));
    h.harvest.forEach((x, i) => {
      dictRef(f, `harvest.${i}.part`, x.part, 'plantParts');
      sourceRefs(f, `harvest.${i}.sources`, x.sources);
    });
    const seenIndications = new Set<string>();
    h.indications.forEach((x, i) => {
      dictRef(f, `indications.${i}.indication`, x.indication, 'indications');
      if (seenIndications.has(x.indication)) {
        errors.push({
          file: f,
          path: `indications.${i}.indication`,
          message: `показание "${x.indication}" указано дважды — объедините записи`,
        });
      }
      seenIndications.add(x.indication);
      sourceRefs(f, `indications.${i}.sources`, x.sources);
      evidenceSources(f, `indications.${i}`, x.evidence.level, x.sources);
    });
    h.usage.forEach((x, i) => {
      x.for_indications.forEach((ind, j) => dictRef(f, `usage.${i}.for_indications.${j}`, ind, 'indications'));
      sourceRefs(f, `usage.${i}.sources`, x.sources);
    });
    sourceRefs(f, 'safety.sources', h.safety.sources);
    sourceRefs(f, 'sources', h.sources);
    h.photos.forEach((p, i) => checkPhoto(f, `photos.${i}`, h.id, p.file));
    h.lookalikes.forEach((l, i) => {
      if (l.herb !== undefined) {
        if (l.herb === h.id) {
          errors.push({ file: f, path: `lookalikes.${i}.herb`, message: 'трава не может быть двойником самой себя' });
        } else {
          ref(f, `lookalikes.${i}.herb`, l.herb, herbIds, 'herbs/');
        }
      }
      if (l.photo) checkPhoto(f, `lookalikes.${i}.photo`, h.id, l.photo.file);
    });
  }

  // 4. Сборы
  for (const r of recipes) {
    const f = `recipes/${r.id}.yaml`;
    r.purpose.forEach((x, i) => dictRef(f, `purpose.${i}`, x, 'indications'));
    r.components.forEach((c, i) => {
      ref(f, `components.${i}.herb`, c.herb, herbIds, 'herbs/');
      if (c.part !== undefined) dictRef(f, `components.${i}.part`, c.part, 'plantParts');
    });
    sourceRefs(f, 'sources', r.sources);
    evidenceSources(f, 'evidence', r.evidence.level, r.sources);
  }

  return errors;
}
