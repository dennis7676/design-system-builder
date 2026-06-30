/**
 * Golden fixtures — brand.json → recipe selection → tokens build (Step 1).
 *
 * R1 is the keystone (advisor #1): build("minimal-tech", no overrides) must
 * reproduce the hand-authored sample's intent hash, so the new builder is tied
 * to the existing 20-fixture safety net instead of forking a second definition.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateTokens, computeTokenHash } from "../src/validator.js";
import { loadRecipes, selectRecipe, toneDistance, type Recipe } from "../src/recipe-selection.js";
import { buildTokens, BuildError } from "../src/tokens-builder.js";
import { validateBrand, normalizeToneVector } from "../src/brand-schema.js";
import { canGenerate } from "../src/gate.js";
import type { BrandJson, ToneVector } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE = JSON.parse(
  readFileSync(join(here, "sample.tokens.json"), "utf8"),
) as TokensDocument;
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

const TONE = (o: Partial<ToneVector> = {}): ToneVector => ({
  static_dynamic: 4,
  cold_warm: 4,
  serious_playful: 4,
  classic_cutting_edge: 4,
  minimal_rich: 4,
  ...o,
});

const brand = (o: Partial<BrandJson> & { tone?: Partial<ToneVector> } = {}): BrandJson => ({
  schemaVersion: "2026-06-30",
  product: { name: "Acme", medium: "web" },
  branding: { tone_vector: TONE(o.tone) },
  ...o,
});

describe("R1 — minimal-tech reproduces the sample intent hash (no fork)", () => {
  it("build(minimal-tech, no overrides) intent hash === sample", () => {
    const b = brand({ tone: { static_dynamic: 2, cold_warm: 3, serious_playful: 3, classic_cutting_edge: 5, minimal_rich: 2 } });
    const built = buildTokens(b, recipe("minimal-tech"));
    expect(computeTokenHash(built)).toBe(computeTokenHash(SAMPLE));
  });
  it("meta differences (generatedAt/toneVector) do not affect the hash", () => {
    const a = buildTokens(brand(), recipe("minimal-tech"), { generatedAt: "2020-01-01T00:00:00Z" });
    const b = buildTokens(brand({ tone: { minimal_rich: 7 } }), recipe("minimal-tech"), { generatedAt: "2021-01-01T00:00:00Z" });
    expect(computeTokenHash(a)).toBe(computeTokenHash(b));
  });
});

describe("R2 — built docs pass the validator", () => {
  for (const key of ["minimal-tech", "enterprise"]) {
    it(`${key} build passes export gate (0 errors)`, () => {
      const built = buildTokens(brand(), recipe(key));
      const errs = validateTokens(built).findings.filter((f) => f.severity === "error");
      expect(errs).toEqual([]);
    });
  }
});

describe("R3 — tone distance picks the nearest survivor", () => {
  it("brand at enterprise anchor selects enterprise", () => {
    const b = brand({ tone: { static_dynamic: 3, cold_warm: 4, serious_playful: 2, classic_cutting_edge: 2, minimal_rich: 4 } });
    expect(selectRecipe(b, RECIPES).recipeKey).toBe("enterprise");
  });
  it("brand at minimal-tech anchor selects minimal-tech", () => {
    const b = brand({ tone: { static_dynamic: 2, cold_warm: 3, serious_playful: 3, classic_cutting_edge: 5, minimal_rich: 2 } });
    expect(selectRecipe(b, RECIPES).recipeKey).toBe("minimal-tech");
  });
});

describe("R4 — hard constraints filter candidates", () => {
  it("constraint 'dense-data' leaves only enterprise as candidate", () => {
    const b = brand({ constraints: ["dense-data"] });
    const sel = selectRecipe(b, RECIPES);
    expect(sel.candidates).toEqual(["enterprise"]);
    expect(sel.recipeKey).toBe("enterprise");
  });
  it("unsatisfiable constraint yields no candidate + conflict", () => {
    const b = brand({ constraints: ["nonexistent-tag"] });
    const sel = selectRecipe(b, RECIPES);
    expect(sel.recipeKey).toBeNull();
    expect(sel.conflicts.map((c) => c.code)).toContain("no-recipe-satisfies-hard-constraints");
  });
  it("medium=video matches no pilot recipe", () => {
    const b = brand({ product: { name: "Acme", medium: "video" } });
    expect(selectRecipe(b, RECIPES).recipeKey).toBeNull();
  });
});

describe("R5 — bounded overrides mutate intent, stay valid", () => {
  it("visual.radius=tighter halves radius and still validates", () => {
    const b = brand({ overrides: { "visual.radius": "tighter" } });
    const built = buildTokens(b, recipe("minimal-tech"));
    const radiusMd = (built.primitive as any).radius.md.$value.value;
    expect(radiusMd).toBe(0.25); // sample md 0.5 × 0.5
    expect(validateTokens(built).findings.filter((f) => f.severity === "error")).toEqual([]);
  });
  it("override changes the intent hash vs no-override", () => {
    const plain = buildTokens(brand(), recipe("minimal-tech"));
    const slow = buildTokens(brand({ overrides: { "motion.speed": "calmer" } }), recipe("minimal-tech"));
    expect(computeTokenHash(slow)).not.toBe(computeTokenHash(plain));
  });
});

describe("R6 — deferred (base:null) recipes are selectable but not buildable", () => {
  // All 4 shipped recipes now have a base tree; exercise the deferred-stub code
  // path with an inline base:null recipe so the contract stays covered.
  const stub: Recipe = {
    key: "stub-fam", version: "0.0.0-stub", source: "test",
    toneAnchor: TONE(),
    hardConstraintRules: { requires: { mediums: ["web"] }, excludesAudiences: [], minContrastCapable: true, tags: ["web"] },
    philosophy: null, base: null,
  };
  it("selecting a base:null recipe raises a recipe-deferred conflict", () => {
    const sel = selectRecipe(brand(), [stub]);
    expect(sel.recipeKey).toBe("stub-fam");
    expect(sel.conflicts.map((c) => c.code)).toContain("recipe-deferred");
  });
  it("buildTokens on a base:null recipe throws BuildError", () => {
    expect(() => buildTokens(brand(), stub)).toThrow(BuildError);
  });
});

describe("R7 — gate purity (4 machine conditions + passed-in userConfirmed)", () => {
  const goodBrand = brand({ tone: { static_dynamic: 2, cold_warm: 3, serious_playful: 3, classic_cutting_edge: 5, minimal_rich: 2 } });
  const goodSel = () => selectRecipe(goodBrand, RECIPES);
  it("all conditions met + confirmed → ok", () => {
    expect(canGenerate({ brand: goodBrand, selection: goodSel(), userConfirmed: true }).ok).toBe(true);
  });
  it("unconfirmed → blocked", () => {
    const r = canGenerate({ brand: goodBrand, selection: goodSel(), userConfirmed: false });
    expect(r.ok).toBe(false);
    expect(r.reasons.join()).toContain("not confirmed");
  });
  it("conflict present → blocked", () => {
    const b = brand({ constraints: ["nonexistent-tag"] });
    expect(canGenerate({ brand: b, selection: selectRecipe(b, RECIPES), userConfirmed: true }).ok).toBe(false);
  });
  it(">3 overrides → blocked", () => {
    const b = brand({ overrides: { "visual.radius": "tighter", "motion.speed": "calmer", foo: "x", bar: "y" } as any });
    expect(canGenerate({ brand: b, selection: selectRecipe(b, RECIPES), userConfirmed: true }).ok).toBe(false);
  });
});

describe("R8 — brand validation (required + range)", () => {
  it("tone axis out of 1..7 is rejected", () => {
    const b = brand({ tone: { minimal_rich: 9 } });
    expect(validateBrand(b).some((e) => e.path === "branding.tone_vector.minimal_rich")).toBe(true);
  });
  it("unknown override axis is rejected", () => {
    const b = brand({ overrides: { "visual.glow": "on" } as any });
    expect(validateBrand(b).some((e) => e.path === "overrides.visual.glow")).toBe(true);
  });
  it("normalizeToneVector maps 1→-1, 4→0, 7→1", () => {
    const n = normalizeToneVector(TONE({ static_dynamic: 1, cold_warm: 4, serious_playful: 7 }));
    expect(n.static_dynamic).toBe(-1);
    expect(n.cold_warm).toBe(0);
    expect(n.serious_playful).toBe(1);
  });
});

describe("R9 — distance ties break by declared order (determinism)", () => {
  it("equidistant survivors pick the earlier one", () => {
    const anchorA = TONE({ minimal_rich: 2 });
    const anchorB = TONE({ minimal_rich: 6 });
    const mk = (key: string, anchor: ToneVector): Recipe => ({
      key, version: "1.0.0", source: "test",
      toneAnchor: anchor,
      hardConstraintRules: { requires: { mediums: ["web"] }, excludesAudiences: [], minContrastCapable: true, tags: ["web"] },
      philosophy: {}, base: {},
    });
    const b = brand({ tone: { minimal_rich: 4 } }); // equidistant (2 vs 6)
    const ordered = [mk("first", anchorA), mk("second", anchorB)];
    expect(toneDistance(b.branding.tone_vector, anchorA)).toBe(toneDistance(b.branding.tone_vector, anchorB));
    expect(selectRecipe(b, ordered).recipeKey).toBe("first");
  });
});
