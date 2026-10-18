import type { EvidenceLevel, LifeForm, Sourcing } from '../enums';
import { evidenceRank, meetsEvidenceThreshold } from '../evidence';
import type { Dictionaries, Herb } from '../schema';

export const SAFETY_FLAGS = ['pregnancy-ok', 'lactation-ok', 'children-ok', 'non-toxic'] as const;
export type SafetyFlag = (typeof SAFETY_FLAGS)[number];

/** Выбранные условия фильтра (спецификация §6.3). Пустой список — условие не задано. */
export interface HerbFilter {
  indications: string[];
  substances: string[];
  substanceClasses: string[];
  actions: string[];
  organSystems: string[];
  safety: SafetyFlag[];
  months: number[];
  parts: string[];
  habitats: string[];
  families: string[];
  lifeForms: LifeForm[];
  sourcing: Sourcing[];
  minEvidence: EvidenceLevel | null;
}

export function emptyFilter(): HerbFilter {
  return {
    indications: [],
    substances: [],
    substanceClasses: [],
    actions: [],
    organSystems: [],
    safety: [],
    months: [],
    parts: [],
    habitats: [],
    families: [],
    lifeForms: [],
    sourcing: [],
    minEvidence: null,
  };
}

export function activeFilterCount(f: HerbFilter): number {
  const lists = [
    f.indications,
    f.substances,
    f.substanceClasses,
    f.actions,
    f.organSystems,
    f.safety,
    f.months,
    f.parts,
    f.habitats,
    f.families,
    f.lifeForms,
    f.sourcing,
  ];
  return lists.reduce((sum, list) => sum + list.length, 0) + (f.minEvidence ? 1 : 0);
}

/** Связи из словарей, нужные фильтру: показание → система органов, вещество → класс. */
export interface FilterIndex {
  organSystemOf: Map<string, string>;
  classOf: Map<string, string>;
}

export function buildFilterIndex(d: Dictionaries): FilterIndex {
  return {
    organSystemOf: new Map(d.indications.map((x) => [x.id, x.organ_system])),
    classOf: new Map(d.substances.map((x) => [x.id, x.class])),
  };
}

function matchesSafety(herb: Herb, flag: SafetyFlag): boolean {
  switch (flag) {
    case 'pregnancy-ok':
      return herb.safety.pregnancy === 'ok';
    case 'lactation-ok':
      return herb.safety.lactation === 'ok';
    case 'children-ok':
      return herb.safety.children.status === 'ok';
    case 'non-toxic':
      return herb.safety.toxicity === 'none';
  }
}

const isString = (x: string | undefined): x is string => x !== undefined;
const hasAny = <T>(values: readonly T[], selected: readonly T[]) => values.some((v) => selected.includes(v));

export function matchesFilter(herb: Herb, f: HerbFilter, index: FilterIndex): boolean {
  const indicationIds = new Set(herb.indications.map((x) => x.indication));
  if (!f.indications.every((id) => indicationIds.has(id))) return false;
  if (!f.substances.every((id) => herb.substances.includes(id))) return false;

  const classes = new Set(herb.substances.map((id) => index.classOf.get(id)).filter(isString));
  if (!f.substanceClasses.every((c) => classes.has(c))) return false;
  if (!f.actions.every((id) => herb.actions.includes(id))) return false;

  const systems = new Set(herb.indications.map((x) => index.organSystemOf.get(x.indication)).filter(isString));
  if (!f.organSystems.every((s) => systems.has(s))) return false;
  if (!f.safety.every((flag) => matchesSafety(herb, flag))) return false;

  if (f.months.length > 0 || f.parts.length > 0) {
    const inOneRecord = herb.harvest.some(
      (h) =>
        (f.parts.length === 0 || f.parts.includes(h.part)) && (f.months.length === 0 || hasAny(h.months, f.months)),
    );
    if (!inOneRecord) return false;
  }
  if (f.habitats.length > 0 && !hasAny(herb.habitats, f.habitats)) return false;
  if (f.families.length > 0 && !f.families.includes(herb.family)) return false;
  if (f.lifeForms.length > 0 && !f.lifeForms.includes(herb.life_form)) return false;
  if (f.sourcing.length > 0 && !hasAny(herb.sourcing, f.sourcing)) return false;

  if (f.minEvidence) {
    const threshold = f.minEvidence;
    const ok = (level: EvidenceLevel) => meetsEvidenceThreshold(level, threshold);
    if (f.indications.length > 0) {
      const selected = herb.indications.filter((x) => f.indications.includes(x.indication));
      if (!selected.every((x) => ok(x.evidence.level))) return false;
    } else if (!herb.indications.some((x) => ok(x.evidence.level))) {
      return false;
    }
  }
  return true;
}

const collator = new Intl.Collator('ru');

/** Сравнение названий по русскому алфавиту («ё» рядом с «е»). */
export function compareNames(a: string, b: string): number {
  return collator.compare(a, b);
}

function lowestSelectedRank(herb: Herb, indicationIds: readonly string[]): number {
  const ranks = herb.indications
    .filter((x) => indicationIds.includes(x.indication))
    .map((x) => evidenceRank(x.evidence.level));
  return ranks.length > 0 ? Math.min(...ranks) : -1;
}

/** Спецификация §6.4: с выбранными показаниями — по наименьшему их уровню (по убыванию), затем по названию. */
export function sortHerbs(herbs: readonly Herb[], f: HerbFilter): Herb[] {
  return [...herbs].sort((a, b) => {
    if (f.indications.length > 0) {
      const diff = lowestSelectedRank(b, f.indications) - lowestSelectedRank(a, f.indications);
      if (diff !== 0) return diff;
    }
    return compareNames(a.name, b.name);
  });
}

export function queryHerbs(herbs: readonly Herb[], f: HerbFilter, index: FilterIndex): Herb[] {
  return sortHerbs(
    herbs.filter((h) => matchesFilter(h, f, index)),
    f,
  );
}
