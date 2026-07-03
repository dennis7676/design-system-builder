import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateStoryDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${storyDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    "<div class=\"story-field\">",
    storyHeader(brand, copy),
    storyHero(brand, copy),
    "</div>",
    "<main>",
    storyFeatures(copy),
    storyForm(copy),
    "</main>",
    storyFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function storyHeader(brand: string, copy: DemoCopy): string {
  const links = ["Product", "Pricing", "Docs", "Company"]
    .map((link) => `<a href="#">${htmlEscape(link)}</a>`)
    .join("");
  return `<header data-demo-region="nav" class="story-nav"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav><button class="btn btn-primary">${htmlEscape(copy.navCta)}</button></header>`;
}

function storyHero(brand: string, copy: DemoCopy): string {
  const glyph = htmlEscape((brand[0] ?? "A").toUpperCase());
  return `<section data-demo-region="hero" class="story-hero"><div class="story-copy"><p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div></div><div class="story-panel story-hero-panel" aria-hidden="true"><span class="glyph">${glyph}</span></div></section>`;
}

function storyFeatures(copy: DemoCopy): string {
  const bands = copy.cards
    .map(([title, body], index) => {
      const number = String(index + 1).padStart(2, "0");
      const alt = index % 2 === 1 ? " story-alt" : "";
      return `<article class="story-band${alt}"><div class="story-band-copy"><h3>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p></div><div class="story-panel"><span>${number}</span></div></article>`;
    })
    .join("");
  return `<section data-demo-region="features" class="story-bands">${bands}</section>`;
}

function storyForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="story-signup"><div class="story-form-card"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></div></section>`;
}

function storyFooter(brand: string, copy: DemoCopy): string {
  const cols = ["Product", "Resources", "Company"]
    .map(
      (col) =>
        `<div><strong>${htmlEscape(col)}</strong><a href="#">Overview</a><a href="#">Changelog</a><a href="#">Support</a></div>`,
    )
    .join("");
  return `<footer data-demo-region="footer" class="story-footer"><div class="story-footer-cols"><div class="story-footer-brand"><span class="brand">${brand}</span><p>${htmlEscape(copy.footTagline)}</p></div>${cols}</div><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function storyDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }`
    : "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const fg = "var(--semantic-color-surface-foreground, CanvasText)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const hairline = "var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent))";
  const radius = "var(--semantic-shape-control, .5rem)";
  const transition = "var(--semantic-motion-transition, 160ms)";
  const easing = "var(--semantic-motion-easing-standard)";
  const panelBg = hasGradient(doc) ? "var(--semantic-gradient-hero)" : primary;
  const raised = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-raised);" : "";
  const overlay = hasElevation(doc) ? " box-shadow: var(--semantic-elevation-overlay);" : "";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}, background ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; }
    .story-field { background: color-mix(in oklch, ${primary} 8%, ${surface}); }
    .story-nav { width: min(76rem, 100%); margin: 0 auto; display: flex; align-items: center; gap: 1.5rem; padding: 1rem clamp(1rem, 4vw, 3rem); }
    .story-nav nav { display: flex; gap: 1rem; margin-left: auto; }
    .story-nav nav a { text-decoration: none; padding: .4rem .5rem; border-radius: ${radius}; }
    .story-nav nav a:hover { color: ${primary}; }
    .eyebrow { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .08em; font-size: .78rem; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { max-width: 52ch; color: color-mix(in oklch, ${fg} 76%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); text-wrap: pretty; }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, color ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ButtonText); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border: 1px solid ${hairline}; }
    .btn:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .story-hero { width: min(76rem, 100%); margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(18rem, .95fr); gap: clamp(2rem, 5vw, 4rem); align-items: center; padding: clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 3rem) clamp(4rem, 9vw, 7rem); }
    .story-copy { display: grid; gap: 1.25rem; }
    .story-hero h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .76), 7vw, calc(var(--semantic-typography-display-size) * 1.16))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .story-panel { border-radius: ${radius}; background: color-mix(in oklch, ${primary} 10%, ${surface}); min-height: 16rem; display: grid; place-items: center; padding: clamp(1.5rem, 4vw, 3rem); overflow: hidden;${raised} }
    .story-hero-panel { min-height: 24rem; background: ${panelBg};${overlay} }
    .glyph { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 2.2), 14vw, calc(var(--semantic-typography-display-size) * 4.2))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); color: ${primary}; }
    main { width: 100%; }
    .story-bands { width: min(76rem, 100%); margin: 0 auto; padding: clamp(3rem, 7vw, 6rem) clamp(1rem, 4vw, 3rem); display: grid; gap: clamp(2.5rem, 6vw, 5rem); }
    .story-band { display: grid; grid-template-columns: minmax(0, 1fr) minmax(16rem, .82fr); gap: clamp(2rem, 5vw, 4rem); align-items: center; padding: clamp(1rem, 3vw, 2rem) 0; }
    .story-alt .story-band-copy { grid-column: 2; grid-row: 1; }
    .story-alt .story-panel { grid-column: 1; grid-row: 1; }
    .story-band-copy { display: grid; gap: .75rem; }
    .story-band-copy h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); text-wrap: balance; }
    .story-band-copy p { color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .story-panel span { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); font-size: clamp(4rem, 12vw, 9rem); line-height: 1; color: color-mix(in oklch, ${primary} 72%, ${surface}); }
    .story-signup { width: 100%; padding: clamp(3rem, 7vw, 6rem) clamp(1rem, 4vw, 3rem); background: color-mix(in oklch, ${primary} 10%, ${surface}); }
    .story-form-card { width: min(34rem, 100%); margin: 0 auto; display: grid; gap: 1rem; padding: clamp(1.5rem, 4vw, 3rem); background: ${surface}; border-radius: ${radius};${overlay} }
    .story-form-card h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .story-form-card form { display: grid; gap: .85rem; margin-top: .5rem; }
    .story-form-card label { display: grid; gap: .35rem; font-size: .9rem; }
    .story-form-card input { padding: .7rem .85rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: color-mix(in oklch, ${surface} 96%, ${primary}); color: ${fg}; font: inherit; transition: border-color ${transition} ${easing}, outline-color ${transition} ${easing}; }
    .story-form-card input:focus-visible { outline: .16rem solid ${primary}; outline-offset: .16rem; }
    .story-footer { position: relative; padding: clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 3rem); display: grid; gap: 1.5rem; }
    .story-footer::before { content: ""; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, ${primary}, transparent); }
    .story-footer-cols { width: min(76rem, 100%); margin: 0 auto; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1.5rem; }
    .story-footer-cols div { display: grid; gap: .4rem; align-content: start; }
    .story-footer-cols a { text-decoration: none; color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .story-footer-cols a:hover { color: ${primary}; }
    .fine { width: min(76rem, 100%); margin: 0 auto; font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 760px) { .story-nav nav { display: none; } .story-hero, .story-band { grid-template-columns: 1fr; } .story-alt .story-band-copy, .story-alt .story-panel { grid-column: auto; grid-row: auto; } .story-footer-cols { grid-template-columns: 1fr; } }${reduce}${storyTierCss(tier)}${storyKoCss(ko)}`;
}

function storyTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    .story-hero, .story-bands, .story-footer-cols, .fine { width: min(68rem, 100%); }
    .story-hero h1 { font-size: clamp(calc(var(--semantic-typography-display-size) * .68), 6vw, var(--semantic-typography-display-size)); }`;
  }
  return `
    .story-hero, .story-bands, .story-footer-cols, .fine { width: min(82rem, 100%); }
    .story-hero h1 { font-size: clamp(calc(var(--semantic-typography-display-size) * .9), 8vw, calc(var(--semantic-typography-display-size) * 1.3)); }
    .story-panel { min-height: 20rem; }`;
}

function storyKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .story-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .story-band-copy h3, .story-form-card h2 { letter-spacing: normal; }`;
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
