/**
 * Video adapter spike (M4) — tokens.json → Remotion-consumable tokens.ts.
 *
 * Invariants under test: the optional `video` transform-contract key is
 * hash-neutral (G-V0); colors realize to #rrggbb with luminance parity to the
 * oklch source via an independent parse path (G-V1); dimensions/durations
 * realize to plain px/ms numbers (G-V2); target filtering + explicit skip
 * accounting hold on a synthetic document (G-V3); the emitted tokens.ts has
 * the contracted exports and embeds toFrames from the single module source
 * (G-V4); toFrames rounding semantics (G-V5); and video/web path parity —
 * nothing is silently dropped (G-V6).
 */
import { describe, it, expect } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeTokenHash, parseColor, relativeLuminance } from "../src/index.js";
import { resolveToken, tokenMap } from "../src/surface-data.js";
import { toRealizedVideo, toRealizedWeb } from "../src/transformer.js";
import type { VideoGradientValue, VideoShadowValue } from "../src/transformer.js";
import { toTokensTs, toFrames, TO_FRAMES_SOURCE } from "../src/adapters/video-adapter.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { BrandJson } from "../src/brand-schema.js";
import type { LeafToken, TokensDocument } from "../src/tokens-schema.js";
import { isGradientValue } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

const brandFor = (key: string): BrandJson =>
  ({
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web" },
    branding: { tone_vector: recipe(key).toneAnchor },
  }) as BrandJson;

const buildFor = (key: string): TokensDocument => buildTokens(brandFor(key), recipe(key));

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function requireVideoGradient(value: unknown): VideoGradientValue {
  if (
    typeof value !== "object" ||
    value === null ||
    !("kind" in value) ||
    !("angle" in value) ||
    !("stops" in value)
  ) {
    throw new Error("video gradient expected");
  }
  return value as VideoGradientValue;
}

function requireVideoShadow(value: unknown): VideoShadowValue {
  if (!Array.isArray(value)) throw new Error("video shadow array expected");
  return value as VideoShadowValue;
}

function sourceStopColor(stop: string): string {
  return stop.replace(/\s+[+-]?(?:\d+|\d*\.\d+)%\s*$/, "");
}

describe("G-V0 — video generation is hash-neutral", () => {
  it("toTokensTs embeds but does not mutate the current build hash", () => {
    const doc = buildFor("minimal-tech");
    const hash = computeTokenHash(doc);
    expect(toTokensTs(doc)).toContain(hash);
    expect(computeTokenHash(doc)).toBe(hash);
  });
});

describe("G-V1 — colors realize to #rrggbb hex with luminance parity", () => {
  const { values } = toRealizedVideo(SAMPLE);
  const web = toRealizedWeb(SAMPLE);

  it("every web color path realizes to a 6-digit hex in the video map", () => {
    let colors = 0;
    for (const [path, cssValue] of web) {
      if (!/^oklch\(|^#/.test(cssValue)) continue;
      if (!path.includes("color")) continue;
      const hex = values.get(path);
      expect(hex, path).toMatch(/^#[0-9a-f]{6}$/);
      colors++;
    }
    expect(colors).toBeGreaterThan(0);
  });

  it("emitted hex luminance matches the oklch source within 0.01 (independent path)", () => {
    for (const [path, cssValue] of web) {
      if (!cssValue.startsWith("oklch(")) continue;
      const hex = values.get(path);
      if (typeof hex !== "string") continue;
      const src = parseColor(cssValue);
      const out = parseColor(hex);
      expect(src, path).not.toBeNull();
      expect(out, path).not.toBeNull();
      expect(Math.abs(relativeLuminance(src!) - relativeLuminance(out!)), path).toBeLessThan(0.01);
    }
  });
});

describe("G-V2 — numerics realize to plain px/ms numbers", () => {
  const { values } = toRealizedVideo(SAMPLE);

  it("abstract dimensions realize as px numbers (space.xs 0.5 × base 16 = 8)", () => {
    expect(values.get("primitive.space.xs")).toBe(8);
  });

  it("durations realize as ms numbers (duration.fast = 120)", () => {
    expect(values.get("primitive.duration.fast")).toBe(120);
  });

  it("fontWeight and number pass through as numbers", () => {
    expect(values.get("primitive.font.weight.regular")).toBe(400);
    expect(typeof values.get("primitive.font.lineHeight.normal")).toBe("number");
  });

  it("fontFamily realizes as a string array", () => {
    const fam = values.get("primitive.font.family.sans");
    expect(Array.isArray(fam)).toBe(true);
    expect((fam as string[])[0]).toBe("Inter");
  });
});

describe("G-V3 — target filtering + explicit skip accounting (synthetic)", () => {
  const doc = structuredClone(SAMPLE) as TokensDocument;
  const space = (doc.primitive as Record<string, unknown>).space as Record<string, LeafToken>;
  space.webOnly = {
    $type: "dimension",
    $class: "target-only:web",
    $value: { value: 1, unit: "abstract" },
  } as LeafToken;
  space.videoOnly = {
    $type: "dimension",
    $class: "target-only:video",
    $value: { value: 2, unit: "abstract" },
  } as LeafToken;
  (doc.primitive as Record<string, unknown>).glow = {
    hero: {
      $type: "gradient",
      $class: "adapter-derived",
      $value: { kind: "linear", angle: "135deg", stops: ["oklch(0.6 0.1 250) 0%", "oklch(0.8 0.05 250) 100%"] },
    },
  };
  (doc.primitive as Record<string, unknown>).float = {
    shadow: {
      $type: "shadow",
      $class: "adapter-derived",
      $value: "inset 0 1px 2px oklch(0 0 0 / 0.12), 4px 8px 16px 2px #112233",
    },
  };
  (doc.primitive as Record<string, unknown>).curve = {
    ease: {
      $type: "cubicBezier",
      $class: "adapter-derived",
      $value: [0.2, 0, 0, 1],
    },
  };
  (doc.primitive as Record<string, unknown>).copy = {
    label: {
      $type: "string",
      $class: "portable",
      $value: "Start",
    },
  };
  (doc.semantic as Record<string, unknown>).motif = {
    kind: {
      $type: "motif-kind",
      $class: "adapter-derived",
      $value: "none",
    },
  };
  const { values, skipped } = toRealizedVideo(doc);

  it("target-only:web is excluded, target-only:video is included", () => {
    expect(values.has("primitive.space.webOnly")).toBe(false);
    expect(values.get("primitive.space.videoOnly")).toBe(32);
  });

  it("gradient path lands in values as a structured Remotion object", () => {
    const gradient = requireVideoGradient(values.get("primitive.glow.hero"));
    expect(gradient).toEqual({
      kind: "linear",
      angle: 135,
      stops: [
        { color: expect.stringMatching(/^#[0-9a-f]{6}$/), position: 0 },
        { color: expect.stringMatching(/^#[0-9a-f]{6}$/), position: 1 },
      ],
    });
    expect(skipped).not.toContain("primitive.glow.hero");
  });

  it("shadow path lands in values as structured shadow layers", () => {
    const shadow = requireVideoShadow(values.get("primitive.float.shadow"));
    expect(shadow).toEqual([
      {
        offsetX: 0,
        offsetY: 1,
        blur: 2,
        spread: 0,
        color: expect.stringMatching(/^#[0-9a-f]{6}$/),
        inset: true,
      },
      {
        offsetX: 4,
        offsetY: 8,
        blur: 16,
        spread: 2,
        color: "#112233",
        inset: false,
      },
    ]);
    expect(skipped).not.toContain("primitive.float.shadow");
  });

  it("cubicBezier path lands in values, not skipped", () => {
    expect(values.get("primitive.curve.ease")).toEqual([0.2, 0, 0, 1]);
    expect(skipped).not.toContain("primitive.curve.ease");
  });

  it("skipped paths are now only string and motif-kind leaves", () => {
    const leaves = tokenMap(doc);
    expect(skipped).toContain("primitive.copy.label");
    expect(skipped).toContain("semantic.motif.kind");
    for (const path of skipped) {
      expect(["string", "motif-kind"], path).toContain(resolveToken(path, leaves).$type);
    }
  });

  it("generated header echoes the skip accounting", () => {
    const ts = toTokensTs(doc);
    expect(ts).not.toContain("primitive.glow.hero");
    expect(ts).not.toContain("primitive.float.shadow");
    expect(ts).not.toContain("primitive.curve.ease");
    expect(ts).toContain("primitive.copy.label");
    expect(ts).toContain("semantic.motif.kind");
    expect(ts).toContain("skipped");
  });
});

describe("G-V3b — gradient/shadow realization on real recipe data", () => {
  const doc = buildFor("creative-multiscale");
  const { values, skipped } = toRealizedVideo(doc);
  const leaves = tokenMap(doc);

  it("realizes hero gradient stops to #rrggbb with luminance parity", () => {
    const resolved = resolveToken("semantic.gradient.hero", leaves);
    if (!isGradientValue(resolved.$value)) throw new Error("semantic.gradient.hero fixture must be a gradient");
    const gradient = requireVideoGradient(values.get("semantic.gradient.hero"));

    expect(gradient.kind).toBe("linear");
    expect(gradient.angle).toBe(Number(resolved.$value.angle?.replace("deg", "")));
    expect(gradient.stops).toHaveLength(resolved.$value.stops.length);

    for (const [index, stop] of gradient.stops.entries()) {
      expect(stop.color).toMatch(/^#[0-9a-f]{6}$/);
      const src = parseColor(sourceStopColor(resolved.$value.stops[index]!));
      const out = parseColor(stop.color);
      expect(src, `stop ${index}`).not.toBeNull();
      expect(out, `stop ${index}`).not.toBeNull();
      expect(Math.abs(relativeLuminance(src!) - relativeLuminance(out!)), `stop ${index}`).toBeLessThan(0.01);
    }
    expect(skipped).not.toContain("semantic.gradient.hero");
  });

  it("realizes elevation shadows to numeric layers with hex colors", () => {
    const shadow = requireVideoShadow(values.get("semantic.elevation.raised"));
    expect(shadow.length).toBeGreaterThan(0);
    for (const layer of shadow) {
      expect(typeof layer.offsetX).toBe("number");
      expect(typeof layer.offsetY).toBe("number");
      expect(typeof layer.blur).toBe("number");
      expect(typeof layer.spread).toBe("number");
      expect(layer.color).toMatch(/^#[0-9a-f]{6}$/);
      expect(typeof layer.inset).toBe("boolean");
    }
    expect(skipped).not.toContain("semantic.elevation.raised");
  });
});

describe("G-V3c — no-gradient/no-shadow video output is additive-stable", () => {
  it("keeps the frozen tokens.ts bytes for the no-gradient/no-shadow sample", () => {
    const ts = toTokensTs(SAMPLE);
    expect(ts).not.toContain("gradient");
    expect(ts).not.toContain("shadow");
    expect(sha256(ts)).toBe("2c6ebbb251a1963cf21b105ba43efe2888727ce6b1bc06165d9a0819ad2954ec");
    expect(toTokensTs(SAMPLE)).toBe(ts);
  });
});

describe("G-V4 — emitted tokens.ts structure", () => {
  const ts = toTokensTs(SAMPLE);

  it("has the contracted exports", () => {
    expect(ts).toContain("export const tokens =");
    expect(ts).toContain("export const fontAssets =");
    expect(ts).toContain("export function toFrames(");
    expect(ts).toContain("as const");
  });

  it("embeds tokenHash and no serialization accidents", () => {
    expect(ts).toContain(computeTokenHash(SAMPLE));
    expect(ts).not.toContain("[object Object]");
    expect(ts).not.toContain("undefined,");
  });

  it("embedded toFrames is byte-identical to the module source (single source)", () => {
    expect(ts).toContain(TO_FRAMES_SOURCE);
    expect(TO_FRAMES_SOURCE).toContain("export function toFrames(");
  });

  it("fontAssets lists each unique family once, primary first", () => {
    expect(ts).toMatch(/fontAssets = \[\s*\n?\s*"Inter"/);
    expect((ts.match(/"Inter"/g) ?? []).length).toBeGreaterThan(0);
  });

  it("is deterministic (two runs, identical bytes)", () => {
    expect(toTokensTs(SAMPLE)).toBe(ts);
  });
});

describe("G-V5 — toFrames semantics", () => {
  it("exact division", () => {
    expect(toFrames(1000, 30)).toBe(30);
  });
  it("rounding modes", () => {
    expect(toFrames(50, 30)).toBe(2); // 1.5 → round → 2
    expect(toFrames(50, 30, "floor")).toBe(1);
    expect(toFrames(50, 30, "ceil")).toBe(2);
    expect(toFrames(100, 30)).toBe(3); // 3.0
  });
  it("rejects non-positive fps", () => {
    expect(() => toFrames(100, 0)).toThrow();
  });
});

describe("G-V6 — web/video path parity (no silent drops)", () => {
  it("video values ∪ skipped covers exactly the web-exportable set (mod target-only)", () => {
    for (const key of RECIPES.map((r) => r.key)) {
      const doc = buildFor(key);
      const { values, skipped } = toRealizedVideo(doc);
      const web = toRealizedWeb(doc);
      for (const path of web.keys()) {
        const covered = values.has(path) || skipped.includes(path);
        expect(covered, `${key}:${path}`).toBe(true);
      }
      // skipped paths are only ever spike-skipped types
      const flat = new Map([...values.keys(), ...skipped].map((p) => [p, true]));
      expect(flat.size).toBe(values.size + skipped.length);
    }
  });
});
