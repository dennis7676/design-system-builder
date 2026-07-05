import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
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
import type { TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash, flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const BATCH = ["expressive", "creative-multiscale"] as const;
type BatchKey = (typeof BATCH)[number];

const TOKEN_HASHES: Record<BatchKey, string> = {
  expressive: "sha256:31ab781d12ed99dccc94ec066e268c3101494db4181e2e4035de1a6229db1dd8",
  "creative-multiscale": "sha256:abc84e1900747fa2d2f97a02638e24166f96b1ce88a03f1a1287c9192efd3ab3",
};

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Batch C", medium: "web" },
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

describe("component batch c rollout", () => {
  it("adds expressive and creative-multiscale to the P1 rollout set", () => {
    expect(COMPONENT_P1_ROLLOUT).toEqual(expect.arrayContaining([...BATCH]));
    expect(COMPONENT_P1_ROLLOUT.indexOf("creative-multiscale")).toBe(
      COMPONENT_P1_ROLLOUT.indexOf("expressive") + 1,
    );
  });

  it("rolls out every catalog recipe and keeps each component tree parity-green", () => {
    const catalogKeys = RECIPES.map((item) => item.key).sort();
    expect([...COMPONENT_P1_ROLLOUT].sort()).toEqual(catalogKeys);

    for (const key of catalogKeys) {
      const doc = buildFor(key);
      const result = validateTokens(doc);

      expect(pathsInSet(leafPaths(doc), COMPONENT_P1_PATHS)).toEqual([...COMPONENT_P1_PATHS].sort());
      expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
      expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
    }
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

    it(`${key} pins its batch c component-layer token hash`, () => {
      expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
    });
  }
});

describe("component batch c expression rows", () => {
  it("expressive uses high-chroma primary fills, larger radius, gradient button accent, and pronounced transitions", () => {
    const component = buildFor("expressive").component as any;

    expect(component.button.primary.background.default.$type).toBe("gradient");
    expect(component.button.primary.background.default.$value.stops).toEqual([
      "oklch(0.49 0.22 300)",
      "oklch(0.43 0.22 300)",
    ]);
    expect(component.button.primary.radius.$value).toBe("{semantic.shape.control}");
    expect(component.button.primary.paddingY.$value).toBe("{primitive.space.sm}");
    expect(component.button.primary.transition.$value).toBe("{primitive.duration.normal}");
    expect(component.badge.background.$value).toBe("{semantic.color.primary.default}");
  });

  it("creative-multiscale splits tiny mono badges from oversized cards and asymmetric inputs", () => {
    const component = buildFor("creative-multiscale").component as any;

    expect(component.badge.paddingX.$value).toBe("{primitive.space.xs}");
    expect(component.badge.paddingY.$value).toEqual({ value: 1, unit: "px-base" });
    expect(component.badge.label.family.$value).toBe("{primitive.font.family.mono}");
    expect(component.card.padding.$value).toBe("{primitive.space.lg}");
    expect(component.input.paddingX.$value).toBe("{primitive.space.lg}");
    expect(component.input.paddingY.$value).toBe("{primitive.space.xs}");
  });
});
