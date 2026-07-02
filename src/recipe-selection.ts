/**
 * Recipe selection — 3-tier priority (design SSOT = references/recipes/*.json):
 *   1. hard constraints (medium / audience / accessibility / constraints) filter candidates
 *   2. tone_vector 5-axis euclidean distance picks the base among survivors
 *   3. archetype / references = override guide only (NOT a decider here)
 *
 * Selection RULES live in the recipe data files (hardConstraintRules, toneAnchor);
 * this module only reads them. Distance ties break by declared RECIPE_ORDER.
 */

import { readFileSync, readdirSync } from "node:fs";
import { TONE_AXES, type BrandJson, type ToneVector, type OverrideAxis } from "./brand-schema.js";

/** Stable load + tie-break order. B1 (d8): +4 structural recipes (7-family ceiling). */
export const RECIPE_ORDER = [
  "minimal-tech",
  "enterprise",
  "expressive",
  "pro-emotive",
  "creative-multiscale",
  "warm-creator",
  "luxury",
  "retro",
] as const;

/** Override axes recognized but intentionally not implemented in the pilot. */
export const DEFERRED_OVERRIDES = [
  "visual.accent",
  "tone_vector.cold_warm",
  "motion.easing",
] as const;

export interface HardConstraintRules {
  readonly requires: { readonly mediums: readonly string[] };
  readonly excludesAudiences: readonly string[];
  readonly minContrastCapable: boolean;
  readonly tags: readonly string[];
}

/** Per-locale font families spliced by the builder (lives OUTSIDE base —
 * never part of the intent hash; non-localized builds ignore it entirely). */
export interface RecipeLocaleFonts {
  readonly append: Readonly<Record<string, readonly string[]>>;
}

export interface Recipe {
  readonly key: string;
  readonly version: string;
  readonly source: string;
  readonly status?: string;
  readonly typeScale?: { readonly ratio?: number };
  readonly toneAnchor: ToneVector;
  readonly hardConstraintRules: HardConstraintRules;
  readonly philosophy: unknown | null;
  readonly base: Record<string, unknown> | null;
  readonly locales?: Readonly<Record<string, RecipeLocaleFonts>>;
}

export interface Conflict {
  readonly code: string;
  readonly message: string;
}

export interface RecipeSelection {
  readonly recipeKey: string | null;
  readonly recipe: Recipe | null;
  readonly candidates: readonly string[];
  readonly distances: ReadonlyArray<{ key: string; distance: number }>;
  readonly conflicts: readonly Conflict[];
}

/** Load all recipes from a directory, ordered by RECIPE_ORDER (unknown keys appended, sorted). */
export function loadRecipes(dir: string): Recipe[] {
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const byKey = new Map<string, Recipe>();
  for (const f of files) {
    const r = JSON.parse(readFileSync(`${dir}/${f}`, "utf8")) as Recipe;
    byKey.set(r.key, r);
  }
  const ordered: Recipe[] = [];
  for (const key of RECIPE_ORDER) {
    const r = byKey.get(key);
    if (r !== undefined) {
      ordered.push(r);
      byKey.delete(key);
    }
  }
  for (const key of [...byKey.keys()].sort()) {
    ordered.push(byKey.get(key)!);
  }
  return ordered;
}

function passesHardConstraints(recipe: Recipe, brand: BrandJson): boolean {
  const rules = recipe.hardConstraintRules;
  if (!rules.requires.mediums.includes(brand.product.medium)) return false;
  for (const aud of brand.audience ?? []) {
    if (rules.excludesAudiences.includes(aud)) return false;
  }
  if (brand.accessibility?.minContrast === "AAA" && !rules.minContrastCapable) return false;
  for (const c of brand.constraints ?? []) {
    if (!rules.tags.includes(c)) return false;
  }
  return true;
}

export function toneDistance(a: ToneVector, b: ToneVector): number {
  let sum = 0;
  for (const axis of TONE_AXES) {
    const d = a[axis] - b[axis];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/**
 * Pure selection over a pre-loaded, pre-ordered recipe list.
 * `recipes` must already be in stable order (loadRecipes guarantees this) so
 * distance ties break deterministically by position.
 */
export function selectRecipe(brand: BrandJson, recipes: readonly Recipe[]): RecipeSelection {
  const survivors = recipes.filter((r) => passesHardConstraints(r, brand));
  const distances = survivors.map((r) => ({
    key: r.key,
    distance: toneDistance(brand.branding.tone_vector, r.toneAnchor),
  }));

  if (survivors.length === 0) {
    return {
      recipeKey: null,
      recipe: null,
      candidates: [],
      distances: [],
      conflicts: [
        {
          code: "no-recipe-satisfies-hard-constraints",
          message: `no recipe matches medium=${brand.product.medium}, constraints=[${(brand.constraints ?? []).join(", ")}]`,
        },
      ],
    };
  }

  // min distance; first survivor wins ties (survivors keep recipes[] order)
  let bestIdx = 0;
  for (let i = 1; i < distances.length; i++) {
    if (distances[i]!.distance < distances[bestIdx]!.distance) bestIdx = i;
  }
  const chosen = survivors[bestIdx]!;
  const conflicts: Conflict[] = [];
  if (chosen.base === null) {
    conflicts.push({
      code: "recipe-deferred",
      message: `selected recipe '${chosen.key}' is a deferred stub (no base token tree); pick another medium/tone or author its base`,
    });
  }
  conflicts.push(...validateOverrides(brand));

  return {
    recipeKey: chosen.key,
    recipe: chosen,
    candidates: survivors.map((r) => r.key),
    distances,
    conflicts,
  };
}

/** Override-axis validation: ≤3 axes, none deferred. Range was checked in validateBrand. */
export function validateOverrides(brand: BrandJson): Conflict[] {
  const conflicts: Conflict[] = [];
  const overrides = brand.overrides ?? {};
  const axes = Object.keys(overrides) as OverrideAxis[];
  if (axes.length > 3) {
    conflicts.push({
      code: "too-many-overrides",
      message: `${axes.length} override axes; constrained override allows at most 3`,
    });
  }
  for (const axis of axes) {
    if ((DEFERRED_OVERRIDES as readonly string[]).includes(axis)) {
      conflicts.push({
        code: "override-deferred",
        message: `override axis '${axis}' is recognized but deferred in this pilot`,
      });
    }
  }
  return conflicts;
}
