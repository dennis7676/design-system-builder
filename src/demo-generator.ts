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

export function generateDemo(doc: TokensDocument): string {
  const hash = computeTokenHash(doc);
  const brand = htmlEscape(doc.meta.recipe);
  const snapshot = JSON.stringify({ builtFromTokenHash: hash, generatedAt: doc.meta.generatedAt });
  return [
    "<!doctype html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    `<style>${demoCss(doc)}</style>`,
    "</head>",
    "<body>",
    header(brand),
    "<main>",
    hero(brand),
    features(),
    form(),
    "</main>",
    footer(brand),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function header(brand: string): string {
  const links = ["Product", "Pricing", "Docs", "Company"]
    .map((l) => `<a href="#">${htmlEscape(l)}</a>`)
    .join("");
  return `<header data-demo-region="nav" class="topbar"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav><button class="btn btn-primary">Get started</button></header>`;
}

function hero(brand: string): string {
  return `<section data-demo-region="hero" class="hero"><p class="eyebrow">Introducing ${brand}</p><h1>Ship a product that feels unmistakably yours.</h1><p class="lead">Every color, type ramp, radius, and motion on this page is driven by one brand token set — nothing here is hardcoded.</p><div class="cta-row"><button class="btn btn-primary">Start free</button><button class="btn btn-ghost">Book a demo</button></div></section>`;
}

function features(): string {
  const cards = ([
    ["Token-driven", "One tokens.json compiles into every surface — catalog, docs, and this applied page."],
    ["Accessible by gate", "Contrast pairs pass a deterministic WCAG export gate before anything ships."],
    ["Recipe families", "Structural recipes give each brand its own room; overrides fine-tune within it."],
  ] as ReadonlyArray<readonly [string, string]>)
    .map(
      ([t, b]) =>
        `<article class="card"><h3>${htmlEscape(t)}</h3><p>${htmlEscape(b)}</p><a class="link" href="#">Learn more</a></article>`,
    )
    .join("");
  return `<section data-demo-region="features" class="features"><h2>Built on the brand's own tokens</h2><div class="card-grid">${cards}</div></section>`;
}

function form(): string {
  return `<section data-demo-region="form" class="signup"><div class="signup-card"><h2>Request access</h2><p class="lead">See the applied page rendered for your brand.</p><form><label>Name<input type="text" name="name" placeholder="Ada Lovelace"></label><label>Work email<input type="email" name="email" placeholder="ada@example.com"></label><label>Company<input type="text" name="company" placeholder="Analytical Engines"></label><button type="submit" class="btn btn-primary">Request access</button></form></div></section>`;
}

function footer(brand: string): string {
  const cols = ["Product", "Resources", "Company"]
    .map(
      (c) =>
        `<div><strong>${htmlEscape(c)}</strong><a href="#">Overview</a><a href="#">Changelog</a><a href="#">Support</a></div>`,
    )
    .join("");
  return `<footer data-demo-region="footer" class="site-footer"><div class="footer-cols"><div class="footer-brand"><span class="brand">${brand}</span><p>Design tokens, applied.</p></div>${cols}</div><p class="fine">© ${brand}. Styled entirely by brand tokens.</p></footer>`;
}

/** Brand values come ONLY from var(--…) (values live in the :root toCssVars block).
 * Layout chrome (grid/clamp/hairlines) may use literals, per baseCss precedent. */
function demoCss(doc: TokensDocument): string {
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
  const heroBg = hasGradient(doc)
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
    @media (max-width: 640px) { .topbar nav { display: none; } }${reduce}`;
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
