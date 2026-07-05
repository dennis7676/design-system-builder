import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import {
  COMPONENT_P1_PATHS,
  COMPONENT_P2_COMPOSITES,
  COMPONENT_P2_PATHS,
  COMPONENT_P2_ROLLOUT,
  COMPONENT_STATES,
  componentCompositeContrastTargets,
  componentCompositeNames,
} from "../src/component-registry.js";
import { buildContractJson } from "../src/contract.js";
import { generateDemo } from "../src/demo-generator.js";
import { generateDesignMd } from "../src/design-md-generator.js";
import { checkManifest } from "../src/manifest.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokensDocument } from "../src/tokens-schema.js";
import { flatten, validateTokens } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));

const NON_P2_BUILD_SHA256: Record<string, string> = {
  enterprise: "bedc6dd5a0bdc295f045fdde41fc512f1428917ac08ddf8cc7b02e4e4121be44",
  expressive: "77a9984cff523323a12c16a29f282e1e641e07dc3107e34a3cc47fc5021917a3",
  "pro-emotive": "ada1ce06ee820378a35bf53a62827ea760e24260a0827b6730f51bdd2e867927",
  "creative-multiscale": "bc425f42f493f7a04b844907e1463856b155e179282392c93ce4b3931e61914e",
  "warm-creator": "92bed21f8be440203a3915bab6f8451d65a04e73e753f53d3c0da6cdbe25a01d",
  luxury: "f8ecabe88cb9a33d554e201abbde1faa38809660f1b1cae3093f71ce59da7114",
  retro: "756501b28c03483ec95d07128cf82bc384e8fa741a7234bafd1650790e207eb8",
};

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Composite Demo", medium: "web" },
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

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

describe("P2 composite registry", () => {
  it("declares the fixed pilot set without expanding component states", () => {
    expect(componentCompositeNames()).toEqual(["nav", "table", "modal", "formRow"]);
    expect(COMPONENT_P2_ROLLOUT).toEqual(["minimal-tech"]);
    expect(COMPONENT_STATES).toEqual(["default", "hover", "focus", "active", "disabled"]);
    expect(COMPONENT_P2_PATHS).toContain("component.table.rowHoverBackground");
    expect(COMPONENT_P2_PATHS).toContain("component.formRow.errorForeground");
  });

  it("keeps P1 and P2 path parity independent for the pilot", () => {
    const doc = buildFor("minimal-tech");
    const paths = leafPaths(doc);

    expect(pathsInSet(paths, COMPONENT_P1_PATHS)).toEqual([...COMPONENT_P1_PATHS].sort());
    expect(pathsInSet(paths, COMPONENT_P2_PATHS)).toEqual([...COMPONENT_P2_PATHS].sort());
    expect(validateTokens(doc).findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
  });

  it("names the P1 set when a P1 path is missing", () => {
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

  it("derives composite contrast pairs from registry-declared targets", () => {
    const doc = buildFor("minimal-tech");

    for (const target of componentCompositeContrastTargets()) {
      expect(doc.contrastPairs).toContainEqual({
        fg: target.fg,
        bg: target.bg,
        role: target.role,
        state: "default",
        ...(target.minRatio !== undefined ? { minRatio: target.minRatio } : {}),
      });
    }
    expect(doc.contrastPairs).toContainEqual({
      fg: "component.table.cellForeground",
      bg: "component.table.rowHoverBackground",
      role: "text",
      state: "default",
    });
  });

  it("records modal overlayBackground as an explicit decorative contrast exemption", () => {
    const result = validateTokens(buildFor("minimal-tech"));
    const exemption = result.findings.find(
      (finding) => finding.code === "contrast-exempt" && finding.path === "component.modal.overlayBackground",
    );

    expect(result.ok).toBe(true);
    expect(exemption).toEqual(
      expect.objectContaining({
        severity: "info",
        meta: expect.objectContaining({
          role: "non-text",
          state: "default",
          exemption: expect.stringContaining("WCAG 1.4.3"),
        }),
      }),
    );
  });
});

describe("P2 composite surfaces and contract", () => {
  it("renders and manifest-gates one specimen for each rolled-out composite", () => {
    const doc = buildFor("minimal-tech");
    const html = generateStyleguide(doc);

    for (const composite of componentCompositeNames()) {
      expect(html).toContain(`data-specimen="${composite}"`);
    }
    expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("fails manifest completeness when a rolled-out composite specimen is missing", () => {
    const doc = buildFor("minimal-tech");
    const surfaces = surfacesFor(doc);
    const incomplete = {
      ...surfaces,
      styleguideHtml: surfaces.styleguideHtml.replace('data-specimen="table"', 'data-specimen="missing-table"'),
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

  it("records the composite registry snapshot and rollout in contract.json", () => {
    const contract = JSON.parse(buildContractJson(buildFor("minimal-tech"))) as {
      readonly components: {
        readonly p2RolloutRecipes: readonly string[];
        readonly composites: ReadonlyArray<{
          readonly name: string;
          readonly leafPaths: readonly string[];
          readonly contrastTargets: readonly unknown[];
          readonly exemptions: readonly unknown[];
        }>;
      };
    };
    const modal = contract.components.composites.find((entry) => entry.name === "modal");

    expect(contract.components.p2RolloutRecipes).toEqual([...COMPONENT_P2_ROLLOUT]);
    expect(contract.components.composites.map((entry) => entry.name)).toEqual(
      COMPONENT_P2_COMPOSITES.map((entry) => entry.name),
    );
    expect(modal?.leafPaths).toContain("overlayBackground");
    expect(modal?.exemptions).toEqual([
      expect.objectContaining({ path: "component.modal.overlayBackground" }),
    ]);
  });
});

describe("P2 pilot values and rollout isolation", () => {
  it("keeps minimal-tech composites alias-first with explicit archetype deltas", () => {
    const component = buildFor("minimal-tech").component as any;
    const html = generateStyleguide(buildFor("minimal-tech"));

    expect(component.nav.background.$value).toBe("{semantic.color.surface.default}");
    expect(component.table.border.$value).toBe("{primitive.color.neutral.100}");
    expect(component.modal.panelBackground.$value).toBe("{semantic.color.surface.default}");
    expect(component.modal.panelRadius.$value).toEqual({ value: 2, unit: "px-base" });
    expect(component.modal.panelShadow.$value).toBe("none");
    expect(component.formRow.errorBorder.$value).toBe("{semantic.color.primary.default}");
    expect(html).toContain(".specimen-nav {");
    expect(html).toContain("font-family: var(--primitive-font-family-mono");
    expect(html).toContain("text-transform: uppercase");
  });

  it("keeps recipes outside COMPONENT_P2_ROLLOUT byte-identical", () => {
    for (const [key, expected] of Object.entries(NON_P2_BUILD_SHA256)) {
      expect(COMPONENT_P2_ROLLOUT).not.toContain(key);
      expect(sha256(JSON.stringify(buildFor(key), null, 2)), key).toBe(expected);
    }
  });
});
