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
const BATCH = ["enterprise", "pro-emotive", "luxury"] as const;
type BatchKey = (typeof BATCH)[number];

const TOKEN_HASHES: Record<BatchKey, string> = {
  enterprise: "sha256:832623ece673a1fa04e7a071a180b126535c1d15ad231b9fbceeb52ea01ce24d",
  "pro-emotive": "sha256:0c5f752cae9dcd71c9357f7761d3c942a4ac9255f41636557a010345561f1820",
  luxury: "sha256:5884290d9770395ff0805502e1fee524e347ff660be4edbe76b5997c213093fa",
};

function recipe(key: BatchKey): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: BatchKey): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Pattern A", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
  };
}

function buildFor(key: BatchKey): TokensDocument {
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

describe("pattern batch a rollout", () => {
  it("appends enterprise, pro-emotive, and luxury to the P3 rollout after the pilot", () => {
    expect(COMPONENT_P3_ROLLOUT.slice(0, BATCH.length + 1)).toEqual(["minimal-tech", ...BATCH]);
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

  it("records the four-recipe P3 rollout set in contract.json", () => {
    const contract = JSON.parse(buildContractJson(buildFor("enterprise"))) as {
      readonly components: { readonly p3RolloutRecipes: readonly string[] };
    };

    expect(contract.components.p3RolloutRecipes.slice(0, BATCH.length + 1)).toEqual(["minimal-tech", ...BATCH]);
  });

  it("carries enterprise briefing-density pattern deltas", () => {
    const component = buildFor("enterprise").component as any;

    expect(component.hero.paddingX.$value).toBe("{primitive.space.sm}");
    expect(component.hero.paddingY.$value).toBe("{primitive.space.md}");
    expect(component.hero.gap.$value).toBe("{primitive.space.xs}");
    expect(component.pricing.cardRadius.$value).toBe("{primitive.radius.sm}");
    expect(component.pricing.featuredBorder.$value).toBe("{semantic.color.primary.hover}");
    expect(component.featureGrid.cellPadding.$value).toBe("{primitive.space.xs}");
    expect(component.featureGrid.gap.$value).toBe("{primitive.space.xs}");
    expect(component.footer.border.$value).toBe("{semantic.color.primary.default}");
    expect(component.footer.gap.$value).toBe("{primitive.space.xs}");
  });

  it("carries pro-emotive balanced-professional pattern deltas", () => {
    const component = buildFor("pro-emotive").component as any;

    expect(component.hero.paddingX.$value).toBe("{semantic.space.inset}");
    expect(component.hero.gap.$value).toBe("{primitive.space.sm}");
    expect(component.pricing.cardMutedForeground.$value).toBe("{primitive.color.neutral.600}");
    expect(component.pricing.cardRadius.$value).toBe("{semantic.shape.control}");
    expect(component.pricing.gap.$value).toBe("{primitive.space.sm}");
    expect(component.featureGrid.cellPadding.$value).toBe("{primitive.space.sm}");
    expect(component.footer.mutedForeground.$value).toBe("{primitive.color.neutral.600}");
    expect(component.footer.gap.$value).toBe("{primitive.space.sm}");
  });

  it("carries luxury editorial-whitespace pattern deltas", () => {
    const component = buildFor("luxury").component as any;

    expect(component.hero.paddingX.$value).toBe("{primitive.space.lg}");
    expect(component.hero.paddingY.$value).toBe("{primitive.space.lg}");
    expect(component.pricing.cardBorder.$value).toBe("{primitive.color.neutral.100}");
    expect(component.pricing.cardRadius.$value).toEqual({ value: 1, unit: "px-base" });
    expect(component.pricing.cardPadding.$value).toBe("{primitive.space.lg}");
    expect(component.pricing.gap.$value).toBe("{primitive.space.lg}");
    expect(component.featureGrid.cellPadding.$value).toBe("{primitive.space.lg}");
    expect(component.featureGrid.gap.$value).toBe("{primitive.space.lg}");
    expect(component.footer.mutedForeground.$value).toBe("{primitive.color.neutral.600}");
    expect(component.footer.paddingY.$value).toBe("{primitive.space.lg}");
  });

  it.each(BATCH)("pins %s pattern batch a tokenHash", (key) => {
    expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
  });
});
