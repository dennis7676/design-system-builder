import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import {
  COMPONENT_P1_PATHS,
  COMPONENT_P1_REGISTRY,
  COMPONENT_P1_ROLLOUT,
  componentContrastTargets,
  componentFocusTargets,
  componentPaths,
  componentPrimitiveNames,
  type ComponentPrimitiveDefinition,
} from "../src/component-registry.js";
import { checkManifest } from "../src/manifest.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { generateDemo } from "../src/demo-generator.js";
import { generateDesignMd } from "../src/design-md-generator.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import { resolveValue, tokenMap } from "../src/surface-data.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash, flatten, validateTokens } from "../src/validator.js";
import { parseOklch } from "../src/color.js";
import { buildContractJson } from "../src/contract.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const KEYSTONE_HASH = "sha256:3da1c49f68f7ab672b314d8200ed395ba4a66f3b0a3cb6b29e42292c31455e47";

const NON_ROLLOUT_BUILD_SHA256: Record<string, string> = {
  enterprise: "e2682eadfc7a0aa77372f85adcd7850a32000125f296b03a4280694c6b8d0d26",
  expressive: "8f8b477ddf1da9b8cef805d556949597ec157e586947fb71282dd51d43fcea42",
  "pro-emotive": "dd888d7016dd365c7539ecfc9565f92cb2b6eb4605732a0321034829a483279d",
  "creative-multiscale": "ab68a8d0698410f5f73acc3ca0026f64b66a37d48fadc6c930ca6ae4d2e18154",
  "warm-creator": "3e00d8969b99ddbd1d331139e827465876d5f4f1530744d20f35334ba8d16b5c",
  luxury: "3e21afeff32fcd0b216078393ccb88789bd5e9befc3d358fdaad1382fbe8532f",
  retro: "20c239fd99bbc0b809b4ccda78142c1a347b71bbdb6a5855195079f8183c8f46",
};

function recipe(key: string): Recipe {
  const found = RECIPES.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
}

function brandFor(key: string, extra: Partial<BrandJson> = {}): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...extra,
  } as BrandJson;
}

function buildFor(key: string, extra: Partial<BrandJson> = {}): TokensDocument {
  return buildTokens(brandFor(key, extra), recipe(key));
}

function leafPaths(doc: TokensDocument): readonly string[] {
  return [...flatten(doc.component, "component").keys()].sort();
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function surfacesFor(doc: TokensDocument) {
  return {
    styleguideHtml: generateStyleguide(doc),
    designMd: generateDesignMd(doc),
    demoHtml: generateDemo(doc),
    contractJson: buildContractJson(doc),
  };
}

function colorValue(doc: TokensDocument, path: string): string {
  const value = resolveValue(path, tokenMap(doc));
  if (typeof value !== "string") throw new Error(`expected color at ${path}`);
  return value;
}

describe("component registry", () => {
  it("drives parity paths, contrast targets, focus targets, and specimen expectations", () => {
    const synthetic = {
      name: "meter",
      baseProperties: ["radius"],
      stateProperties: ["background", "foreground", "border"],
      contrastRole: "text",
      focusIndicator: "border",
    } as const satisfies ComponentPrimitiveDefinition;
    const registry = [...COMPONENT_P1_REGISTRY, synthetic];

    expect(componentPaths(registry)).toContain("component.meter.border.focus");
    expect(componentContrastTargets(registry)).toContainEqual(
      expect.objectContaining({
        primitive: "meter",
        state: "active",
        fg: "component.meter.foreground.active",
        bg: "component.meter.background.active",
      }),
    );
    expect(componentFocusTargets(registry)).toContainEqual(
      expect.objectContaining({
        primitive: "meter",
        fg: "component.meter.border.focus",
        bg: "component.meter.background.focus",
        role: "non-text",
      }),
    );
    expect(componentPrimitiveNames(registry)).toContain("meter");
  });
});

describe("component parity gate", () => {
  it("accepts the pilot recipe exact path set", () => {
    const doc = buildFor("minimal-tech");
    expect(leafPaths(doc)).toEqual([...COMPONENT_P1_PATHS].sort());
    expect(validateTokens(doc).findings.filter((finding) => finding.code === "component-parity")).toEqual([]);
  });

  it("fails loudly when a rolled-out recipe omits component.input.border.focus", () => {
    const doc = buildFor("minimal-tech");
    delete (doc.component.input as any).border.focus;
    const finding = validateTokens(doc).findings.find((item) => item.code === "component-parity");
    expect(finding).toEqual(expect.objectContaining({ severity: "error" }));
    expect(finding?.message).toContain("component.input.border.focus");
    expect(finding?.meta?.missing).toContain("component.input.border.focus");
  });

  it("fails loudly when a rolled-out recipe carries an extra component path", () => {
    const doc = buildFor("minimal-tech");
    (doc.component.input as any).border.extra = {
      $type: "color",
      $value: "{semantic.color.primary.default}",
      $class: "adapter-derived",
    };
    const finding = validateTokens(doc).findings.find((item) => item.code === "component-parity");
    expect(finding).toEqual(expect.objectContaining({ severity: "error" }));
    expect(finding?.message).toContain("component.input.border.extra");
    expect(finding?.meta?.extra).toContain("component.input.border.extra");
  });

  it("keeps every non-rollout recipe byte-identical to the pre-change token build", () => {
    // Pins self-retire as batches land: once a recipe joins COMPONENT_P1_ROLLOUT
    // its byte-identity guarantee is deliberately released (its component tree grows).
    for (const [key, expected] of Object.entries(NON_ROLLOUT_BUILD_SHA256)) {
      if (COMPONENT_P1_ROLLOUT.includes(key)) continue;
      const doc = buildFor(key);
      expect(sha256(JSON.stringify(doc, null, 2)), key).toBe(expected);
    }
  });
});

describe("generic component contrast pairs", () => {
  it("derives every interactive state pair and focus indicator pair from the registry", () => {
    const doc = buildFor("minimal-tech");
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
  });

  it("records disabled-state contrast exemptions without failing the build", () => {
    const doc = buildFor("minimal-tech");
    (doc.component.button as any).primary.foreground.disabled.$value = "{primitive.color.neutral.100}";
    const result = validateTokens(doc);
    const exemption = result.findings.find(
      (finding) =>
        finding.code === "contrast-exempt" &&
        finding.meta?.state === "disabled" &&
        finding.meta?.role === "text" &&
        finding.meta?.ratio === 1,
    );

    expect(result.ok).toBe(true);
    expect(exemption).toEqual(
      expect.objectContaining({
        severity: "info",
        meta: expect.objectContaining({
          requiredWithoutExemption: 4.5,
          exemption: expect.stringContaining("WCAG 1.4.3"),
        }),
      }),
    );
  });

  it("gates focus indicators at non-text 3:1 against the focus background", () => {
    const doc = buildFor("minimal-tech");
    (doc.component.input as any).border.focus.$value = "{primitive.color.neutral.100}";
    const finding = validateTokens(doc).findings.find(
      (item) =>
        item.code === "contrast-fail" &&
        item.meta?.role === "non-text" &&
        item.meta?.state === "focus",
    );

    expect(finding).toEqual(
      expect.objectContaining({
        severity: "error",
        meta: expect.objectContaining({ required: 3 }),
      }),
    );
  });
});

describe("component specimen gallery", () => {
  it("renders one styleguide specimen per registry primitive", () => {
    const doc = buildFor("minimal-tech");
    const html = generateStyleguide(doc);

    for (const primitive of componentPrimitiveNames()) {
      expect(html).toContain(`data-specimen="${primitive}"`);
    }
    expect(checkManifest(doc, surfacesFor(doc)).filter((finding) => finding.severity === "error")).toEqual([]);
  });

  it("manifest completeness fails when a registry primitive specimen is missing", () => {
    const doc = buildFor("minimal-tech");
    const surfaces = surfacesFor(doc);
    const incomplete = {
      ...surfaces,
      styleguideHtml: surfaces.styleguideHtml.replace('data-specimen="divider"', 'data-specimen="missing-divider"'),
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
});

describe("alias-first component values", () => {
  it("absorbs the six legacy button leaves into the primary variant/state shape", () => {
    const button = (buildFor("minimal-tech").component.button as any).primary;

    expect(button.background.default.$value).toBe("{semantic.color.primary.default}");
    expect(button.background.hover.$value).toBe("{semantic.color.primary.hover}");
    expect(button.foreground.default.$value).toBe("{semantic.color.primary.foreground}");
    expect(button.paddingX.$value).toBe("{semantic.space.inset}");
    expect(button.transition.$value).toBe("{semantic.motion.transition}");
    expect(button.radius.$value).toEqual({ value: 2, unit: "px-base" });
  });

  it("lets accent hue rotation flow through component color leaves", () => {
    const doc = buildTokens(
      brandFor("minimal-tech", { overrides: { "visual.accent": 110 } }),
      recipe("minimal-tech"),
    );
    const semantic = parseOklch(colorValue(doc, "semantic.color.primary.default"));
    const button = parseOklch(colorValue(doc, "component.button.primary.background.default"));
    const link = parseOklch(colorValue(doc, "component.link.foreground.default"));

    expect(validateTokens(doc).ok).toBe(true);
    expect(semantic?.H).toBe(110);
    expect(button?.H).toBe(110);
    expect(link?.H).toBe(110);
  });
});

describe("keystone rebaseline", () => {
  it("pins the new minimal-tech component-layer token hash", () => {
    const built = buildTokens(brandFor("minimal-tech"), recipe("minimal-tech"), { generatedAt: SAMPLE.meta.generatedAt });

    expect(computeTokenHash(SAMPLE)).toBe(KEYSTONE_HASH);
    expect(computeTokenHash(built)).toBe(KEYSTONE_HASH);
    expect(SAMPLE.contrastPairs).toHaveLength(57);
    expect(leafPaths(SAMPLE)).toEqual([...COMPONENT_P1_PATHS].sort());
  });
});
