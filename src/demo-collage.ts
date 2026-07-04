import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import { textureOverlayCss } from "./texture-overlay.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateCollageDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${collageDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    collageHeader(brand),
    "<main>",
    collageHero(brand, copy, tier),
    collageFeatures(copy),
    collageForm(copy),
    "</main>",
    collageFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function collageHeader(brand: string): string {
  const links = ["Product", "Pricing", "Docs", "Company"].map((label) => `<a href="#">${htmlEscape(label)}</a>`).join("");
  return `<header data-demo-region="nav" class="collage-nav"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav></header>`;
}

function collageHero(brand: string, copy: DemoCopy, tier: DemoTier): string {
  const glyph = htmlEscape((brand[0] ?? "A").toUpperCase());
  const glyphSpan = tier === "bold" ? `<span class="hero-panel">${glyph}</span>` : `<span>${glyph}</span>`;
  return `<section data-demo-region="hero" class="collage-hero"><div class="collage-copy"><p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div></div><div class="collage-panel" aria-hidden="true">${glyphSpan}</div></section>`;
}

function collageFeatures(copy: DemoCopy): string {
  const cards = copy.cards
    .map(
      ([title, body]) =>
        `<article class="collage-card"><h3>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p><a class="link" href="#">${htmlEscape(copy.learnMore)}</a></article>`,
    )
    .join("");
  return `<section data-demo-region="features" class="collage-features"><h2>${htmlEscape(copy.featuresTitle)}</h2><div class="collage-stagger">${cards}</div></section>`;
}

function collageForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="collage-band"><div class="collage-form-card"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></div></section>`;
}

function collageFooter(brand: string, copy: DemoCopy): string {
  const links = ["Product", "Resources", "Company"].map((label) => `<a href="#">${htmlEscape(label)}</a>`).join("");
  return `<footer data-demo-region="footer" class="collage-footer"><a class="brand" href="#">${brand}</a><nav aria-label="Footer">${links}</nav><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function collageDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
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
  const overlay = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-overlay);" : "";
  const panelImage = hasGradient(doc) ? " background-image: var(--semantic-gradient-hero);" : "";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}, background ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; text-wrap: balance; }
    .eyebrow { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .08em; font-size: .78rem; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { max-width: 52ch; color: color-mix(in oklch, ${fg} 76%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ${onPrimary}); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border: 1px solid ${hairline}; }
    .btn:focus-visible, a:focus-visible, input:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .collage-nav { display: flex; align-items: center; gap: 1.5rem; padding: 1.1rem clamp(1rem, 4vw, 3rem); background: color-mix(in oklch, ${primary} 12%, ${surface}); }
    .collage-nav nav { display: flex; flex-wrap: wrap; gap: 1rem; margin-left: auto; }
    .collage-nav a { text-decoration: none; }
    main { width: min(76rem, 100%); margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem); }
    .collage-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, .82fr); align-items: center; padding: clamp(4rem, 9vw, 7rem) 0; }
    .collage-copy { position: relative; z-index: 1; display: grid; gap: 1.35rem; margin-right: -4rem; }
    .collage-hero h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .82), 8vw, calc(var(--semantic-typography-display-size) * 1.26))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .collage-panel { min-height: 26rem; border-radius: calc(${radius} * 1.25); background: ${primary};${panelImage} color: ${onPrimary}; display: grid; place-items: center; padding: 2rem; overflow: hidden;${overlay} }
    .collage-panel span { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 3), 18vw, calc(var(--semantic-typography-display-size) * 5.6))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .collage-features { padding: clamp(3rem, 7vw, 6rem) 0; display: grid; gap: 2rem; }
    .collage-features h2 { max-width: 22ch; text-wrap: balance; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .collage-stagger { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1rem; align-items: start; }
    .collage-card { border: 1px solid ${hairline}; border-radius: ${radius}; padding: ${inset}; background: color-mix(in oklch, ${surface} 96%, ${primary}); display: grid; gap: .65rem; align-content: start;${raised} transition: box-shadow ${transition} ${easing}, transform ${transition} ${easing}; }
    .collage-card:hover {${overlay} transform: translateY(-2px); }
    .collage-card:nth-child(2) { transform: translateY(2rem); background: ${primary}; color: ${onPrimary}; }
    .collage-card:nth-child(3) { transform: translateY(4rem); }
    .collage-card h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .collage-card p { color: color-mix(in oklch, currentColor 78%, transparent); }
    .link { color: currentColor; text-decoration: underline; text-underline-offset: .18em; font-weight: 600; }
    .collage-band { margin: clamp(2rem, 5vw, 4rem) calc(clamp(1rem, 4vw, 3rem) * -1) 0; padding: clamp(5rem, 10vw, 8rem) clamp(1rem, 4vw, 3rem); background: color-mix(in oklch, ${primary} 10%, ${surface}); clip-path: polygon(0 6%, 100% 0, 100% 94%, 0 100%); }
    .collage-form-card { width: min(34rem, 100%); margin: 0 auto; border: 1px solid ${hairline}; border-radius: ${radius}; padding: clamp(1.5rem, 4vw, 3rem); background: ${surface}; display: grid; gap: 1rem;${overlay} }
    .collage-form-card h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .collage-form-card form { display: grid; gap: .85rem; }
    .collage-form-card label { display: grid; gap: .35rem; font-size: .9rem; }
    .collage-form-card input { padding: .65rem .8rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: ${surface}; color: ${fg}; font: inherit; }
    .collage-footer { padding: clamp(2.5rem, 6vw, 4rem) clamp(1rem, 4vw, 3rem); display: grid; gap: .9rem; justify-items: center; text-align: center; }
    .collage-footer .brand { max-width: 20ch; font: var(--semantic-typography-display-weight) clamp(var(--semantic-typography-display-size), 8vw, calc(var(--semantic-typography-display-size) * 1.4))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .collage-footer nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; }
    .fine { max-width: 52ch; font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 760px) { .collage-nav nav { display: none; } .collage-hero { grid-template-columns: 1fr; gap: 1rem; } .collage-copy { margin-right: 0; } .collage-panel { min-height: 14rem; } .collage-stagger { grid-template-columns: 1fr; } .collage-card:nth-child(2), .collage-card:nth-child(3) { transform: none; } }${reduce}${collageTierCss(tier)}${textureOverlayCss(doc, [".collage-panel", ".collage-card", ".collage-form-card"])}${collageKoCss(ko)}`;
}

function collageTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    main { width: min(68rem, 100%); }
    .collage-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .68), 6vw, var(--semantic-typography-display-size))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .collage-stagger { grid-template-columns: repeat(3, 1fr); }`;
  }
  return `
    main { width: min(82rem, 100%); }
    .collage-hero h1 { font: var(--semantic-typography-display-weight) clamp(var(--semantic-typography-display-size), 9vw, calc(var(--semantic-typography-display-size) * 1.38))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .collage-stagger { grid-template-columns: 2fr 1fr; }
    .collage-stagger .collage-card:first-child { grid-row: span 2; min-height: 18rem; align-content: end; }
    @media (max-width: 760px) { .collage-stagger { grid-template-columns: 1fr; } .collage-stagger .collage-card:first-child { grid-row: auto; min-height: 0; } }`;
}

function collageKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .collage-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .collage-features h2, .collage-card h3, .collage-form-card h2 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}

function hasElevation(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)elevation(\.|$)/);
}

function hasGradient(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)gradient(\.|$)/);
}
