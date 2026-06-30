/**
 * buildTokens(brand, recipe) → TokensDocument.
 *
 * Clones the recipe's intent base, applies bounded contrast-safe overrides
 * (scalar mutations on existing dimension/duration tokens — never touches color,
 * so a WCAG pair the recipe satisfies stays satisfied), and fills meta from the
 * brand. With no overrides, build(recipe).intent === recipe.base verbatim, so
 * the intent tokenHash is reproducible.
 */

import type { BrandJson, BrandOverrides } from "./brand-schema.js";
import { normalizeToneVector } from "./brand-schema.js";
import type { Recipe } from "./recipe-selection.js";
import type { Philosophy, TokensDocument } from "./tokens-schema.js";

export class BuildError extends Error {}

const RADIUS_FACTOR = { tighter: 0.5, looser: 1.5 } as const;
const SPEED_FACTOR = { snappier: 0.75, calmer: 1.5 } as const;

export interface BuildOptions {
  /** Deterministic by default so golden output is stable; CLI may pass real time. */
  readonly generatedAt?: string;
}

const SCHEMA_VERSION = "2026-06-30";

export function buildTokens(brand: BrandJson, recipe: Recipe, opts: BuildOptions = {}): TokensDocument {
  if (recipe.base === null || recipe.philosophy === null) {
    throw new BuildError(
      `recipe '${recipe.key}' is a deferred stub with no base token tree; cannot build`,
    );
  }
  const base = structuredClone(recipe.base) as {
    transformContract: TokensDocument["transformContract"];
    contrastPairs: TokensDocument["contrastPairs"];
    primitive: TokensDocument["primitive"];
    semantic: TokensDocument["semantic"];
    component: TokensDocument["component"];
  };

  applyOverrides(base, brand.overrides ?? {});

  const doc: TokensDocument = {
    version: "1.0.0",
    schemaVersion: SCHEMA_VERSION,
    meta: {
      generatedAt: opts.generatedAt ?? "1970-01-01T00:00:00Z",
      recipe: recipe.key,
      toneVector: normalizeToneVector(brand.branding.tone_vector),
      requiredTargets: targetsFor(brand),
      philosophy: recipe.philosophy as Philosophy,
    },
    transformContract: base.transformContract,
    contrastPairs: base.contrastPairs,
    primitive: base.primitive,
    semantic: base.semantic,
    component: base.component,
  };
  return doc;
}

function targetsFor(brand: BrandJson): string[] {
  // Pilot: medium maps 1:1 to a single web target. Video/app expand in M4/later.
  return brand.product.medium === "web" ? ["web"] : [brand.product.medium];
}

function applyOverrides(base: { primitive: Record<string, unknown> }, overrides: BrandOverrides): void {
  if (overrides["visual.radius"] !== undefined) {
    scaleDimensionGroup(base.primitive, "radius", RADIUS_FACTOR[overrides["visual.radius"]]);
  }
  if (overrides["motion.speed"] !== undefined) {
    scaleDimensionGroup(base.primitive, "duration", SPEED_FACTOR[overrides["motion.speed"]]);
  }
}

interface DimensionLeaf {
  $value: { value: number; unit: string };
}

function scaleDimensionGroup(primitive: Record<string, unknown>, group: string, factor: number): void {
  const node = primitive[group];
  if (node === undefined || node === null || typeof node !== "object") return;
  for (const leaf of Object.values(node as Record<string, unknown>)) {
    const l = leaf as Partial<DimensionLeaf>;
    if (l.$value !== undefined && typeof l.$value === "object" && typeof l.$value.value === "number") {
      l.$value.value = round4(l.$value.value * factor);
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
