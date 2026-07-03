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
const regions = ["nav", "hero", "features", "form", "footer"] as const;

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

describe("G-A1 — minimal-tech renders spec-sheet", () => {
  it("emits all five regions with spec-sheet structural markers", () => {
    const html = generateDemo(buildFor("minimal-tech"));
    for (const region of regions) expect(html).toContain(`data-demo-region="${region}"`);
    expect(html).toContain("spec-nav");
    expect(html).toContain("spec-hero");
    expect(html).toContain("spec-table");
    expect(html).not.toContain("card-grid");
    expect(html).not.toContain("masthead");
  });

  it("keeps spec-sheet CSS brand values behind variables", () => {
    expect(styleBody(generateDemo(buildFor("minimal-tech")))).not.toMatch(/oklch\(\s*[\d.]/);
    expect(styleBody(generateDemo(buildFor("minimal-tech")))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("G-A2 — enterprise renders briefing", () => {
  it("emits all five regions with briefing structural markers", () => {
    const html = generateDemo(buildFor("enterprise"));
    for (const region of regions) expect(html).toContain(`data-demo-region="${region}"`);
    expect(html).toContain("briefing-utility");
    expect(html).toContain("briefing-hero");
    expect(html).toContain("briefing-rows");
    expect(html).not.toContain("card-grid");
    expect(html).not.toContain("masthead");
  });

  it("keeps briefing CSS brand values behind variables", () => {
    expect(styleBody(generateDemo(buildFor("enterprise")))).not.toMatch(/oklch\(\s*[\d.]/);
    expect(styleBody(generateDemo(buildFor("enterprise")))).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });
});

describe("G-A3 — skeleton metadata is hash-neutral", () => {
  it("echoes new skeletons and keeps the R1 keystone hash unchanged", () => {
    const minimal = buildFor("minimal-tech");
    const enterprise = buildFor("enterprise");
    expect(minimal.meta.skeleton).toBe("spec-sheet");
    expect(enterprise.meta.skeleton).toBe("briefing");
    expect(computeTokenHash(minimal)).toBe(computeTokenHash(SAMPLE));
  });
});

describe("G-A4 — KO locale reuses batch A skeletons", () => {
  it("renders Korean copy through the spec-sheet branch", () => {
    const html = generateDemo(buildFor("minimal-tech", ["ko"]));
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("spec-hero");
    expect(html).toContain("max-width: min(24ch, 16em)");
    expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
  });

  it("renders Korean copy through the briefing branch", () => {
    const html = generateDemo(buildFor("enterprise", ["ko"]));
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("briefing-hero");
    expect(html).toContain("max-width: min(24ch, 16em)");
    expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
  });
});

describe("G-A5 — batch A output is deterministic", () => {
  it("keeps generated HTML stable for identical inputs", () => {
    expect(sha256(generateDemo(buildFor("minimal-tech")))).toBe(sha256(generateDemo(buildFor("minimal-tech"))));
    expect(sha256(generateDemo(buildFor("enterprise")))).toBe(sha256(generateDemo(buildFor("enterprise"))));
  });
});
