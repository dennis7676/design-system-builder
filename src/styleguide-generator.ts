import type { TokensDocument } from "./tokens-schema.js";
import { toCssVars } from "./adapters/css-adapter.js";
import { computeTokenHash } from "./validator.js";
import { toRealizedWeb } from "./transformer.js";
import {
  aliasRows,
  contrastKey,
  contrastResults,
  entriesFrom,
  hasTokenPath,
  resolveToken,
  tokenEntries,
  tokenMap,
} from "./surface-data.js";
import {
  axisLabel,
  componentUsage,
  descriptionFor,
  htmlEscape,
  pathTail,
  styleguideInlineJs,
  tokenEntriesUnder,
  tokenRef,
  typeSentence,
  usageHint,
} from "./render-utils.js";
import { webfontHeadTags } from "./font-sources.js";

const TYPOGRAPHY_ROLES = ["display", "h1", "h2", "h3", "body", "caption", "heading"] as const;

export function generateStyleguide(doc: TokensDocument): string {
  const hash = computeTokenHash(doc);
  const ko = doc.meta.locales?.includes("ko") ?? false;
  const realized = toRealizedWeb(doc);
  const sections = [
    philosophy(doc),
    colors(doc, realized),
    typography(doc, realized, ko),
    spacing(doc, realized),
    shapes(doc, realized),
  ];
  const elevation = elevationSection(doc, realized);
  if (elevation !== "") sections.push(elevation);
  if (hasMotion(doc)) sections.push(motionSection(doc, realized));
  sections.push(components(doc), relationships(doc), accessibility(doc));
  const snapshot = JSON.stringify({ builtFromTokenHash: hash, generatedAt: doc.meta.generatedAt });
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${htmlEscape(doc.meta.recipe)} Design System</title>`,
    ...webfontHeadTags(doc),
    `<style>${baseCss(doc)}${koCss(ko)}</style>`,
    "</head>",
    "<body>",
    `<nav aria-label="Sections">${nav(doc)}</nav>`,
    `<main>${sections.join("\n")}</main>`,
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    `<script>${styleguideInlineJs()}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function nav(doc: TokensDocument): string {
  const items = [
    ["philosophy", "Philosophy"],
    ["colors", "Colors"],
    ["typography", "Typography"],
    ["spacing", "Spacing"],
    ["shapes", "Shapes"],
  ];
  if (hasElevation(doc)) items.push(["elevation", "Elevation"]);
  if (hasMotion(doc)) items.push(["motion", "Motion"]);
  items.push(["components", "Components"], ["relationships", "Relationships"], ["accessibility", "Accessibility"]);
  return items.map(([id, label]) => `<a href="#${id}" data-nav-link="${id}">${label}</a>`).join("");
}

function philosophy(doc: TokensDocument): string {
  const principles = doc.meta.philosophy.principles
    .map((principle) => `<li>${htmlEscape(principle)}</li>`)
    .join("");
  const tone = Object.entries(doc.meta.toneVector)
    .map(([axis, value]) => {
      const percent = Math.round(((value + 1) / 2) * 100);
      return `<div class="tone-chip"><span>${htmlEscape(axisLabel(axis))}</span><b>${htmlEscape(value.toFixed(2))}</b><i><em style="width:${percent}%"></em></i></div>`;
    })
    .join("");
  const trace = doc.meta.philosophy.decisionTrace
    .map((item) =>
      `<tr data-trace-row><td>${htmlEscape(item.axis)}=${htmlEscape(String(item.value))}</td><td>${htmlEscape(item.rationale)}</td><td>${htmlEscape(item.coversTokenPath.join(", "))}</td></tr>`,
    )
    .join("");
  return section("philosophy", "Philosophy", `<div class="hero-panel"><p class="eyebrow">Generated design system</p><h1>${htmlEscape(doc.meta.recipe)}</h1><p class="lead">${htmlEscape(doc.meta.philosophy.rationale)}</p><div class="tone-grid">${tone}</div></div><div class="brand-card"><strong>Design principles</strong><ul>${principles}</ul></div><div class="table-card"><h3>Decision trace</h3><table><tbody>${trace}</tbody></table></div>`);
}

function colors(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const contrast = contrastResults(doc);
  const swatches = tokenEntriesUnder(doc.semantic, "color", "semantic.color")
    .filter((entry) => entry.leaf.$type === "color")
    .map((entry) => {
      const value = realized.get(entry.path) ?? "transparent";
      const role = pathTail(entry.path, "semantic.color");
      const badges = contrast
        .filter((result) => result.pair.bg === entry.path)
        .map((result) => `<span class="badge ${result.pass ? "pass" : "fail"}">${result.pair.state} ${result.ratio.toFixed(2)} ${result.pass ? "PASS" : "FAIL"}</span>`)
        .join("");
      return `<article data-color-swatch class="color-card"><span class="swatch" style="background:${htmlEscape(value)}"></span><div><p class="meta-label">${htmlEscape(role)}</p><strong>${htmlEscape(value)}</strong><small>${htmlEscape(usageHint(role, descriptionFor(doc, entry)))}</small><div class="badge-row">${badges}</div></div></article>`;
    })
    .join("");
  return section("colors", "Colors", `<p class="section-lead">Semantic roles describe where color is used, not only what value it resolves to. Pair surface roles with foreground roles, and reserve primary roles for clear action states.</p><div class="swatch-grid">${swatches}</div>`);
}

function typography(doc: TokensDocument, realized: ReadonlyMap<string, string>, ko = false): string {
  // ko neutralizes NEGATIVE tracking on rendered specimens (Hangul crowding);
  // positive caption tracking is kept. The dl still documents the token value.
  const renderTracking = (t: string): string => (ko && Number(t) < 0 ? "0" : t);
  const samples = typographyRoles(doc, realized)
    .map((role) => `<article data-type-sample data-type-role="${role.name}" class="type-card"><div class="type-meta">${htmlEscape(role.name)} &middot; ${htmlEscape(role.size)} &middot; ${htmlEscape(role.weight)}</div><p style="font:${role.weight} ${role.size}/${role.lineHeight} ${htmlEscape(role.family)};letter-spacing:${htmlEscape(renderTracking(role.tracking))}em">${htmlEscape(typeSentence(role.name))}</p><dl class="type-fields"><div><dt>family</dt><dd>${htmlEscape(role.family)}</dd></div><div><dt>size</dt><dd>${htmlEscape(role.size)}</dd></div><div><dt>weight</dt><dd>${htmlEscape(role.weight)}</dd></div><div><dt>line-height</dt><dd>${htmlEscape(role.lineHeight)}</dd></div><div><dt>tracking</dt><dd>${htmlEscape(role.tracking)}</dd></div></dl></article>`)
    .join("");
  return section("typography", "Typography", `<p class="section-lead">The ramp uses the realized typography tokens directly, so specimens show the same scale and weight that components consume.</p><div class="type-ramp">${samples}</div>`);
}

function spacing(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const bars = tokenEntriesUnder(doc.primitive, "space", "primitive.space")
    .map((entry) => `<div data-spacing-bar><span>${entry.path}</span><i style="width:calc(${realized.get(entry.path) ?? "0rem"} * 4)"></i><code>${realized.get(entry.path) ?? ""}</code></div>`)
    .join("");
  return section("spacing", "Spacing", `<div class="bars">${bars}</div>`);
}

function shapes(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const boxes = tokenEntriesUnder(doc.primitive, "radius", "primitive.radius")
    .map((entry) => `<div data-shape-box class="radius-box" style="border-radius:${realized.get(entry.path) ?? "0"}">${entry.path}<br><code>${realized.get(entry.path) ?? ""}</code></div>`)
    .join("");
  return section("shapes", "Shapes", `<div class="shape-grid">${boxes}</div>`);
}

function elevationSection(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const cards = tokenEntries(doc)
    .filter((entry) => entry.leaf.$type === "shadow")
    .map((entry) => `<div data-elevation-card class="elevation-card" style="box-shadow:${realized.get(entry.path) ?? "none"}">${entry.path}</div>`)
    .join("");
  return cards === "" ? "" : section("elevation", "Elevation", cards);
}

function motionSection(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const rows = tokenEntries(doc)
    .filter((entry) => /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/.test(entry.path))
    .map((entry) => `<tr data-motion-row><td>${entry.path}</td><td>${realized.get(entry.path) ?? ""}</td><td>${htmlEscape(tokenRef(entry.leaf))}</td></tr>`)
    .join("");
  const easing = easingRows(doc);
  const easingTable = easing === "" ? "" : `<h3>Easing roles</h3><table><tbody>${easing}</tbody></table>`;
  return section("motion", "Motion", `${easingTable}<table><tbody>${rows}</tbody></table><button class="demo-button">Motion demo</button>`);
}

function easingRows(doc: TokensDocument): string {
  const leaves = tokenMap(doc);
  return ["standard", "enter", "exit"]
    .map((role) => {
      const path = `semantic.motion.easing.${role}`;
      if (!leaves.has(path)) return "";
      const resolved = resolveToken(path, leaves);
      const raw = Array.isArray(resolved.$value) ? `[${resolved.$value.join(", ")}]` : String(resolved.$value);
      return `<tr data-motion-easing-row><td>${path}</td><td>${htmlEscape(raw)}</td><td>${htmlEscape(role)}</td></tr>`;
    })
    .join("");
}

function components(doc: TokensDocument): string {
  const mappings = entriesFrom(doc.component, "component")
    .map((entry) => `<tr data-component-row><td>${entry.path}</td><td>${htmlEscape(tokenRef(entry.leaf))}</td><td>${htmlEscape(componentUsage(entry.path))}</td></tr>`)
    .join("");
  return section("components", "Components", `<p class="section-lead">Component tokens bind semantic decisions into reusable states. Use the control to simulate the primary button state without leaving this static file.</p><div class="playground" data-playground><div class="playground-toolbar" role="group" aria-label="Preview button state"><button type="button" data-playground-state="default" class="is-selected">Default</button><button type="button" data-playground-state="hover">Hover</button><button type="button" data-playground-state="focus">Focus</button><button type="button" data-playground-state="disabled">Disabled</button></div><div class="component-stage"><div><button data-component-demo class="demo-button playground-target">Primary button</button><div class="state-row"><button class="demo-button state-hover" type="button">Hover</button><button class="demo-button state-focus" type="button">Focus</button><button class="demo-button" type="button" disabled>Disabled</button></div></div><article class="sample-card"><p class="meta-label">Composed example</p><h3>Token-backed card</h3><p>Surface, foreground, spacing, radius, and button tokens combine into a real product pattern.</p><button class="demo-button" type="button">Continue</button></article></div></div><div class="table-card"><h3>Component token map</h3><table><tbody>${mappings}</tbody></table></div>`);
}

function relationships(doc: TokensDocument): string {
  const rows = aliasRows(doc)
    .map((row) => `<tr data-alias-row><td>${htmlEscape(row.terminal)}</td><td>${htmlEscape(row.target)}</td><td>${htmlEscape(row.path)}</td></tr>`)
    .join("");
  return section("relationships", "Token Relationships", `<table><thead><tr><th>Primitive</th><th>Semantic</th><th>Component</th></tr></thead><tbody>${rows}</tbody></table>`);
}

function accessibility(doc: TokensDocument): string {
  const rows = contrastResults(doc)
    .map((result) => `<tr data-contrast-row="${htmlEscape(contrastKey(result.pair))}"><td>${result.pair.fg}</td><td>${result.pair.bg}</td><td>${result.pair.role}</td><td>${result.pair.state}</td><td>${result.ratio.toFixed(2)}</td><td>${result.minRatio}</td><td>${result.pass ? "PASS" : "FAIL"}</td></tr>`)
    .join("");
  return section("accessibility", "Accessibility", `<table><tbody>${rows}</tbody></table><button data-focus-demo class="focus-demo">Focus demo</button>`);
}

function section(id: string, title: string, body: string): string {
  return `<section id="${id}" data-surface-element="${id}"><h2>${title}</h2>${body}</section>`;
}

function typographyRoles(doc: TokensDocument, realized: ReadonlyMap<string, string>): readonly RoleStyle[] {
  const roles = new Map<string, Map<string, string>>();
  for (const entry of tokenEntriesUnder(doc.semantic, "typography", "semantic.typography")) {
    const [role, prop] = pathTail(entry.path, "semantic.typography").split(".");
    if (role === undefined || prop === undefined) continue;
    const values = roles.get(role) ?? new Map<string, string>();
    values.set(prop, realized.get(entry.path) ?? "");
    roles.set(role, values);
  }
  return TYPOGRAPHY_ROLES.map((name) => {
    const values = roles.get(name) ?? new Map<string, string>();
    return {
    name,
      family: values.get("family") ?? "",
      size: values.get("size") ?? "",
      weight: values.get("weight") ?? "",
      lineHeight: values.get("lineHeight") ?? "",
      tracking: values.get("tracking") ?? "0",
    };
  });
}

interface RoleStyle {
  readonly name: string;
  readonly family: string;
  readonly size: string;
  readonly weight: string;
  readonly lineHeight: string;
  readonly tracking: string;
}

function hasElevation(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)shadow(\.|$)/);
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}

function baseCss(doc: TokensDocument): string {
  const reduce = hasMotion(doc)
    ? `
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after { transition: none !important; animation: none !important; }
    }`
    : "";
  return `${toCssVars(doc)}
    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; overflow-x: hidden; }
    body { margin: 0; overflow-x: hidden; background: var(--semantic-color-surface-default, Canvas); color: var(--semantic-color-surface-foreground, CanvasText); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); display: grid; grid-template-columns: 15rem minmax(0, 1fr); }
    nav { position: sticky; top: 0; height: 100vh; padding: var(--semantic-space-inset, 1.5rem); border-right: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); background: color-mix(in oklch, var(--semantic-color-surface-default, Canvas) 92%, transparent); backdrop-filter: blur(.75rem); }
    nav a { display: block; color: inherit; padding: .55rem .75rem; border-radius: var(--semantic-shape-control, .5rem); text-decoration: none; transition: background var(--semantic-motion-transition, 160ms) ease, color var(--semantic-motion-transition, 160ms) ease; }
    nav a:hover, nav a.is-active { color: var(--semantic-color-primary-default, currentColor); background: color-mix(in oklch, var(--semantic-color-primary-default, currentColor) 10%, transparent); }
    main { width: min(78rem, 100%); max-width: 100%; padding: clamp(1.25rem, 3vw, 3rem); }
    section { padding: clamp(2.25rem, 5vw, 5rem) 0; border-bottom: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); scroll-margin-top: 2rem; }
    h1, h2, h3, p { margin-top: 0; }
    h1 { max-width: 13ch; margin-bottom: 1rem; font: var(--semantic-typography-display-weight) clamp(calc(var(--semantic-typography-display-size) * .92), 7vw, calc(var(--semantic-typography-display-size) * 1.16))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); overflow-wrap: anywhere; }
    h2 { margin-bottom: 1rem; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); }
    h3 { margin-bottom: .75rem; font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    table { width: 100%; table-layout: fixed; border-collapse: collapse; margin-top: 1rem; font-size: .92rem; }
    th, td { border-bottom: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); padding: .75rem; text-align: left; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; }
    code, .type-meta, .meta-label, .eyebrow { font-family: var(--primitive-font-family-mono, ui-monospace, monospace); font-size: .78rem; }
    .hero-panel { width: 100%; max-width: 100%; padding: clamp(1.5rem, 4vw, 3rem); border-radius: var(--semantic-shape-control, .5rem); background: linear-gradient(135deg, color-mix(in oklch, var(--semantic-color-primary-default, currentColor) 16%, var(--semantic-color-surface-default, Canvas)), var(--semantic-color-surface-default, Canvas)); border: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); }
    .lead, .section-lead { max-width: 62rem; color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 76%, var(--semantic-color-surface-default, Canvas)); font: var(--semantic-typography-body-weight) var(--semantic-typography-body-size)/var(--semantic-typography-body-lineHeight) var(--semantic-typography-body-family); letter-spacing: calc(var(--semantic-typography-body-tracking) * 1em); overflow-wrap: anywhere; word-break: break-word; line-break: loose; }
    .eyebrow, .meta-label, .type-meta { color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 58%, var(--semantic-color-surface-default, Canvas)); text-transform: uppercase; letter-spacing: 0; }
    .tone-grid, .swatch-grid, .shape-grid, .type-ramp, .component-stage { display: grid; grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr)); gap: 1rem; }
    .tone-chip, .brand-card, .table-card, .color-card, .type-card, .radius-box, .elevation-card, .sample-card, .playground { min-width: 0; border: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); border-radius: var(--semantic-shape-control, .5rem); background: color-mix(in oklch, var(--semantic-color-surface-default, Canvas) 96%, var(--semantic-color-primary-default, currentColor)); padding: var(--semantic-space-inset, 1.5rem); }
    .table-card { overflow-x: auto; }
    .tone-chip { display: grid; gap: .45rem; }
    .tone-chip b { color: var(--semantic-color-primary-default, currentColor); }
    .tone-chip i, .bars i { display: block; overflow: hidden; border-radius: 999px; background: var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); }
    .tone-chip em { display: block; height: .5rem; border-radius: inherit; background: var(--semantic-color-primary-default, currentColor); }
    .brand-card { margin-top: 1rem; }
    .brand-card ul { margin-bottom: 0; padding-left: 1.25rem; }
    .swatch-grid { grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); }
    .color-card { display: grid; grid-template-columns: 6rem 1fr; gap: 1rem; min-height: 10rem; }
    .color-card strong { display: block; margin-bottom: .35rem; font-family: var(--primitive-font-family-mono, ui-monospace, monospace); word-break: break-word; }
    .color-card small { display: block; color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 68%, var(--semantic-color-surface-default, Canvas)); }
    .swatch { display: block; min-height: 100%; border-radius: var(--semantic-shape-control, .5rem); border: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); }
    .badge-row, .state-row, .playground-toolbar { display: flex; flex-wrap: wrap; gap: .5rem; margin-top: 1rem; }
    .badge, .playground-toolbar button { border: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); border-radius: 999px; padding: .35rem .6rem; background: var(--semantic-color-surface-default, Canvas); color: inherit; }
    .pass { color: var(--semantic-color-primary-default, currentColor); }
    .fail { color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 82%, var(--semantic-color-primary-default, currentColor)); }
    .type-card p { margin: .75rem 0; }
    .type-fields { display: grid; gap: .4rem; margin: .75rem 0 0; }
    .type-fields div { display: grid; grid-template-columns: 6rem minmax(0, 1fr); gap: .75rem; }
    .type-fields dt { color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 58%, var(--semantic-color-surface-default, Canvas)); }
    .type-fields dd { margin: 0; overflow-wrap: anywhere; }
    .bars div { display: grid; grid-template-columns: minmax(9rem, 14rem) minmax(3rem, 1fr) 6rem; align-items: center; gap: 1rem; margin: .75rem 0; }
    .bars i { height: 1rem; background: var(--semantic-color-primary-default, currentColor); }
    .demo-button { background: var(--component-button-background, var(--semantic-color-primary-default, ButtonFace)); color: var(--component-button-foreground, ButtonText); border: 0; border-radius: var(--component-button-radius, var(--semantic-shape-control, .5rem)); padding: .75rem var(--component-button-paddingX, 1.25rem); transition: background var(--component-button-transition, var(--semantic-motion-transition, 160ms)) ease, transform var(--component-button-transition, var(--semantic-motion-transition, 160ms)) ease, opacity var(--component-button-transition, var(--semantic-motion-transition, 160ms)) ease; }
    .demo-button:hover, .state-hover, .playground.is-hover .playground-target { background: var(--component-button-backgroundHover, var(--component-button-background, ButtonFace)); transform: translateY(-1px); }
    .demo-button:disabled, .playground.is-disabled .playground-target { opacity: .45; cursor: not-allowed; transform: none; }
    .focus-demo:focus-visible, .demo-button:focus-visible, .state-focus, .playground.is-focus .playground-target { outline: .2rem solid var(--semantic-color-primary-default, Highlight); outline-offset: .2rem; }
    .playground-toolbar button.is-selected { color: var(--component-button-foreground, ButtonText); background: var(--component-button-background, var(--semantic-color-primary-default, ButtonFace)); border-color: transparent; }
    .component-stage { align-items: stretch; }
    .sample-card { display: grid; gap: .4rem; align-content: start; }
    @media (max-width: 760px) { body { display: block; } nav { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); } main { padding: 1rem; } h1 { font-size: calc(var(--semantic-typography-display-size) * .72); } .hero-panel, .tone-chip, .brand-card, .table-card, .color-card, .type-card, .radius-box, .elevation-card, .sample-card, .playground { padding: 1rem; } .color-card { grid-template-columns: 1fr; } .swatch { min-height: 6rem; } .bars div { grid-template-columns: 1fr; } }
${reduce}`;
}

function koCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    h1 { max-width: min(13ch, 15em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    h2 { letter-spacing: normal; }
    .lead, .section-lead { max-width: 35em; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }`;
}
