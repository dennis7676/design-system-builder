import { toCssVars } from "./adapters/css-adapter.js";
import type { DemoCopy } from "./demo-copy.js";
import { webfontHeadTags } from "./font-sources.js";
import { htmlEscape, mixedText, oklchMix } from "./render-utils.js";
import { hasTokenPath } from "./surface-data.js";
import { textureOverlayCss } from "./texture-overlay.js";
import { glassPanelCss } from "./glass-surface.js";
import type { TokensDocument } from "./tokens-schema.js";

type DemoTier = "safe" | "balanced" | "bold";

export function generateBriefingDemo(doc: TokensDocument, tier: DemoTier, ko: boolean, copy: DemoCopy, brand: string, snapshot: string): string {
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${brand} — product</title>`,
    ...webfontHeadTags(doc),
    `<style>${briefingDemoCss(doc, tier, ko)}</style>`,
    "</head>",
    "<body>",
    briefingHeader(brand, copy),
    "<main>",
    briefingHero(copy),
    briefingFeatures(copy),
    briefingForm(copy),
    "</main>",
    briefingFooter(brand, copy),
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function briefingHeader(brand: string, copy: DemoCopy): string {
  const links = ["Product", "Pricing", "Docs", "Company"].map((l) => `<a href="#">${htmlEscape(l)}</a>`).join("");
  return `<header data-demo-region="nav" class="briefing-nav"><div class="briefing-utility"><span>BRIEFING</span><span>${brand}</span></div><div class="briefing-main"><a class="brand" href="#">${brand}</a><nav aria-label="Primary">${links}</nav><button class="btn btn-primary">${htmlEscape(copy.navCta)}</button></div></header>`;
}

function briefingHero(copy: DemoCopy): string {
  const metrics = copy.cards
    .map(([title], index) => `<div class="briefing-metric"><span>${String(index + 1).padStart(2, "0")}</span><strong>${htmlEscape(title)}</strong></div>`)
    .join("");
  return `<section data-demo-region="hero" class="briefing-hero"><div class="briefing-copy"><p class="briefing-number">01</p><h1>${htmlEscape(copy.headline)}</h1><p class="lead">${htmlEscape(copy.lead)}</p><div class="cta-row"><button class="btn btn-primary">${htmlEscape(copy.ctaPrimary)}</button><button class="btn btn-ghost">${htmlEscape(copy.ctaGhost)}</button></div></div><aside class="briefing-metrics">${metrics}</aside></section>`;
}

function briefingFeatures(copy: DemoCopy): string {
  const rows = copy.cards.map(([title, body]) => `<article><h3>${htmlEscape(title)}</h3><p>${htmlEscape(body)}</p></article>`).join("");
  return `<section data-demo-region="features" class="briefing-section"><div class="briefing-heading"><span class="briefing-number">02</span><h2>${htmlEscape(copy.featuresTitle)}</h2></div><div class="briefing-rows">${rows}</div></section>`;
}

function briefingForm(copy: DemoCopy): string {
  const fields = copy.fields
    .map(
      ([label, type, name, ph]) =>
        `<label>${htmlEscape(label)}<input type="${type}" name="${name}" placeholder="${htmlEscape(ph)}"></label>`,
    )
    .join("");
  return `<section data-demo-region="form" class="briefing-form"><span class="briefing-number">03</span><div><h2>${htmlEscape(copy.formTitle)}</h2><p class="lead">${htmlEscape(copy.formLead)}</p></div><form>${fields}<button type="submit" class="btn btn-primary">${htmlEscape(copy.formSubmit)}</button></form></section>`;
}

function briefingFooter(brand: string, copy: DemoCopy): string {
  const cols = ["Product", "Resources", "Company"]
    .map((c) => `<div><strong>${htmlEscape(c)}</strong><a href="#">Overview</a><a href="#">Changelog</a><a href="#">Support</a></div>`)
    .join("");
  return `<footer data-demo-region="footer" class="briefing-footer"><div class="footer-cols"><div><span class="brand">${brand}</span><p>${htmlEscape(copy.footTagline)}</p></div>${cols}</div><p class="fine">${copy.fine(brand)}</p></footer>`;
}

function briefingDemoCss(doc: TokensDocument, tier: DemoTier, ko: boolean): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { transition: none !important; animation: none !important; } }`
    : "";
  const surface = "var(--semantic-color-surface-default, Canvas)";
  const fg = "var(--semantic-color-surface-foreground, CanvasText)";
  const primary = "var(--semantic-color-primary-default, LinkText)";
  const textMix = (pct: number, site: string) => mixedText({
    doc,
    fgPath: "semantic.color.surface.foreground",
    surfacePath: "semantic.color.surface.default",
    fgCss: fg,
    surfaceCss: surface,
    pct,
    role: "text",
    site,
  });
  const hairline = `var(--primitive-color-neutral-100, ${oklchMix("currentColor", 14, "transparent")})`;
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
    .briefing-utility, .briefing-number, .briefing-metric span, .fine { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); text-transform: uppercase; letter-spacing: .06em; }
    .briefing-utility, .briefing-number, .briefing-metric span { font-size: .78rem; color: ${textMix(62, "briefing.utility")}; }
    .lead { max-width: 52ch; color: ${textMix(76, "briefing.lead")}; font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); }
    .btn { border: 0; border-radius: ${radius}; padding: .7rem 1.25rem; font: inherit; cursor: pointer; transition: background ${transition} ${easing}, transform ${transition} ${easing}; }
    .btn-primary { background: var(--component-button-background, ${primary}); color: var(--component-button-foreground, ButtonText); border-radius: var(--component-button-radius, ${radius}); padding: .7rem var(--component-button-paddingX, 1.25rem); }
    .btn-primary:hover { background: var(--component-button-backgroundHover, ${primary}); transform: translateY(-1px); }
    .btn-ghost { background: transparent; color: ${primary}; border: 1px solid ${hairline}; }
    .btn:focus-visible, .briefing-form input:focus-visible { outline: .18rem solid ${primary}; outline-offset: .18rem; }
    .briefing-utility { display: flex; justify-content: space-between; gap: 1rem; padding: .55rem clamp(1rem, 4vw, 3rem); border-bottom: 1px solid ${hairline}; }
    .briefing-main { display: flex; align-items: center; gap: 1.5rem; padding: 1rem clamp(1rem, 4vw, 3rem); border-bottom: 1px solid ${hairline}; }
    .briefing-main nav { display: flex; gap: 1rem; margin-left: auto; }
    .briefing-main nav a { text-decoration: none; padding: .35rem .25rem; }
    main { width: min(78rem, 100%); margin: 0 auto; padding: 0 clamp(1rem, 4vw, 3rem); }
    .briefing-hero { display: grid; grid-template-columns: minmax(0, 1fr) minmax(18rem, .72fr); border-bottom: 1px solid ${hairline}; }
    .briefing-copy { display: grid; align-content: center; justify-items: start; gap: 1.25rem; padding: clamp(4rem, 9vw, 7rem) clamp(1.5rem, 5vw, 4rem) clamp(4rem, 9vw, 7rem) 0; }
    .briefing-hero h1 { max-width: 24ch; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .68), 6.8vw, calc(var(--semantic-typography-display-size) * .82))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); }
    .briefing-metrics { border-left: 1px solid ${hairline}; display: grid; align-content: stretch; }
    .briefing-metric { display: grid; gap: .5rem; align-content: center; padding: clamp(1.25rem, 4vw, 2.25rem); border-bottom: 1px solid ${hairline}; }
    .briefing-metric:last-child { border-bottom: 0; }
    .briefing-metric strong, .briefing-rows h3 { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .cta-row { display: flex; flex-wrap: wrap; gap: .75rem; }
    .briefing-section { padding: clamp(3rem, 7vw, 5.5rem) 0; display: grid; gap: 1.5rem; border-bottom: 1px solid ${hairline}; }
    .briefing-heading { display: flex; gap: 1rem; align-items: baseline; }
    .briefing-heading h2, .briefing-form h2 { font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    .briefing-rows { display: grid; border-top: 2px solid ${hairline}; }
    .briefing-rows article { display: grid; grid-template-columns: minmax(14rem, .7fr) minmax(0, 1fr); gap: clamp(1rem, 4vw, 3rem); padding: clamp(1.25rem, 4vw, 2.5rem) 0; border-bottom: 1px solid ${hairline}; }
    .briefing-rows p { color: ${textMix(72, "briefing.rows")}; }
    .briefing-form { padding: clamp(3rem, 7vw, 5.5rem) 0; display: grid; grid-template-columns: auto minmax(0, 1fr) minmax(18rem, .8fr); gap: clamp(1rem, 4vw, 3rem); align-items: start; }
    .briefing-form form { display: grid; gap: .85rem; border: 1px solid ${hairline}; border-radius: ${radius}; padding: clamp(1rem, 3vw, 1.75rem); }
    .briefing-form label { display: grid; gap: .35rem; font-size: .9rem; }
    .briefing-form input { padding: .7rem .8rem; border: 1px solid ${hairline}; border-radius: ${radius}; background: ${surface}; color: ${fg}; font: inherit; }
    .briefing-footer { border-top: 2px solid ${hairline}; padding: clamp(2rem, 5vw, 3rem) clamp(1rem, 4vw, 3rem); display: grid; gap: 1.25rem; }
    .footer-cols { display: grid; grid-template-columns: 1.4fr repeat(3, minmax(8rem, 1fr)); gap: 1.5rem; width: min(78rem, 100%); margin: 0 auto; }
    .footer-cols div { display: grid; gap: .4rem; align-content: start; }
    .footer-cols a { text-decoration: none; color: ${textMix(72, "briefing.footer-link")}; }
    .fine { width: min(78rem, 100%); margin: 0 auto; text-align: right; font-size: var(--semantic-typography-caption-size); line-height: var(--semantic-typography-caption-lineHeight); color: ${textMix(60, "briefing.fine")}; }
    @media (max-width: 780px) { .briefing-main { align-items: flex-start; flex-direction: column; } .briefing-main nav { margin-left: 0; flex-wrap: wrap; } .briefing-hero, .briefing-rows article, .briefing-form, .footer-cols { grid-template-columns: 1fr; } .briefing-copy { padding-right: 0; } .briefing-metrics { border-left: 0; border-top: 1px solid ${hairline}; } .fine { text-align: left; } }${reduce}${briefingTierCss(tier)}${textureOverlayCss(doc, [".briefing-copy", ".briefing-metric", ".briefing-form form"])}${glassPanelCss(doc, [".briefing-copy", ".briefing-metric", ".briefing-form form"])}${briefingKoCss(ko)}`;
}

function briefingTierCss(tier: DemoTier): string {
  if (tier === "balanced") return "";
  if (tier === "safe") {
    return `
    main { width: min(70rem, 100%); }
    .briefing-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .62), 6vw, calc(var(--semantic-typography-display-size) * .76))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }`;
  }
  return `
    main { width: min(84rem, 100%); }
    .briefing-hero h1 { font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .74), 7vw, calc(var(--semantic-typography-display-size) * .94))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); }
    .briefing-metric { padding-block: clamp(1.5rem, 5vw, 3rem); }`;
}

function briefingKoCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .lead { max-width: min(52ch, 35em); line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .briefing-hero h1 { max-width: min(24ch, 16em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    .brand, .briefing-heading h2, .briefing-form h2, .briefing-metric strong, .briefing-rows h3 { letter-spacing: normal; }`;
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}
