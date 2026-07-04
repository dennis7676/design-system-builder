import type { BrandJson, EdgeName, ExpressionTier, ToneVector } from "./brand-schema.js";
import type { Conflict, Recipe } from "./recipe-selection.js";

export interface EdgeSuggestion {
  readonly edge: EdgeName;
  readonly rationale: string;
  readonly deferred: boolean;
}

interface EdgeMenuEntry {
  readonly edge: EdgeName;
  readonly version: "v1";
  readonly deferred: boolean;
  readonly fits: (context: EdgeContext) => boolean;
  readonly rationale: (context: EdgeContext) => string;
}

interface EdgeContext {
  readonly brand: BrandJson;
  readonly recipe: Recipe;
  readonly tone: ToneVector;
  readonly expression: ExpressionTier;
}

export const TEXTURE_GRAIN_OPACITY_CAP = 0.06;

export const TEXTURE_GRAIN_OVERLAY = {
  version: "texture-grain.v1",
  image:
    'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%27120%27 height=%27120%27 viewBox=%270 0 120 120%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%270.85%27 numOctaves=%272%27 seed=%2717%27 stitchTiles=%27stitch%27/%3E%3CfeColorMatrix type=%27saturate%27 values=%270%27/%3E%3CfeComponentTransfer%3E%3CfeFuncA type=%27table%27 tableValues=%270 0.45%27/%3E%3C/feComponentTransfer%3E%3C/filter%3E%3Crect width=%27120%27 height=%27120%27 filter=%27url(%23n)%27/%3E%3C/svg%3E")',
  blendMode: "multiply",
  opacity: 0.025,
  extremes: {
    dark: "#000000",
    light: "#ffffff",
  },
} as const;

const TEXTURE_RECIPE_FITS = new Set(["retro", "warm-creator", "luxury"]);

export const EDGE_MENU = [
  {
    edge: "texture-grain",
    version: "v1",
    deferred: false,
    fits: textureGrainFits,
    rationale: textureRationale,
  },
  {
    edge: "glass",
    version: "v1",
    deferred: false,
    fits: glassFits,
    rationale: glassRationale,
  },
] as const satisfies readonly EdgeMenuEntry[];

export function suggestEdges(brand: BrandJson, recipe: Recipe): readonly EdgeSuggestion[] {
  const context = edgeContext(brand, recipe);
  return EDGE_MENU
    .filter((entry) => entry.fits(context))
    .map((entry) => ({
      edge: entry.edge,
      rationale: entry.rationale(context),
      deferred: entry.deferred,
    }));
}

export function validateEdgeFitness(brand: BrandJson, recipe: Recipe): readonly Conflict[] {
  const requested = brand.edges ?? [];
  if (requested.length === 0) return [];

  const context = edgeContext(brand, recipe);
  const conflicts: Conflict[] = [];
  for (const edge of requested) {
    const entry = EDGE_MENU.find((item) => item.edge === edge);
    if (entry === undefined || entry.deferred) continue;
    if (!entry.fits(context)) {
      conflicts.push({
        code: "edge-fit-rejected",
        message: `edge '${edge}' does not fit recipe '${recipe.key}' at expression '${context.expression}': ${entry.rationale(context)}`,
      });
    }
  }
  return conflicts;
}

function edgeContext(brand: BrandJson, recipe: Recipe): EdgeContext {
  return {
    brand,
    recipe,
    tone: brand.branding.tone_vector,
    expression: brand.expression ?? "balanced",
  };
}

function textureGrainFits(context: EdgeContext): boolean {
  if (context.recipe.key === "minimal-tech" && context.expression === "safe") return false;
  return TEXTURE_RECIPE_FITS.has(context.recipe.key) || isWarmOrganic(context.tone);
}

function textureRationale(context: EdgeContext): string {
  if (context.recipe.key === "minimal-tech" && context.expression === "safe") {
    return "Texture grain is withheld because minimal-tech at safe tier needs a crisp, low-noise surface.";
  }
  if (TEXTURE_RECIPE_FITS.has(context.recipe.key)) {
    return `Texture grain reinforces the tactile depth expected from the ${context.recipe.key} recipe.`;
  }
  if (isWarmOrganic(context.tone)) {
    return "Texture grain fits because the tone vector reads warm and organic.";
  }
  return "Texture grain needs a retro, warm-creator, luxury, or warm-organic concept.";
}

function glassFits(context: EdgeContext): boolean {
  return context.tone.classic_cutting_edge >= 5 && context.tone.cold_warm <= 3;
}

function glassRationale(context: EdgeContext): string {
  if (glassFits(context)) {
    return "Glass fits because the tone vector is cool and cutting-edge; the contrast gate keeps the backing opacity high enough for unknown backdrops.";
  }
  return "Glass needs a cool, cutting-edge concept (classic_cutting_edge >= 5 and cold_warm <= 3).";
}

function isWarmOrganic(tone: ToneVector): boolean {
  return tone.cold_warm >= 5 && tone.minimal_rich >= 5;
}
