import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import {
  COMPONENT_P2_PATHS,
  COMPONENT_P2_ROLLOUT,
  componentCompositeContrastTargets,
  componentCompositeNames,
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
  enterprise: "sha256:6db24f210b320dabc85df376541504998b82da776b81df9a4fcbbca8e2a38252",
  "pro-emotive": "sha256:fb15cd36b87d8ac2f8cc16d08b893ea1e194a9594734758be89363c59e91882a",
  luxury: "sha256:3f28f6ce32244018d257c2799e857ad531258417e23cb80c87efce2ba1277981",
};

function recipe(key: BatchKey): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: BatchKey): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Composite A", medium: "web" },
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

function compositePairKey(pair: Pick<ContrastPair, "fg" | "bg" | "role" | "state" | "minRatio">): string {
  return `${pair.fg}|${pair.bg}|${pair.role}|${pair.state}|${pair.minRatio ?? ""}`;
}

describe("composite batch a rollout", () => {
  it("appends enterprise, pro-emotive, and luxury to the P2 rollout after the pilot", () => {
    expect(COMPONENT_P2_ROLLOUT).toEqual(["minimal-tech", ...BATCH]);
  });

  it.each(BATCH)("accepts %s exact P2 composite path parity", (key) => {
    const doc = buildFor(key);
    const result = validateTokens(doc);

    expect(pathsInSet(leafPaths(doc), COMPONENT_P2_PATHS)).toEqual([...COMPONENT_P2_PATHS].sort());
    expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
    expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it.each(BATCH)("derives all 10 composite contrast pairs and keeps %s floors green", (key) => {
    const doc = buildFor(key);
    const targets = componentCompositeContrastTargets();
    const expected = targets.map((target) => ({
      fg: target.fg,
      bg: target.bg,
      role: target.role,
      state: "default" as const,
      ...(target.minRatio !== undefined ? { minRatio: target.minRatio } : {}),
    }));
    const actual = new Set(doc.contrastPairs.map(compositePairKey));

    expect(targets).toHaveLength(10);
    for (const pair of expected) {
      expect(actual.has(compositePairKey(pair))).toBe(true);
    }
    expect(contrastResults(doc).filter((result) => !result.pass)).toEqual([]);
  });

  it.each(BATCH)("renders one %s styleguide specimen per composite and passes manifest completeness", (key) => {
    const doc = buildFor(key);
    const html = generateStyleguide(doc);

    for (const composite of componentCompositeNames()) {
      expect(html).toContain(`data-specimen="${composite}"`);
    }
    expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("records the four-recipe P2 rollout set in contract.json", () => {
    const contract = JSON.parse(buildContractJson(buildFor("enterprise"))) as {
      readonly components: { readonly p2RolloutRecipes: readonly string[] };
    };

    expect(contract.components.p2RolloutRecipes).toEqual(["minimal-tech", ...BATCH]);
  });

  it("carries enterprise briefing-density composite deltas", () => {
    const component = buildFor("enterprise").component as any;

    expect(component.nav.border.$value).toBe("{semantic.color.primary.default}");
    expect(component.nav.paddingY.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.table.cellPaddingX.$value).toBe("{primitive.space.xs}");
    expect(component.table.cellPaddingY.$value).toEqual({ value: 4, unit: "px-base" });
    expect(component.modal.panelRadius.$value).toBe("{primitive.radius.sm}");
    expect(component.modal.padding.$value).toBe("{primitive.space.sm}");
    expect(component.formRow.errorBorder.$value).toBe("{semantic.color.primary.hover}");
  });

  it("carries pro-emotive balanced-professional composite deltas", () => {
    const component = buildFor("pro-emotive").component as any;

    expect(component.table.rowStripeBackground.$value).toBe("{semantic.color.surface.default}");
    expect(component.table.rowHoverBackground.$value).toBe("{primitive.color.neutral.100}");
    expect(component.table.cellPaddingY.$value).toEqual({ value: 8, unit: "px-base" });
    expect(component.modal.panelRadius.$value).toBe("{semantic.shape.control}");
    expect(component.modal.panelShadow.$value).toBe("{semantic.elevation.raised}");
    expect(component.formRow.gap.$value).toBe("{primitive.space.sm}");
  });

  it("carries luxury editorial-whitespace composite deltas", () => {
    const component = buildFor("luxury").component as any;

    expect(component.nav.paddingX.$value).toBe("{primitive.space.lg}");
    expect(component.nav.paddingY.$value).toBe("{primitive.space.sm}");
    expect(component.table.border.$value).toBe("{primitive.color.neutral.100}");
    expect(component.table.rowStripeBackground.$value).toBe("{primitive.color.neutral.100}");
    expect(component.table.cellPaddingX.$value).toBe("{primitive.space.lg}");
    expect(component.table.cellPaddingY.$value).toBe("{primitive.space.sm}");
    expect(component.modal.padding.$value).toBe("{primitive.space.lg}");
  });

  it.each(BATCH)("pins %s composite batch a tokenHash", (key) => {
    expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
  });
});
