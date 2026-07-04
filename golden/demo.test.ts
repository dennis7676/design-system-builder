/**
 * P3 — applied demo surface. The demo joins the surface contract with the same
 * discipline as the styleguide (own builtFromTokenHash + completeness), and must
 * be styled entirely by tokens (G-D4 differentiation KPI).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  checkManifest,
  buildContractJson,
  computeTokenHash,
  generateDemo,
  generateDesignMd,
  generateStyleguide,
} from "../src/index.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { BrandJson } from "../src/brand-schema.js";
import { SKELETONS, type TokensDocument } from "../src/tokens-schema.js";
import { mixedText } from "../src/render-utils.js";

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

const surfacesFor = (doc: TokensDocument) => ({
  styleguideHtml: generateStyleguide(doc),
  designMd: generateDesignMd(doc),
  demoHtml: generateDemo(doc),
  contractJson: buildContractJson(doc),
});
const errors = (doc: TokensDocument, surfaces = surfacesFor(doc)) =>
  checkManifest(doc, surfaces).filter((f) => f.severity === "error");

const REGIONS = ["nav", "hero", "features", "form", "footer"];
const buildFor = (key: string): TokensDocument =>
  buildTokens(
    { schemaVersion: "2026-06-30", product: { name: "Demo", medium: "web" }, branding: { tone_vector: recipe(key).toneAnchor } } as BrandJson,
    recipe(key),
  );
const rootVar = (html: string, name: string): string | null =>
  html.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1]?.trim() ?? null;

describe("G-D1 — self-contained demo with all regions", () => {
  it("emits valid self-contained HTML, token snapshot, and every region", () => {
    const html = generateDemo(SAMPLE);
    expect(html.toLowerCase().startsWith("<!doctype html>")).toBe(true);
    expect(html).toMatch(/<html\b[\s\S]*<\/html>/i);
    expect(html).toContain('<script id="token-snapshot" type="application/json">');
    for (const region of REGIONS) expect(html).toContain(`data-demo-region="${region}"`);
  });
});

describe("G-D2 — demo drift detection", () => {
  it("reports manifest-drift for a stale demo hash", () => {
    const built = surfacesFor(SAMPLE);
    const stale = { ...built, demoHtml: built.demoHtml.replace(computeTokenHash(SAMPLE), "sha256:stale") };
    expect(errors(SAMPLE, stale)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "manifest-drift", meta: expect.objectContaining({ surface: "demo" }) }),
      ]),
    );
  });
});

describe("G-D3 — demo completeness", () => {
  it("reports surface-incomplete when a region is removed", () => {
    const built = surfacesFor(SAMPLE);
    const missing = { ...built, demoHtml: built.demoHtml.replace('data-demo-region="form"', 'data-region-x="form"') };
    expect(errors(SAMPLE, missing)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "surface-incomplete", meta: expect.objectContaining({ surface: "demo", element: "form" }) }),
      ]),
    );
  });
});

describe("G-D4 — token-driven (differentiation KPI)", () => {
  it("luxury vs minimal-tech demos differ in :root brand vars", () => {
    const lux = generateDemo(buildFor("luxury"));
    const min = generateDemo(buildFor("minimal-tech"));
    const luxPrimary = rootVar(lux, "--semantic-color-primary-default");
    const minPrimary = rootVar(min, "--semantic-color-primary-default");
    const luxHeadFamily = rootVar(lux, "--semantic-typography-heading-family");
    const minHeadFamily = rootVar(min, "--semantic-typography-heading-family");
    expect(luxPrimary).not.toBeNull();
    expect(minPrimary).not.toBeNull();
    expect(luxPrimary).not.toBe(minPrimary); // near-black vs blue
    expect(luxHeadFamily).not.toBe(minHeadFamily); // serif vs sans
  });
});

describe("G-D5 — anti-hardcode (brand values only via var(--…))", () => {
  it("demo CSS body outside :root contains no literal color values", () => {
    const html = generateDemo(SAMPLE);
    const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    // strip the :root { … } block emitted by toCssVars — the only place literals live
    const body = css.replace(/:root\s*\{[\s\S]*?\n\s*\}/, "");
    // literal oklch color = oklch( followed by a number (colorspace keyword "in oklch" won't match)
    expect(body).not.toMatch(/oklch\(\s*[\d.]/);
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("baseline — generated demo satisfies all manifest gates", () => {
  it("checkManifest(SAMPLE) yields no demo error", () => {
    expect(errors(SAMPLE).filter((f) => f.meta?.surface === "demo")).toEqual([]);
  });
});

describe("demo derived foreground contrast", () => {
  it("sweeps all recipes across all skeletons without derived mix failures", () => {
    for (const recipeEntry of RECIPES) {
      const base = buildTokens(
        {
          schemaVersion: "2026-06-30",
          product: { name: "Demo", medium: "web" },
          branding: { tone_vector: recipeEntry.toneAnchor },
        } as BrandJson,
        recipeEntry,
      );
      for (const skeleton of SKELETONS) {
        const doc = structuredClone(base);
        doc.meta.skeleton = skeleton;
        expect(generateDemo(doc), `${recipeEntry.key}/${skeleton}`).toContain("<!doctype html>");
      }
    }
  });

  it("throws with site, percentage, ratio, and floor when a mix fails", () => {
    expect(() =>
      mixedText({
        doc: SAMPLE,
        fgPath: "semantic.color.surface.foreground",
        surfacePath: "semantic.color.surface.default",
        pct: 20,
        role: "text",
        site: "negative.demo",
      }),
    ).toThrow(/negative\.demo.*pct=20%.*ratio=1\.63.*floor=4\.5/);
  });
});
