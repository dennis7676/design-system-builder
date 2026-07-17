import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import { heroAdvisory, formatHeroAdvisory } from "../src/hero-advisory.js";
import { loadRecipes, RECIPE_ORDER, type RecipeKey } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));

function recipe(key: RecipeKey) {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function buildFor(key: RecipeKey) {
  const brand: BrandJson = {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
  };
  return buildTokens(brand, recipe(key));
}

describe("hero imagery advisory", () => {
  it("does not recommend imagery for blueprint — the hero carries by type and rule", () => {
    const advisory = heroAdvisory(buildFor("blueprint"));
    expect(advisory.recommend).toBe(false);
    expect(advisory.reason).toContain("spec-sheet");
    expect(advisory.contrastCaveat).toBeUndefined();
  });

  it("stays silent on the operator hook when imagery is not recommended", () => {
    expect(formatHeroAdvisory(buildFor("blueprint"))).toBeNull();
  });

  it("recommends imagery for an imagery-led skeleton and voids the flat-background proof", () => {
    const expressive = heroAdvisory(buildFor("expressive"));
    expect(expressive.recommend).toBe(true);
    expect(expressive.contrastCaveat).toContain("re-prove hero text contrast");
  });

  it("splits the recipe roster instead of recommending imagery for everything", () => {
    const verdicts = RECIPE_ORDER.map((key) => heroAdvisory(buildFor(key)).recommend);
    expect(verdicts).toContain(true);
    expect(verdicts).toContain(false);
  });

  it("never blocks: every recipe yields an advisory with a stated reason", () => {
    for (const key of RECIPE_ORDER) {
      expect(heroAdvisory(buildFor(key)).reason, key).not.toBe("");
    }
  });
});
