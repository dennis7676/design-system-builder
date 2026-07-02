import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { clampOklchChroma, contrastRatio, isInSrgbGamut, parseColor, parseOklch } from "../src/color.js";
import { generateDemo } from "../src/demo-generator.js";
import { validateBrand, type BrandJson, type BrandOverrides, type ToneVector } from "../src/brand-schema.js";
import { canGenerate } from "../src/gate.js";
import { RECIPE_ORDER, loadRecipes, selectRecipe, type Recipe } from "../src/recipe-selection.js";
import { tokenEntries, tokenMap, resolveValue, contrastResults } from "../src/surface-data.js";
import { buildTokens } from "../src/tokens-builder.js";
import { computeTokenHash, validateTokens } from "../src/validator.js";
import { isGradientValue, type TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE_TEXT = readFileSync(join(here, "sample.tokens.json"), "utf8");
const SAMPLE = JSON.parse(SAMPLE_TEXT) as TokensDocument;
const HUES = [60, 110, 200, 275, 350] as const;
const SAMPLE_TONE = {
  static_dynamic: 2,
  cold_warm: 3,
  serious_playful: 3,
  classic_cutting_edge: 5,
  minimal_rich: 2,
} as const;

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`missing recipe ${key}`);
  return found;
}

function brand(tone: ToneVector, overrides?: BrandOverrides): BrandJson {
  return { schemaVersion: "2026-06-30", product: { name: "Accent", medium: "web" }, branding: { tone_vector: tone }, overrides };
}

function noOverrideDoc(key: string): TokensDocument {
  return buildTokens(brand(recipe(key).toneAnchor), recipe(key));
}

function accentDoc(key: string, hue: number): TokensDocument {
  return buildTokens(brand(recipe(key).toneAnchor, { "visual.accent": hue }), recipe(key));
}

function terminalColor(doc: TokensDocument, path: string): string {
  const value = resolveValue(path, tokenMap(doc));
  if (typeof value !== "string") throw new Error(`expected color at ${path}`);
  return value;
}

function colorStrings(doc: TokensDocument): readonly string[] {
  return tokenEntries(doc).flatMap((entry) => {
    if (entry.leaf.$type === "color" && typeof entry.leaf.$value === "string" && !entry.leaf.$value.startsWith("{")) return [entry.leaf.$value];
    if (entry.leaf.$type === "gradient" && isGradientValue(entry.leaf.$value)) return entry.leaf.$value.stops;
    return [];
  });
}

function chromaticPrimitiveHues(doc: TokensDocument): readonly number[] {
  return tokenEntries(doc)
    .filter((entry) => entry.path.startsWith("primitive.") && entry.leaf.$type === "color")
    .map((entry) => typeof entry.leaf.$value === "string" ? parseOklch(entry.leaf.$value) : null)
    .filter((color): color is NonNullable<typeof color> => color !== null && color.C >= 0.03)
    .map((color) => color.H);
}

function hueDelta(a: number, b: number): number {
  const delta = ((a - b) % 360 + 360) % 360;
  return delta > 180 ? delta - 360 : delta;
}

describe("G-C1 accent absent keeps the no-override anchor byte-identical", () => {
  it("minimal-tech sample JSON and R1 intent hash stay unchanged", () => {
    const doc = buildTokens(brand(SAMPLE_TONE), recipe("minimal-tech"), { generatedAt: "2026-06-30T14:30:00Z" });
    expect(`${JSON.stringify(doc, null, 2)}\n`).toBe(SAMPLE_TEXT);
    expect(computeTokenHash(doc)).toBe(computeTokenHash(SAMPLE));
    expect(doc.meta.colorOverride).toBeUndefined();
  });
});

describe("G-C2 accent hue sweep passes the export gate", () => {
  for (const key of RECIPE_ORDER) {
    for (const hue of HUES) {
      it(`${key} hue ${hue} passes with repaired text contrast`, () => {
        const doc = accentDoc(key, hue);
        const errors = validateTokens(doc).findings.filter((finding) => finding.severity === "error");
        expect(errors).toEqual([]);
        expect(doc.meta.colorOverride?.requestedHue).toBe(hue);
        for (const result of contrastResults(doc).filter((item) => item.pair.role === "text")) {
          expect(result.ratio).toBeGreaterThanOrEqual(4.5);
        }
      });
    }
  }
});

describe("G-C3 accent rotation preserves retro hue relationships", () => {
  it("pairwise chromatic primitive hue deltas stay within half a degree", () => {
    const before = chromaticPrimitiveHues(noOverrideDoc("retro"));
    const after = chromaticPrimitiveHues(accentDoc("retro", 275));
    expect(after.length).toBe(before.length);
    for (let i = 0; i < before.length; i++) {
      for (let j = i + 1; j < before.length; j++) {
        expect(Math.abs(hueDelta(after[i] ?? 0, after[j] ?? 0) - hueDelta(before[i] ?? 0, before[j] ?? 0))).toBeLessThanOrEqual(0.5);
      }
    }
  });
});

describe("G-C4 accent output stays parseable and in sRGB gamut", () => {
  for (const key of RECIPE_ORDER) {
    it(`${key} hue 110 emits only valid color strings`, () => {
      for (const value of colorStrings(accentDoc(key, 110))) {
        expect(parseColor(value)).not.toBeNull();
        const color = parseOklch(value);
        if (color !== null) expect(isInSrgbGamut(color)).toBe(true);
      }
    });
  }
  it("clamps an out-of-gamut yellow without moving L or H", () => {
    const clamped = clampOklchChroma({ L: 0.5, C: 0.4, H: 100 });
    expect(clamped.L).toBe(0.5);
    expect(clamped.H).toBe(100);
    expect(clamped.C).toBeLessThan(0.4);
    expect(isInSrgbGamut(clamped)).toBe(true);
  });
});

describe("G-C5 accent builds are deterministic", () => {
  it("same brand builds byte-identical tokens including colorOverride meta", () => {
    const a = accentDoc("pro-emotive", 350);
    const b = accentDoc("pro-emotive", 350);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

describe("G-C6 accent brand gate accepts hue integers and rejects obsolete axes", () => {
  it("accepts 0 and 359", () => {
    expect(validateBrand(brand(recipe("minimal-tech").toneAnchor, { "visual.accent": 0 }))).toEqual([]);
    expect(validateBrand(brand(recipe("minimal-tech").toneAnchor, { "visual.accent": 359 }))).toEqual([]);
  });
  it.each([-1, 360, "warm", 3.5])("rejects %s", (value) => {
    const b = brand(recipe("minimal-tech").toneAnchor, { "visual.accent": value } as BrandOverrides);
    expect(validateBrand(b).map((error) => error.path)).toContain("overrides.visual.accent");
  });
  it("cold_warm is unknown with an accent hint, while motion.easing stays deferred", () => {
    const cold = brand(recipe("minimal-tech").toneAnchor, { "tone_vector.cold_warm": 7 } as BrandOverrides);
    expect(validateBrand(cold)[0]?.message).toContain("visual.accent");
    expect(selectRecipe(cold, RECIPES).conflicts[0]?.message).toContain("visual.accent");
    const motion = brand(recipe("minimal-tech").toneAnchor, { "motion.easing": "spring" } as BrandOverrides);
    expect(selectRecipe(motion, RECIPES).conflicts.map((conflict) => conflict.code)).toContain("override-deferred");
  });
});

describe("5.2 pro-emotive warm rose scenario", () => {
  it("selects pro-emotive and emits the requested hue family into tokens and demo", () => {
    const b = brand(recipe("pro-emotive").toneAnchor, { "visual.accent": 350 });
    const selection = selectRecipe(b, RECIPES);
    expect(selection.recipeKey).toBe("pro-emotive");
    expect(canGenerate({ brand: b, selection, userConfirmed: true }).ok).toBe(true);
    const doc = buildTokens(b, recipe("pro-emotive"));
    const primary = parseOklch(terminalColor(doc, "semantic.color.primary.default"));
    expect(primary?.H).toBe(350);
    expect(contrastRatio(terminalColor(doc, "semantic.color.primary.foreground"), terminalColor(doc, "semantic.color.primary.default"))).toBeGreaterThanOrEqual(4.5);
    expect(generateDemo(doc)).toContain("350.0");
  });
});

describe("G-C7 — bounded repair path (synthetic marginal recipe)", () => {
  // Current recipes never trip the repair loop (2880-cell hue probe, 2026-07-02),
  // so these synthetic cases keep the safety net itself under test.
  function marginalMinimalTech(L: number): Recipe {
    const clone = structuredClone(recipe("minimal-tech")) as unknown as {
      base: { primitive: { color: { blue: Record<string, { $value: string }> } } };
    };
    clone.base.primitive.color.blue["600"].$value = `oklch(${L} 0.13 255)`;
    return clone as unknown as Recipe;
  }

  it("repairs a marginal pair within the ±0.06 L bound and records provenance", () => {
    const doc = buildTokens(brand(SAMPLE_TONE, { "visual.accent": 110 } as BrandOverrides), marginalMinimalTech(0.58));
    const corrections = doc.meta.colorOverride?.corrections ?? [];
    expect(corrections).toHaveLength(1);
    const c = corrections[0];
    expect(c.path).toBe("primitive.color.blue.600");
    const fromL = Number(/oklch\(([\d.]+)/.exec(c.from)?.[1]);
    const toL = Number(/oklch\(([\d.]+)/.exec(c.to)?.[1]);
    expect(Math.abs(toL - fromL)).toBeLessThanOrEqual(0.06);
    expect(contrastRatio(terminalColor(doc, "semantic.color.primary.foreground"), terminalColor(doc, "semantic.color.primary.default"))).toBeGreaterThanOrEqual(4.5);
  });

  it("fails hard with accent-contrast-unrepairable beyond the bound", () => {
    expect(() => buildTokens(brand(SAMPLE_TONE, { "visual.accent": 110 } as BrandOverrides), marginalMinimalTech(0.66)))
      .toThrowError(/accent-contrast-unrepairable/);
  });
});
