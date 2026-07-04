import { toCssVars } from "./adapters/css-adapter.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import { textureOverlayCss } from "./texture-overlay.js";
import { glassPanelCss } from "./glass-surface.js";
import type { TokensDocument } from "./tokens-schema.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateEditorialDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${editorialDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    editorialHeader(brand),
    "<main>",
    editorialHero(brand, copy),
    editorialFeatures(copy),
    editorialForm(copy),
    "</main>",
    editorialFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function editorialHeader(brand: string): string {
  const links = ["Product", "Pricing", "Docs", "Company"]
    .map((l) => `<a href="#">${htmlEscape(l)}</a>`)
    .join("");
  return `<header data-demo-region="nav" class="masthead"><a class="brand masthead-wordmark" href="#">${brand}</a><nav class="masthead-links" aria-label="Primary">${links}</nav></header>`;
}

function editorialHero(brand: string, copy: DemoCopy): string {
  return `<section data-demo-region="hero" class="editorial-hero"><p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div></section>`;
}

function editorialFeatures(copy: DemoCopy): string {
  const rows = copy.cards
    .map(([title, body], index) => {
      const number = String(index + 1).padStart(2, "0");
      return `<article class="spread-row"><span class="spread-number">${number}</span><h3>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p></article>`;
    })
    .join("");
  return `<section data-demo-region="features" class="editorial-spread"><h2>${htmlEscape(copy.featuresTitle)}</h2><div class="spread-rows">${rows}</div></section>`;
}

function editorialForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="invitation"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></section>`;
}

function editorialFooter(brand: string, copy: DemoCopy): string {
  return `<footer data-demo-region="footer" class="colophon"><a class="brand" href="#">${brand}</a><p>${htmlEscape(copy.footTagline)}</p><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function editorialDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
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
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}, background ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; }
    .eyebrow, .spread-number { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .08em; font-size: .78rem; color: color-mix(in oklch, ${fg} 58%, ${surface}); }
    .lead { max-width: 48ch; text-wrap: pretty; color: color-mix(in oklch, ${fg} 74%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ButtonText); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border: 1px solid ${hairline}; }
    .btn:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .masthead { display: grid; justify-items: center; gap: .75rem; padding: 1.25rem clamp(1rem, 4vw, 3rem); border-bottom: 1px solid ${hairline}; }
    .masthead-wordmark { text-align: center; }
    .masthead-links { display: flex; flex-wrap: wrap; justify-content: center; gap: clamp(.75rem, 2vw, 1.5rem); font-family: var(--primitive-font-family-mono, ui-monospace, monospace); font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; }
    .masthead-links a { text-decoration: none; padding-block: .25rem; }
    .masthead-links a:hover { color: ${primary}; }
    main { width: min(74rem, 100%); margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem); }
    .editorial-hero { min-height: min(44rem, 82vh); display: grid; place-items: center; align-content: center; justify-items: center; gap: 1.35rem; text-align: center; padding: clamp(4rem, 10vw, 8rem) 0; border-bottom: 1px solid ${hairline}; }
    .editorial-hero h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .78), 8vw, calc(var(--semantic-typography-display-size) * 1.2))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .cta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; }
    .editorial-spread { padding: clamp(3rem, 7vw, 6rem) 0; display: grid; gap: clamp(2rem, 5vw, 4rem); border-bottom: 1px solid ${hairline}; }
    .editorial-spread h2 { max-width: 20ch; text-wrap: balance; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .spread-rows { display: grid; border-top: 1px solid ${hairline}; }
    .spread-row { display: grid; grid-template-columns: minmax(3rem, .35fr) minmax(12rem, .9fr) minmax(16rem, 1.2fr); gap: clamp(1rem, 4vw, 3rem); align-items: start; padding: clamp(1.5rem, 4vw, 3rem) 0; border-bottom: 1px solid ${hairline}; }
    .spread-row:nth-child(even) h3 { grid-column: 3; grid-row: 1; }
    .spread-row:nth-child(even) p { grid-column: 2; grid-row: 1; }
    .spread-row h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .spread-row p { color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .invitation { width: min(34rem, 100%); margin: 0 auto; padding: clamp(3rem, 7vw, 6rem) 0; display: grid; gap: 1rem; text-align: center; }
    .invitation h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .invitation form { display: grid; gap: 1rem; margin-top: 1rem; text-align: left; }
    .invitation label { display: grid; gap: .35rem; font-size: .9rem; }
    .invitation input { padding: .75rem 0; border: 0; border-bottom: 1px solid ${hairline}; border-radius: 0; background: transparent; color: ${fg}; font: inherit; transition: border-color ${transition} ${easing}, outline-color ${transition} ${easing}; }
    .invitation input:focus-visible { outline: .16rem solid ${primary}; outline-offset: .2rem; }
    .colophon { border-top: 1px solid ${hairline}; padding: clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 3rem); display: grid; justify-items: center; gap: .65rem; text-align: center; }
    .colophon > p:not(.fine) { color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .fine { max-width: 52ch; font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 760px) { .spread-row, .spread-row:nth-child(even) h3, .spread-row:nth-child(even) p { grid-template-columns: 1fr; grid-column: auto; grid-row: auto; } .spread-row { gap: .75rem; } }${reduce}${editorialTierCss(tier)}${textureOverlayCss(doc, [".editorial-hero", ".invitation"])}${glassPanelCss(doc, [".editorial-hero", ".invitation"])}${editorialKoCss(ko)}`;
}

function editorialTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    main { width: min(66rem, 100%); }
    .editorial-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .68), 6vw, var(--semantic-typography-display-size))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .spread-row { grid-template-columns: minmax(3rem, .3fr) 1fr 1fr; }`;
  }
  return `
    main { width: min(80rem, 100%); }
    .editorial-hero h1 { font: var(--semantic-typography-display-weight) clamp(var(--semantic-typography-display-size), 9vw, calc(var(--semantic-typography-display-size) * 1.35))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .editorial-spread { gap: clamp(2.5rem, 6vw, 5rem); }
    .spread-row { padding: clamp(2rem, 5vw, 3.5rem) 0; }`;
}

function editorialKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(48ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .editorial-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .editorial-spread h2, .spread-row h3, .invitation h2 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}
