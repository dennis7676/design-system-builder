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
import { generateEditorialDemo } from "./demo-editorial.js";
import { COPY, type DemoCopy } from "./demo-copy.js";

/** Regions the completeness contract (manifest.checkDemo) requires. */
export const DEMO_REGIONS = ["nav", "hero", "features", "form", "footer"] as const;

/** Expression tier resolution: meta.expression is optional; absent ⇒ balanced,
 * and the balanced path emits byte-identical output to the pre-tier generator
 * (backward-compat anchor — golden G-X1). */
type Tier = "safe" | "balanced" | "bold";

export function generateDemo(doc: TokensDocument): string {
  const tier: Tier = doc.meta.expression ?? "balanced";
  const ko = doc.meta.locales?.includes("ko") ?? false;
  const copy: DemoCopy = ko ? COPY.ko : COPY.en;
  const hash = computeTokenHash(doc);
  const brand = htmlEscape(doc.meta.recipe);
  const snapshot = JSON.stringify({ builtFromTokenHash: hash, generatedAt: doc.meta.generatedAt });
  if (doc.meta.skeleton === "editorial") {
    return generateEditorialDemo(doc, tier, ko, copy, brand, snapshot);
  }
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

function header(brand: string, copy: DemoCopy): string {
  const links = ["Product", "Pricing", "Docs", "Company"]
    .map((l) => `<a href="#">${htmlEscape(l)}</a>`)
    .join("");
  return `<header data-demo-region="nav" class="topbar"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav><button class="btn btn-primary">${htmlEscape(copy.navCta)}</button></header>`;
}

function heroInner(brand: string, copy: DemoCopy): string {
  // brand arrives pre-escaped; copy deck literals are static and HTML-safe.
  return `<p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div>`;
}

function hero(brand: string, copy: DemoCopy): string {
  return `<section data-demo-region="hero" class="hero">${heroInner(brand, copy)}</section>`;
}

/** Bold tier: split hero — copy column ↔ brand panel with a display glyph.
 * Same region contract; the glyph is the brand's first letter (deterministic). */
function heroBold(brand: string, copy: DemoCopy): string {
  const glyph = htmlEscape((brand[0] ?? "A").toUpperCase());
  return `<section data-demo-region="hero" class="hero"><div class="hero-copy">${heroInner(brand, copy)}</div><div class="hero-panel" aria-hidden="true"><span class="glyph">${glyph}</span></div></section>`;
}

function features(copy: DemoCopy): string {
  const cards = (copy.cards as ReadonlyArray<readonly [string, string]>)
    .map(
      ([t, b]) =>
        `<article class="card"><h3>${htmlEscape(t)}</h3><p>${htmlEscape(b)}</p><a class="link" href="#">${htmlEscape(copy.learnMore)}</a></article>`,
    )
    .join("");
  return `<section data-demo-region="features" class="features"><h2>${htmlEscape(copy.featuresTitle)}</h2><div class="card-grid">${cards}</div></section>`;
}

function form(copy: DemoCopy): string {
  const fields = (copy.fields as ReadonlyArray<readonly [string, string, string, string]>)
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="signup"><div class="signup-card"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></div></section>`;
}

function footer(brand: string, copy: DemoCopy): string {
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
  const easing = "var(--semantic-motion-easing-standard)";
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
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}, background ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; }
    .eyebrow { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .04em; font-size: .8rem; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { max-width: 52ch; color: color-mix(in oklch, ${fg} 78%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
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
    .hero h1 { max-width: 18ch; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .62), 6vw, var(--semantic-typography-display-size))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .features { padding: clamp(2rem, 5vw, 4rem) 0; display: grid; gap: 1.5rem; border-top: 1px solid ${hairline}; }
    .card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
    .features h2 { font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .card { border: 1px solid ${hairline}; border-radius: ${radius}; padding: ${inset}; background: color-mix(in oklch, ${surface} 96%, ${primary}); display: grid; gap: .6rem; align-content: start;${raised} transition: box-shadow ${transition} ${easing}, transform ${transition} ${easing}; }
    .card:hover {${overlay} transform: translateY(-2px); }
    .card h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .link { color: ${primary}; text-decoration: none; font-weight: 600; }
    .signup { padding: clamp(2rem, 5vw, 4rem) 0; }
    .signup-card { border: 1px solid ${hairline}; border-radius: ${radius}; padding: clamp(1.5rem, 4vw, 3rem); background: color-mix(in oklch, ${surface} 94%, ${primary}); display: grid; gap: 1rem; max-width: 34rem;${overlay} }
    .signup-card h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .signup form { display: grid; gap: .85rem; }
    .signup label { display: grid; gap: .35rem; font-size: .9rem; }
    .signup input { padding: .65rem .8rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: ${surface}; color: ${fg}; font: inherit; transition: border-color ${transition} ${easing}, outline-color ${transition} ${easing}; }
    .signup input:focus-visible { outline: .16rem solid ${primary}; outline-offset: 1px; }
    .site-footer { border-top: 1px solid ${hairline}; margin-top: 2rem; padding: clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 3rem); display: grid; gap: 1.5rem; }
    .footer-cols { display: grid; grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr)); gap: 1.5rem; width: min(72rem, 100%); margin: 0 auto; }
    .footer-cols div { display: grid; gap: .4rem; align-content: start; }
    .footer-cols a { text-decoration: none; color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .footer-cols a:hover { color: ${primary}; }
    .fine { width: min(72rem, 100%); margin: 0 auto; font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 640px) { .topbar nav { display: none; } }${reduce}${tierCss(tier, doc)}${koCss(ko)}`;
}

/** Korean rendering rules (spec: locale-typography). Appended last so they
 * override Latin-tuned metrics: keep-all line breaking, neutral heading
 * tracking, and a display line-height floor (Hangul fills the em box — the
 * bold tier's .98 crowds syllable blocks). Emits nothing for Latin builds. */
function koCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .hero h1 { max-width: min(18ch, 15em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .features h2, .signup-card h2 { letter-spacing: normal; }`;
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
  if (tier === "safe") {
    // Quieter: narrower measure, moderate display clamp, symmetric grid.
    return `
    main { width: min(64rem, 100%); }
    .hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .58), 5vw, calc(var(--semantic-typography-display-size) * .8))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
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
    .hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .78), 7vw, calc(var(--semantic-typography-display-size) * 1.18))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .hero-panel { align-self: stretch; min-height: 20rem; border-radius: calc(${radius} * 1.4); background: ${panelBg}; display: grid; place-content: center; padding: 2rem; overflow: hidden;${panelShadow} }
    .hero-panel .glyph { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 2.2), 12vw, calc(var(--semantic-typography-display-size) * 4))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); color: ${primary}; }
    .features { padding: clamp(2.5rem, 6vw, 5rem) 0; }
    .features h2 { font: var(--semantic-typography-h2-weight) clamp(var(--semantic-typography-h2-size), 4vw, calc(var(--semantic-typography-h2-size) * 1.35))/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); max-width: 22ch; }
    .card-grid { grid-template-columns: 2fr 1fr; }
    .card { padding: calc(${inset} * 1.1); }
    .card:first-child { grid-row: span 2; background: ${spotlightBg}; align-content: end; min-height: 20rem; }
    .card:first-child h3 { font-size: calc(var(--semantic-typography-h3-size) * 1.45); }
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
