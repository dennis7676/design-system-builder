/**
 * brand.json — interview output, the upstream input to recipe selection.
 *
 * tone_vector uses the canonical 5-axis, 1..7 integer scale (brand.json is the
 * authority for axis names and scale; tokens.json meta.toneVector is a
 * normalized -1..1 echo derived by the builder).
 */

// Axis labels (1..7): each pole is documented for interview scripts. `cold_warm`
// is the colour-temperature (warm-cool) axis, mapping to the Warm-Cool dimension
// of the I.R.I / Kobayashi colour-image scales; the key name is kept stable
// (label clarified only — see design d7 Round A).
export const TONE_AXES = [
  "static_dynamic",     // static (1) .. dynamic (7)
  "cold_warm",          // colour temperature: cool (1) .. warm (7)
  "serious_playful",    // serious (1) .. playful (7)
  "classic_cutting_edge", // classic (1) .. cutting-edge (7)
  "minimal_rich",       // minimal (1) .. rich (7)
] as const;

export type ToneAxis = (typeof TONE_AXES)[number];

/** 1..7 integer per axis. */
export type ToneVector = Record<ToneAxis, number>;

export type Medium = "web" | "app" | "video";

/**
 * Shared expression dial (settled ↔ daring). A finite enum chosen in
 * brand.json — it scales layout amplitude on applied surfaces and never
 * mutates token values, so contrast pairs hold identically at every tier.
 * Absent ⇒ "balanced" (the pre-tier layout, byte-identical).
 */
export const EXPRESSION_TIERS = ["safe", "balanced", "bold"] as const;

export type ExpressionTier = (typeof EXPRESSION_TIERS)[number];

/**
 * Bounded, contrast-safe pilot overrides. Each maps to a scalar mutation on
 * existing intent tokens, so it can never break a WCAG pair the recipe already
 * satisfies.
 *
 * Deferred (need contrast re-derivation or a new token type — out of pilot
 * scope, see recipe-selection DEFERRED_OVERRIDES): visual.accent,
 * tone_vector.cold_warm (hue shifts → contrast), motion.easing (easing-curve
 * token does not exist in the base tree yet).
 */
export const OVERRIDE_RANGES = {
  "visual.radius": ["tighter", "looser"],
  "motion.speed": ["snappier", "calmer"],
} as const;

export type OverrideAxis = keyof typeof OVERRIDE_RANGES;

export type BrandOverrides = {
  [K in OverrideAxis]?: (typeof OVERRIDE_RANGES)[K][number];
};

/** Pilot locale set. Only "ko" is recognized; others are validation errors. */
export const KNOWN_LOCALES = ["ko"] as const;

export interface BrandProduct {
  readonly name: string;
  readonly medium: Medium;
  /** Target content locales. Absent/[] ⇒ Latin-only (pre-locale behavior). */
  readonly locales?: readonly string[];
}

export interface BrandBranding {
  readonly tone_vector: ToneVector;
  /** Override guide only — never the recipe decider. */
  readonly archetype?: string;
  /** Override guide only — never the recipe decider. */
  readonly references?: readonly string[];
}

export interface BrandJson {
  readonly schemaVersion: string;
  readonly product: BrandProduct;
  /** Hard-constraint inputs. */
  readonly audience?: readonly string[];
  readonly accessibility?: { readonly minContrast?: "AA" | "AAA" };
  /** Free-form hard-constraint tags the brand requires of a recipe. */
  readonly constraints?: readonly string[];
  readonly branding: BrandBranding;
  /** Explicit overrides; ≤3 axes, each value within OVERRIDE_RANGES. */
  readonly overrides?: BrandOverrides;
  /** Expression dial for applied-surface layout amplitude. Absent ⇒ "balanced". */
  readonly expression?: ExpressionTier;
}

export interface BrandFieldError {
  readonly path: string;
  readonly message: string;
}

function isInt1to7(v: unknown): boolean {
  return typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 7;
}

/**
 * Required-field + range validation (one of the gate's machine conditions).
 * Returns [] when brand.json is structurally complete and in-range.
 */
export function validateBrand(brand: unknown): BrandFieldError[] {
  const errors: BrandFieldError[] = [];
  const b = brand as Partial<BrandJson> | null | undefined;
  if (b === null || typeof b !== "object") {
    return [{ path: "(root)", message: "brand must be an object" }];
  }
  if (typeof b.schemaVersion !== "string" || b.schemaVersion === "") {
    errors.push({ path: "schemaVersion", message: "required string" });
  }
  if (b.product === undefined || typeof b.product !== "object") {
    errors.push({ path: "product", message: "required object" });
  } else {
    if (typeof b.product.name !== "string" || b.product.name === "") {
      errors.push({ path: "product.name", message: "required string" });
    }
    if (b.product.medium !== "web" && b.product.medium !== "app" && b.product.medium !== "video") {
      errors.push({ path: "product.medium", message: "must be web|app|video" });
    }
    if (b.product.locales !== undefined) {
      if (!Array.isArray(b.product.locales)) {
        errors.push({ path: "product.locales", message: "must be a string array" });
      } else {
        for (const loc of b.product.locales) {
          if (!(KNOWN_LOCALES as readonly string[]).includes(loc as string)) {
            errors.push({ path: "product.locales", message: `unknown locale '${String(loc)}' (known: ${KNOWN_LOCALES.join(", ")})` });
          }
        }
      }
    }
  }
  if (b.branding === undefined || typeof b.branding !== "object") {
    errors.push({ path: "branding", message: "required object" });
  } else {
    const tv = b.branding.tone_vector as Record<string, unknown> | undefined;
    if (tv === undefined || typeof tv !== "object") {
      errors.push({ path: "branding.tone_vector", message: "required object" });
    } else {
      for (const axis of TONE_AXES) {
        if (!isInt1to7(tv[axis])) {
          errors.push({ path: `branding.tone_vector.${axis}`, message: "integer 1..7 required" });
        }
      }
    }
  }
  if (b.expression !== undefined && !EXPRESSION_TIERS.includes(b.expression as ExpressionTier)) {
    errors.push({ path: "expression", message: `must be one of ${EXPRESSION_TIERS.join("|")}` });
  }
  if (b.overrides !== undefined) {
    const ov = b.overrides as Record<string, unknown>;
    for (const [axis, value] of Object.entries(ov)) {
      if (!(axis in OVERRIDE_RANGES)) {
        errors.push({ path: `overrides.${axis}`, message: "unknown override axis" });
        continue;
      }
      const allowed = OVERRIDE_RANGES[axis as OverrideAxis] as readonly string[];
      if (!allowed.includes(value as string)) {
        errors.push({ path: `overrides.${axis}`, message: `must be one of ${allowed.join("|")}` });
      }
    }
  }
  return errors;
}

export function normalizeToneVector(tv: ToneVector): Record<ToneAxis, number> {
  const out = {} as Record<ToneAxis, number>;
  for (const axis of TONE_AXES) {
    // 1..7 → -1..1, midpoint 4 → 0
    out[axis] = Math.round(((tv[axis] - 4) / 3) * 1000) / 1000;
  }
  return out;
}
