/**
 * G-K — recipe-declared skeleton spike. This locks the luxury editorial branch
 * while keeping all non-luxury demos byte-identical to the pre-spike generator.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import { generateDemo } from "../src/demo-generator.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokensDocument } from "../src/tokens-schema.js";
import { computeTokenHash } from "../src/validator.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const recipe = (key: string): Recipe => {
  const found = RECIPES.find((r) => r.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
};
const brandFor = (key: string, locales?: readonly string[]): BrandJson => ({
  schemaVersion: "2026-06-30",
  product: { name: "Demo", medium: "web", ...(locales !== undefined ? { locales: [...locales] } : {}) },
  branding: { tone_vector: recipe(key).toneAnchor },
});
const buildFor = (key: string, locales?: readonly string[]): TokensDocument =>
  buildTokens(brandFor(key, locales), recipe(key));
const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");
const styleBody = (html: string): string => {
  const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
  return css.replace(/:root\s*\{[\s\S]*?\n\s*\}/, "");
};

const STANDARD_DEMO_HASHES = {
  "minimal-tech": "5bc5a3e4d84d36147dfaf0ef65bedd96d128f5d8ef4d7d4587821e0850b4d383",
  enterprise: "e2b3869e93bd80e4e7f2683e3ebdade93b6ff8d147df3d83e46b83d1d0d27387",
  expressive: "c0d446ef6417d266cc7ca594ff67c71e34ef516bfcd1d961dd6190378e13cf83",
  "pro-emotive": "642c9bd0e78ad64570726f68eca058e44f9bd8e703543160b67c01c6cc79d937",
  "creative-multiscale": "557c3d837421f374a088dab475e2b1160d4995e5d564ad6d6abb6d4d4e35546d",
  "warm-creator": "64da2f85e3b0cd9fb6a2a0da80c89c96aae2f18a5358bf49174272ad69dc6e1e",
  retro: "be5eef79d6e9e918032869c8f493f669fa3c64e922f940b59e4eb29fe4be906d",
} as const;

const regions = ["nav", "hero", "features", "form", "footer"] as const;

describe("G-K1 — non-luxury demos stay byte-identical", () => {
  for (const [key, hash] of Object.entries(STANDARD_DEMO_HASHES)) {
    it(`${key} keeps the pre-spike standard demo bytes`, () => {
      const built = buildFor(key);
      const html = generateDemo(built);
      expect(recipe(key).skeleton).toBeUndefined();
      expect(built.meta.skeleton).toBeUndefined();
      expect(sha256(html)).toBe(hash);
      expect(html).toContain("card-grid");
      expect(html).toContain("btn btn-primary");
      expect(html).not.toContain("masthead");
      expect(html).not.toContain("colophon");
    });
  }
});

describe("G-K2 — luxury renders the editorial skeleton", () => {
  it("emits all five regions with editorial structural markers", () => {
    const html = generateDemo(buildFor("luxury"));
    for (const region of regions) expect(html).toContain(`data-demo-region="${region}"`);
    expect(html).toContain("class=\"masthead\"");
    expect(html).toContain("class=\"editorial-hero\"");
    expect(html).toContain("class=\"editorial-spread\"");
    expect(html).toContain("class=\"invitation\"");
    expect(html).toContain("class=\"colophon\"");
    expect(html).not.toContain("card-grid");
    expect(html).not.toContain("footer-cols");
    expect(html).not.toContain("signup-card");
    expect(html.match(/btn btn-ghost/g)?.length ?? 0).toBe(1);
    expect(html.match(/<button/g)?.length ?? 0).toBe(2);
    expect(html).toContain("spread-number\">01");
    expect(html).toContain("spread-number\">02");
    expect(html).toContain("spread-number\">03");
  });

  it("keeps editorial CSS brand values behind variables", () => {
    const html = generateDemo(buildFor("luxury"));
    const body = styleBody(html);
    expect(body).not.toMatch(/oklch\(\s*[\d.]/);
    expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("G-K3 — skeleton metadata is hash-neutral", () => {
  it("echoes luxury skeleton and keeps the R1 keystone hash unchanged", () => {
    const luxury = buildFor("luxury");
    const minimal = buildFor("minimal-tech");
    expect(luxury.meta.skeleton).toBe("editorial");
    expect(computeTokenHash(minimal)).toBe(computeTokenHash(SAMPLE));
  });
});

describe("G-K4 — KO locale reuses the editorial skeleton", () => {
  it("renders Korean copy through the editorial branch", () => {
    const html = generateDemo(buildFor("luxury", ["ko"]));
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("class=\"masthead\"");
    expect(html).toContain("class=\"editorial-hero\"");
    expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
    expect(html).not.toContain("card-grid");
  });
});
