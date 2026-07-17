import { describe, expect, it } from "vitest";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { BrandJson, ToneVector } from "../src/brand-schema.js";
import { formatRecipeCandidateTable, loadRecipes, selectRecipe, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));

const MINIMAL_TONE: ToneVector = {
  static_dynamic: 2,
  cold_warm: 3,
  serious_playful: 3,
  classic_cutting_edge: 5,
  minimal_rich: 2,
};

function brand(input: {
  readonly tone?: ToneVector;
  readonly recipeOverride?: string;
  readonly constraints?: readonly string[];
} = {}): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Recipe Candidate", medium: "web" },
    branding: {
      tone_vector: input.tone ?? MINIMAL_TONE,
      ...(input.recipeOverride === undefined ? {} : { recipe_override: input.recipeOverride }),
    },
    ...(input.constraints === undefined ? {} : { constraints: input.constraints }),
  };
}

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`missing recipe ${key}`);
  return found;
}

function selectedRecipe(input: BrandJson): Recipe {
  const selection = selectRecipe(input, RECIPES);
  if (selection.recipe === null) throw new Error("expected recipe selection");
  return selection.recipe;
}

describe("recipe candidate affordances", () => {
  it("prints a stable top-three candidate table for nearest selection", () => {
    const table = formatRecipeCandidateTable(selectRecipe(brand(), RECIPES));

    expect(table).toBe([
      "recipe candidates (tone distance, hard constraints):",
      "  1. minimal-tech         d=0.000  OK  ← selected",
      "  2. medical-clinical     d=2.236  OK",
      "  3. pro-emotive          d=2.449  OK",
    ].join("\n"));
  });

  it("honors recipe_override and emits the same tokens as a direct build with that recipe", () => {
    const overridden = brand({ recipeOverride: "pro-emotive" });
    const selection = selectRecipe(overridden, RECIPES);
    const overrideTokens = buildTokens(overridden, selectedRecipe(overridden));
    const directTokens = buildTokens(overridden, recipe("pro-emotive"));

    expect(selection.recipeKey).toBe("pro-emotive");
    expect(formatRecipeCandidateTable(selection)).toContain("pro-emotive          d=2.449  OK  ← selected (override)");
    expect(JSON.stringify(overrideTokens)).toBe(JSON.stringify(directTokens));
  });

  it("rejects recipe_override when a hard constraint filters that recipe", () => {
    expect(() => selectRecipe(brand({ recipeOverride: "minimal-tech", constraints: ["dense-data"] }), RECIPES))
      .toThrowError(/dense-data/);
  });

  it("rejects unknown recipe_override keys with the valid recipe list", () => {
    expect(() => selectRecipe(brand({ recipeOverride: "unknown-family" }), RECIPES))
      .toThrowError(/valid: creative-multiscale, enterprise, expressive, luxury, medical-clinical, minimal-tech, pro-emotive, retro, warm-creator/);
  });

  it("builds byte-identical tokens for the same brand.json with recipe_override", () => {
    const input = brand({ recipeOverride: "pro-emotive" });
    const first = `${JSON.stringify(buildTokens(input, selectedRecipe(input)), null, 2)}\n`;
    const second = `${JSON.stringify(buildTokens(input, selectedRecipe(input)), null, 2)}\n`;

    expect(first).toBe(second);
  });
});
