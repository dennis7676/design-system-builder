/**
 * Applied demo page (P3 — surface #3). A realistic product layout — nav, hero,
 * features, form, footer — styled ENTIRELY by one brand's tokens via
 * toCssVars(doc) + var(--…). No brand value is hardcoded (layout chrome only),
 * so two divergent recipes produce visibly different pages from identical markup.
 *
 * Same surface discipline as the styleguide: an embedded builtFromTokenHash makes
 * it drift-checkable (manifest.ts checkDemo). Regions carry data-demo-region for
 * the completeness contract.
 */
import type { TokensDocument } from "./tokens-schema.js";
import { toCssVars } from "./adapters/css-adapter.js";
import { computeTokenHash } from "./validator.js";
import { hasTokenPath } from "./surface-data.js";
import { htmlEscape } from "./render-utils.js";

/** Regions the completeness contract (manifest.checkDemo) requires. */
export const DEMO_REGIONS = ["nav", "hero", "features", "form", "footer"] as const;

/** Expression tier resolution: meta.expression is optional; absent ⇒ balanced,
 * and the balanced path emits byte-identical output to the pre-tier generator
 * (backward-compat anchor — golden G-X1). */
type Tier = "safe" | "balanced" | "bold";

/** Copy decks. EN is the verbatim pre-locale copy (byte-identity anchor);
 * KO is a fixed Korean deck rendered when meta.locales includes "ko". */
const COPY = {
  en: {
    eyebrow: (brand: string) => `Introducing ${brand}`,
    headline: "Ship a product that feels unmistakably yours.",
    lead: "Every color, type ramp, radius, and motion on this page is driven by one brand token set — nothing here is hardcoded.",
    ctaPrimary: "Start free",
    ctaGhost: "Book a demo",
    navCta: "Get started",
    featuresTitle: "Built on the brand's own tokens",
    cards: [
      ["Token-driven", "One tokens.json compiles into every surface — catalog, docs, and this applied page."],
      ["Accessible by gate", "Contrast pairs pass a deterministic WCAG export gate before anything ships."],
      ["Recipe families", "Structural recipes give each brand its own room; overrides fine-tune within it."],
    ],
    learnMore: "Learn more",
    formTitle: "Request access",
    formLead: "See the applied page rendered for your brand.",
    formSubmit: "Request access",
    fields: [
      ["Name", "text", "name", "Ada Lovelace"],
      ["Work email", "email", "email", "ada@example.com"],
      ["Company", "text", "company", "Analytical Engines"],
    ],
    footTagline: "Design tokens, applied.",
    fine: (brand: string) => `© ${brand}. Styled entirely by brand tokens.`,
  },
  ko: {
    eyebrow: (brand: string) => `${brand}를 소개합니다`,
    headline: "당신의 브랜드다움이 그대로 느껴지는 제품을 만드세요.",
    lead: "이 페이지의 모든 색상, 타이포그래피, 곡률, 모션은 하나의 브랜드 토큰 세트에서 파생됩니다 — 하드코딩된 값은 없습니다.",
    ctaPrimary: "무료로 시작",
    ctaGhost: "데모 신청",
    navCta: "시작하기",
    featuresTitle: "브랜드 고유 토큰으로 빌드됩니다",
    cards: [
      ["토큰 기반 설계", "하나의 tokens.json이 카탈로그, 문서, 그리고 이 적용 페이지까지 모든 표면으로 컴파일됩니다."],
      ["게이트로 보장되는 접근성", "대비쌍은 출고 전 결정론적 WCAG 게이트를 통과합니다."],
      ["레시피 패밀리", "구조적 레시피가 브랜드마다 고유한 공간을 제공합니다."],
    ],
    learnMore: "자세히 보기",
    formTitle: "접근 요청",
    formLead: "당신의 브랜드로 렌더링된 적용 페이지를 확인하세요.",
    formSubmit: "접근 요청",
    fields: [
      ["이름", "text", "name", "홍길동"],
      ["업무용 이메일", "email", "email", "hong@example.com"],
      ["회사", "text", "company", "분석기관"],
    ],
    footTagline: "디자인 토큰, 그대로 적용.",
    fine: (brand: string) => `© ${brand}. 모든 스타일은 브랜드 토큰에서 나옵니다.`,
  },
} as const;

type Copy = (typeof COPY)[keyof typeof COPY];

export function generateDemo(doc: TokensDocument): string {
  const tier: Tier = doc.meta.expression ?? "balanced";
  const ko = doc.meta.locales?.includes("ko") ?? false;
  const copy: Copy = ko ? COPY.ko : COPY.en;
  const hash = computeTokenHash(doc);
  const brand = htmlEscape(doc.meta.recipe);
  const snapshot = JSON.stringify({ builtFromTokenHash: hash, generatedAt: doc.meta.generatedAt });
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    `<style>${demoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    header(brand, copy),
    "<main>",
    tier === "bold" ? heroBold(brand, copy) : hero(brand, copy),
    features(copy),
    form(copy),
    "</main>",
    footer(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function header(brand: string, copy: Copy): string {
  const links = ["Product", "Pricing", "Docs", "Company"]
    .map((l) => `<a href="#">${htmlEscape(l)}</a>`)
    .join("");
  return `<header data-demo-region="nav" class="topbar"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav><button class="btn btn-primary">${htmlEscape(copy.navCta)}</button></header>`;
}

function heroInner(brand: string, copy: Copy): string {
  // brand arrives pre-escaped; copy deck literals are static and HTML-safe.
  return `<p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div>`;
}

function hero(brand: string, copy: Copy): string {
  return `<section data-demo-region="hero" class="hero">${heroInner(brand, copy)}</section>`;
}

/** Bold tier: split hero — copy column ↔ brand panel with a display glyph.
 * Same region contract; the glyph is the brand's first letter (deterministic). */
function heroBold(brand: string, copy: Copy): string {
  const glyph = htmlEscape((brand[0] ?? "A").toUpperCase());
  return `<section data-demo-region="hero" class="hero"><div class="hero-copy">${heroInner(brand, copy)}</div><div class="hero-panel" aria-hidden="true"><span class="glyph">${glyph}</span></div></section>`;
}

function features(copy: Copy): string {
  const cards = (copy.cards as ReadonlyArray<readonly [string, string]>)
    .map(
      ([t, b]) =>
        `<article class="card"><h3>${htmlEscape(t)}</h3><p>${htmlEscape(b)}</p><a class="link" href="#">${htmlEscape(copy.learnMore)}</a></article>`,
    )
    .join("");
  return `<section data-demo-region="features" class="features"><h2>${htmlEscape(copy.featuresTitle)}</h2><div class="card-grid">${cards}</div></section>`;
}

function form(copy: Copy): string {
  const fields = (copy.fields as ReadonlyArray<readonly [string, string, string, string]>)
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="signup"><div class="signup-card"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></div></section>`;
}

function footer(brand: string, copy: Copy): string {
  const cols = ["Product", "Resources", "Company"]
    .map(
      (c) =>
        `<div><strong>${htmlEscape(c)}</strong><a href="#">Overview</a><a href="#">Changelog</a><a href="#">Support</a></div>`,
    )
    .join("");
  return `<footer data-demo-region="footer" class="site-footer"><div class="footer-cols"><div class="footer-brand"><span class="brand">${brand}</span><p>${htmlEscape(copy.footTagline)}</p></div>${cols}</div><p class="fine">${copy.fine(brand)}</p></footer>`;
}

/** Brand values come ONLY from var(--…) (values live in the :root toCssVars block).
 * Layout chrome (grid/clamp/hairlines) may use literals, per baseCss precedent. */
function demoCss(doc: TokensDocument, tier: Tier = "balanced", ko = false): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }`
    : "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const fg = "var(--semantic-color-surface-foreground, CanvasText)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const hairline = "var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent))";
  const radius = "var(--semantic-shape-control, .5rem)";
  const inset = "var(--semantic-space-inset, 1.5rem)";
  const transition = "var(--semantic-motion-transition, 160ms)";
  // Elevation is opt-in per recipe: expressive recipes declare semantic.elevation.*,
  // flat recipes (minimal-tech/enterprise) declare none → no box-shadow is emitted,
  // so they render flat by identity. Values come only from var(--semantic-elevation-*).
  const raised = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-raised);" : "";
  const overlay = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-overlay);" : "";
  // Hero gradient is opt-in: expressive recipes declare semantic.gradient.hero;
  // flat recipes emit no gradient so the hero renders on the plain surface.
  // At bold the gradient moves into the hero-panel (tierCss), so the hero bg
  // stays plain — no double-gradient.
  const heroBg = tier !== "bold" && hasGradient(doc)
    ? ` background: var(--semantic-gradient-hero); border-radius: ${radius}; padding-inline: clamp(1.5rem, 4vw, 3rem); margin-top: 1.5rem;`
    : "";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight, 400) var(--semantic-typography-body-size, 1rem)/var(--semantic-typography-body-lineHeight, 1.5) var(--semantic-typography-body-family, system-ui, sans-serif); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; }
    .brand { font: var(--semantic-typography-heading-weight, 700) 1.2rem/1 var(--semantic-typography-heading-family, system-ui, sans-serif); text-decoration: none; }
    .eyebrow { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .04em; font-size: .8rem; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { max-width: 52ch; color: color-mix(in oklch, ${fg} 78%, ${surface}); font-size: 1.05rem; }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ease, transform ${transition} ease; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ButtonText); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border: 1px solid ${hairline}; }
    .btn:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .topbar { display: flex; align-items: center; gap: 1.5rem; padding: 1rem clamp(1rem, 4vw, 3rem); border-bottom: 1px solid ${hairline}; position: sticky; top: 0; background: color-mix(in oklch, ${surface} 92%, transparent); backdrop-filter: blur(.6rem); }
    .topbar nav { display: flex; gap: 1rem; margin-left: auto; }
    .topbar nav a { text-decoration: none; padding: .4rem .5rem; border-radius: ${radius}; }
    .topbar nav a:hover { color: ${primary}; }
    main { width: min(72rem, 100%); margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem); }
    .hero { padding: clamp(3rem, 8vw, 6rem) 0; display: grid; gap: 1.5rem;${heroBg} }
    .hero h1 { max-width: 18ch; font: var(--semantic-typography-heading-weight, 700) clamp(2.4rem, 6vw, 4rem)/1.05 var(--semantic-typography-heading-family, system-ui, sans-serif); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .features { padding: clamp(2rem, 5vw, 4rem) 0; display: grid; gap: 1.5rem; border-top: 1px solid ${hairline}; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
    .card { border: 1px solid ${hairline}; border-radius: ${radius}; padding: ${inset}; background: color-mix(in oklch, ${surface} 96%, ${primary}); display: grid; gap: .6rem; align-content: start;${raised} transition: box-shadow ${transition} ease, transform ${transition} ease; }
    .card:hover {${overlay} transform: translateY(-2px); }
    .card h3 { font: var(--semantic-typography-heading-weight, 700) 1.2rem/1.2 var(--semantic-typography-heading-family, system-ui, sans-serif); }
    .link { color: ${primary}; text-decoration: none; font-weight: 600; }
    .signup { padding: clamp(2rem, 5vw, 4rem) 0; }
    .signup-card { border: 1px solid ${hairline}; border-radius: ${radius}; padding: clamp(1.5rem, 4vw, 3rem); background: color-mix(in oklch, ${surface} 94%, ${primary}); display: grid; gap: 1rem; max-width: 34rem;${overlay} }
    .signup form { display: grid; gap: .85rem; }
    .signup label { display: grid; gap: .35rem; font-size: .9rem; }
    .signup input { padding: .65rem .8rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: ${surface}; color: ${fg}; font: inherit; }
    .signup input:focus-visible { outline: .16rem solid ${primary}; outline-offset: 1px; }
    .site-footer { border-top: 1px solid ${hairline}; margin-top: 2rem; padding: clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 3rem); display: grid; gap: 1.5rem; }
    .footer-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1.5rem; width: min(72rem, 100%); margin: 0 auto; }
    .footer-cols div { display: grid; gap: .4rem; align-content: start; }
    .footer-cols a { text-decoration: none; color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .footer-cols a:hover { color: ${primary}; }
    .fine { width: min(72rem, 100%); margin: 0 auto; font-size: .85rem; color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 640px) { .topbar nav { display: none; } }${reduce}${tierCss(tier, doc)}${koCss(ko)}`;
}

/** Korean rendering rules (spec: locale-typography). Appended last so they
 * override Latin-tuned metrics: keep-all line breaking, neutral heading
 * tracking, and a display line-height floor (Hangul fills the em box — the
 * bold tier's .98 crowds syllable blocks). Emits nothing for Latin builds. */
function koCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; }
    .hero h1 { letter-spacing: normal; line-height: 1.12; }`;
}

/** Tier layout overrides, appended after the base rules (same specificity —
 * source order wins). Balanced emits nothing: the base IS the balanced tier.
 * Brand values only via var(--…)/color-mix over vars; layout chrome literals
 * only (baseCss precedent). Never touches colour tokens or contrast pairs. */
function tierCss(tier: Tier, doc: TokensDocument): string {
  if (tier === "balanced") return "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const radius = "var(--semantic-shape-control, .5rem)";
  const inset = "var(--semantic-space-inset, 1.5rem)";
  const heading = "var(--semantic-typography-heading-family, system-ui, sans-serif)";
  const headingWeight = "var(--semantic-typography-heading-weight, 700)";
  if (tier === "safe") {
    // Quieter: narrower measure, moderate display clamp, symmetric grid.
    return `
    main { width: min(64rem, 100%); }
    .hero h1 { font: ${headingWeight} clamp(2.2rem, 5vw, 3.2rem)/1.1 ${heading}; }
    .card-grid { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 760px) { .card-grid { grid-template-columns: 1fr; } }`;
  }
  // bold — split hero + brand panel, bounded display clamp (overflow lesson),
  // asymmetric spotlight grid, density ×1.1/×1.25. Vocabulary stays opt-in:
  // flat recipes get color-mix solids, no invented shadow/gradient.
  const panelBg = hasGradient(doc)
    ? "var(--semantic-gradient-hero)"
    : `color-mix(in oklch, ${surface} 88%, ${primary})`;
  const panelShadow = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-overlay);" : "";
  const spotlightBg = hasGradient(doc)
    ? "var(--semantic-gradient-hero)"
    : `color-mix(in oklch, ${surface} 90%, ${primary})`;
  return `
    main { width: min(76rem, 100%); }
    .hero { grid-template-columns: 1.1fr .9fr; column-gap: 2.5rem; align-items: center; padding: clamp(3rem, 7vw, 5.5rem) 0; }
    .hero-copy { display: grid; gap: 1.5rem; }
    .hero h1 { font: ${headingWeight} clamp(3rem, 7vw, 4.75rem)/.98 ${heading}; letter-spacing: -.01em; }
    .hero-panel { align-self: stretch; min-height: 20rem; border-radius: calc(${radius} * 1.4); background: ${panelBg}; display: grid; place-content: center; padding: 2rem; overflow: hidden;${panelShadow} }
    .hero-panel .glyph { font: ${headingWeight} clamp(5rem, 12vw, 9rem)/1 ${heading}; color: ${primary}; }
    .features { padding: clamp(2.5rem, 6vw, 5rem) 0; }
    .features h2 { font: ${headingWeight} clamp(1.8rem, 4vw, 2.6rem)/1.15 ${heading}; max-width: 22ch; }
    .card-grid { grid-template-columns: 2fr 1fr; }
    .card { padding: calc(${inset} * 1.1); }
    .card:first-child { grid-row: span 2; background: ${spotlightBg}; align-content: end; min-height: 20rem; }
    .card:first-child h3 { font-size: 1.8rem; }
    @media (max-width: 760px) { .hero { grid-template-columns: 1fr; } .card-grid { grid-template-columns: 1fr; } .card:first-child { grid-row: auto; min-height: 0; } }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}

/** True when the doc carries semantic.elevation.* — expressive recipes only. */
function hasElevation(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)elevation(\.|$)/);
}

/** True when the doc carries semantic.gradient.* — expressive recipes only. */
function hasGradient(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)gradient(\.|$)/);
}
