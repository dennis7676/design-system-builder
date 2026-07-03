/**
 * G-E — elevation vocabulary (Tier-1). Expressive recipes gain felt depth via
 * semantic.elevation.* (shadow); flat recipes (minimal-tech/enterprise) stay
 * elevation-free by identity.
 * The applied demo paints elevation only from tokens (no hardcoded shadow).
 */
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateTokens } from "../src/validator.js";
import { generateDemo } from "../src/index.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { BrandJson } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;
const buildFor = (key: string): TokensDocument =>
  buildTokens(
    { schemaVersion: "2026-06-30", product: { name: "Demo", medium: "web" }, branding: { tone_vector: recipe(key).toneAnchor } } as BrandJson,
    recipe(key),
  );

const EXPRESSIVE = ["expressive", "warm-creator", "retro", "pro-emotive", "creative-multiscale", "luxury"];
const FLAT = ["minimal-tech", "enterprise"];

const hasElevationLeaf = (doc: TokensDocument): boolean =>
  Boolean((doc.semantic as Record<string, unknown>)?.elevation);
const errorsOf = (doc: TokensDocument) => validateTokens(doc).findings.filter((f) => f.severity === "error");

describe("G-E1 — expressive recipes declare elevation and pass the export gate", () => {
  for (const key of EXPRESSIVE) {
    it(`${key} builds with a semantic.elevation leaf and 0 errors`, () => {
      const doc = buildFor(key);
      expect(hasElevationLeaf(doc)).toBe(true);
      expect(errorsOf(doc)).toEqual([]);
    });
  }
});

describe("G-E2 — flat recipes stay elevation-free by identity", () => {
  for (const key of FLAT) {
    it(`${key} carries no elevation or shadow leaf`, () => {
      const doc = buildFor(key);
      expect(hasElevationLeaf(doc)).toBe(false);
      expect(JSON.stringify(doc)).not.toContain('"$type":"shadow"');
    });
  }
  it("minimal-tech still validates while carrying no elevation vocabulary", () => {
    expect(errorsOf(buildFor("minimal-tech"))).toEqual([]);
  });
});

describe("G-E3 — demo consumes elevation only when present", () => {
  it("expressive demo paints token-driven box-shadow and no hardcoded literal", () => {
    const html = generateDemo(buildFor("expressive"));
    const decls = html.match(/box-shadow:\s*[^;]+/g) ?? [];
    expect(decls.length).toBeGreaterThan(0);
    for (const d of decls) expect(d).toContain("var(--semantic-elevation-");
  });
  it("minimal-tech demo emits no box-shadow declaration (renders flat)", () => {
    const html = generateDemo(buildFor("minimal-tech"));
    expect(html).not.toContain("box-shadow:");
  });
});
