/**
 * G-G — gradient vocabulary (Tier-1b). Expressive recipes gain a brand-tinted
 * hero gradient, gated by a worst-case-stop contrast check so no stop can break
 * text legibility. Flat recipes stay gradient-free (R1 keystone intact). The
 * dark-stop test (G-G4) proves the gate actually bites.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateTokens, computeTokenHash } from "../src/validator.js";
import { generateDemo } from "../src/index.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { BrandJson } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;
const buildFor = (key: string): TokensDocument =>
  buildTokens(
    { schemaVersion: "2026-06-30", product: { name: "Demo", medium: "web" }, branding: { tone_vector: recipe(key).toneAnchor } } as BrandJson,
    recipe(key),
  );

const EXPRESSIVE = ["expressive", "warm-creator", "retro", "pro-emotive", "creative-multiscale", "luxury"];
const FLAT = ["minimal-tech", "enterprise"];

const hasGradientLeaf = (doc: TokensDocument): boolean =>
  Boolean((doc.semantic as Record<string, unknown>)?.gradient);
const errorsOf = (doc: TokensDocument) => validateTokens(doc).findings.filter((f) => f.severity === "error");

describe("G-G1 — expressive recipes declare a gated hero gradient", () => {
  for (const key of EXPRESSIVE) {
    it(`${key} builds with semantic.gradient.hero and passes the export gate`, () => {
      const doc = buildFor(key);
      expect(hasGradientLeaf(doc)).toBe(true);
      expect(errorsOf(doc)).toEqual([]);
    });
  }
});

describe("G-G2 — flat recipes stay gradient-free", () => {
  for (const key of FLAT) {
    it(`${key} carries no gradient leaf`, () => {
      const doc = buildFor(key);
      expect(hasGradientLeaf(doc)).toBe(false);
      expect(JSON.stringify(doc)).not.toContain('"$type":"gradient"');
    });
  }
});

describe("G-G3 — demo consumes gradient only when present", () => {
  it("expressive demo hero uses var(--semantic-gradient-hero)", () => {
    expect(generateDemo(buildFor("expressive"))).toContain("var(--semantic-gradient-hero)");
  });
  it("minimal-tech demo has no gradient-backed hero", () => {
    expect(generateDemo(buildFor("minimal-tech"))).not.toContain("var(--semantic-gradient-hero)");
  });
});

describe("G-G4 — worst-case-stop gate bites on a dark stop", () => {
  it("a gradient with a dark stop yields contrast-fail", () => {
    const doc = JSON.parse(JSON.stringify(buildFor("expressive"))) as TokensDocument;
    // inject a dark stop that drops well below 4.5:1 vs dark foreground text
    (doc.semantic as Record<string, { hero: { $value: { stops: string[] } } }>).gradient.hero.$value.stops = [
      "oklch(0.98 0 0)",
      "oklch(0.25 0.1 300)",
    ];
    const fails = validateTokens(doc).findings.filter((f) => f.code === "contrast-fail");
    expect(fails.length).toBeGreaterThan(0);
    expect(fails.some((f) => f.message.includes("worst-case"))).toBe(true);
  });
  it("uniformly light stops produce no contrast finding", () => {
    const doc = buildFor("expressive");
    expect(validateTokens(doc).findings.filter((f) => f.code === "contrast-fail")).toEqual([]);
  });
});

describe("G-G5 — R1 keystone holds", () => {
  it("build(minimal-tech) intent hash === sample", () => {
    expect(computeTokenHash(buildFor("minimal-tech"))).toBe(computeTokenHash(SAMPLE));
  });
});
