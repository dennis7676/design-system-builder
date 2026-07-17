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
import { TONE_AXES, type BrandJson, type ToneVector } from "./brand-schema.js";
import { validateEdgeFitness } from "./edge-point.js";
import { validateMotifFitness } from "./motif.js";

/** Stable load + tie-break order. B1 (d8): +4 structural recipes (7-family ceiling).
 *  d10: +medical-clinical (industry-seed promotion — teal clinical tone gap). */
export const RECIPE_ORDER = [
  "minimal-tech",
  "enterprise",
  "expressive",
  "pro-emotive",
  "creative-multiscale",
  "warm-creator",
  "luxury",
  "retro",
  "medical-clinical",
] as const;

export type RecipeKey = (typeof RECIPE_ORDER)[number];

/** Empty while all recognized override axes are implemented. */
export const DEFERRED_OVERRIDES = [] as const;

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
  readonly skeleton?: "standard" | "editorial" | "spec-sheet" | "briefing" | "collage" | "mosaic" | "poster" | "journal" | "story";
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

export interface RecipeCandidateRow {
  readonly key: string;
  readonly distance: number;
  readonly hardConstraintFailures: readonly string[];
  readonly selected: boolean;
  readonly selectedBy: "nearest" | "override" | null;
}

export interface RecipeSelection {
  readonly recipeKey: string | null;
  readonly recipe: Recipe | null;
  readonly candidates: readonly string[];
  readonly distances: ReadonlyArray<{ key: string; distance: number }>;
  readonly candidateRows: readonly RecipeCandidateRow[];
  readonly conflicts: readonly Conflict[];
}

export class RecipeSelectionError extends Error {
  constructor(readonly conflict: Conflict) {
    super(conflict.message);
    this.name = "RecipeSelectionError";
  }
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

function hardConstraintFailures(recipe: Recipe, brand: BrandJson): readonly string[] {
  const failures: string[] = [];
  const rules = recipe.hardConstraintRules;
  if (!rules.requires.mediums.includes(brand.product.medium)) failures.push(`medium:${brand.product.medium}`);
  for (const aud of brand.audience ?? []) {
    if (rules.excludesAudiences.includes(aud)) failures.push(`audience:${aud}`);
  }
  if (brand.accessibility?.minContrast === "AAA" && !rules.minContrastCapable) failures.push("minContrast:AAA");
  for (const c of brand.constraints ?? []) {
    if (!rules.tags.includes(c)) failures.push(c);
  }
  return failures;
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
 * Distance ties break deterministically by recipe key.
 */
export function selectRecipe(brand: BrandJson, recipes: readonly Recipe[]): RecipeSelection {
  const ranked = recipes
    .map((recipe) => ({
      recipe,
      key: recipe.key,
      distance: toneDistance(brand.branding.tone_vector, recipe.toneAnchor),
      hardConstraintFailures: hardConstraintFailures(recipe, brand),
    }))
    .sort(compareCandidate);
  const survivors = ranked.filter((candidate) => candidate.hardConstraintFailures.length === 0);
  const overrideKey = brand.branding.recipe_override;
  const selectedBy = overrideKey === undefined ? "nearest" : "override";

  if (overrideKey !== undefined) {
    const override = ranked.find((candidate) => candidate.key === overrideKey);
    if (override === undefined) {
      throw new RecipeSelectionError({
        code: "recipe-override-unknown",
        message: `recipe_override '${overrideKey}' is unknown (valid: ${recipes.map((recipe) => recipe.key).sort().join(", ")})`,
      });
    }
    if (override.hardConstraintFailures.length > 0) {
      throw new RecipeSelectionError({
        code: "recipe-override-rejected",
        message: `recipe_override '${overrideKey}' rejected by hard constraints: ${override.hardConstraintFailures.join(", ")}`,
      });
    }
  }

  const chosenCandidate = overrideKey === undefined ? survivors[0] : survivors.find((candidate) => candidate.key === overrideKey);
  const distances = survivors.map((candidate) => ({
    key: candidate.key,
    distance: candidate.distance,
  }));
  const candidateRows = rowsForCandidateTable(ranked, chosenCandidate?.key ?? null, selectedBy);

  if (survivors.length === 0) {
    return {
      recipeKey: null,
      recipe: null,
      candidates: [],
      distances: [],
      candidateRows,
      conflicts: [
        {
          code: "no-recipe-satisfies-hard-constraints",
          message: `no recipe matches medium=${brand.product.medium}, constraints=[${(brand.constraints ?? []).join(", ")}]`,
        },
      ],
    };
  }

  if (chosenCandidate === undefined) {
    return {
      recipeKey: null,
      recipe: null,
      candidates: survivors.map((candidate) => candidate.key),
      distances,
      candidateRows,
      conflicts: [
        {
          code: "recipe-override-unresolved",
          message: `recipe_override '${String(overrideKey)}' did not resolve to a selectable recipe`,
        },
      ],
    };
  }

  const chosen = chosenCandidate.recipe;
  const conflicts: Conflict[] = [];
  if (chosen.base === null) {
    conflicts.push({
      code: "recipe-deferred",
      message: `selected recipe '${chosen.key}' is a deferred stub (no base token tree); pick another medium/tone or author its base`,
    });
  }
  conflicts.push(...validateOverrides(brand));
  conflicts.push(...validateEdgeFitness(brand, chosen));
  conflicts.push(...validateMotifFitness(brand, chosen));

  return {
    recipeKey: chosen.key,
    recipe: chosen,
    candidates: survivors.map((candidate) => candidate.key),
    distances,
    candidateRows,
    conflicts,
  };
}

function compareCandidate(
  a: { readonly key: string; readonly distance: number },
  b: { readonly key: string; readonly distance: number },
): number {
  if (a.distance !== b.distance) return a.distance - b.distance;
  return a.key.localeCompare(b.key);
}

function rowsForCandidateTable(
  ranked: ReadonlyArray<{
    readonly key: string;
    readonly distance: number;
    readonly hardConstraintFailures: readonly string[];
  }>,
  selectedKey: string | null,
  selectedBy: "nearest" | "override",
): readonly RecipeCandidateRow[] {
  const passing = ranked.filter((candidate) => candidate.hardConstraintFailures.length === 0);
  const rows: RecipeCandidateRow[] = [];
  for (const candidate of passing.slice(0, 3)) rows.push(rowFromCandidate(candidate, selectedKey, selectedBy));

  if (selectedKey !== null && !rows.some((row) => row.key === selectedKey)) {
    const selected = passing.find((candidate) => candidate.key === selectedKey);
    if (selected !== undefined) rows.push(rowFromCandidate(selected, selectedKey, selectedBy));
  }

  const filtered = ranked.find((candidate) => candidate.hardConstraintFailures.length > 0);
  if (filtered !== undefined) rows.push(rowFromCandidate(filtered, selectedKey, selectedBy));
  return rows;
}

function rowFromCandidate(
  candidate: {
    readonly key: string;
    readonly distance: number;
    readonly hardConstraintFailures: readonly string[];
  },
  selectedKey: string | null,
  selectedBy: "nearest" | "override",
): RecipeCandidateRow {
  const selected = candidate.key === selectedKey;
  return {
    key: candidate.key,
    distance: candidate.distance,
    hardConstraintFailures: candidate.hardConstraintFailures,
    selected,
    selectedBy: selected ? selectedBy : null,
  };
}

export function formatRecipeCandidateTable(selection: RecipeSelection): string {
  const lines = ["recipe candidates (tone distance, hard constraints):"];
  for (let index = 0; index < selection.candidateRows.length; index++) {
    const row = selection.candidateRows[index];
    if (row === undefined) continue;
    const status = row.hardConstraintFailures.length === 0
      ? "OK"
      : `filtered: ${row.hardConstraintFailures.join(", ")}`;
    const marker = row.selected
      ? `  ← selected${row.selectedBy === "override" ? " (override)" : ""}`
      : "";
    lines.push(`  ${index + 1}. ${row.key.padEnd(20)} d=${row.distance.toFixed(3)}  ${status}${marker}`);
  }
  return lines.join("\n");
}

/** Override-axis validation: ≤3 axes, none deferred. Range was checked in validateBrand. */
export function validateOverrides(brand: BrandJson): Conflict[] {
  const conflicts: Conflict[] = [];
  const overrides = brand.overrides ?? {};
  const axes = Object.keys(overrides);
  if (axes.length > 3) {
    conflicts.push({
      code: "too-many-overrides",
      message: `${axes.length} override axes; constrained override allows at most 3`,
    });
  }
  for (const axis of axes) {
    if (axis === "tone_vector.cold_warm") {
      conflicts.push({
        code: "override-unknown",
        message: "override axis 'tone_vector.cold_warm' is subsumed; use 'visual.accent' hue 0..359 instead",
      });
      continue;
    }
    if ((DEFERRED_OVERRIDES as readonly string[]).includes(axis)) {
      conflicts.push({
        code: "override-deferred",
        message: `override axis '${axis}' is recognized but deferred in this pilot`,
      });
    }
  }
  return conflicts;
}
