import { bundleSchemas, type ContentBundle, type DictionaryKey } from '../schema';
import { countRu } from '../text';

/**
 * Ссылки внутри собранной базы, которые проверяет tools/src/validate.ts: словари, источники,
 * двойники и компоненты сборов. Текст ошибки: "<где>: нет <id>".
 */
export function bundleReferenceErrors(b: ContentBundle): string[] {
  const errors: string[] = [];
  const d = b.dictionaries;
  const ids = (key: DictionaryKey) => new Set<string>(d[key].map((x) => x.id));
  const dict = {
    indications: ids('indications'),
    organSystems: ids('organSystems'),
    substances: ids('substances'),
    substanceClasses: ids('substanceClasses'),
    actions: ids('actions'),
    plantParts: ids('plantParts'),
    habitats: ids('habitats'),
    families: ids('families'),
  };
  const sourceIds = new Set<string>(b.sources.map((s) => s.id));
  const herbIds = new Set<string>(b.herbs.map((h) => h.id));

  const check = (where: string, id: string, known: Set<string>) => {
    if (!known.has(id)) errors.push(`${where}: нет ${id}`);
  };
  const checkSources = (where: string, refs: { id: string }[]) =>
    refs.forEach((r, i) => check(`${where}.${i}`, r.id, sourceIds));

  d.indications.forEach((x, i) => check(`indications.${i}.organ_system`, x.organ_system, dict.organSystems));
  d.substances.forEach((x, i) => check(`substances.${i}.class`, x.class, dict.substanceClasses));

  for (const h of b.herbs) {
    const f = `herbs/${h.id}`;
    check(`${f} family`, h.family, dict.families);
    h.habitats.forEach((x, i) => check(`${f} habitats.${i}`, x, dict.habitats));
    h.substances.forEach((x, i) => check(`${f} substances.${i}`, x, dict.substances));
    h.actions.forEach((x, i) => check(`${f} actions.${i}`, x, dict.actions));
    h.harvest.forEach((x, i) => {
      check(`${f} harvest.${i}.part`, x.part, dict.plantParts);
      checkSources(`${f} harvest.${i}.sources`, x.sources);
    });
    h.indications.forEach((x, i) => {
      check(`${f} indications.${i}.indication`, x.indication, dict.indications);
      checkSources(`${f} indications.${i}.sources`, x.sources);
    });
    h.usage.forEach((x, i) => {
      x.for_indications.forEach((ind, j) => check(`${f} usage.${i}.for_indications.${j}`, ind, dict.indications));
      checkSources(`${f} usage.${i}.sources`, x.sources);
    });
    checkSources(`${f} safety.sources`, h.safety.sources);
    checkSources(`${f} sources`, h.sources);
    h.lookalikes.forEach((l, i) => {
      if (l.herb !== undefined) check(`${f} lookalikes.${i}.herb`, l.herb, herbIds);
    });
  }

  for (const r of b.recipes) {
    const f = `recipes/${r.id}`;
    r.purpose.forEach((x, i) => check(`${f} purpose.${i}`, x, dict.indications));
    r.components.forEach((c, i) => {
      check(`${f} components.${i}.herb`, c.herb, herbIds);
      if (c.part !== undefined) check(`${f} components.${i}.part`, c.part, dict.plantParts);
    });
    checkSources(`${f} sources`, r.sources);
  }

  return errors;
}

export type ParsedContent =
  | { ok: true; bundle: ContentBundle }
  | { ok: false; reason: 'json' | 'schema' | 'references' };

/** Текст content.json → проверенная база либо причина отказа. */
export function parseContentBundle(text: string): ParsedContent {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'json' };
  }
  const parsed = bundleSchemas.contentBundle.safeParse(value);
  if (!parsed.success) return { ok: false, reason: 'schema' };
  if (bundleReferenceErrors(parsed.data).length > 0) return { ok: false, reason: 'references' };
  return { ok: true, bundle: parsed.data };
}

/**
 * Какую базу показывать. Скачанная берётся, только если она целая и новее встроенной;
 * любая другая непустая скачанная (повреждена, устарела после обновления APK) подлежит удалению.
 */
export function pickActiveContent(
  bundled: ContentBundle,
  downloadedText: string | null,
): { bundle: ContentBundle; source: 'bundled' | 'downloaded'; discardDownloaded: boolean } {
  if (!downloadedText) return { bundle: bundled, source: 'bundled', discardDownloaded: false };
  const parsed = parseContentBundle(downloadedText);
  if (parsed.ok && parsed.bundle.contentVersion > bundled.contentVersion) {
    return { bundle: parsed.bundle, source: 'downloaded', discardDownloaded: false };
  }
  return { bundle: bundled, source: 'bundled', discardDownloaded: true };
}

/** Пути всех фото базы: трав, их ботанических рисунков и двойников. */
export function photoPaths(b: ContentBundle): Set<string> {
  const paths = new Set<string>();
  for (const h of b.herbs) {
    for (const p of h.photos) paths.add(p.path);
    if (h.illustration) paths.add(h.illustration.path);
    for (const l of h.lookalikes) if (l.photo) paths.add(l.photo.path);
  }
  return paths;
}

export interface ChangeSummary {
  added: number;
  removed: number;
  changed: number;
  /** Изменились сборы, словари или источники. */
  otherChanged: boolean;
}

export function summarizeChanges(prev: ContentBundle, next: ContentBundle): ChangeSummary {
  const prevById = new Map(prev.herbs.map((h) => [h.id, JSON.stringify(h)]));
  const nextById = new Map(next.herbs.map((h) => [h.id, JSON.stringify(h)]));
  let added = 0;
  let changed = 0;
  for (const [id, json] of nextById) {
    const before = prevById.get(id);
    if (before === undefined) added += 1;
    else if (before !== json) changed += 1;
  }
  let removed = 0;
  for (const id of prevById.keys()) if (!nextById.has(id)) removed += 1;

  const otherChanged =
    JSON.stringify(prev.recipes) !== JSON.stringify(next.recipes) ||
    JSON.stringify(prev.dictionaries) !== JSON.stringify(next.dictionaries) ||
    JSON.stringify(prev.sources) !== JSON.stringify(next.sources);
  return { added, removed, changed, otherChanged };
}

/** Текст плашки после обновления; null — менялась только версия, плашка не нужна. */
export function updateMessage(s: ChangeSummary): string | null {
  const parts: string[] = [];
  if (s.added > 0) parts.push(`+${countRu(s.added, ['трава', 'травы', 'трав'])}`);
  if (s.changed > 0) parts.push(`изменено ${s.changed}`);
  if (s.removed > 0) parts.push(`удалено ${s.removed}`);
  if (parts.length > 0) return `База обновлена: ${parts.join(', ')}`;
  return s.otherChanged ? 'База обновлена' : null;
}
