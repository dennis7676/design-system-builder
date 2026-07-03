import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrandJson } from "../src/brand-schema.js";
import { generateDemo } from "../src/demo-generator.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const REGIONS = ["nav", "hero", "features", "form", "footer"] as const;
const CASES = [
  {
    key: "expressive",
    skeleton: "collage",
    markers: ["collage-hero", "collage-panel", "collage-stagger", "collage-band"],
    forbidden: ["masthead"],
  },
  {
    key: "creative-multiscale",
    skeleton: "mosaic",
    markers: ["mosaic-grid", "mosaic-headline", "mosaic-tile"],
    forbidden: ["masthead"],
  },
  {
    key: "retro",
    skeleton: "poster",
    markers: ["poster-badge", "poster-rule", "poster-ticket"],
    forbidden: ["masthead", "card-grid"],
  },
] as const;

function recipe(key: string): Recipe {
  const found = RECIPES.find((r) => r.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string, locales?: readonly string[]): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web", ...(locales !== undefined ? { locales: [...locales] } : {}) },
    branding: { tone_vector: recipe(key).toneAnchor },
  };
}

function buildFor(key: string, locales?: readonly string[]): TokensDocument {
  return buildTokens(brandFor(key, locales), recipe(key));
}

function styleBody(html: string): string {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  return css.replace(/:root\s*\{[\s\S]*?\n\s*\}/, "");
}

describe("G-KB1 — batch B grammars render complete skeletons", () => {
  for (const entry of CASES) {
    it(`${entry.key} renders ${entry.skeleton} regions and markers`, () => {
      const html = generateDemo(buildFor(entry.key));

      for (const region of REGIONS) expect(html).toContain(`data-demo-region="${region}"`);
      for (const marker of entry.markers) expect(html).toContain(marker);
      for (const marker of entry.forbidden) expect(html).not.toContain(marker);
    });
  }
});

describe("G-KB2 — batch B CSS keeps brand values behind variables", () => {
  for (const entry of CASES) {
    it(`${entry.skeleton} emits no literal brand color values outside :root`, () => {
      const body = styleBody(generateDemo(buildFor(entry.key)));
      expect(body).not.toMatch(/oklch\(\s*[\d.]/);
      expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    });
  }
});

describe("G-KB3 — batch B skeleton metadata is hash-neutral", () => {
  for (const entry of CASES) {
    it(`${entry.key} echoes ${entry.skeleton} without changing token intent`, () => {
      const baseRecipe = recipe(entry.key);
      const strippedRecipe: Recipe = { ...baseRecipe, skeleton: undefined };
      const withSkeleton = buildTokens(brandFor(entry.key), baseRecipe);
      const withoutSkeleton = buildTokens(brandFor(entry.key), strippedRecipe);
      const { meta: withMeta, ...withTree } = withSkeleton;
      const { meta: withoutMeta, ...withoutTree } = withoutSkeleton;

      expect(withMeta.skeleton).toBe(entry.skeleton);
      expect(withoutMeta.skeleton).toBeUndefined();
      expect(computeTokenHash(withSkeleton)).toBe(computeTokenHash(withoutSkeleton));
      expect(JSON.stringify(withTree)).toBe(JSON.stringify(withoutTree));
    });
  }
});

describe("G-KB4 — Korean locale renders through every batch B grammar", () => {
  for (const entry of CASES) {
    it(`${entry.skeleton} keeps the grammar and ko typography block`, () => {
      const html = generateDemo(buildFor(entry.key, ["ko"]));

      expect(html).toContain('<html lang="ko">');
      expect(html).toContain("word-break: keep-all");
      expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
      for (const marker of entry.markers) expect(html).toContain(marker);
    });
  }
});
