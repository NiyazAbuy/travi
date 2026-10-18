import type { Herb, Recipe, SourceRef } from '../schema';

function uniqueIds(groups: SourceRef[][]): string[] {
  return [...new Set(groups.flat().map((r) => r.id))];
}

/** Источники карточки травы в порядке появления: показания, сбор, применение, безопасность, общие. */
export function herbSourceIds(herb: Herb): string[] {
  return uniqueIds([
    ...herb.indications.map((x) => x.sources),
    ...herb.harvest.map((x) => x.sources),
    ...herb.usage.map((x) => x.sources),
    herb.safety.sources,
    herb.sources,
  ]);
}

export function recipeSourceIds(recipe: Recipe): string[] {
  return uniqueIds([recipe.sources]);
}
