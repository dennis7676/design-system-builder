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

/** Synthetic standard anchor: a skeleton-less recipe must keep taking the
 * standard demo path byte-for-byte. Pinned on minimal-tech's token document
 * with the skeleton declaration stripped, so grammar diffusion across the
 * real recipes cannot silently drift the standard generator. */
const STANDARD_SYNTHETIC_HASH = "5bc5a3e4d84d36147dfaf0ef65bedd96d128f5d8ef4d7d4587821e0850b4d383";

const regions = ["nav", "hero", "features", "form", "footer"] as const;

describe("G-K1 — skeleton-less recipes take the standard demo path", () => {
  it("synthetic skeleton-less recipe keeps the standard demo bytes", () => {
    const base = recipe("minimal-tech");
    const { skeleton: _drop, ...rest } = base;
    const stripped = rest as Recipe;
    const built = buildTokens(brandFor("minimal-tech"), stripped);
    const html = generateDemo(built);
    expect(built.meta.skeleton).toBeUndefined();
    expect(sha256(html)).toBe(STANDARD_SYNTHETIC_HASH);
    expect(html).toContain("card-grid");
    expect(html).toContain("btn btn-primary");
    expect(html).not.toContain("masthead");
    expect(html).not.toContain("colophon");
  });
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
