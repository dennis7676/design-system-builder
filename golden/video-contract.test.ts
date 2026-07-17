import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import { buildContractJson } from "../src/contract.js";
import { loadRecipes, RECIPE_ORDER, type Recipe, type RecipeKey } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokenGroup, TokenNode, TokensDocument } from "../src/tokens-schema.js";
import { isLeaf } from "../src/tokens-schema.js";
import { computeTokenHash, validateTokens } from "../src/validator.js";
import { VIDEO_CONTRACT, realizedVideoPaths } from "../src/video-contract.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));

const TOKEN_HASHES: Record<RecipeKey, string> = {
  "creative-multiscale": "sha256:c8ff00bc84368173612274f130042a4f15e0c9a65fe9869ae18d6070c26275fc",
  enterprise: "sha256:832623ece673a1fa04e7a071a180b126535c1d15ad231b9fbceeb52ea01ce24d",
  expressive: "sha256:f36a9d63ca675514f48a361b190ad4e0e8e7efb23c0c70372e16e3424e0904fc",
  luxury: "sha256:5884290d9770395ff0805502e1fee524e347ff660be4edbe76b5997c213093fa",
  "blueprint": "sha256:b60432eda09fac95a6e25c14e9fbadbf2141280e70f93b78938c984fb71323f2",
  "medical-clinical": "sha256:d4e3a4b6409fedd03fa214876d06f4dcc34449af8504a549977181f6127a9b90",
  "minimal-tech": "sha256:eb29826206ce72f927b2a3ebf0f390abae35964879602ddbd4eb28d6d3d13c51",
  "pro-emotive": "sha256:0c5f752cae9dcd71c9357f7761d3c942a4ac9255f41636557a010345561f1820",
  retro: "sha256:cbeef50c2d177516472ac267bf65887d315a0d24efc8769a35a970f84701efde",
  "warm-creator": "sha256:4f4de0666e57443779a675102a354124bb62ae45fd0c86e1a3f9b3ca5564b199",
};

function recipe(key: RecipeKey): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: RecipeKey): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
  };
}

function buildFor(key: RecipeKey): TokensDocument {
  return buildTokens(brandFor(key), recipe(key));
}

function group(node: TokenNode, path: string): TokenGroup {
  if (isLeaf(node)) throw new Error(`${path} must be a token group`);
  return node;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("video contract parity gate", () => {
  it("accepts every rolled-out recipe when declared paths are realized", () => {
    for (const key of RECIPE_ORDER) {
      const doc = buildFor(key);
      expect(
        validateTokens(doc).findings.filter((finding) => finding.code === "video-contract-parity"),
        key,
      ).toEqual([]);
      expect(realizedVideoPaths(doc), key).toEqual([...VIDEO_CONTRACT[key]]);
    }
  });

  it("fails loudly when a declared video path is no longer realized", () => {
    const doc = buildFor("minimal-tech");
    const space = group(doc.primitive.space, "primitive.space");
    const xs = space.xs;
    if (xs === undefined || !isLeaf(xs)) throw new Error("primitive.space.xs fixture missing");
    xs.$class = "target-only:web";

    const finding = validateTokens(doc).findings.find((item) => item.code === "video-contract-parity");
    expect(finding).toEqual(expect.objectContaining({ severity: "error" }));
    expect(finding?.message).toContain("primitive.space.xs");
    expect(finding?.meta?.missing).toContain("primitive.space.xs");
  });

  it("keeps every recipe tokenHash sealed to the pre-change value", () => {
    for (const key of RECIPE_ORDER) {
      expect(computeTokenHash(buildFor(key)), key).toBe(TOKEN_HASHES[key]);
    }
  });

  it("emits deterministic contract.json video sections", () => {
    for (const key of RECIPE_ORDER) {
      const first = buildContractJson(buildFor(key));
      const second = buildContractJson(buildFor(key));
      expect(second, key).toBe(first);

      const contract = JSON.parse(first) as { readonly video: { readonly realizablePaths: readonly string[] } };
      expect(contract.video.realizablePaths, key).toEqual([...VIDEO_CONTRACT[key]]);
      expect(sha256(JSON.stringify(contract.video)), key).toBe(
        sha256(JSON.stringify(JSON.parse(second).video)),
      );
    }
  });
});
