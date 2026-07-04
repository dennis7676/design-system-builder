/**
 * Edge points Round 1 — finite enum + deterministic concept-fit suggestions +
 * texture-grain end to end. The no-edge identity assertion is deliberately
 * against the committed keystone intent hash; do not regenerate it for this
 * change.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildTokens } from "../src/tokens-builder.js";
import { validateBrand, type BrandJson, type ExpressionTier, type ToneVector } from "../src/brand-schema.js";
import { loadRecipes, selectRecipe, type Recipe } from "../src/recipe-selection.js";
import { suggestEdges, TEXTURE_GRAIN_OPACITY_CAP } from "../src/edge-point.js";
import { generateDemo, generateStyleguide } from "../src/index.js";
import { computeTokenHash, validateTokens } from "../src/validator.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;

const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;
const minimalTone: ToneVector = {
  static_dynamic: 2,
  cold_warm: 3,
  serious_playful: 3,
  classic_cutting_edge: 5,
  minimal_rich: 2,
};

function brandFor(key: string, extra: Partial<BrandJson> = {}): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...extra,
  } as BrandJson;
}

function textureDoc(key = "retro"): TokensDocument {
  return buildTokens(brandFor(key, { edges: ["texture-grain"] }), recipe(key));
}

function errorCodes(doc: TokensDocument): readonly string[] {
  return validateTokens(doc).findings
    .filter((finding) => finding.severity === "error")
    .map((finding) => finding.code);
}

describe("edge enum validation", () => {
  it("rejects unknown edge names with the allowed enum", () => {
    const errors = validateBrand(brandFor("retro", { edges: ["vaporwave"] }));
    expect(errors).toEqual([
      expect.objectContaining({
        path: "edges",
        message: expect.stringContaining("texture-grain, glass"),
      }),
    ]);
  });

  it("rejects deferred glass loudly", () => {
    const errors = validateBrand(brandFor("minimal-tech", { edges: ["glass"] }));
    expect(errors).toEqual([
      expect.objectContaining({
        path: "edges",
        message: expect.stringContaining("DEFERRED until its contrast-floor gate ships (Round 2)"),
      }),
    ]);
  });
});

describe("deterministic concept-fit suggestions", () => {
  it("double-run output is deeply equal and byte-stable", () => {
    const b = brandFor("retro");
    const first = suggestEdges(b, recipe("retro"));
    const second = suggestEdges(b, recipe("retro"));
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("minimal-tech at safe tier does not suggest texture-grain", () => {
    const b = brandFor("minimal-tech", {
      expression: "safe" as ExpressionTier,
      branding: { tone_vector: minimalTone },
    });
    const edges = suggestEdges(b, recipe("minimal-tech")).map((entry) => entry.edge);
    expect(edges).not.toContain("texture-grain");
  });

  it("cool cutting-edge concepts list glass as deferred", () => {
    const b = brandFor("minimal-tech", { branding: { tone_vector: minimalTone } });
    expect(suggestEdges(b, recipe("minimal-tech"))).toContainEqual(
      expect.objectContaining({ edge: "glass", deferred: true }),
    );
  });
});

describe("texture-grain tokens and gates", () => {
  it("emits semantic.texture.overlay and passes the export gate", () => {
    const doc = textureDoc("retro");
    const overlay = (doc.semantic as any).texture.overlay;
    expect(overlay.image.$value).toContain("feTurbulence");
    expect(overlay.blendMode.$value).toBe("multiply");
    expect(overlay.opacity.$value).toBeLessThanOrEqual(TEXTURE_GRAIN_OPACITY_CAP);
    expect(errorCodes(doc)).toEqual([]);
  });

  it("opacity above the cap fails validation", () => {
    const doc = textureDoc("retro");
    (doc.semantic as any).texture.overlay.opacity.$value = TEXTURE_GRAIN_OPACITY_CAP + 0.001;
    expect(errorCodes(doc)).toContain("texture-opacity-cap");
  });

  it("worst-case blended background can fail a passing base pair", () => {
    const doc = textureDoc("retro");
    (doc.primitive.color as any).neutral["900"].$value = "#000000";
    (doc.primitive.color as any).neutral["50"].$value = "#757575";
    const findings = validateTokens(doc).findings.filter((finding) => finding.code === "texture-contrast-fail");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.message).toContain("blended-background");
    expect(findings[0]?.meta?.ratio).toBeLessThan(4.5);
  });
});

describe("edge fitness and no-edge identity", () => {
  it("hand-added unfit texture-grain produces a concept-fit conflict", () => {
    const b = brandFor("minimal-tech", {
      expression: "safe" as ExpressionTier,
      branding: { tone_vector: minimalTone },
      edges: ["texture-grain"],
    });
    const selection = selectRecipe(b, RECIPES);
    expect(selection.recipeKey).toBe("minimal-tech");
    expect(selection.conflicts).toContainEqual(
      expect.objectContaining({
        code: "edge-fit-rejected",
        message: expect.stringContaining("Texture grain is withheld"),
      }),
    );
  });

  it("absent edges and edges: [] are byte-identical, with keystone intent hash unchanged", () => {
    const baseBrand = brandFor("minimal-tech", { branding: { tone_vector: minimalTone } });
    const absent = buildTokens(baseBrand, recipe("minimal-tech"), { generatedAt: SAMPLE.meta.generatedAt });
    const empty = buildTokens({ ...baseBrand, edges: [] }, recipe("minimal-tech"), { generatedAt: SAMPLE.meta.generatedAt });
    expect(JSON.stringify(empty, null, 2)).toBe(JSON.stringify(absent, null, 2));
    expect(computeTokenHash(absent)).toBe(computeTokenHash(SAMPLE));
  });

  it("demo/styleguide consume texture through vars only", () => {
    const doc = textureDoc("retro");
    const css = [generateDemo(doc), generateStyleguide(doc)].join("\n");
    expect(css).toContain("var(--semantic-texture-overlay-image)");
    expect(css).toContain("var(--semantic-texture-overlay-blendMode)");
    expect(css).toContain("var(--semantic-texture-overlay-opacity)");
  });
});
