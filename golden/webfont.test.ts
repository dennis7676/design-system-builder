import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import { generateDemo } from "../src/demo-generator.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import {
  collectWebfonts,
  fontSourceKinds,
  loadRecipes,
  type Recipe,
  webfontImportCss,
} from "../src/index.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokenGroup, TokenNode, TokensDocument } from "../src/tokens-schema.js";
import { writeGeneratedArtifacts } from "../src/cli.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const recipes = loadRecipes(join(root, "references/recipes"));

const recipe = (key: string): Recipe => {
  const found = recipes.find((item) => item.key === key);
  if (found === undefined) throw new Error(`recipe fixture missing: ${key}`);
  return found;
};

const brandFor = (key: string, locales?: readonly string[]): BrandJson => ({
  schemaVersion: "2026-06-30",
  product: { name: "Demo", medium: "web", ...(locales !== undefined ? { locales } : {}) },
  branding: { tone_vector: recipe(key).toneAnchor },
});

const buildFor = (key: string, locales?: readonly string[]): TokensDocument =>
  buildTokens(brandFor(key, locales), recipe(key));

describe("G-W1 — font source completeness", () => {
  it("every base and locale recipe family resolves to exactly one source kind", () => {
    const missing: string[] = [];
    for (const item of recipes) {
      for (const family of familiesInRecipe(item)) {
        const kinds = fontSourceKinds(family);
        if (kinds.length !== 1) missing.push(`${item.key}: ${family} (${kinds.length})`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe("G-W2 — generated surfaces include document webfonts", () => {
  it("minimal-tech demo emits exact Inter and JetBrains Mono css2 weight-union links", () => {
    const html = generateDemo(buildFor("minimal-tech"));
    const inter = "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap";
    const jetbrains = "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap";

    expect(html).toContain('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
    expect(html).toContain(`<link rel="stylesheet" href="${inter}">`);
    expect(html).toContain(`<link rel="stylesheet" href="${jetbrains}">`);
  });

  it("minimal-tech styleguide emits the same webfont head links", () => {
    const html = generateStyleguide(buildFor("minimal-tech"));
    expect(stylesheetLinks(html)).toEqual([
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap",
    ]);
  });

  it("luxury ko demo emits the recipe's sans/serif webfonts and no SUIT source", () => {
    const html = generateDemo(buildFor("luxury", ["ko"]));
    const links = stylesheetLinks(html);

    expect(links).toEqual([
      "https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&display=swap",
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
      "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap",
      "https://fonts.googleapis.com/css2?family=Noto+Serif+KR:wght@400;600;700&display=swap",
    ]);
    expect(html).not.toContain("SUIT.css");
  });
});

describe("G-W3 — unknown family marker", () => {
  it("marks an unresolved family in the generated head", () => {
    const doc = withExtraFamily(buildFor("minimal-tech"), "Mystery Sans");
    expect(generateDemo(doc)).toContain("<!-- webfont: no source for Mystery Sans -->");
    expect(collectWebfonts(doc).missingFamilies).toEqual(["Mystery Sans"]);
  });
});

describe("G-W4 — CLI fonts.css sidecar", () => {
  it("writes font imports next to tokens.css while tokens.css stays import-free", () => {
    const dir = mkdtempSync(join(tmpdir(), "dsb-webfont-"));
    const doc = buildFor("minimal-tech");
    writeGeneratedArtifacts(dir, {
      doc,
      css: "",
      styleguideHtml: "",
      designMd: "",
      demoHtml: "",
    });

    expect(readFileSync(join(dir, "fonts.css"), "utf8")).toBe(`${webfontImportCss(doc)}\n`);
    expect(readFileSync(join(dir, "tokens.css"), "utf8")).not.toContain("@import");
  });
});

function familiesInRecipe(recipeFixture: Recipe): readonly string[] {
  const families = new Set<string>();
  collectFamilies(recipeFixture.base, families);
  for (const locale of Object.values(recipeFixture.locales ?? {})) {
    for (const stack of Object.values(locale.append)) {
      for (const family of stack) families.add(family);
    }
  }
  return [...families].sort();
}

function collectFamilies(value: unknown, families: Set<string>): void {
  if (!isRecord(value)) return;
  if (value["$type"] === "fontFamily" && Array.isArray(value["$value"])) {
    for (const item of value["$value"]) {
      if (typeof item === "string") families.add(item);
    }
    return;
  }
  for (const child of Object.values(value)) collectFamilies(child, families);
}

function stylesheetLinks(html: string): readonly string[] {
  return [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map((match) => match[1] ?? "");
}

function withExtraFamily(doc: TokensDocument, family: string): TokensDocument {
  const font = tokenGroup(doc.primitive["font"]);
  const families = tokenGroup(font["family"]);
  families["mystery"] = { $type: "fontFamily", $value: [family, "sans-serif"], $class: "portable" };
  return doc;
}

function tokenGroup(node: TokenNode | undefined): TokenGroup {
  if (node === undefined || !isRecord(node) || "$value" in node) throw new Error("expected token group");
  return node;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
