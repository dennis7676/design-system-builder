import { describe, expect, it } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildTokens } from "../src/tokens-builder.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { computeTokenHash, validateTokens } from "../src/validator.js";
import { generateDemo, generateStyleguide } from "../src/index.js";
import type { BrandJson, ToneVector } from "../src/brand-schema.js";
import type { ContrastPair, TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const GLASS_TOKEN_HASH = "sha256:6fe323021f4a6535be5c863d8bf61e44b24e52ab99eeebea920cede44b517d65";

const minimalTone: ToneVector = {
  static_dynamic: 2,
  cold_warm: 3,
  serious_playful: 3,
  classic_cutting_edge: 5,
  minimal_rich: 2,
};

const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

function brandFor(key: string, extra: Partial<BrandJson> = {}): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...extra,
  } as BrandJson;
}

function glassDoc(): TokensDocument {
  return buildTokens(brandFor("minimal-tech", { branding: { tone_vector: minimalTone }, edges: ["glass"] }), recipe("minimal-tech"));
}

function glassFindings(doc: TokensDocument): ReturnType<typeof validateTokens>["findings"] {
  return validateTokens(doc).findings.filter((finding) => finding.code.startsWith("glass-"));
}

function setGlassFixture(
  doc: TokensDocument,
  input: {
    readonly fill: string;
    readonly opacity: number;
    readonly fg: string;
    readonly pair?: Partial<ContrastPair>;
  },
): void {
  (doc.semantic as any).glass.surface.fill.$value = input.fill;
  (doc.semantic as any).glass.surface.opacity.$value = input.opacity;
  (doc.semantic as any).color.primary.foreground.$value = input.fg;
  doc.contrastPairs = [
    {
      fg: "semantic.color.primary.foreground",
      bg: "semantic.glass.surface.fill",
      role: "text",
      state: "default",
      ...input.pair,
    },
  ];
}

describe("glass edge tokens", () => {
  it("emits semantic.glass.surface, registers coverage, and keeps a stable hash", () => {
    const doc = glassDoc();
    const surface = (doc.semantic as any).glass.surface;
    expect(surface.fill.$value).toBe("{semantic.color.surface.foreground}");
    expect(surface.opacity.$value).toBe(0.88);
    expect(surface.blur.$value).toEqual({ value: 18, unit: "px-base" });
    expect(surface.border.$value).toBe("{semantic.color.primary.foreground}");
    expect(doc.meta.philosophy.principles).toContain("High-opacity glass stays legible over unknown backdrops");
    expect(doc.meta.philosophy.decisionTrace).toContainEqual(
      expect.objectContaining({
        axis: "edge.glass",
        value: "glass.v1",
        coversTokenPath: ["semantic.glass.surface.*"],
      }),
    );
    expect(doc.contrastPairs).toContainEqual({
      fg: "semantic.color.primary.foreground",
      bg: "semantic.glass.surface.fill",
      role: "text",
      state: "default",
    });
    expect(validateTokens(doc).ok).toBe(true);
    expect(glassFindings(doc)).toEqual([]);
    expect(computeTokenHash(doc)).toBe(GLASS_TOKEN_HASH);
  });

  it("demo and styleguide consume glass through vars only", () => {
    const doc = glassDoc();
    const html = [generateDemo(doc), generateStyleguide(doc)].join("\n");
    expect(html).toContain("var(--semantic-glass-surface-fill)");
    expect(html).toContain("var(--semantic-glass-surface-opacity)");
    expect(html).toContain("var(--semantic-glass-surface-blur)");
    expect(html).toContain("var(--semantic-glass-surface-border)");
    expect(html).toContain("glass-edge-backdrop");
    expect(html).toContain("backdrop-filter: blur(var(--semantic-glass-surface-blur))");
  });

  it("glass panels carry token-driven inset so content never sits on the panel edge", () => {
    const doc = glassDoc();
    const html = [generateDemo(doc), generateStyleguide(doc)].join("\n");
    const panelRule = html.match(/isolation: isolate;[^}]*backdrop-filter/)?.[0] ?? "";
    expect(panelRule).toContain("padding: var(--semantic-space-inset)");
    expect(panelRule).toContain("border-radius: var(--semantic-shape-control)");
  });
});

describe("glass contrast-floor gate", () => {
  it("shipped defaults pass with no glass findings", () => {
    expect(glassFindings(glassDoc())).toEqual([]);
  });

  it("opacity below the floor fails", () => {
    const doc = glassDoc();
    (doc.semantic as any).glass.surface.opacity.$value = 0.4;
    expect(glassFindings(doc)).toContainEqual(
      expect.objectContaining({
        code: "glass-opacity-floor",
        path: "semantic.glass.surface.opacity",
      }),
    );
  });

  it("catches interior luminance collapse that endpoint checks would miss", () => {
    const doc = glassDoc();
    setGlassFixture(doc, {
      fill: "#000000",
      opacity: 0.6,
      fg: "#595959",
      pair: { role: "large-text", minRatio: 2.9 },
    });
    const findings = glassFindings(doc);
    expect(findings).toContainEqual(
      expect.objectContaining({
        code: "glass-contrast-collapse",
        meta: expect.objectContaining({
          ratio: 1,
          required: 2.9,
          interval: expect.objectContaining({ min: 0, max: 0.4 }),
        }),
      }),
    );
  });

  it("fails when the nearest interval endpoint is below the floor", () => {
    const doc = glassDoc();
    setGlassFixture(doc, { fill: "#000000", opacity: 0.6, fg: "#ffffff" });
    const finding = glassFindings(doc).find((item) => item.code === "glass-contrast-fail");
    expect(finding).toEqual(
      expect.objectContaining({
        code: "glass-contrast-fail",
        meta: expect.objectContaining({
          ratio: expect.any(Number),
          required: 4.5,
          interval: expect.objectContaining({ min: 0, max: 0.4 }),
          fgLuminance: 1,
        }),
      }),
    );
    expect(finding?.meta?.ratio).toBeLessThan(4.5);
  });

  it("keeps the gate verdict independent of blur", () => {
    const first = glassDoc();
    const second = glassDoc();
    setGlassFixture(first, { fill: "#000000", opacity: 0.6, fg: "#ffffff" });
    setGlassFixture(second, { fill: "#000000", opacity: 0.6, fg: "#ffffff" });
    (first.semantic as any).glass.surface.blur.$value = { value: 4, unit: "px-base" };
    (second.semantic as any).glass.surface.blur.$value = { value: 64, unit: "px-base" };
    expect(glassFindings(second).map((finding) => ({ code: finding.code, meta: finding.meta }))).toEqual(
      glassFindings(first).map((finding) => ({ code: finding.code, meta: finding.meta })),
    );
  });
});
