/**
 * Expression tier (safe | balanced | bold) — shared layout-amplitude dial.
 *
 * Invariants under test: absence ⇒ balanced ⇒ byte-identical to the pre-tier
 * generator (G-X1); tiers are pairwise distinct in layout markers (G-X2);
 * every tier keeps the demo surface contracts (G-X3); bold keeps the
 * anti-hardcode + flat-identity disciplines (G-X4); the schema gate rejects
 * out-of-enum tiers (G-X5); and the R1 keystone never moves (G-X6).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  checkManifest,
  computeTokenHash,
  generateDemo,
  generateDesignMd,
  generateStyleguide,
} from "../src/index.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import { validateBrand, type BrandJson, type ExpressionTier } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

const brandFor = (key: string, expression?: ExpressionTier): BrandJson =>
  ({
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...(expression !== undefined ? { expression } : {}),
  }) as BrandJson;

const buildFor = (key: string, expression?: ExpressionTier): TokensDocument =>
  buildTokens(brandFor(key, expression), recipe(key));

const demoErrors = (doc: TokensDocument) =>
  checkManifest(doc, {
    styleguideHtml: generateStyleguide(doc),
    designMd: generateDesignMd(doc),
    demoHtml: generateDemo(doc),
  }).filter((f) => f.severity === "error" && f.meta?.surface === "demo");

describe("G-X1 — absence ⇒ balanced ⇒ byte-identical (backward-compat anchor)", () => {
  it("demo without meta.expression equals demo at balanced, per recipe", () => {
    for (const key of ["minimal-tech", "expressive"]) {
      const absent = generateDemo(buildFor(key));
      const balanced = generateDemo(buildFor(key, "balanced"));
      expect(balanced).toBe(absent);
    }
  });
  it("absent brand field leaves meta.expression unset (artifact byte-stability)", () => {
    expect("expression" in buildFor("minimal-tech").meta).toBe(false);
    expect(buildFor("minimal-tech", "bold").meta.expression).toBe("bold");
  });
});

describe("G-X2 — tiers are pairwise distinct (differentiation KPI)", () => {
  it("safe/balanced/bold expressive demos differ; bold alone has panel + spotlight", () => {
    const safe = generateDemo(buildFor("expressive", "safe"));
    const balanced = generateDemo(buildFor("expressive", "balanced"));
    const bold = generateDemo(buildFor("expressive", "bold"));
    expect(safe).not.toBe(balanced);
    expect(bold).not.toBe(balanced);
    expect(bold).not.toBe(safe);
    for (const [html, expected] of [
      [safe, false],
      [balanced, false],
      [bold, true],
    ] as const) {
      expect(html.includes('class="hero-panel"')).toBe(expected);
      expect(/grid-row:\s*span 2/.test(html)).toBe(expected);
    }
    // safe's own marker: symmetric grid override present only at safe
    expect(safe).toContain("repeat(3, 1fr)");
    expect(balanced).not.toContain("repeat(3, 1fr)");
  });
});

describe("G-X3 — surface contracts hold at every tier", () => {
  const tiers: ExpressionTier[] = ["safe", "balanced", "bold"];
  for (const key of ["minimal-tech", "expressive"]) {
    for (const tier of tiers) {
      it(`checkManifest demo gates pass — ${key} @ ${tier}`, () => {
        expect(demoErrors(buildFor(key, tier))).toEqual([]);
      });
    }
  }
});

describe("G-X4 — bold discipline (anti-hardcode + flat identity)", () => {
  it("bold demo CSS outside :root has no literal colors (expressive + minimal-tech)", () => {
    for (const key of ["expressive", "minimal-tech"]) {
      const html = generateDemo(buildFor(key, "bold"));
      const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
      const body = css.replace(/:root\s*\{[\s\S]*?\n\s*\}/, "");
      expect(body).not.toMatch(/oklch\(\s*[\d.]/);
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    }
  });
  it("bold on flat recipe invents no shadow/gradient", () => {
    const html = generateDemo(buildFor("minimal-tech", "bold"));
    expect(html).not.toMatch(/box-shadow\s*:/);
    expect(html).not.toMatch(/gradient\(/);
  });
});

describe("G-X5 — schema gate", () => {
  const base = brandFor("minimal-tech");
  it("accepts absence and all three tiers", () => {
    expect(validateBrand(base)).toEqual([]);
    for (const tier of ["safe", "balanced", "bold"] as const) {
      expect(validateBrand({ ...base, expression: tier })).toEqual([]);
    }
  });
  it("rejects out-of-enum values", () => {
    const errors = validateBrand({ ...base, expression: "wild" });
    expect(errors).toEqual([expect.objectContaining({ path: "expression" })]);
  });
});

describe("G-X6 — R1 keystone unmoved by expression", () => {
  it("build(minimal-tech) intent hash === sample, with and without the tier", () => {
    const keystone = computeTokenHash(SAMPLE);
    expect(computeTokenHash(buildFor("minimal-tech"))).toBe(keystone);
    expect(computeTokenHash(buildFor("minimal-tech", "bold"))).toBe(keystone);
  });
});
