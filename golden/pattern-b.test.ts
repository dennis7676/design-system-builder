import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import {
  COMPONENT_P3_PATHS,
  COMPONENT_P3_ROLLOUT,
  componentPatternContrastTargets,
  componentPatternNames,
} from "../src/component-registry.js";
import { buildContractJson } from "../src/contract.js";
import { generateDemo } from "../src/demo-generator.js";
import { generateDesignMd } from "../src/design-md-generator.js";
import { checkManifest } from "../src/manifest.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import { contrastResults } from "../src/surface-data.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { ContrastPair, TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash, flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const PREVIOUS = ["minimal-tech", "enterprise", "pro-emotive", "luxury"] as const;
const BATCH = ["retro", "warm-creator", "expressive", "creative-multiscale"] as const;
type BatchKey = (typeof BATCH)[number];

const TOKEN_HASHES: Record<BatchKey, string> = {
  retro: "sha256:cbeef50c2d177516472ac267bf65887d315a0d24efc8769a35a970f84701efde",
  "warm-creator": "sha256:4f4de0666e57443779a675102a354124bb62ae45fd0c86e1a3f9b3ca5564b199",
  expressive: "sha256:f36a9d63ca675514f48a361b190ad4e0e8e7efb23c0c70372e16e3424e0904fc",
  "creative-multiscale": "sha256:c8ff00bc84368173612274f130042a4f15e0c9a65fe9869ae18d6070c26275fc",
};

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Pattern B", medium: "web" },
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

function patternPairKey(pair: Pick<ContrastPair, "fg" | "bg" | "role" | "state" | "minRatio">): string {
  return `${pair.fg}|${pair.bg}|${pair.role}|${pair.state}|${pair.minRatio ?? ""}`;
}

describe("pattern batch b rollout", () => {
  it("appends the final four recipes to the P3 rollout set", () => {
    expect(COMPONENT_P3_ROLLOUT).toEqual([...PREVIOUS, ...BATCH]);
  });

  it("rolls out every catalog recipe to P3 pattern parity", () => {
    const catalogKeys = RECIPES.map((item) => item.key).sort();
    expect([...COMPONENT_P3_ROLLOUT].sort()).toEqual(catalogKeys);

    for (const key of catalogKeys) {
      const doc = buildFor(key);
      const result = validateTokens(doc);

      expect(pathsInSet(leafPaths(doc), COMPONENT_P3_PATHS)).toEqual([...COMPONENT_P3_PATHS].sort());
      expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
      expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
    }
  });

  it.each(BATCH)("accepts %s exact P3 pattern path parity", (key) => {
    const doc = buildFor(key);
    const result = validateTokens(doc);

    expect(pathsInSet(leafPaths(doc), COMPONENT_P3_PATHS)).toEqual([...COMPONENT_P3_PATHS].sort());
    expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
    expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it.each(BATCH)("derives all 11 pattern contrast pairs and keeps %s floors green", (key) => {
    const doc = buildFor(key);
    const targets = componentPatternContrastTargets();
    const expected = targets.map((target) => ({
      fg: target.fg,
      bg: target.bg,
      role: target.role,
      state: "default" as const,
      ...(target.minRatio !== undefined ? { minRatio: target.minRatio } : {}),
    }));
    const actual = new Set(doc.contrastPairs.map(patternPairKey));

    expect(targets).toHaveLength(11);
    for (const pair of expected) {
      expect(actual.has(patternPairKey(pair))).toBe(true);
    }
    expect(contrastResults(doc).filter((result) => !result.pass)).toEqual([]);
  });

  it.each(BATCH)("renders one %s styleguide specimen per pattern and passes manifest completeness", (key) => {
    const doc = buildFor(key);
    const html = generateStyleguide(doc);

    for (const pattern of componentPatternNames()) {
      expect(html).toContain(`data-specimen="${pattern}"`);
    }
    expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("records the eight-recipe P3 rollout set in contract.json", () => {
    const contract = JSON.parse(buildContractJson(buildFor("retro"))) as {
      readonly components: { readonly p3RolloutRecipes: readonly string[] };
    };

    expect(contract.components.p3RolloutRecipes).toEqual([...PREVIOUS, ...BATCH]);
  });

  it("carries retro poster-rhythm pattern deltas", () => {
    const component = buildFor("retro").component as any;

    expect(component.hero.background.$type).toBe("gradient");
    expect(component.hero.background.$value).toBe("{semantic.gradient.hero}");
    expect(component.pricing.cardBorder.$value).toBe("{semantic.color.surface.foreground}");
    expect(component.pricing.cardRadius.$value).toEqual({ value: 0, unit: "px-base" });
    expect(component.pricing.featuredBackground.$value).toBe("{semantic.color.surface.foreground}");
    expect(component.featureGrid.background.$value).toBe("{semantic.color.accent.default}");
    expect(component.footer.background.$value).toBe("{semantic.color.surface.foreground}");
    expect(component.footer.border.$value).toBe("{semantic.color.primary.default}");
    expect(component.footer.gap.$value).toBe("{primitive.space.xs}");
  });

  it("carries warm-creator organic pattern deltas", () => {
    const component = buildFor("warm-creator").component as any;

    expect(component.hero.gap.$value).toBe("{primitive.space.md}");
    expect(component.pricing.cardRadius.$value).toBe("{semantic.shape.control}");
    expect(component.pricing.gap.$value).toBe("{primitive.space.md}");
    expect(component.featureGrid.background.$value).toBe("{primitive.color.neutral.100}");
    expect(component.featureGrid.cellPadding.$value).toBe("{primitive.space.md}");
    expect(component.featureGrid.gap.$value).toBe("{primitive.space.md}");
    expect(component.footer.paddingY.$value).toBe("{primitive.space.lg}");
    expect(component.footer.gap.$value).toBe("{primitive.space.md}");
  });

  it("carries expressive loud pattern deltas", () => {
    const component = buildFor("expressive").component as any;

    expect(component.hero.background.$type).toBe("gradient");
    expect(component.hero.background.$value).toBe("{semantic.gradient.hero}");
    expect(component.pricing.cardBorder.$value).toBe("{semantic.color.primary.default}");
    expect(component.pricing.cardRadius.$value).toBe("{semantic.shape.control}");
    expect(component.pricing.featuredBackground.$value).toBe("{semantic.color.primary.default}");
    expect(component.pricing.featuredBorder.$value).toBe("{semantic.color.primary.hover}");
    expect(component.featureGrid.cellPadding.$value).toBe("{primitive.space.lg}");
    expect(component.footer.background.$value).toBe("{semantic.color.primary.default}");
  });

  it("carries creative-multiscale split-scale pattern deltas", () => {
    const component = buildFor("creative-multiscale").component as any;

    expect(component.hero.paddingX.$value).toBe("{primitive.space.sm}");
    expect(component.hero.paddingY.$value).toBe("{primitive.space.lg}");
    expect(component.hero.gap.$value).toBe("{primitive.space.xs}");
    expect(component.pricing.cardRadius.$value).toBe("{primitive.radius.sm}");
    expect(component.pricing.gap.$value).toBe("{primitive.space.lg}");
    expect(component.featureGrid.cellPadding.$value).toBe("{primitive.space.xs}");
    expect(component.featureGrid.gap.$value).toBe("{primitive.space.xs}");
    expect(component.footer.gap.$value).toBe("{primitive.space.xs}");
  });

  it.each(BATCH)("pins %s pattern batch b tokenHash", (key) => {
    expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
  });
});
