import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import { textureOverlayCss } from "./texture-overlay.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateJournalDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${journalDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    journalHeader(brand),
    "<main>",
    journalHero(brand, copy),
    journalFeatures(copy),
    journalForm(copy),
    "</main>",
    journalFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function journalHeader(brand: string): string {
  const links = ["Letters", "Process", "Archive", "About"]
    .map((link) => `<a href="#">${htmlEscape(link)}</a>`)
    .join("");
  return `<header data-demo-region="nav" class="journal-nav"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav></header>`;
}

function journalHero(brand: string, copy: DemoCopy): string {
  return `<section data-demo-region="hero" class="journal-hero journal-column"><p class="eyebrow">${copy.eyebrow(brand)}</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-ghost journal-link">${htmlEscape(copy.ctaGhost)}</button></div></section>`;
}

function journalFeatures(copy: DemoCopy): string {
  const rows = copy.cards
    .map(
      ([title, body]) =>
        `<article><h3><span aria-hidden="true">–</span>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p></article>`,
    )
    .join("");
  return `<section data-demo-region="features" class="journal-features journal-column"><h2>${htmlEscape(copy.featuresTitle)}</h2><div class="journal-list">${rows}</div></section>`;
}

function journalForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="journal-form journal-column"><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></section>`;
}

function journalFooter(brand: string, copy: DemoCopy): string {
  return `<footer data-demo-region="footer" class="journal-signature"><a class="brand" href="#">${brand}</a><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function journalDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }`
    : "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const fg = "var(--semantic-color-surface-foreground, CanvasText)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const hairline = "var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent))";
  const radius = "var(--primitive-radius-md, var(--semantic-shape-control, .75rem))";
  const transition = "var(--semantic-motion-transition, 160ms)";
  const easing = "var(--semantic-motion-easing-standard)";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { margin: 0; background: ${surface}; color: ${fg}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    h1, h2, h3, p { margin: 0; }
    a { color: inherit; transition: color ${transition} ${easing}; }
    .brand { font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); text-decoration: none; }
    .journal-nav { display: flex; align-items: center; gap: 1.5rem; padding: clamp(1.5rem, 5vw, 3rem) clamp(1rem, 5vw, 4rem); }
    .journal-nav nav { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: clamp(.8rem, 2vw, 1.4rem); margin-left: auto; color: color-mix(in oklch, ${fg} 66%, ${surface}); }
    .journal-nav nav a { text-decoration: none; }
    .journal-nav nav a:hover { color: ${primary}; }
    main { width: min(100%, 72rem); margin: 0 auto; padding: 0 clamp(1rem, 5vw, 4rem); }
    .journal-column { width: min(34rem, 100%); margin-inline: 0 auto; }
    .eyebrow { font-family: var(--semantic-typography-body-family); font-style: italic; color: color-mix(in oklch, ${fg} 62%, ${surface}); }
    .lead { color: color-mix(in oklch, ${fg} 74%, ${surface}); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); text-wrap: pretty; }
    .journal-hero { min-height: min(38rem, 76vh); display: grid; align-content: center; gap: 1.25rem; padding: clamp(3rem, 8vw, 6rem) 0; }
    .journal-hero h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-h1-weight) clamp(var(--semantic-typography-h1-size), 6vw, calc(var(--semantic-typography-h1-size) * 1.18))/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: color ${transition} ${easing}, background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { width: 100%; background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ButtonText); border-radius: var(--component-button-radius, ${radius}); padding: .8rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost.journal-link { background: transparent; border: 0; border-radius: 0; color: ${primary}; padding: 0 0 .12rem; text-decoration: underline; text-underline-offset: .32em; }
    .btn:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .journal-features { padding: clamp(2.5rem, 7vw, 5rem) 0; display: grid; gap: 1.5rem; }
    .journal-features h2, .journal-form h2 { font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); text-wrap: balance; }
    .journal-list { display: grid; gap: clamp(1.5rem, 4vw, 2.25rem); }
    .journal-list article { display: grid; gap: .5rem; }
    .journal-list h3 { display: inline; font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .journal-list h3 span { margin-right: .45rem; color: ${primary}; }
    .journal-list p { color: color-mix(in oklch, ${fg} 72%, ${surface}); }
    .journal-form { padding: clamp(2.5rem, 7vw, 5rem) 0; display: grid; gap: 1rem; }
    .journal-form form { display: grid; gap: .9rem; margin-top: .5rem; }
    .journal-form label { display: grid; gap: .35rem; font-size: .92rem; color: color-mix(in oklch, ${fg} 78%, ${surface}); }
    .journal-form input { padding: .78rem .9rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: color-mix(in oklch, ${surface} 96%, ${primary}); color: ${fg}; font: inherit; transition: border-color ${transition} ${easing}, outline-color ${transition} ${easing}; }
    .journal-form input:focus-visible { outline: .16rem solid ${primary}; outline-offset: .16rem; }
    .journal-signature { padding: clamp(3rem, 7vw, 5rem) clamp(1rem, 5vw, 4rem); display: grid; justify-items: center; gap: .65rem; text-align: center; }
    .journal-signature .brand { font: italic var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .fine { max-width: 52ch; font: var(--semantic-typography-caption-weight) var(--semantic-typography-caption-size)/var(--semantic-typography-caption-lineHeight) var(--semantic-typography-caption-family); letter-spacing: calc(var(--semantic-typography-caption-tracking) * 1em); color: color-mix(in oklch, ${fg} 60%, ${surface}); }
    @media (max-width: 640px) { .journal-nav { align-items: flex-start; flex-direction: column; } .journal-nav nav { margin-left: 0; justify-content: flex-start; } }${reduce}${journalTierCss(tier)}${textureOverlayCss(doc, [".journal-hero", ".journal-form"])}${journalKoCss(ko)}`;
}

function journalTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    main { width: min(64rem, 100%); }
    .journal-column { width: min(32rem, 100%); }
    .journal-hero h1 { font-size: var(--semantic-typography-h1-size); }`;
  }
  return `
    .journal-column { width: min(36rem, 100%); }
    .journal-hero { min-height: min(42rem, 80vh); }
    .journal-hero h1 { font-size: clamp(calc(var(--semantic-typography-h1-size) * 1.05), 7vw, calc(var(--semantic-typography-h1-size) * 1.3)); }`;
}

function journalKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(48ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .journal-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-h1-lineHeight)); }
    .brand, .journal-features h2, .journal-form h2, .journal-list h3 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}
