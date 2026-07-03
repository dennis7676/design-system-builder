/**
 * Locale typography (ko pilot) — spec: locale-typography.
 *
 * Invariants: no-locale builds/demos byte-identical to pre-change (G-L1);
 * ko builds splice Korean families personality-aligned (G-L2); ko surfaces
 * carry lang/keep-all/metric rules + Korean copy while keeping every demo
 * contract (G-L3); the brand gate rejects unknown locales (G-L4); ko input
 * remains hash-distinct from no-locale input (G-L5).
 */
import { describe, it, expect } from "vitest";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  checkManifest,
  computeTokenHash,
  generateDemo,
  generateDesignMd,
  generateStyleguide,
} from "../src/index.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import { validateBrand, type BrandJson, type ExpressionTier } from "../src/brand-schema.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const RECIPES = loadRecipes(join(here, "../references/recipes"));
const recipe = (key: string): Recipe => RECIPES.find((r) => r.key === key)!;

const brandFor = (key: string, opts: { locales?: string[]; expression?: ExpressionTier } = {}): BrandJson =>
  ({
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web", ...(opts.locales !== undefined ? { locales: opts.locales } : {}) },
    branding: { tone_vector: recipe(key).toneAnchor },
    ...(opts.expression !== undefined ? { expression: opts.expression } : {}),
  }) as BrandJson;

const buildFor = (key: string, opts: { locales?: string[]; expression?: ExpressionTier } = {}): TokensDocument =>
  buildTokens(brandFor(key, opts), recipe(key));

const familyStacks = (doc: TokensDocument): Record<string, string[]> => {
  const fam = (doc.primitive as { font?: { family?: Record<string, { $value: string[] }> } }).font?.family ?? {};
  return Object.fromEntries(Object.entries(fam).map(([k, v]) => [k, v.$value]));
};

const demoErrors = (doc: TokensDocument) =>
  checkManifest(doc, {
    styleguideHtml: generateStyleguide(doc),
    designMd: generateDesignMd(doc),
    demoHtml: generateDemo(doc),
  }).filter((f) => f.severity === "error" && f.meta?.surface === "demo");

describe("G-L1 — no-locale anchor (byte identity)", () => {
  it("tokens and demos without locales are unchanged across tiers", () => {
    for (const key of ["minimal-tech", "luxury"]) {
      const plain = buildFor(key);
      const empty = buildFor(key, { locales: [] });
      expect(JSON.stringify(empty)).toBe(JSON.stringify(plain));
      expect("locales" in plain.meta).toBe(false);
      for (const tier of ["safe", "balanced", "bold"] as const) {
        const doc = buildFor(key, { expression: tier });
        const html = generateDemo(doc);
        expect(html).toContain('<html lang="en">');
        expect(html).not.toContain("keep-all");
      }
    }
  });
});

describe("G-L2 — Korean family splice (personality-aligned)", () => {
  it("luxury ko: serif stack gains Noto Serif KR, sans gains Pretendard, generic stays last", () => {
    const stacks = familyStacks(buildFor("luxury", { locales: ["ko"] }));
    expect(stacks.serif).toContain("Noto Serif KR");
    expect(stacks.serif![stacks.serif!.length - 1]).toBe("serif");
    expect(stacks.sans).toContain("Pretendard");
    expect(stacks.sans![stacks.sans!.length - 1]).toBe("sans-serif");
    expect(stacks.mono).not.toContain("Pretendard"); // mono untouched
  });
  it("promoted recipes lead with their identity-matched Korean family (P4)", () => {
    const PROMOTED: Record<string, string> = {
      "enterprise": "IBM Plex Sans KR",
      "creative-multiscale": "SUIT",
      "warm-creator": "NanumSquareRound",
    };
    for (const [key, family] of Object.entries(PROMOTED)) {
      const stacks = familyStacks(buildFor(key, { locales: ["ko"] }));
      const sans = stacks.sans!;
      expect(sans, `${key} sans missing ${family}`).toContain(family);
      expect(
        sans.indexOf(family),
        `${key}: ${family} must precede Pretendard`,
      ).toBeLessThan(sans.indexOf("Pretendard"));
    }
  });
  it("every recipe ko build carries a Korean family in its heading-capable stacks", () => {
    for (const r of RECIPES) {
      const stacks = familyStacks(buildFor(r.key, { locales: ["ko"] }));
      const all = Object.entries(stacks).filter(([k]) => k !== "mono");
      for (const [, stack] of all) {
        const hasKorean = stack.some((f) => /Pretendard|Noto Serif KR|Apple SD Gothic Neo/.test(f));
        expect(hasKorean, `${r.key} stack missing Korean family: ${stack.join(", ")}`).toBe(true);
      }
    }
  });
});

describe("G-L3 — ko surface rules + demo contracts", () => {
  for (const key of ["minimal-tech", "luxury"]) {
    for (const tier of ["safe", "balanced", "bold"] as const) {
      it(`${key} @ ${tier}: lang, keep-all, Korean copy, zero demo errors`, () => {
        const doc = buildFor(key, { locales: ["ko"], expression: tier });
        const html = generateDemo(doc);
        expect(html).toContain('<html lang="ko">');
        expect(html).toContain("word-break: keep-all");
        expect(html).toContain("당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.");
        expect(demoErrors(doc)).toEqual([]);
      });
    }
  }
  it("bold ko: no negative h1 letter-spacing survives; line-height floor present", () => {
    const html = generateDemo(buildFor("luxury", { locales: ["ko"], expression: "bold" }));
    const css = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
    // ko override appended after tierCss → wins the cascade
    const lastH1Rule = css.lastIndexOf(".hero h1");
    expect(css.slice(lastH1Rule)).toContain("letter-spacing: normal");
    expect(css.slice(lastH1Rule)).toContain("line-height: max(1.12, var(--semantic-typography-display-lineHeight))");
  });
  it("styleguide ko: lang + keep-all", () => {
    const html = generateStyleguide(buildFor("luxury", { locales: ["ko"] }));
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain("word-break: keep-all");
  });
});

describe("G-L4 — brand locale gate", () => {
  it("accepts ko/absence/empty, rejects unknown", () => {
    expect(validateBrand(brandFor("minimal-tech"))).toEqual([]);
    expect(validateBrand(brandFor("minimal-tech", { locales: [] }))).toEqual([]);
    expect(validateBrand(brandFor("minimal-tech", { locales: ["ko"] }))).toEqual([]);
    expect(validateBrand(brandFor("minimal-tech", { locales: ["xx"] }))).toEqual([
      expect.objectContaining({ path: "product.locales" }),
    ]);
  });
});

describe("G-L5 — locale input is hash-distinct", () => {
  it("ko build differs from the current no-locale base because locale fonts splice into intent", () => {
    const currentBase = computeTokenHash(buildFor("minimal-tech"));
    expect(computeTokenHash(buildFor("minimal-tech", { locales: ["ko"] }))).not.toBe(currentBase);
  });
});

describe("G-T4 — Korean measure and leading are generator-only", () => {
  it("ko demo appends em measure caps and a body line-height floor", () => {
    const html = generateDemo(buildFor("minimal-tech", { locales: ["ko"] }));
    const css = cssOf(html);
    const bodyBlock = lastRuleBlock(css, "body");
    const heroBlock = lastRuleBlock(css, ".hero h1");
    const leadBlock = lastRuleBlock(css, ".lead");

    expect(bodyBlock).toContain("line-height: max(1.7, var(--semantic-typography-body-lineHeight))");
    expect(heroBlock).toContain("max-width: min(18ch, 15em)");
    expect(leadBlock).toContain("max-width: min(52ch, 35em)");
    // .lead re-declares the body font shorthand (which resets line-height),
    // so the ko floor must be restated on .lead itself.
    expect(leadBlock).toContain("line-height: max(1.7, var(--semantic-typography-body-lineHeight))");
    expect(Number(rootVar(html, "--semantic-typography-body-lineHeight"))).toBeLessThanOrEqual(1.7);
  });

  it("ko styleguide floors lead leading and neutralizes negative specimen tracking", () => {
    const html = generateStyleguide(buildFor("minimal-tech", { locales: ["ko"] }));
    expect(html).toContain(".lead, .section-lead { max-width: 35em; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }");
    const specimen = (role: string): string =>
      html.match(new RegExp(`data-type-role="${role}"[^>]*>.*?<p style="[^"]*"`, "s"))![0];
    expect(specimen("h1")).toContain("letter-spacing:0em"); // -0.01 neutralized
    expect(specimen("caption")).toContain("letter-spacing:0.04em"); // positive kept
    // the dl keeps documenting the token value even when the render is neutralized
    expect(html).toContain("<dt>tracking</dt><dd>-0.01</dd>");
  });

  it("non-ko demo never emits Korean-only typography overrides", () => {
    const html = generateDemo(buildFor("minimal-tech"));
    expect(html).toContain('<html lang="en">');
    expect(html).not.toContain("max-width: min(18ch, 15em)");
    expect(html).not.toContain("max-width: min(52ch, 35em)");
    expect(html).not.toContain("line-height: max(1.7, var(--semantic-typography-body-lineHeight))");
    expect(html).not.toContain("word-break: keep-all");
  });
});

function cssOf(html: string): string {
  return html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
}

function rootVar(html: string, name: string): string {
  const match = html.match(new RegExp(`${name}:\\s*([^;]+);`));
  if (match?.[1] === undefined) {
    throw new Error(`missing root var: ${name}`);
  }
  return match[1].trim();
}

function lastRuleBlock(css: string, selector: string): string {
  const ruleStart = `${selector} {`;
  const index = css.lastIndexOf(ruleStart);
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
