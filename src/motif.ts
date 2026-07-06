import { MOTIF_NAMES, type BrandJson, type ExpressionTier, type MotifName, type ToneVector } from "./brand-schema.js";
import { htmlEscape } from "./render-utils.js";
import type { Recipe, Conflict } from "./recipe-selection.js";
import type { TokensDocument } from "./tokens-schema.js";

export interface MotifSuggestion {
  readonly motif: MotifName;
  readonly rationale: string;
}

interface MotifMenuEntry {
  readonly motif: MotifName;
  readonly version: "v1";
  readonly fits: (context: MotifContext) => boolean;
  readonly rationale: (context: MotifContext) => string;
}

interface MotifContext {
  readonly brand: BrandJson;
  readonly recipe: Recipe;
  readonly tone: ToneVector;
  readonly expression: ExpressionTier;
}

export const MOTIF_GEOMETRIC_SVG = {
  version: "geometric.v1",
  markup:
    '<svg class="motif-geometric" data-motif-kind="geometric" data-motif-geometric-version="geometric.v1" viewBox="0 0 120 120" role="presentation" focusable="false" xmlns="http://www.w3.org/2000/svg"><circle cx="36" cy="36" r="22" fill="currentColor"/><rect x="58" y="28" width="40" height="48" rx="4" fill="none" stroke="currentColor" stroke-width="8"/><path d="M28 96 L96 28" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>',
} as const;

export const MOTIF_RULE_LINES_CSS = {
  version: "rule-lines.v1",
  background:
    "repeating-linear-gradient(0deg, var(--semantic-motif-ink) 0 1px, transparent 1px calc(var(--semantic-motif-scale) / 7))",
} as const;

const GEOMETRIC_RECIPE_FITS = new Set(["minimal-tech", "expressive", "creative-multiscale"]);
const RULE_LINES_RECIPE_FITS = new Set(["luxury", "enterprise", "retro"]);

export const MOTIF_MENU = [
  {
    motif: "glyph",
    version: "v1",
    fits: glyphFits,
    rationale: glyphRationale,
  },
  {
    motif: "geometric",
    version: "v1",
    fits: geometricFits,
    rationale: geometricRationale,
  },
  {
    motif: "rule-lines",
    version: "v1",
    fits: ruleLinesFits,
    rationale: ruleLinesRationale,
  },
  {
    motif: "none",
    version: "v1",
    fits: noneFits,
    rationale: noneRationale,
  },
] as const satisfies readonly MotifMenuEntry[];

export function suggestMotifs(brand: BrandJson, recipe: Recipe): readonly MotifSuggestion[] {
  const context = motifContext(brand, recipe);
  return MOTIF_MENU
    .filter((entry) => entry.fits(context))
    .map((entry) => ({
      motif: entry.motif,
      rationale: entry.rationale(context),
    }));
}

export function validateMotifFitness(brand: BrandJson, recipe: Recipe): readonly Conflict[] {
  const requested = brand.motif;
  if (requested === undefined) return [];

  const context = motifContext(brand, recipe);
  const entry = MOTIF_MENU.find((item) => item.motif === requested);
  if (entry === undefined || entry.fits(context)) return [];
  return [
    {
      code: "motif-fit-rejected",
      message: `motif '${requested}' does not fit recipe '${recipe.key}' at expression '${context.expression}': ${entry.rationale(context)}`,
    },
  ];
}

export interface MotifSlotCssOptions {
  readonly selector: string;
  readonly min: number;
  readonly viewport: string;
  readonly max: number;
}

export function motifKindFromTokens(doc: TokensDocument): MotifName | null {
  const semantic = doc.semantic as Record<string, unknown>;
  const motif = semantic.motif;
  if (!isRecord(motif)) return null;
  const kind = motif.kind;
  if (!isRecord(kind)) return null;
  const value = kind.$value;
  return typeof value === "string" && (MOTIF_NAMES as readonly string[]).includes(value)
    ? value as MotifName
    : null;
}

export function renderMotifSlot(doc: TokensDocument, brand: string): string | null {
  const kind = motifKindFromTokens(doc);
  if (kind === null) return null;
  if (kind === "none") return "";
  if (kind === "geometric") return MOTIF_GEOMETRIC_SVG.markup;
  if (kind === "rule-lines") return '<span class="motif-rule-lines" data-motif-kind="rule-lines"></span>';

  const glyph = htmlEscape((brand[0] ?? "A").toUpperCase());
  return `<span class="glyph" data-motif-kind="glyph">${glyph}</span>`;
}

export function motifSlotCss(options: MotifSlotCssOptions): string {
  const scale = motifScaleClamp(options);
  return `
    /* motif:start */
    ${options.selector} .glyph { font: var(--semantic-typography-display-weight) ${scale}/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); color: var(--semantic-motif-ink); }
    ${options.selector} .motif-geometric { display: block; inline-size: ${scale}; block-size: ${scale}; color: var(--semantic-motif-ink); }
    ${options.selector} .motif-rule-lines { display: block; inline-size: 100%; block-size: 100%; min-block-size: ${scale}; background: ${MOTIF_RULE_LINES_CSS.background}; }
    /* motif:end */`;
}

function motifContext(brand: BrandJson, recipe: Recipe): MotifContext {
  return {
    brand,
    recipe,
    tone: brand.branding.tone_vector,
    expression: brand.expression ?? "balanced",
  };
}

function glyphFits(_context: MotifContext): boolean {
  return true;
}

function glyphRationale(_context: MotifContext): string {
  return "Glyph fits because it preserves the current first-letter signature element.";
}

function geometricFits(context: MotifContext): boolean {
  return (
    GEOMETRIC_RECIPE_FITS.has(context.recipe.key) ||
    context.tone.classic_cutting_edge >= 5 ||
    context.tone.static_dynamic >= 5
  );
}

function geometricRationale(context: MotifContext): string {
  if (GEOMETRIC_RECIPE_FITS.has(context.recipe.key)) {
    return `Geometric fits because the ${context.recipe.key} recipe supports a constructed signature mark.`;
  }
  if (context.tone.classic_cutting_edge >= 5) {
    return "Geometric fits because the tone vector reads cutting-edge.";
  }
  if (context.tone.static_dynamic >= 5) {
    return "Geometric fits because the tone vector reads dynamic.";
  }
  return "Geometric needs minimal-tech, expressive, creative-multiscale, cutting-edge, or dynamic input.";
}

function ruleLinesFits(context: MotifContext): boolean {
  return (
    RULE_LINES_RECIPE_FITS.has(context.recipe.key) ||
    (context.tone.classic_cutting_edge <= 3 && context.tone.serious_playful <= 4)
  );
}

function ruleLinesRationale(context: MotifContext): string {
  if (RULE_LINES_RECIPE_FITS.has(context.recipe.key)) {
    return `Rule-lines fits because the ${context.recipe.key} recipe supports a composed editorial signature.`;
  }
  if (context.tone.classic_cutting_edge <= 3 && context.tone.serious_playful <= 4) {
    return "Rule-lines fits because the tone vector reads classic and composed.";
  }
  return "Rule-lines needs luxury, enterprise, retro, or a classic and composed tone.";
}

function noneFits(_context: MotifContext): boolean {
  return true;
}

function noneRationale(_context: MotifContext): string {
  return "None fits because opting out of a signature element is always safe.";
}

function motifScaleClamp(options: MotifSlotCssOptions): string {
  return `clamp(calc(var(--semantic-motif-scale) * ${formatMultiplier(options.min)}), ${options.viewport}, calc(var(--semantic-motif-scale) * ${formatMultiplier(options.max)}))`;
}

function formatMultiplier(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
