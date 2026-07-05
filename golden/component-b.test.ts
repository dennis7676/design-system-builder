import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_P1_PATHS,
  COMPONENT_P1_ROLLOUT,
  componentContrastTargets,
  componentFocusTargets,
  componentPrimitiveNames,
} from "../src/component-registry.js";
import { buildContractJson } from "../src/contract.js";
import { generateDemo } from "../src/demo-generator.js";
import { generateDesignMd } from "../src/design-md-generator.js";
import { checkManifest } from "../src/manifest.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import { contrastResults } from "../src/surface-data.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { BrandJson } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash, flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const BATCH = ["luxury", "retro", "warm-creator"] as const;
const TOKEN_HASHES: Record<(typeof BATCH)[number], string> = {
  luxury: "sha256:3f28f6ce32244018d257c2799e857ad531258417e23cb80c87efce2ba1277981",
  retro: "sha256:e040faa61bbf15081d561aaff9f83a39b1dbeb9159929a835019a2c8664c615d",
  "warm-creator": "sha256:32ba7064639ec0f97dc6e847b752e96bc2a81bc19d98a37e8fdb508e3d264139",
};

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Batch B", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
  };
}

function buildFor(key: string): TokensDocument {
  return buildTokens(brandFor(key), recipe(key));
}

function leafPaths(doc: TokensDocument): readonly string[] {
  return [...flatten(doc.component, "component").keys()].sort();
}

function pathsInSet(paths: readonly string[], expected: readonly string[]): readonly string[] {
  const roots = new Set(expected.map(componentPathRoot));
  return paths.filter((path) => roots.has(componentPathRoot(path))).sort();
}

function componentPathRoot(path: string): string {
  const [namespace, name] = path.split(".");
  return `${namespace ?? ""}.${name ?? ""}`;
}

function surfacesFor(doc: TokensDocument) {
  return {
    styleguideHtml: generateStyleguide(doc),
    designMd: generateDesignMd(doc),
    demoHtml: generateDemo(doc),
    contractJson: buildContractJson(doc),
  };
}

describe("component batch b rollout", () => {
  it("appends luxury, retro, and warm-creator to the P1 rollout set", () => {
    expect(COMPONENT_P1_ROLLOUT.slice(-BATCH.length)).toEqual(BATCH);
  });

  for (const key of BATCH) {
    it(`${key} exposes exact P1 component parity and validates cleanly`, () => {
      const doc = buildFor(key);
      const result = validateTokens(doc);

      expect(pathsInSet(leafPaths(doc), COMPONENT_P1_PATHS)).toEqual([...COMPONENT_P1_PATHS].sort());
      expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
      expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
    });

    it(`${key} carries the derived component contrast pairs and clears floors`, () => {
      const doc = buildFor(key);

      for (const target of componentContrastTargets()) {
        expect(doc.contrastPairs).toContainEqual({
          fg: target.fg,
          bg: target.bg,
          role: target.role,
          state: target.state,
          ...(target.minRatio !== undefined ? { minRatio: target.minRatio } : {}),
        });
      }
      for (const target of componentFocusTargets()) {
        expect(doc.contrastPairs).toContainEqual({
          fg: target.fg,
          bg: target.bg,
          role: "non-text",
          state: "focus",
        });
      }
      expect(contrastResults(doc).filter((result) => !result.pass)).toEqual([]);
    });

    it(`${key} renders one styleguide specimen per registry primitive`, () => {
      const doc = buildFor(key);
      const html = generateStyleguide(doc);

      for (const primitive of componentPrimitiveNames()) {
        expect(html).toContain(`data-specimen="${primitive}"`);
      }
      expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
    });

    it(`${key} pins its batch b component-layer token hash`, () => {
      expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
    });
  }
});

describe("component batch b expression rows", () => {
  it("luxury uses generous padding, thin borders, and subdued primary hover", () => {
    const component = buildFor("luxury").component as any;

    expect(component.button.primary.paddingX.$value).toBe("{primitive.space.lg}");
    expect(component.button.primary.borderWidth.$value).toEqual({ value: 1, unit: "px-base" });
    expect(component.button.primary.background.hover.$value).toBe("{semantic.color.primary.default}");
    expect(component.badge.label.transform.$value).toBe("uppercase");
  });

  it("retro uses square controls, thick borders, and bold labels", () => {
    const component = buildFor("retro").component as any;

    expect(component.button.primary.radius.$value).toEqual({ value: 0, unit: "px-base" });
    expect(component.button.primary.borderWidth.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.card.borderWidth.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.badge.label.weight.$value).toBe("{primitive.font.weight.bold}");
  });

  it("warm-creator uses pill controls and quicker tactile transitions", () => {
    const component = buildFor("warm-creator").component as any;

    expect(component.button.primary.radius.$value).toEqual({ value: 999, unit: "px-base" });
    expect(component.badge.radius.$value).toEqual({ value: 999, unit: "px-base" });
    expect(component.switch.radius.$value).toEqual({ value: 999, unit: "px-base" });
    expect(component.button.primary.transition.$value).toBe("{primitive.duration.fast}");
  });
});
