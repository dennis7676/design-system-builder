import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateSpecSheetDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${specSheetDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    specHeader(brand),
    "<main>",
    specHero(brand, copy),
    specFeatures(copy),
    specForm(copy),
    "</main>",
    specFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function specHeader(brand: string): string {
  const links = ["product", "pricing", "docs", "company"].map((l) => `<a href="#">${htmlEscape(l)}</a>`).join("");
  return `<header data-demo-region="nav" class="spec-nav"><a class="brand spec-wordmark" href="#">${brand}</a><nav class="spec-links" aria-label="Primary">${links}</nav></header>`;
}

function specHero(brand: string, copy: DemoCopy): string {
  return `<section data-demo-region="hero" class="spec-hero"><p class="spec-index">001 — ${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div></section>`;
}

function specFeatures(copy: DemoCopy): string {
  const rows = copy.cards
    .map(([title, body], index) => {
      const number = String(index + 1).padStart(2, "0");
      return `<tr><td class="spec-index">${number}</td><td><h3>${htmlEscape(title)}</h3></td><td><p>${htmlEscape(body)}</p></td></tr>`;
    })
    .join("");
  return `<section data-demo-region="features" class="spec-features features"><h2>${htmlEscape(copy.featuresTitle)}</h2><table class="spec-table"><tbody>${rows}</tbody></table></section>`;
}

function specForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="spec-form"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></section>`;
}

function specFooter(brand: string, copy: DemoCopy): string {
  return `<footer data-demo-region="footer" class="spec-footer"><a class="brand" href="#">${brand}</a><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function specSheetDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
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
    .spec-index, .spec-links, .spec-form label, .fine { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .06em; }
    .spec-index, .spec-links, .spec-form label { font-size: .78rem; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { max-width: 52ch; color: color-mix(in oklch, ${fg} 76%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ButtonText); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border: 1px solid ${hairline}; }
    .btn:focus-visible, .spec-form input:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .spec-nav { display: flex; align-items: center; gap: 1.5rem; padding: 1rem clamp(1rem, 4vw, 3rem); border-bottom: 1px solid ${hairline}; }
    .spec-links { display: flex; gap: clamp(.75rem, 2vw, 1.5rem); margin-left: auto; }
    .spec-links a { text-decoration: none; padding-block: .25rem; }
    main { width: min(76rem, 100%); margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem); }
    .spec-hero { border-left: 2px solid ${hairline}; padding: clamp(4rem, 9vw, 7rem) 0 clamp(4rem, 9vw, 7rem) clamp(1.25rem, 4vw, 3rem); display: grid; gap: 1.25rem; justify-items: start; text-align: left; border-bottom: 1px solid ${hairline}; }
    .spec-hero h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .72), 7vw, calc(var(--semantic-typography-display-size) * 1.06))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .hero h1 { max-width: 24ch; font: var(--semantic-typography-display-weight) var(--semantic-typography-display-size)/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .hero-panel .glyph { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * 2.2), 12vw, calc(var(--semantic-typography-display-size) * 4))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; justify-content: flex-start; }
    .spec-features { padding: clamp(3rem, 7vw, 5.5rem) 0; display: grid; gap: 1.25rem; border-bottom: 1px solid ${hairline}; }
    .spec-features h2 { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); font-size: .78rem; text-transform: uppercase; letter-spacing: .06em; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .spec-table { width: 100%; border-collapse: collapse; border: 1px solid ${hairline}; }
    .spec-table td { border: 1px solid ${hairline}; padding: clamp(1rem, 3vw, 2rem); vertical-align: top; }
    .spec-table h3, .card h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .spec-table p { color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .spec-form { padding: clamp(3rem, 7vw, 5.5rem) 0; display: grid; gap: .9rem; text-align: left; }
    .spec-form h2 { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .spec-form form { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)) auto; gap: 1rem; align-items: end; margin-top: 1rem; }
    .spec-form label { display: grid; gap: .35rem; }
    .spec-form input { padding: .75rem 0; border: 0; border-bottom: 1px solid ${hairline}; border-radius: 0; background: transparent; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); }
    .spec-footer { border-top: 1px solid ${hairline}; border-bottom: 1px solid ${hairline}; padding: 1.25rem clamp(1rem, 4vw, 3rem); display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
    .fine { max-width: 52ch; font-size: var(--semantic-typography-caption-size); line-height: var(--semantic-typography-caption-lineHeight); color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 760px) { .spec-nav, .spec-footer { align-items: flex-start; flex-direction: column; } .spec-links { margin-left: 0; flex-wrap: wrap; } .spec-table tr, .spec-table td { display: block; } .spec-form form { grid-template-columns: 1fr; } }${reduce}${specTierCss(tier)}${specKoCss(ko)}`;
}

function specTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    main { width: min(68rem, 100%); }
    .spec-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .66), 6vw, calc(var(--semantic-typography-display-size) * .9))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .spec-table td { padding: clamp(.85rem, 2vw, 1.5rem); }`;
  }
  return `
    main { width: min(82rem, 100%); }
    .spec-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .82), 8vw, calc(var(--semantic-typography-display-size) * 1.18))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .spec-table td { padding: clamp(1.25rem, 4vw, 2.5rem); }`;
}

function specKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .spec-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .hero h1 { max-width: min(18ch, 15em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .spec-features h2, .spec-table h3, .spec-form h2 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}
