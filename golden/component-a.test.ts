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
import { checkManifest } from "../src/manifest.js";
import { generateDemo } from "../src/demo-generator.js";
import { generateDesignMd } from "../src/design-md-generator.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash, flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const BATCH = ["enterprise", "pro-emotive"] as const;
type BatchKey = (typeof BATCH)[number];

const TOKEN_HASHES: Record<BatchKey, string> = {
  enterprise: "sha256:6db24f210b320dabc85df376541504998b82da776b81df9a4fcbbca8e2a38252",
  "pro-emotive": "sha256:fb15cd36b87d8ac2f8cc16d08b893ea1e194a9594734758be89363c59e91882a",
};

function recipe(key: BatchKey): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: BatchKey): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
  } as BrandJson;
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

describe("component batch a rollout", () => {
  it("appends enterprise and pro-emotive to the P1 rollout after the pilot", () => {
    const rollout = [...COMPONENT_P1_ROLLOUT];
    expect(rollout).toEqual(expect.arrayContaining([...BATCH]));
    expect(rollout.indexOf("enterprise")).toBeGreaterThan(rollout.indexOf("minimal-tech"));
    expect(rollout.indexOf("pro-emotive")).toBe(rollout.indexOf("enterprise") + 1);
  });

  it.each(BATCH)("accepts %s exact P1 component path parity", (key) => {
    const doc = buildFor(key);
    const result = validateTokens(doc);

    expect(pathsInSet(leafPaths(doc), COMPONENT_P1_PATHS)).toEqual([...COMPONENT_P1_PATHS].sort());
    expect(result.findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it.each(BATCH)("derives every component contrast pair and keeps %s floors green", (key) => {
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
        role: target.role,
        state: target.state,
      });
    }
    expect(validateTokens(doc).findings.filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it.each(BATCH)("renders one %s styleguide specimen per registry primitive", (key) => {
    const doc = buildFor(key);
    const html = generateStyleguide(doc);

    for (const primitive of componentPrimitiveNames()) {
      expect(html).toContain(`data-specimen="${primitive}"`);
    }
    expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("carries enterprise density, top-rule, and strong focus-ring deltas", () => {
    const component = buildFor("enterprise").component as any;

    expect(component.button.primary.paddingX.$value).toBe("{primitive.space.sm}");
    expect(component.button.primary.borderWidth.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.button.primary.radius.$value).toBe("{primitive.radius.sm}");
    expect(component.input.borderPlacement.$value).toBe("top");
    expect(component.input.borderWidth.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.divider.thickness.$value).toEqual({ value: 2, unit: "px-base" });
  });

  it("carries pro-emotive medium radius, elevation-ready card, and calm timing", () => {
    const doc = buildFor("pro-emotive");
    const component = doc.component as any;
    const semantic = doc.semantic as any;

    expect(component.button.primary.radius.$value).toBe("{semantic.shape.control}");
    expect(component.button.primary.transition.$value).toBe("{semantic.motion.transition}");
    expect(component.card.radius.$value).toBe("{semantic.shape.control}");
    expect(component.card.padding.$value).toBe("{semantic.space.inset}");
    expect(semantic.elevation.raised.$value).toBe("{primitive.shadow.md}");
  });

  it.each(BATCH)("pins %s tokenHash", (key) => {
    expect(computeTokenHash(buildFor(key))).toBe(TOKEN_HASHES[key]);
  });
});
