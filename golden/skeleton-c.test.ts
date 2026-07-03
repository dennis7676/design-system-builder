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
const REGIONS = ["nav", "hero", "features", "form", "footer"] as const;

const recipe = (key: string): Recipe => {
  const found = RECIPES.find((candidate) => candidate.key === key);
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

const expectAllRegions = (html: string): void => {
  for (const region of REGIONS) expect(html).toContain(`data-demo-region="${region}"`);
};

const expectNoBrandLiterals = (html: string): void => {
  const body = styleBody(html);
  expect(body).not.toMatch(/oklch\(\s*[\d.]/);
  expect(body).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
};

describe("G-KC1 — warm-creator renders journal", () => {
  it("emits all five regions with journal structural markers", () => {
    const html = generateDemo(buildFor("warm-creator"));
    expectAllRegions(html);
    expect(html).toContain("journal-column");
    expect(html).toContain("journal-list");
    expect(html).toContain("journal-signature");
    expect(html).toContain("<span aria-hidden=\"true\">–</span>");
    expect(html).toContain("btn btn-ghost journal-link");
    expect(html).not.toContain("masthead");
    expect(html).not.toContain("card-grid");
    expectNoBrandLiterals(html);
  });

  it("echoes journal skeleton and keeps the R1 keystone hash unchanged", () => {
    const journal = buildFor("warm-creator");
    const minimal = buildFor("minimal-tech");
    expect(journal.meta.skeleton).toBe("journal");
    expect(computeTokenHash(minimal)).toBe(computeTokenHash(SAMPLE));
    expect(sha256(JSON.stringify(journal.primitive))).toBe(sha256(JSON.stringify(buildFor("warm-creator").primitive)));
  });

  it("renders Korean copy through the journal branch", () => {
    const html = generateDemo(buildFor("warm-creator", ["ko"]));
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("journal-column");
    expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
    expect(html).not.toContain("card-grid");
  });
});

describe("G-KC2 — pro-emotive renders story", () => {
  it("emits all five regions with story structural markers", () => {
    const html = generateDemo(buildFor("pro-emotive"));
    expectAllRegions(html);
    expect(html).toContain("story-band");
    expect(html).toContain("story-panel");
    expect(html).toContain("story-alt");
    expect(html).toContain("var(--semantic-gradient-hero)");
    expect(html).not.toContain("masthead");
    expect(html).not.toContain("card-grid");
    expectNoBrandLiterals(html);
  });

  it("echoes story skeleton and keeps the R1 keystone hash unchanged", () => {
    const story = buildFor("pro-emotive");
    const minimal = buildFor("minimal-tech");
    expect(story.meta.skeleton).toBe("story");
    expect(computeTokenHash(minimal)).toBe(computeTokenHash(SAMPLE));
    expect(sha256(JSON.stringify(story.semantic))).toBe(sha256(JSON.stringify(buildFor("pro-emotive").semantic)));
  });

  it("renders Korean copy through the story branch", () => {
    const html = generateDemo(buildFor("pro-emotive", ["ko"]));
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("story-band");
    expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
    expect(html).not.toContain("masthead");
  });
});
