import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import {
  COMPONENT_P1_PATHS,
  COMPONENT_P2_PATHS,
  COMPONENT_P3_PATTERNS,
  COMPONENT_P3_PATHS,
  COMPONENT_P3_ROLLOUT,
  COMPONENT_STATES,
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
import type { TokensDocument } from "../src/tokens-schema.js";
import { flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Pattern Demo", medium: "web" },
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

function specimen(html: string, name: string): string {
  return new RegExp(`<article class="component-specimen" data-specimen="${name}"[\\s\\S]*?</article>`).exec(html)?.[0] ?? "";
}

describe("P3 pattern registry", () => {
  it("declares the full rollout without expanding component states", () => {
    expect(componentPatternNames()).toEqual(["hero", "pricing", "featureGrid", "footer"]);
    expect(COMPONENT_P3_ROLLOUT).toEqual([
      "minimal-tech",
      "enterprise",
      "pro-emotive",
      "luxury",
      "retro",
      "warm-creator",
      "expressive",
      "creative-multiscale",
      "medical-clinical",
    ]);
    expect(COMPONENT_STATES).toEqual(["default", "hover", "focus", "active", "disabled"]);
    expect(COMPONENT_P3_PATHS).toContain("component.pricing.featuredBackground");
    expect(COMPONENT_P3_PATHS).toContain("component.footer.mutedForeground");
  });

  it("keeps P1, P2, and P3 path parity independent for the pilot", () => {
    const doc = buildFor("minimal-tech");
    const paths = leafPaths(doc);

    expect(pathsInSet(paths, COMPONENT_P1_PATHS)).toEqual([...COMPONENT_P1_PATHS].sort());
    expect(pathsInSet(paths, COMPONENT_P2_PATHS)).toEqual([...COMPONENT_P2_PATHS].sort());
    expect(pathsInSet(paths, COMPONENT_P3_PATHS)).toEqual([...COMPONENT_P3_PATHS].sort());
    expect(paths).toEqual([...COMPONENT_P1_PATHS, ...COMPONENT_P2_PATHS, ...COMPONENT_P3_PATHS].sort());
    expect(validateTokens(doc).findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
  });

  it("names the P1 set when a primitive path is missing", () => {
    const doc = buildFor("minimal-tech");
    delete (doc.component.input as any).border.focus;

    const finding = validateTokens(doc).findings.find(
      (item) => item.code === "component-parity" && item.meta?.set === "P1 registry",
    );

    expect(finding).toEqual(expect.objectContaining({ severity: "error" }));
    expect(finding?.message).toContain("P1 registry");
    expect(finding?.meta?.missing).toContain("component.input.border.focus");
  });

  it("names the P2 set when a composite path is missing", () => {
    const doc = buildFor("minimal-tech");
    delete (doc.component.table as any).rowStripeBackground;

    const finding = validateTokens(doc).findings.find(
      (item) => item.code === "component-parity" && item.meta?.set === "P2 composite registry",
    );

    expect(finding).toEqual(expect.objectContaining({ severity: "error" }));
    expect(finding?.message).toContain("P2 composite registry");
    expect(finding?.meta?.missing).toContain("component.table.rowStripeBackground");
  });

  it("names the P3 set when a pattern path is missing", () => {
    const doc = buildFor("minimal-tech");
    delete (doc.component.pricing as any).featuredBackground;

    const finding = validateTokens(doc).findings.find(
      (item) => item.code === "component-parity" && item.meta?.set === "P3 pattern registry",
    );

    expect(finding).toEqual(expect.objectContaining({ severity: "error" }));
    expect(finding?.message).toContain("P3 pattern registry");
    expect(finding?.meta?.missing).toContain("component.pricing.featuredBackground");
  });

  it("derives pattern contrast pairs from registry-declared targets", () => {
    const doc = buildFor("minimal-tech");

    for (const target of componentPatternContrastTargets()) {
      expect(doc.contrastPairs).toContainEqual({
        fg: target.fg,
        bg: target.bg,
        role: target.role,
        state: "default",
        ...(target.minRatio !== undefined ? { minRatio: target.minRatio } : {}),
      });
    }
    expect(doc.contrastPairs).toContainEqual({
      fg: "component.pricing.featuredBorder",
      bg: "semantic.color.surface.default",
      role: "non-text",
      state: "default",
    });
    expect(contrastResults(doc).filter((result) => !result.pass)).toEqual([]);
  });
});

describe("P3 pattern surfaces and contract", () => {
  it("renders and manifest-gates one var-only specimen for each rolled-out pattern", () => {
    const doc = buildFor("minimal-tech");
    const html = generateStyleguide(doc);

    for (const pattern of componentPatternNames()) {
      const fragment = specimen(html, pattern);
      expect(fragment).toContain(`data-specimen="${pattern}"`);
      expect(fragment).not.toMatch(/#[0-9a-fA-F]{3,8}\b|oklch\(|rgba?\(|hsla?\(|Canvas|CanvasText|color-mix/i);
    }
    expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("fails manifest completeness when a rolled-out pattern specimen is missing", () => {
    const doc = buildFor("minimal-tech");
    const surfaces = surfacesFor(doc);
    const incomplete = {
      ...surfaces,
      styleguideHtml: surfaces.styleguideHtml.replace('data-specimen="pricing"', 'data-specimen="missing-pricing"'),
    };

    expect(checkManifest(doc, incomplete)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "surface-incomplete",
          meta: expect.objectContaining({ surface: "styleguide", element: "components" }),
        }),
      ]),
    );
  });

  it("records the pattern registry snapshot and rollout in contract.json", () => {
    const contract = JSON.parse(buildContractJson(buildFor("minimal-tech"))) as {
      readonly components: {
        readonly p3RolloutRecipes: readonly string[];
        readonly patterns: ReadonlyArray<{
          readonly name: string;
          readonly leafPaths: readonly string[];
          readonly contrastTargets: readonly unknown[];
          readonly exemptions: readonly unknown[];
        }>;
      };
    };
    const pricing = contract.components.patterns.find((entry) => entry.name === "pricing");

    expect(contract.components.p3RolloutRecipes).toEqual([...COMPONENT_P3_ROLLOUT]);
    expect(contract.components.patterns.map((entry) => entry.name)).toEqual(
      COMPONENT_P3_PATTERNS.map((entry) => entry.name),
    );
    expect(pricing?.leafPaths).toContain("featuredBackground");
    expect(pricing?.contrastTargets).toContainEqual(
      expect.objectContaining({
        fg: "component.pricing.featuredBorder",
        bg: "semantic.color.surface.default",
        role: "non-text",
      }),
    );
  });
});

describe("P3 pilot values", () => {
  it("keeps minimal-tech patterns alias-first with explicit archetype deltas", () => {
    const component = buildFor("minimal-tech").component as any;
    const html = generateStyleguide(buildFor("minimal-tech"));

    expect(component.hero.background.$value).toBe("{semantic.color.surface.default}");
    expect(component.pricing.cardBorder.$value).toBe("{primitive.color.neutral.100}");
    expect(component.pricing.cardRadius.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.pricing.featuredBackground.$value).toBe("{semantic.color.primary.default}");
    expect(component.featureGrid.iconForeground.$value).toBe("{semantic.color.primary.default}");
    expect(component.footer.background.$value).toBe("{semantic.color.surface.foreground}");
    expect(html).toContain(".specimen-footer {");
    expect(html).toContain("font-family: var(--primitive-font-family-mono");
    expect(html).toContain("text-transform: uppercase");
  });
});
