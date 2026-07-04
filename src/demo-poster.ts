import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import { textureOverlayCss } from "./texture-overlay.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generatePosterDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${posterDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    posterHeader(brand),
    "<main>",
    posterHero(brand, copy),
    posterFeatures(copy),
    posterForm(copy),
    "</main>",
    posterFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function posterHeader(brand: string): string {
  const links = ["Product", "Pricing", "Docs", "Company"].map((label) => `<a href="#">${htmlEscape(label)}</a>`).join("");
  return `<header data-demo-region="nav" class="poster-nav poster-rule"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav></header>`;
}

function posterHero(brand: string, copy: DemoCopy): string {
  return `<section data-demo-region="hero" class="poster-hero"><p class="poster-badge">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="poster-stars">✱ ✱ ✱</p><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div></section>`;
}

function posterFeatures(copy: DemoCopy): string {
  const rows = copy.cards
    .map(([title, body], index) => {
      const number = String(index + 1).padStart(2, "0");
      return `<article class="poster-row poster-rule"><span>${number}</span><h3>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p></article>`;
    })
    .join("");
  return `<section data-demo-region="features" class="poster-features"><h2>${htmlEscape(copy.featuresTitle)}</h2>${rows}</section>`;
}

function posterForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="poster-form"><div class="poster-ticket"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></div></section>`;
}

function posterFooter(brand: string, copy: DemoCopy): string {
  return `<footer data-demo-region="footer" class="poster-footer poster-rule"><a class="brand" href="#">${brand}</a><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function posterDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }`
    : "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const fg = "var(--semantic-color-surface-foreground, CanvasText)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const onPrimary = "var(--semantic-color-primary-foreground, ButtonText)";
  const hairline = "var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent))";
  const transition = "var(--semantic-motion-transition, 160ms)";
  const easing = "var(--semantic-motion-easing-standard)";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}, background ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; text-wrap: balance; }
    .lead { max-width: 52ch; margin-inline: auto; color: color-mix(in oklch, ${fg} 76%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 1px solid ${fg}; border-radius: 999px; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ${onPrimary}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border-color: ${primary}; }
    .btn:focus-visible, a:focus-visible, input:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .poster-rule { border-top: 3px solid ${fg}; border-bottom: 1px solid ${fg}; }
    .poster-nav { display: grid; justify-items: center; gap: .8rem; padding: 1rem clamp(1rem, 4vw, 3rem); text-align: center; }
    .poster-nav nav { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .1em; font-size: .78rem; }
    .poster-nav a { text-decoration: none; }
    main { width: min(72rem, 100%); margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem); }
    .poster-hero { padding: clamp(4rem, 9vw, 7rem) 0; display: grid; justify-items: center; gap: 1.15rem; text-align: center; }
    .poster-badge { border: 1px solid ${fg}; border-radius: 999px; padding: .35rem .8rem; font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .1em; font-size: .78rem; }
    .poster-hero h1 { width: 100%; max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .9), 9vw, calc(var(--semantic-typography-display-size) * 1.65))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .poster-stars { font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: .2em; color: ${primary}; }
    .cta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: .75rem; }
    .poster-features { padding: clamp(2.5rem, 6vw, 5rem) 0; display: grid; justify-items: center; gap: 1.25rem; text-align: center; }
    .poster-features h2 { max-width: 20ch; text-wrap: balance; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .poster-row { width: min(46rem, 100%); padding: 1.3rem 0; display: grid; justify-items: center; gap: .55rem; }
    .poster-row span { width: 2.5rem; aspect-ratio: 1; border: 1px solid ${fg}; border-radius: 999px; display: grid; place-items: center; font-family: var(--primitive-font-family-mono, ui-monospace, monospace); }
    .poster-row h3 { font: var(--semantic-typography-h3-weight) clamp(var(--semantic-typography-h3-size), 4vw, calc(var(--semantic-typography-h3-size) * 1.45))/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .poster-row p { max-width: 40ch; color: color-mix(in oklch, ${fg} 74%, ${surface}); }
    .poster-form { padding: clamp(2rem, 5vw, 4rem) 0; display: grid; justify-items: center; }
    .poster-ticket { width: min(34rem, 100%); border: 2px dashed ${hairline}; border-radius: 0; padding: clamp(1.5rem, 4vw, 3rem); display: grid; gap: 1rem; text-align: center; background: color-mix(in oklch, ${surface} 94%, ${primary}); }
    .poster-ticket h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .poster-ticket form { display: grid; gap: .85rem; text-align: left; }
    .poster-ticket label { display: grid; gap: .35rem; font-size: .9rem; }
    .poster-ticket input { padding: .65rem .8rem; border: 1px solid ${hairline}; border-radius: 0; background: ${surface}; color: ${fg}; font: inherit; }
    .poster-footer { margin-top: 2rem; padding: 1.25rem clamp(1rem, 4vw, 3rem); display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 1rem; text-align: center; }
    .fine { font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    @media (max-width: 640px) { .poster-nav nav { display: none; } .poster-footer { display: grid; } }${reduce}${posterTierCss(tier)}${textureOverlayCss(doc, [".poster-hero", ".poster-ticket"])}${posterKoCss(ko)}`;
}

function posterTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    main { width: min(64rem, 100%); }
    .poster-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .76), 7vw, calc(var(--semantic-typography-display-size) * 1.18))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }`;
  }
  return `
    main { width: min(78rem, 100%); }
    .poster-hero h1 { font: var(--semantic-typography-display-weight) clamp(var(--semantic-typography-display-size), 10vw, calc(var(--semantic-typography-display-size) * 1.95))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .poster-row { padding-block: 1.7rem; }`;
}

function posterKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .poster-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .poster-features h2, .poster-row h3, .poster-ticket h2 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}
