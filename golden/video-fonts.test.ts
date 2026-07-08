import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BrandJson } from "../src/brand-schema.js";
import { buildContractJson } from "../src/contract.js";
import { CSS_URL_FONT_SOURCES, GOOGLE_FONT_FAMILIES } from "../src/font-sources.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";
import type { TokenGroup, TokenNode, TokensDocument } from "../src/tokens-schema.js";
import { toTokensTs } from "../src/adapters/video-adapter.js";
import { remotionFontPackage, toFontsTs } from "../src/adapters/video-fonts.js";
import { writeGeneratedArtifacts } from "../src/cli.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const recipes = loadRecipes(join(root, "references/recipes"));

const REMOTION_PACKAGES: Readonly<Record<(typeof GOOGLE_FONT_FAMILIES)[number], string>> = {
  "Cormorant Garamond": "CormorantGaramond",
  "DM Sans": "DMSans",
  "IBM Plex Mono": "IBMPlexMono",
  "IBM Plex Sans": "IBMPlexSans",
  "IBM Plex Sans KR": "IBMPlexSansKR",
  Inter: "Inter",
  "JetBrains Mono": "JetBrainsMono",
  Lexend: "Lexend",
  Merriweather: "Merriweather",
  "Noto Serif KR": "NotoSerifKR",
  Nunito: "Nunito",
  Poppins: "Poppins",
  "Public Sans": "PublicSans",
  "Source Sans 3": "SourceSans3",
  "Source Serif 4": "SourceSerif4",
  "Space Grotesk": "SpaceGrotesk",
  "Space Mono": "SpaceMono",
};

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

describe("G-V7 — emitted Remotion font loader module", () => {
  it("emits google-font imports and loadVideoFonts calls for google families", () => {
    const ts = toFontsTs(buildFor("minimal-tech"));

    expect(ts).toContain(
      'import { loadFont as loadInter } from "@remotion/google-fonts/Inter";',
    );
    expect(ts).toContain(
      'import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";',
    );
    expect(ts).toContain('"Inter": loadInter().fontFamily');
    expect(ts).toContain('"JetBrains Mono": loadJetBrainsMono().fontFamily');
    expect(ts).toContain("export function loadVideoFonts()");
  });

  it("emits css-url families as CDN stylesheets, never as google-font imports", () => {
    const ts = toFontsTs(buildFor("creative-multiscale", ["ko"]));

    expect(ts).toContain('"family": "SUIT"');
    expect(ts).toContain(`"url": "${CSS_URL_FONT_SOURCES.SUIT}"`);
    expect(ts).toContain("export const cdnFontStylesheets");
    expect(ts).not.toContain("@remotion/google-fonts/SUIT");
  });

  it("omits system families from font loaders and CDN stylesheets", () => {
    const ts = toFontsTs(withExtraFamily(buildFor("minimal-tech"), "-apple-system"));

    expect(ts).not.toContain('"-apple-system":');
    expect(ts).not.toContain('"family": "-apple-system"');
    expect(ts).not.toContain("@remotion/google-fonts/-apple-system");
  });

  it("maps every known google family to the @remotion/google-fonts package name", () => {
    for (const family of GOOGLE_FONT_FAMILIES) {
      expect(remotionFontPackage(family), family).toBe(REMOTION_PACKAGES[family]);
    }
  });

  it("is deterministic across runs", () => {
    const doc = buildFor("luxury");
    expect(toFontsTs(doc)).toBe(toFontsTs(doc));
  });

  it("keeps tokens.ts fontAssets unchanged while CLI writes fonts.video.ts beside it", () => {
    const dir = mkdtempSync(join(tmpdir(), "dsb-video-fonts-"));
    const doc = buildFor("minimal-tech");
    const tokensTs = toTokensTs(doc);
    writeGeneratedArtifacts(dir, {
      doc,
      css: "",
      styleguideHtml: "",
      designMd: "",
      demoHtml: "",
      contractJson: buildContractJson(doc),
    });

    expect(readFileSync(join(dir, "tokens.ts"), "utf8")).toBe(tokensTs);
    expect(readFileSync(join(dir, "fonts.video.ts"), "utf8")).toBe(toFontsTs(doc));
  });
});

function withExtraFamily(doc: TokensDocument, family: string): TokensDocument {
  const font = tokenGroup(doc.primitive["font"]);
  const families = tokenGroup(font["family"]);
  families["systemOnly"] = { $type: "fontFamily", $value: [family], $class: "portable" };
  return doc;
}

function tokenGroup(node: TokenNode | undefined): TokenGroup {
  if (node === undefined || typeof node !== "object" || "$value" in node) throw new Error("expected token group");
  return node;
}
