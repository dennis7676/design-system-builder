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
    product: { name: "Composite B", medium: "web" },
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

function compositePairKey(pair: Pick<ContrastPair, "fg" | "bg" | "role" | "state" | "minRatio">): string {
  return `${pair.fg}|${pair.bg}|${pair.role}|${pair.state}|${pair.minRatio ?? ""}`;
}

describe("composite batch b rollout", () => {
  it("appends the final four recipes to the P2 rollout set", () => {
    expect(COMPONENT_P2_ROLLOUT).toEqual([...PREVIOUS, ...BATCH, "medical-clinical"]);
  });

  it("rolls out every catalog recipe to P2 composite parity", () => {
    const catalogKeys = RECIPES.map((item) => item.key).sort();
    expect([...COMPONENT_P2_ROLLOUT].sort()).toEqual(catalogKeys);

    for (const key of catalogKeys) {
      const doc = buildFor(key);
      const result = validateTokens(doc);

      expect(pathsInSet(leafPaths(doc), COMPONENT_P2_PATHS)).toEqual([...COMPONENT_P2_PATHS].sort());
      expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
      expect(result.findings.filter((finding) => finding.severity === "error")).toEqual([]);
    }
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

  it("records the eight-recipe P2 rollout set in contract.json", () => {
    const contract = JSON.parse(buildContractJson(buildFor("retro"))) as {
      readonly components: { readonly p2RolloutRecipes: readonly string[] };
    };

    expect(contract.components.p2RolloutRecipes).toEqual([...PREVIOUS, ...BATCH, "medical-clinical"]);
  });

  it("carries retro poster-rhythm composite deltas", () => {
    const component = buildFor("retro").component as any;

    expect(component.nav.background.$value).toBe("{semantic.color.surface.foreground}");
    expect(component.table.border.$value).toBe("{semantic.color.surface.foreground}");
    expect(component.table.rowHoverBackground.$value).toBe("{semantic.color.accent.default}");
    expect(component.table.cellPaddingY.$value).toEqual({ value: 4, unit: "px-base" });
    expect(component.modal.panelRadius.$value).toEqual({ value: 0, unit: "px-base" });
    expect(component.modal.panelShadow.$value).toBe("8px 8px 0 oklch(0.25 0.02 55 / 0.88)");
    expect(component.formRow.errorBorder.$value).toBe("{semantic.color.primary.hover}");
  });

  it("carries warm-creator organic composite deltas", () => {
    const component = buildFor("warm-creator").component as any;

    expect(component.nav.paddingX.$value).toBe("{semantic.space.inset}");
    expect(component.table.rowHoverBackground.$value).toBe("{primitive.color.neutral.100}");
    expect(component.table.cellPaddingY.$value).toEqual({ value: 8, unit: "px-base" });
    expect(component.modal.panelRadius.$value).toBe("{semantic.shape.control}");
    expect(component.modal.panelShadow.$value).toBe("{semantic.elevation.raised}");
    expect(component.formRow.gap.$value).toBe("{primitive.space.md}");
  });

  it("carries expressive high-chroma composite deltas", () => {
    const component = buildFor("expressive").component as any;

    expect(component.nav.background.$value).toBe("{semantic.color.primary.default}");
    expect(component.nav.foreground.$value).toBe("{semantic.color.primary.foreground}");
    expect(component.table.rowStripeBackground.$type).toBe("gradient");
    expect(component.table.rowStripeBackground.$value).toBe("{semantic.gradient.hero}");
    expect(component.modal.panelBackground.$type).toBe("gradient");
    expect(component.modal.panelBackground.$value).toBe("{semantic.gradient.hero}");
    expect(component.modal.panelShadow.$value).toBe("{semantic.elevation.overlay}");
  });

  it("carries creative-multiscale split-scale composite deltas", () => {
    const component = buildFor("creative-multiscale").component as any;

    expect(component.nav.paddingY.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.table.cellPaddingX.$value).toBe("{primitive.space.xs}");
    expect(component.table.cellPaddingY.$value).toEqual({ value: 3, unit: "px-base" });
    expect(component.modal.padding.$value).toBe("{primitive.space.lg}");
    expect(component.modal.panelShadow.$value).toBe("{semantic.elevation.overlay}");
    expect(component.formRow.gap.$value).toBe("{primitive.space.lg}");
  });

  it.each(BATCH)("pins %s composite batch b tokenHash", (key) => {
    expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
  });
});
