import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import { textureOverlayCss } from "./texture-overlay.js";
import { glassPanelCss } from "./glass-surface.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateMosaicDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${mosaicDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    mosaicHeader(brand),
    "<main>",
    mosaicHero(brand, copy),
    mosaicFeatures(copy),
    mosaicForm(copy),
    "</main>",
    mosaicFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function mosaicHeader(brand: string): string {
  const links = ["Product", "Pricing", "Docs", "Company"].map((label) => `<a href="#">${htmlEscape(label)}</a>`).join("");
  return `<header data-demo-region="nav" class="mosaic-nav"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav></header>`;
}

function mosaicHero(brand: string, copy: DemoCopy): string {
  const glyph = htmlEscape((brand[0] ?? "A").toUpperCase());
  return `<section data-demo-region="hero" class="mosaic-grid mosaic-hero"><div class="mosaic-tile mosaic-headline"><p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1></div><div class="mosaic-tile mosaic-lead"><p class="lead">${htmlEscape(copy.lead)}</p></div><div class="mosaic-tile mosaic-action"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button></div><div class="mosaic-tile mosaic-glyph" aria-hidden="true">${glyph}</div></section>`;
}

function mosaicFeatures(copy: DemoCopy): string {
  const cards = copy.cards
    .map(
      ([title, body], index) =>
        `<article class="mosaic-tile mosaic-card ${index === 0 ? "mosaic-card-large" : ""}"><h3>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p><a class="link" href="#">${htmlEscape(copy.learnMore)}</a></article>`,
    )
    .join("");
  return `<section data-demo-region="features" class="mosaic-features"><h2>${htmlEscape(copy.featuresTitle)}</h2><div class="mosaic-feature-row">${cards}</div></section>`;
}

function mosaicForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="mosaic-form"><div class="mosaic-tile mosaic-form-card"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></div></section>`;
}

function mosaicFooter(brand: string, copy: DemoCopy): string {
  return `<footer data-demo-region="footer" class="mosaic-footer"><div class="mosaic-tile mosaic-footer-brand"><a class="brand" href="#">${brand}</a></div><p class="mosaic-tile fine">${copy.fine(brand)}</p></footer>`;
}

function mosaicDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }`
    : "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const fg = "var(--semantic-color-surface-foreground, CanvasText)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const onPrimary = "var(--semantic-color-primary-foreground, ButtonText)";
  const hairline = "var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent))";
  const radius = "var(--semantic-shape-control, .5rem)";
  const inset = "var(--semantic-space-inset, 1.5rem)";
  const transition = "var(--semantic-motion-transition, 160ms)";
  const easing = "var(--semantic-motion-easing-standard)";
  const raised = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-raised);" : "";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}, background ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; }
    .eyebrow { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .08em; font-size: .78rem; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { max-width: 52ch; color: color-mix(in oklch, ${fg} 76%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { width: 100%; height: 100%; min-height: 5rem; background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ${onPrimary}); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn:focus-visible, a:focus-visible, input:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .mosaic-nav { display: flex; align-items: center; gap: 1.5rem; padding: 1rem clamp(1rem, 4vw, 3rem); }
    .mosaic-nav .brand { font-size: calc(var(--semantic-typography-h1-size) * .82); }
    .mosaic-nav nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-left: auto; }
    .mosaic-nav a { text-decoration: none; }
    main { width: 100%; margin: 0; }
    .mosaic-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-template-rows: repeat(2, minmax(13rem, auto)); gap: 1px; background: ${hairline}; }
    .mosaic-tile { background: ${surface}; padding: ${inset}; display: grid; align-content: center; gap: .8rem; min-width: 0;${raised} }
    .mosaic-headline { grid-column: span 2; grid-row: span 2; align-content: end; }
    .mosaic-headline h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 1.15), 9vw, calc(var(--semantic-typography-display-size) * 1.9))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .mosaic-lead { grid-column: span 2; }
    .mosaic-action .btn { align-self: stretch; }
    .mosaic-glyph { color: ${primary}; place-items: center; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 1.5), 12vw, calc(var(--semantic-typography-display-size) * 3.4))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .mosaic-features { padding: clamp(2rem, 5vw, 4rem) clamp(1rem, 4vw, 3rem); display: grid; gap: 1rem; }
    .mosaic-features h2 { max-width: 20ch; text-wrap: balance; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .mosaic-feature-row { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 1px; background: ${hairline}; }
    .mosaic-card { min-height: 16rem; align-content: start; border-radius: 0; }
    .mosaic-card h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .mosaic-card-large h3 { max-width: 16ch; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .mosaic-card p { color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .link { color: ${primary}; text-decoration: none; font-weight: 600; }
    .mosaic-form { padding: 0 clamp(1rem, 4vw, 3rem) clamp(2rem, 5vw, 4rem); display: grid; justify-items: start; }
    .mosaic-form-card { width: min(26rem, 100%); border: 1px solid ${hairline}; border-radius: ${radius}; }
    .mosaic-form-card h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .mosaic-form-card form { display: grid; gap: .85rem; }
    .mosaic-form-card label { display: grid; gap: .35rem; font-size: .9rem; }
    .mosaic-form-card input { padding: .65rem .8rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: ${surface}; color: ${fg}; font: inherit; }
    .mosaic-footer { display: grid; grid-template-columns: 2fr 1fr; gap: 1px; background: ${hairline}; }
    .mosaic-footer-brand .brand { font: var(--semantic-typography-display-weight) clamp(var(--semantic-typography-display-size), 8vw, calc(var(--semantic-typography-display-size) * 1.45))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .fine { margin: 0; font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    @media (max-width: 760px) { .mosaic-nav nav { display: none; } .mosaic-grid, .mosaic-feature-row, .mosaic-footer { grid-template-columns: 1fr; } .mosaic-headline, .mosaic-lead { grid-column: auto; grid-row: auto; } }${reduce}${mosaicTierCss(tier)}${textureOverlayCss(doc, [".mosaic-tile"])}${glassPanelCss(doc, [".mosaic-tile"])}${mosaicKoCss(ko)}`;
}

function mosaicTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    .mosaic-grid { grid-template-rows: repeat(2, minmax(11rem, auto)); }
    .mosaic-headline h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .9), 7vw, calc(var(--semantic-typography-display-size) * 1.35))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }`;
  }
  return `
    .mosaic-grid { grid-template-rows: repeat(2, minmax(16rem, auto)); }
    .mosaic-headline h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 1.35), 10vw, calc(var(--semantic-typography-display-size) * 2.2))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .mosaic-card-large { min-height: 22rem; }`;
}

function mosaicKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .mosaic-headline h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .mosaic-features h2, .mosaic-card h3, .mosaic-form-card h2 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}

function hasElevation(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)elevation(\.|$)/);
}
