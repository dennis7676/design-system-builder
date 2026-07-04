import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTokens } from "../src/tokens-builder.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { generateDemo } from "../src/demo-generator.js";
import { toRealizedWeb } from "../src/transformer.js";
import { validateTokens } from "../src/validator.js";
import type { BrandJson, ToneVector } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const PRE_TYPOGRAPHY_SAMPLE = JSON.parse(
  readFileSync(join(here, "fixtures/pre-typography-sample.tokens.json"), "utf8"),
) as TokensDocument;

const TONE = (o: Partial<ToneVector> = {}): ToneVector => ({
  static_dynamic: 4,
  cold_warm: 4,
  serious_playful: 4,
  classic_cutting_edge: 4,
  minimal_rich: 4,
  ...o,
});

const brand = (o: Partial<BrandJson> & { tone?: Partial<ToneVector> } = {}): BrandJson => ({
  schemaVersion: "2026-06-30",
  product: { name: "Acme", medium: "web" },
  branding: { tone_vector: TONE(o.tone) },
  ...o,
});

const recipe = (key: string): Recipe => {
  const found = RECIPES.find((r) => r.key === key);
  if (found === undefined) {
    throw new Error(`missing recipe: ${key}`);
  }
  return found;
};

const round4 = (value: number): number => Math.round(value * 10000) / 10000;
const TYPOGRAPHY_ROLES = ["display", "h1", "h2", "h3", "body", "caption"] as const;
const TYPOGRAPHY_FIELDS = ["family", "size", "weight", "lineHeight", "tracking"] as const;

const minimalTechSampleBrand = (): BrandJson =>
  brand({
    tone: {
      static_dynamic: 2,
      cold_warm: 3,
      serious_playful: 3,
      classic_cutting_edge: 5,
      minimal_rich: 2,
    },
  });

describe("G-T1 — computed typography scale echo", () => {
  for (const r of RECIPES) {
    it(`${r.key} echoes a monotone anchored type scale`, () => {
      const built = buildTokens(brand({ tone: r.toneAnchor }), r);
      const anchors = built.meta.typeScale.anchors;

      expect(anchors.caption).toBeLessThan(anchors.body);
      expect(anchors.body).toBeLessThan(anchors.heading);
      expect(anchors.heading).toBeLessThanOrEqual(anchors.display);
      expect(built.meta.typeScale.ratio).toBe(round4(Math.sqrt(anchors.display / anchors.body)));
      expect(anchors).toEqual({
        caption: dimensionValueAt(r.base, ["primitive", "font", "size", "caption"]),
        body: dimensionValueAt(r.base, ["primitive", "font", "size", "body"]),
        heading: dimensionValueAt(r.base, ["primitive", "font", "size", "heading"]),
        display: dimensionValueAt(r.base, ["primitive", "font", "size", "display"]),
      });
    });
  }
});

describe("G-T0 — pre-typography keystone is a value-identical subset", () => {
  it("fresh minimal-tech build preserves every old scalar leaf", () => {
    const built = buildTokens(minimalTechSampleBrand(), recipe("minimal-tech"), {
      generatedAt: "2026-06-30T14:30:00Z",
    });
    const missingOrChanged = scalarLeaves(PRE_TYPOGRAPHY_SAMPLE)
      .filter(([path]) => !isLegacyFlatButtonPath(path))
      .map(([path, value]) => {
        const next = valueAt(built, path);
        return next.exists && deepEqual(next.value, value) ? null : { path, expected: value, actual: next.value };
      })
      .filter((entry) => entry !== null);

    expect(missingOrChanged).toEqual([]);
  });
});

function isLegacyFlatButtonPath(path: readonly string[]): boolean {
  return path[0] === "component" && path[1] === "button";
}

describe("G-T2 — semantic typography roles resolve to terminal web values", () => {
  for (const r of RECIPES) {
    it(`${r.key} resolves six roles across five fields`, () => {
      const built = buildTokens(brand({ tone: r.toneAnchor }), r);
      const realized = toRealizedWeb(built);

      for (const role of TYPOGRAPHY_ROLES) {
        for (const field of TYPOGRAPHY_FIELDS) {
          const path = `semantic.typography.${role}.${field}`;
          const resolved = realized.get(path);
          expect(resolved, `${r.key} ${path}`).toBeDefined();
          expect(resolved, `${r.key} ${path}`).not.toMatch(/^\{.+\}$/);
          expect(resolved, `${r.key} ${path}`).not.toBe("");
        }
      }
    });
  }
});

describe("G-T3 — role scale stays bounded and strictly monotone", () => {
  for (const r of RECIPES) {
    it(`${r.key} role sizes are monotone with bounded h1/body ratio`, () => {
      const built = buildTokens(brand({ tone: r.toneAnchor }), r);
      const realized = toRealizedWeb(built);
      const caption = remNumber(realized, "semantic.typography.caption.size");
      const body = remNumber(realized, "semantic.typography.body.size");
      const h3 = remNumber(realized, "semantic.typography.h3.size");
      const h2 = remNumber(realized, "semantic.typography.h2.size");
      const h1 = remNumber(realized, "semantic.typography.h1.size");
      const display = remNumber(realized, "semantic.typography.display.size");

      expect(h1 / body).toBeGreaterThanOrEqual(1.25);
      expect(h1 / body).toBeLessThanOrEqual(2);
      expect(caption).toBeLessThan(body);
      expect(body).toBeLessThan(h3);
      expect(h3).toBeLessThan(h2);
      expect(h2).toBeLessThan(h1);
      expect(h1).toBeLessThanOrEqual(display);
    });
  }
});

describe("G-T5 — demo typography roles are consumed without literal role font sizes", () => {
  it("hero h1, card h3, and fine print font sizing comes from role variables", () => {
    const html = generateDemo(buildTokens(minimalTechSampleBrand(), recipe("minimal-tech")));
    const css = cssOf(html);

    for (const selector of [".hero h1", ".card h3", ".fine"] as const) {
      const block = lastRuleBlock(css, selector);
      expect(block, selector).toContain("var(--semantic-typography-");
      expect(block, selector).not.toMatch(/font(?:-size)?\s*:[^;]*(?:rem|px)/);
    }
  });

  it("bold-tier hero glyph derives from the display token, not literal rems", () => {
    const bold = { ...minimalTechSampleBrand(), expression: "bold" as const };
    const html = generateDemo(buildTokens(bold, recipe("minimal-tech")));
    const css = cssOf(html);
    const block = lastRuleBlock(css, ".hero-panel .glyph");
    expect(block).toContain("var(--semantic-typography-display-size)");
    expect(block).not.toMatch(/font(?:-size)?\s*:[^;]*\d(?:rem|px)/);
  });

  it("validator reports zero orphan warnings for role-terminal primitive font size tokens", () => {
    const roleSizeTerminals = new Set([
      "primitive.font.size.caption",
      "primitive.font.size.body",
      "primitive.font.size.heading",
      "primitive.font.size.display",
      "primitive.font.size.h2",
      "primitive.font.size.h3",
    ]);
    for (const r of RECIPES) {
      const built = buildTokens(brand({ tone: r.toneAnchor }), r);
      const orphanFontSizes = validateTokens(built).findings.filter(
        (finding) =>
          finding.severity === "warn" &&
          finding.code === "orphan-token" &&
          finding.path !== undefined &&
          roleSizeTerminals.has(finding.path),
      );
      expect(orphanFontSizes, r.key).toEqual([]);
    }
  });
});

function dimensionValueAt(root: unknown, path: readonly string[]): number {
  const node = valueAt(root, path);
  if (!node.exists || !isRecord(node.value)) {
    throw new Error(`missing dimension leaf: ${path.join(".")}`);
  }
  const value = node.value["$value"];
  if (!isRecord(value) || typeof value["value"] !== "number") {
    throw new Error(`missing dimension value: ${path.join(".")}`);
  }
  return value["value"];
}

function scalarLeaves(root: unknown, prefix: readonly string[] = []): ReadonlyArray<readonly [readonly string[], unknown]> {
  if (root === null || typeof root !== "object") {
    return [[prefix, root]];
  }
  if (Array.isArray(root)) {
    return root.flatMap((value, index) => scalarLeaves(value, [...prefix, String(index)]));
  }
  return Object.entries(root).flatMap(([key, value]) => scalarLeaves(value, [...prefix, key]));
}

function valueAt(root: unknown, path: readonly string[]): { readonly exists: true; readonly value: unknown } | { readonly exists: false } {
  let node = root;
  for (const part of path) {
    if (Array.isArray(node)) {
      const index = Number(part);
      if (!Number.isInteger(index) || index < 0 || index >= node.length) return { exists: false };
      node = node[index];
      continue;
    }
    if (!isRecord(node) || !(part in node)) return { exists: false };
    node = node[part];
  }
  return { exists: true, value: node };
}

function deepEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function remNumber(realized: ReadonlyMap<string, string>, path: string): number {
  const value = realized.get(path);
  if (value === undefined) {
    throw new Error(`missing realized value: ${path}`);
  }
  const match = value.match(/^([0-9.]+)rem$/);
  if (match === null || match[1] === undefined) {
    throw new Error(`expected rem value at ${path}: ${value}`);
  }
  return Number(match[1]);
}

function cssOf(html: string): string {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
}

function lastRuleBlock(css: string, selector: string): string {
  const index = css.lastIndexOf(selector);
  if (index < 0) {
    throw new Error(`missing CSS selector: ${selector}`);
  }
  const start = css.indexOf("{", index);
  const end = css.indexOf("}", start);
  if (start < 0 || end < 0) {
    throw new Error(`missing CSS block: ${selector}`);
  }
  return css.slice(start + 1, end);
}
