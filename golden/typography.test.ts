import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildTokens } from "../src/tokens-builder.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
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
      .map(([path, value]) => {
        const next = valueAt(built, path);
        return next.exists && deepEqual(next.value, value) ? null : { path, expected: value, actual: next.value };
      })
      .filter((entry) => entry !== null);

    expect(missingOrChanged).toEqual([]);
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
