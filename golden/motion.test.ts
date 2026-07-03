import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateBrand, type BrandJson, type BrandOverrides } from "../src/brand-schema.js";
import { toTokensTs } from "../src/adapters/video-adapter.js";
import { MOTION_EASING_PRESETS } from "../src/motion-easing.js";
import { loadRecipes, selectRecipe, type Recipe } from "../src/recipe-selection.js";
import { resolveToken, tokenMap } from "../src/surface-data.js";
import { type CubicBezierValue, type LeafToken, type TokensDocument } from "../src/tokens-schema.js";
import { buildTokens } from "../src/tokens-builder.js";
import { toRealizedVideo, toRealizedWeb } from "../src/transformer.js";
import { flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;

const NORMATIVE = {
  "minimal-tech": { standard: [0.2, 0, 0, 1], enter: [0, 0, 0, 1], exit: [0.3, 0, 1, 1] },
  enterprise: { standard: [0.25, 0.1, 0.25, 1], enter: [0, 0, 0.2, 1], exit: [0.4, 0, 1, 1] },
  "pro-emotive": { standard: [0.4, 0, 0.2, 1], enter: [0, 0, 0.1, 1], exit: [0.4, 0, 1, 1] },
  expressive: { standard: [0.34, 1.2, 0.64, 1], enter: [0.16, 1.1, 0.3, 1], exit: [0.6, 0, 0.8, 0.6] },
  "creative-multiscale": { standard: [0.68, -0.3, 0.32, 1.3], enter: [0.2, 1.25, 0.4, 1], exit: [0.7, -0.2, 0.9, 0.6] },
  "warm-creator": { standard: [0.25, 0.46, 0.45, 0.94], enter: [0.1, 0.6, 0.3, 1], exit: [0.5, 0, 0.75, 0.7] },
  luxury: { standard: [0.19, 1, 0.22, 1], enter: [0.1, 0.8, 0.2, 1], exit: [0.55, 0, 0.85, 0.5] },
  retro: { standard: [0.7, 0, 0.3, 1], enter: [0.5, 0, 0.1, 1], exit: [0.9, 0, 0.5, 1] },
} as const;

type RecipeKey = keyof typeof NORMATIVE;
type EasingRole = keyof (typeof NORMATIVE)[RecipeKey];

function recipe(key: RecipeKey): Recipe {
  const found = RECIPES.find((r) => r.key === key);
  if (found === undefined) throw new Error(`missing recipe ${key}`);
  return found;
}

function brandFor(key: RecipeKey, overrides?: BrandOverrides): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Motion", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...(overrides === undefined ? {} : { overrides }),
  };
}

function buildFor(key: RecipeKey, overrides?: BrandOverrides): TokensDocument {
  return buildTokens(brandFor(key, overrides), recipe(key));
}

function leafMap(doc: TokensDocument): Map<string, LeafToken> {
  return new Map([
    ...flatten(doc.primitive, "primitive"),
    ...flatten(doc.semantic, "semantic"),
    ...flatten(doc.component, "component"),
  ]);
}

function leafAt(doc: TokensDocument, path: string): LeafToken {
  const leaf = leafMap(doc).get(path);
  if (leaf === undefined) throw new Error(`missing token ${path}`);
  return leaf;
}

function cubic(doc: TokensDocument, path: string): CubicBezierValue {
  const value = leafAt(doc, path).$value;
  if (!Array.isArray(value) || value.length !== 4) throw new Error(`not cubicBezier ${path}`);
  const [x1, y1, x2, y2] = value;
  return [x1, y1, x2, y2];
}

describe("G-M1 — per-recipe motion easing vocabulary", () => {
  for (const key of Object.keys(NORMATIVE) as RecipeKey[]) {
    it(`${key} carries the normative primitive triples and semantic aliases`, () => {
      const doc = buildFor(key);
      const leaves = tokenMap(doc);
      for (const role of Object.keys(NORMATIVE[key]) as EasingRole[]) {
        const primitivePath = `primitive.motion.easing.${role}`;
        const semanticPath = `semantic.motion.easing.${role}`;
        expect(cubic(doc, primitivePath)).toEqual(NORMATIVE[key][role]);
        expect(leafAt(doc, semanticPath)).toEqual({
          $type: "cubicBezier",
          $value: `{${primitivePath}}`,
          $class: "adapter-derived",
        });
        expect(resolveToken(semanticPath, leaves).$value).toEqual(NORMATIVE[key][role]);
      }
    });
  }

  it("exit curves never overshoot y2 above 1", () => {
    for (const triple of Object.values(NORMATIVE)) {
      expect(triple.exit[3]).toBeLessThanOrEqual(1);
    }
  });
});

describe("G-M2 — web and video realize easing tokens", () => {
  it("web emits CSS cubic-bezier strings", () => {
    const web = toRealizedWeb(buildFor("expressive"));
    expect(web.get("semantic.motion.easing.standard")).toBe("cubic-bezier(0.34, 1.2, 0.64, 1)");
    expect(web.get("semantic.motion.easing.enter")).toBe("cubic-bezier(0.16, 1.1, 0.3, 1)");
  });

  it("video emits readonly number tuples and no cubicBezier skip", () => {
    const doc = buildFor("expressive");
    const { values, skipped } = toRealizedVideo(doc);
    expect(values.get("semantic.motion.easing.standard")).toEqual([0.34, 1.2, 0.64, 1]);
    expect(skipped.some((path) => path.includes("easing"))).toBe(false);
    const ts = toTokensTs(doc);
    expect(ts).toContain("standard: [0.34, 1.2, 0.64, 1] as const");
    expect(ts).not.toContain("cubicBezier");
  });
});

describe("G-M3 — motion.easing override unlock", () => {
  it("dramatic preset replaces luxury easing wholesale with provenance", () => {
    const doc = buildFor("luxury", { "motion.easing": "dramatic" });
    expect(cubic(doc, "primitive.motion.easing.standard")).toEqual(MOTION_EASING_PRESETS.dramatic.standard);
    expect(cubic(doc, "primitive.motion.easing.enter")).toEqual(MOTION_EASING_PRESETS.dramatic.enter);
    expect(cubic(doc, "primitive.motion.easing.exit")).toEqual(MOTION_EASING_PRESETS.dramatic.exit);
    expect(doc.meta.motionOverride).toEqual({ preset: "dramatic" });
    expect(resolveToken("semantic.motion.easing.standard", tokenMap(doc)).$value).toEqual(MOTION_EASING_PRESETS.dramatic.standard);
  });

  it("unknown easing presets fail enum-range validation and do not become deferred conflicts", () => {
    const invalidBrand = {
      schemaVersion: "2026-06-30",
      product: { name: "Motion", medium: "web" },
      branding: { tone_vector: recipe("minimal-tech").toneAnchor },
      overrides: { "motion.easing": "bouncy" },
    };
    expect(validateBrand(invalidBrand).map((error) => error.path)).toContain("overrides.motion.easing");
    expect(selectRecipe(brandFor("minimal-tech", { "motion.easing": "standard" }), RECIPES).conflicts).toEqual([]);
  });
});

describe("G-M4 — cubicBezier validator and keystone superset gate", () => {
  it("rejects out-of-range x coordinates and names the path", () => {
    const doc = buildFor("minimal-tech");
    leafAt(doc, "primitive.motion.easing.standard").$value = [1.2, 0, 0, 1];
    const findings = validateTokens(doc).findings;
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "cubic-bezier-invalid",
          path: "primitive.motion.easing.standard",
          message: expect.stringContaining("primitive.motion.easing.standard"),
        }),
      ]),
    );
  });

  it("new minimal-tech build preserves every current keystone leaf deep-equal", () => {
    const before = leafMap(SAMPLE);
    const after = leafMap(buildFor("minimal-tech"));
    for (const [path, leaf] of before) {
      expect(after.get(path), path).toEqual(leaf);
    }
  });
});
