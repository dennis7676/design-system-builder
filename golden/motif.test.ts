import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { validateBrand, MOTIF_NAMES, type BrandJson, type MotifName, type ToneVector } from "../src/brand-schema.js";
import { buildContractJson } from "../src/contract.js";
import { generateDemo } from "../src/demo-generator.js";
import { MOTIF_GEOMETRIC_SVG, suggestMotifs } from "../src/motif.js";
import { loadRecipes, selectRecipe, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import { toRealizedVideo } from "../src/transformer.js";
import { computeTokenHash, validateTokens } from "../src/validator.js";
import type { Skeleton, TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE_TEXT = readFileSync(join(here, "sample.tokens.json"), "utf8");
const SAMPLE = JSON.parse(SAMPLE_TEXT) as TokensDocument;

const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

const minimalTone: ToneVector = {
  static_dynamic: 2,
  cold_warm: 3,
  serious_playful: 3,
  classic_cutting_edge: 5,
  minimal_rich: 2,
};

const classicWarmLuxuryTone: ToneVector = {
  static_dynamic: 3,
  cold_warm: 5,
  serious_playful: 2,
  classic_cutting_edge: 2,
  minimal_rich: 4,
};

function brandFor(key: string, extra: Partial<BrandJson> = {}): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...extra,
  } as BrandJson;
}

function motifDoc(motif: MotifName, key = "minimal-tech"): TokensDocument {
  return buildTokens(
    brandFor(key, {
      branding: { tone_vector: key === "minimal-tech" ? minimalTone : recipe(key).toneAnchor },
      motif,
    }),
    recipe(key),
    { generatedAt: SAMPLE.meta.generatedAt },
  );
}

function motifFindings(doc: TokensDocument): ReturnType<typeof validateTokens>["findings"] {
  return validateTokens(doc).findings.filter((finding) => finding.code === "motif-ink-floor");
}

describe("motif enum validation", () => {
  it("rejects unknown motif names with the allowed enum", () => {
    const errors = validateBrand(brandFor("minimal-tech", { motif: "mascot" as MotifName }));
    expect(errors).toEqual([
      expect.objectContaining({
        path: "motif",
        message: expect.stringContaining("CONFLICT [motif-unknown]"),
      }),
    ]);
    expect(errors[0]?.message).toContain("glyph, geometric, rule-lines, none");
  });

  it("rejects array form because motif is single-valued", () => {
    const errors = validateBrand(brandFor("minimal-tech", { motif: ["glyph"] as unknown as MotifName }));
    expect(errors).toEqual([
      expect.objectContaining({
        path: "motif",
        message: expect.stringContaining("single value"),
      }),
    ]);
  });
});

describe("deterministic motif suggestions", () => {
  it("double-run output is deeply equal and byte-stable", () => {
    const b = brandFor("minimal-tech", { branding: { tone_vector: minimalTone } });
    const first = suggestMotifs(b, recipe("minimal-tech"));
    const second = suggestMotifs(b, recipe("minimal-tech"));
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("does not offer geometric to a classic warm luxury brand", () => {
    const b = brandFor("luxury", { branding: { tone_vector: classicWarmLuxuryTone } });
    const motifs = suggestMotifs(b, recipe("luxury")).map((entry) => entry.motif);
    expect(motifs).toContain("rule-lines");
    expect(motifs).toContain("glyph");
    expect(motifs).toContain("none");
    expect(motifs).not.toContain("geometric");
  });
});

describe("motif tokens and contract surface", () => {
  it("emits semantic.motif for every explicit motif kind", () => {
    for (const motif of MOTIF_NAMES) {
      const doc = motifDoc(motif);
      const group = (doc.semantic as any).motif;
      expect(group.kind).toEqual(expect.objectContaining({ $type: "motif-kind", $value: motif }));
      expect(group.ink).toEqual(expect.objectContaining({ $type: "color", $value: "{semantic.color.primary.default}" }));
      expect(group.scale).toEqual(expect.objectContaining({ $type: "dimension", $value: "{semantic.typography.display.size}" }));
    }
  });

  it("omits semantic.motif when motif is absent and keeps the keystone bytes unchanged", () => {
    const doc = buildTokens(
      brandFor("minimal-tech", { branding: { tone_vector: minimalTone } }),
      recipe("minimal-tech"),
      { generatedAt: SAMPLE.meta.generatedAt },
    );
    expect((doc.semantic as any).motif).toBeUndefined();
    expect(`${JSON.stringify(doc, null, 2)}\n`).toBe(SAMPLE_TEXT);
    expect(computeTokenHash(doc)).toBe(computeTokenHash(SAMPLE));

    const contract = JSON.parse(buildContractJson(doc)) as { readonly tokens: { readonly leafTypes: string[] }; readonly gates: ReadonlyArray<{ readonly code: string }> };
    expect(contract.tokens.leafTypes).not.toContain("motif-kind");
    expect(contract.gates.map((gate) => gate.code)).not.toContain("motif-ink-floor");
  });

  it("exposes motif-kind and motif-ink-floor only when motif tokens exist", () => {
    const doc = motifDoc("geometric");
    const contract = JSON.parse(buildContractJson(doc)) as { readonly tokens: { readonly leafTypes: string[] }; readonly gates: ReadonlyArray<{ readonly code: string }> };
    expect(contract.tokens.leafTypes).toContain("motif-kind");
    expect(contract.gates.map((gate) => gate.code)).toContain("motif-ink-floor");
    expect(toRealizedVideo(doc).skipped).toContain("semantic.motif.kind");
  });
});

describe("motif ink gate and fitness", () => {
  it("fails when motif ink falls below the non-text floor", () => {
    const doc = motifDoc("glyph");
    (doc.semantic as any).motif.ink.$value = "#b0b0b0";
    (doc.semantic as any).color.surface.default.$value = "#ffffff";
    const finding = motifFindings(doc)[0];
    expect(finding).toEqual(
      expect.objectContaining({
        code: "motif-ink-floor",
        path: "semantic.motif.ink",
        meta: expect.objectContaining({ required: 3, role: "non-text" }),
      }),
    );
    expect(finding?.meta?.ratio).toBeLessThan(3);
  });

  it("exempts motif kind none from the ink floor", () => {
    const doc = motifDoc("none");
    (doc.semantic as any).motif.ink.$value = "#b0b0b0";
    (doc.semantic as any).color.surface.default.$value = "#ffffff";
    expect(motifFindings(doc)).toEqual([]);
  });

  it("rejects a hand-added unfit motif during recipe selection", () => {
    const b = brandFor("luxury", {
      branding: { tone_vector: classicWarmLuxuryTone, recipe_override: "luxury" },
      motif: "geometric",
    });
    const selection = selectRecipe(b, RECIPES);
    expect(selection.recipeKey).toBe("luxury");
    expect(selection.conflicts).toContainEqual(
      expect.objectContaining({
        code: "motif-fit-rejected",
        message: expect.stringContaining("Geometric needs"),
      }),
    );
  });
});

describe("motif demo rendering", () => {
  it("renders the pinned geometric SVG without the legacy first-letter glyph in all five slots", () => {
    const cases: ReadonlyArray<readonly [string, Skeleton | undefined, "bold" | undefined]> = [
      ["standard bold", undefined, "bold"],
      ["story", "story", undefined],
      ["collage", "collage", undefined],
      ["mosaic", "mosaic", undefined],
      ["spec-sheet", "spec-sheet", undefined],
    ];

    for (const [label, skeleton, expression] of cases) {
      const doc = motifDoc("geometric");
      doc.meta.skeleton = skeleton;
      doc.meta.expression = expression;
      const html = generateDemo(doc);
      expect(html, label).toContain(MOTIF_GEOMETRIC_SVG.version);
      expect(html, label).toContain('data-motif-kind="geometric"');
      expect(html, label).toContain("<circle");
      expect(html, label).toContain("<rect");
      expect(html, label).toContain("<path");
      expect(html, label).toContain('aria-hidden="true"');
      expect(html, label).not.toContain('<span class="glyph">M</span>');

      const motifCssBlocks = html.match(/\/\* motif:start \*\/[\s\S]*?\/\* motif:end \*\//g) ?? [];
      expect(motifCssBlocks.length, label).toBeGreaterThan(0);
      for (const block of motifCssBlocks) {
        expect(block, label).toContain("var(--semantic-motif-ink)");
        expect(block, label).toContain("var(--semantic-motif-scale)");
        expect(block, label).not.toContain("--semantic-color-primary");
        expect(block, label).not.toContain("--semantic-typography-display-size");
      }
    }
  });
});
