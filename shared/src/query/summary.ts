import type { UsageForm } from '../enums';
import { evidenceRank } from '../evidence';
import { USAGE_FORM_LABELS } from '../labels';
import type { Dictionaries, Herb } from '../schema';
import { compareNames } from './filter';

/** Краткие сводки травы для карточек и строк списка (спецификация редизайна §4.3, §4.5). */

type Named = { id: string; name: string };

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Системы органов, к которым относятся показания травы (не больше limit).
 * Порядок: больше показаний в системе — выше; при равенстве — лучший уровень доказанности
 * среди показаний системы; затем по названию.
 */
export function herbOrganSystems(herb: Herb, dictionaries: Dictionaries, limit = 3): Named[] {
  const stats = new Map<string, { count: number; best: number }>();
  for (const x of herb.indications) {
    const systemId = dictionaries.indications.find((i) => i.id === x.indication)?.organ_system;
    if (systemId === undefined) continue;
    const rank = evidenceRank(x.evidence.level);
    const prev = stats.get(systemId);
    stats.set(systemId, { count: (prev?.count ?? 0) + 1, best: Math.max(prev?.best ?? rank, rank) });
  }

  const systems: (Named & { count: number; best: number })[] = [];
  for (const [id, { count, best }] of stats) {
    const system = dictionaries.organSystems.find((s) => s.id === id);
    if (system) systems.push({ id, name: system.name, count, best });
  }
  systems.sort((a, b) => b.count - a.count || b.best - a.best || compareNames(a.name, b.name));
  return systems.slice(0, limit).map(({ id, name }) => ({ id, name }));
}

const INTERNAL_FORMS: readonly UsageForm[] = ['infusion', 'decoction', 'tincture', 'tea'];
const EXTERNAL_FORMS: readonly UsageForm[] = ['rinse', 'bath', 'compress'];

/**
 * Способы применения одной строкой: «внутрь» и «наружно». Подписи уникальны, идут в порядке
 * появления и пишутся со строчной буквы; форма «other» в краткую сводку не попадает.
 */
export function usageSummary(herb: Herb): { internal: string[]; external: string[] } {
  const labels = (forms: readonly UsageForm[]) => {
    const seen = new Set<UsageForm>();
    for (const u of herb.usage) if (forms.includes(u.form)) seen.add(u.form);
    return [...seen].map((form) => lowerFirst(USAGE_FORM_LABELS[form]));
  };
  return { internal: labels(INTERNAL_FORMS), external: labels(EXTERNAL_FORMS) };
}

/** Части растения из записей о сборе — без повторов, в порядке появления. */
export function herbParts(herb: Herb, dictionaries: Dictionaries): Named[] {
  const parts: Named[] = [];
  for (const h of herb.harvest) {
    if (parts.some((p) => p.id === h.part)) continue;
    const part = dictionaries.plantParts.find((p) => p.id === h.part);
    if (part) parts.push({ id: part.id, name: part.name });
  }
  return parts;
}

/**
 * Название без уточнения в скобках в конце: «Трава (надземная часть)» → «Трава».
 * Скобки внутри уточнения учитываются: «Matricaria chamomilla L. (син. … (L.) Rauschert)» → «Matricaria chamomilla L.».
 * Скобки в середине, несбалансированные скобки и название только из скобок — без изменений.
 */
export function shortLabel(name: string): string {
  const trimmed = name.trimEnd();
  if (!trimmed.endsWith(')')) return name;
  // от последней закрывающей скобки назад — до парной ей открывающей
  let depth = 0;
  for (let i = trimmed.length - 1; i >= 0; i--) {
    const ch = trimmed[i];
    if (ch === ')') depth++;
    else if (ch === '(' && --depth === 0) {
      const short = trimmed.slice(0, i).trimEnd();
      return short === '' ? name : short;
    }
  }
  return name;
}

/** Названия через запятую одной фразой: первое с заглавной, остальные со строчной. */
export function nameList(names: readonly string[]): string {
  return names.map((n, i) => (i === 0 ? upperFirst(n) : lowerFirst(n))).join(', ');
}

/**
 * Строка под названием травы: названия действий через запятую (первое с заглавной, остальные со строчной).
 * Нет действий — названия двух первых показаний так же; нет и их — пустая строка.
 */
export function herbLine(herb: Herb, dictionaries: Dictionaries): string {
  const actions = herb.actions.flatMap((id) => dictionaries.actions.find((a) => a.id === id)?.name ?? []);
  if (actions.length > 0) return nameList(actions);
  const indications = herb.indications.flatMap(
    (x) => dictionaries.indications.find((i) => i.id === x.indication)?.name ?? [],
  );
  return nameList(indications.slice(0, 2));
}

/**
 * Плашки назначения сбора (спецификация §4.5, макет 05): короткие названия систем органов его показаний,
 * без повторов, в порядке показаний; у показания без системы — его собственное название без уточнения в скобках.
 */
export function purposeLabels(purpose: readonly string[], dictionaries: Dictionaries, limit = 3): string[] {
  const labels: string[] = [];
  for (const id of purpose) {
    const indication = dictionaries.indications.find((i) => i.id === id);
    const system = dictionaries.organSystems.find((s) => s.id === indication?.organ_system);
    const label = system?.name ?? (indication ? shortLabel(indication.name) : undefined);
    if (label !== undefined && !labels.includes(label)) labels.push(label);
  }
  return labels.slice(0, limit);
}
