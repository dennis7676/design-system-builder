import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import { COPY } from "../src/surface-data.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));

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

function section(html: string, id: string): string {
  const match = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?<\\/section>`));
  if (match?.[0] === undefined) throw new Error(`missing section: ${id}`);
  return match[0];
}

function cssOf(html: string): string {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
}

function styleBody(html: string): string {
  return cssOf(html).replace(/:root\s*\{[\s\S]*?\n\s*\}/, "");
}

describe("applications section", () => {
  it("is positioned between components and relationships", () => {
    const html = generateStyleguide(buildFor("minimal-tech"));

    expect(html).toContain('<section id="applications"');
    expect(html.indexOf('<section id="components"')).toBeLessThan(html.indexOf('<section id="applications"'));
    expect(html.indexOf('<section id="applications"')).toBeLessThan(html.indexOf('<section id="relationships"'));
    expect(html.indexOf('data-nav-link="applications"')).toBeLessThan(html.indexOf('data-nav-link="relationships"'));
  });

  it("renders all application blocks and fixed aspect frame counts", () => {
    const html = generateStyleguide(buildFor("minimal-tech"));
    const apps = section(html, "applications");

    for (const marker of ["app-website", "app-slide", "app-carousel", "app-video-land", "app-video-port"]) {
      expect(apps).toContain(`data-application="${marker}"`);
    }
    expect(apps.match(/data-app-slide-frame/g) ?? []).toHaveLength(2);
    expect(apps.match(/data-app-carousel-frame/g) ?? []).toHaveLength(3);
    expect(cssOf(html)).toContain(".app-ratio-16x9 { aspect-ratio: 16 / 9; }");
    expect(cssOf(html)).toContain(".app-ratio-4x5 { aspect-ratio: 4 / 5; }");
    expect(cssOf(html)).toContain(".app-ratio-9x16 { aspect-ratio: 9 / 16; }");
  });

  it("keeps application brand values behind variables", () => {
    const html = generateStyleguide(buildFor("minimal-tech"));
    const apps = section(html, "applications");
    const appCss = styleBody(html).match(/\.applications-grid[\s\S]*?(?=@media \(max-width: 760px\))/)?.[0] ?? "";

    expect(`${apps}\n${appCss}`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(`${apps}\n${appCss}`).not.toMatch(/oklch\(\s*[\d.]/);
    expect(`${apps}\n${appCss}`).not.toMatch(/font-size:\s*\d+px/);
    expect(`${apps}\n${appCss}`).toContain("var(--");
  });

  it("reuses copy deck strings for all sample body copy", () => {
    const apps = section(generateStyleguide(buildFor("minimal-tech")), "applications");
    const deckStrings = new Set<string>([
      COPY.en.headline,
      COPY.en.lead,
      COPY.en.ctaPrimary,
      COPY.en.featuresTitle,
      ...COPY.en.cards.flatMap(([title, body]) => [title, body]),
    ]);
    const sampleBodies = [...apps.matchAll(/data-copy-source="deck">([^<]+)</g)].map((match) => match[1]);

    expect(sampleBodies.length).toBeGreaterThanOrEqual(8);
    for (const body of sampleBodies) expect(deckStrings.has(body ?? "")).toBe(true);
  });

  it("renders Korean deck copy and preserves ko typography rules", () => {
    const html = generateStyleguide(buildFor("minimal-tech", ["ko"]));
    const apps = section(html, "applications");

    expect(html).toContain('<html lang="ko">');
    expect(apps).toContain(COPY.ko.headline);
    expect(apps).toContain(COPY.ko.cards[0][1]);
    expect(apps).not.toContain(COPY.en.headline);
    expect(cssOf(html)).toContain(".application-copy { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }");
  });

  it("keeps identical inputs byte-deterministic", () => {
    const doc = buildFor("minimal-tech");

    expect(sha256(generateStyleguide(doc))).toBe(sha256(generateStyleguide(doc)));
  });

  it("maps different skeletons to different placement markup", () => {
    const specSheet = section(generateStyleguide(buildFor("minimal-tech")), "applications");
    const briefing = section(generateStyleguide(buildFor("enterprise")), "applications");

    expect(specSheet).toContain('data-skeleton-align="left"');
    expect(specSheet).toContain('data-skeleton-ornament="hairline"');
    expect(briefing).toContain('data-skeleton-align="center"');
    expect(briefing).toContain('data-skeleton-ornament="index"');
  });
});
