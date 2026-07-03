import { resolveToken, tokenEntries, tokenMap } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

export type FontSourceKind = "google" | "css-url" | "system";

export interface WebfontSource {
  readonly family: string;
  readonly kind: "google" | "css-url";
  readonly url: string;
}

export interface WebfontCollection {
  readonly sources: readonly WebfontSource[];
  readonly missingFamilies: readonly string[];
}

export const GOOGLE_FONT_FAMILIES = [
  "Cormorant Garamond",
  "DM Sans",
  "IBM Plex Mono",
  "IBM Plex Sans",
  "IBM Plex Sans KR",
  "Inter",
  "JetBrains Mono",
  "Lexend",
  "Merriweather",
  "Noto Serif KR",
  "Nunito",
  "Poppins",
  "Public Sans",
  "Source Sans 3",
  "Source Serif 4",
  "Space Grotesk",
  "Space Mono",
] as const;

export const CSS_URL_FONT_SOURCES = {
  SUIT: "https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css",
  NanumSquareRound: "https://hangeul.pstatic.net/hangeul_static/css/nanum-square-round.css",
  Pretendard: "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css",
  "Pretendard Variable": "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css",
} as const satisfies Readonly<Record<string, string>>;

export const SYSTEM_FONT_FAMILIES = [
  "-apple-system",
  "Apple SD Gothic Neo",
  "Cambria",
  "Georgia",
  "monospace",
  "sans-serif",
  "serif",
  "system-ui",
  "ui-monospace",
] as const;

export function fontSourceKinds(family: string): readonly FontSourceKind[] {
  const kinds: FontSourceKind[] = [];
  if ((GOOGLE_FONT_FAMILIES as readonly string[]).includes(family)) kinds.push("google");
  if (Object.hasOwn(CSS_URL_FONT_SOURCES, family)) kinds.push("css-url");
  if ((SYSTEM_FONT_FAMILIES as readonly string[]).includes(family)) kinds.push("system");
  return kinds;
}

export function fontSourceKind(family: string): FontSourceKind | undefined {
  const kinds = fontSourceKinds(family);
  return kinds.length === 1 ? kinds[0] : undefined;
}

export function collectWebfonts(doc: TokensDocument): WebfontCollection {
  const weights = collectFontWeights(doc);
  const sources: WebfontSource[] = [];
  const missingFamilies: string[] = [];

  for (const family of collectFontFamilies(doc)) {
    const kind = fontSourceKind(family);
    if (kind === undefined) {
      missingFamilies.push(family);
      continue;
    }
    if (kind === "system") continue;
    const url = kind === "google" ? googleCss2Url(family, weights) : cssUrlFor(family);
    if (url === undefined) {
      missingFamilies.push(family);
      continue;
    }
    sources.push({ family, kind, url });
  }

  return { sources, missingFamilies };
}

export function googleCss2Url(family: string, weights: readonly number[]): string {
  return `https://fonts.googleapis.com/css2?family=${family.replaceAll(" ", "+")}:wght@${weights.join(";")}&display=swap`;
}

export function webfontHeadTags(doc: TokensDocument): readonly string[] {
  const webfonts = collectWebfonts(doc);
  const tags: string[] = [];
  if (webfonts.sources.some((source) => source.kind === "google")) {
    tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }
  for (const source of webfonts.sources) {
    tags.push(`<link rel="stylesheet" href="${source.url}">`);
  }
  for (const family of webfonts.missingFamilies) {
    tags.push(`<!-- webfont: no source for ${commentText(family)} -->`);
  }
  return tags;
}

export function webfontImportCss(doc: TokensDocument): string {
  return collectWebfonts(doc).sources.map((source) => `@import url("${source.url}");`).join("\n");
}

function collectFontFamilies(doc: TokensDocument): readonly string[] {
  const leaves = tokenMap(doc);
  const seen = new Set<string>();
  const families: string[] = [];
  for (const entry of tokenEntries(doc)) {
    if (entry.leaf.$type !== "fontFamily") continue;
    const resolved = resolveToken(entry.path, leaves);
    if (!Array.isArray(resolved.$value)) continue;
    for (const family of resolved.$value) {
      if (seen.has(family)) continue;
      seen.add(family);
      families.push(family);
    }
  }
  return families;
}

function collectFontWeights(doc: TokensDocument): readonly number[] {
  const leaves = tokenMap(doc);
  const weights = new Set<number>([400, 700]);
  for (const entry of tokenEntries(doc)) {
    if (entry.leaf.$type !== "fontWeight") continue;
    const value = resolveToken(entry.path, leaves).$value;
    if (typeof value === "number") weights.add(value);
  }
  return [...weights].sort((a, b) => a - b);
}

function cssUrlFor(family: string): string | undefined {
  for (const [name, url] of Object.entries(CSS_URL_FONT_SOURCES)) {
    if (name === family) return url;
  }
  return undefined;
}

function commentText(value: string): string {
  return value.replaceAll("--", "- -").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
