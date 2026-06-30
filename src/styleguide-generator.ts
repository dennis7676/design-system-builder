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
  tokenEntries,
} from "./surface-data.js";
import {
  descriptionFor,
  htmlEscape,
  pathTail,
  tokenEntriesUnder,
  tokenRef,
} from "./render-utils.js";

export function generateStyleguide(doc: TokensDocument): string {
  const hash = computeTokenHash(doc);
  const realized = toRealizedWeb(doc);
  const sections = [
    philosophy(doc),
    colors(doc, realized),
    typography(doc, realized),
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
    '<html lang="en">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${htmlEscape(doc.meta.recipe)} Design System</title>`,
    `<style>${baseCss(doc)}</style>`,
    "</head>",
    "<body>",
    `<nav aria-label="Sections">${nav(doc)}</nav>`,
    `<main>${sections.join("\n")}</main>`,
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
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
  return items.map(([id, label]) => `<a href="#${id}">${label}</a>`).join("");
}

function philosophy(doc: TokensDocument): string {
  const principles = doc.meta.philosophy.principles
    .map((principle) => `<li>${htmlEscape(principle)}</li>`)
    .join("");
  const trace = doc.meta.philosophy.decisionTrace
    .map((item) =>
      `<tr data-trace-row><td>${htmlEscape(item.axis)}=${htmlEscape(String(item.value))}</td><td>${htmlEscape(item.rationale)}</td><td>${htmlEscape(item.coversTokenPath.join(", "))}</td></tr>`,
    )
    .join("");
  return section("philosophy", "Philosophy", `<div class="brand-card"><strong>${htmlEscape(doc.meta.recipe)}</strong><p>${htmlEscape(doc.meta.philosophy.rationale)}</p><ul>${principles}</ul></div><table><tbody>${trace}</tbody></table>`);
}

function colors(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const swatches = tokenEntriesUnder(doc.semantic, "color", "semantic.color")
    .filter((entry) => entry.leaf.$type === "color")
    .map((entry) => {
      const value = realized.get(entry.path) ?? "transparent";
      const role = pathTail(entry.path, "semantic.color");
      const contrast = contrastResults(doc).filter((result) => result.pair.bg === entry.path);
      const badges = contrast.map((result) => `<span class="${result.pass ? "pass" : "fail"}">${result.pair.state} ${result.ratio.toFixed(2)} ${result.pass ? "pass" : "fail"}</span>`).join("");
      return `<article data-color-swatch><span class="swatch" style="background:${htmlEscape(value)}"></span><strong>${htmlEscape(role)}</strong><small>${htmlEscape(descriptionFor(doc, entry))}</small>${badges}</article>`;
    })
    .join("");
  return section("colors", "Colors", `<div class="swatch-grid">${swatches}</div>`);
}

function typography(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const samples = typographyRoles(doc, realized)
    .map((role) => `<p data-type-sample style="font:${role.weight} ${role.size}/${role.lineHeight} ${htmlEscape(role.family)}">${htmlEscape(role.name)}: The quick brown fox maps intent to type.</p>`)
    .join("");
  return section("typography", "Typography", samples);
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
  return section("motion", "Motion", `<table><tbody>${rows}</tbody></table><button class="demo-button">Motion demo</button>`);
}

function components(doc: TokensDocument): string {
  const mappings = entriesFrom(doc.component, "component")
    .map((entry) => `<tr data-component-row><td>${entry.path}</td><td>${htmlEscape(tokenRef(entry.leaf))}</td></tr>`)
    .join("");
  return section("components", "Components", `<button data-component-demo class="demo-button">Primary button</button><table><tbody>${mappings}</tbody></table>`);
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
  return [...roles].map(([name, values]) => ({
    name,
    size: values.get("size") ?? "1rem",
    weight: values.get("weight") ?? "400",
    lineHeight: values.get("lineHeight") ?? "1.5",
    family: values.get("family") ?? "system-ui, sans-serif",
  }));
}

interface RoleStyle {
  readonly name: string;
  readonly size: string;
  readonly weight: string;
  readonly lineHeight: string;
  readonly family: string;
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
    body { margin: 0; background: var(--semantic-color-surface-default); color: var(--semantic-color-surface-foreground); font-family: var(--semantic-typography-body-family); display: grid; grid-template-columns: 14rem 1fr; }
    nav { position: sticky; top: 0; height: 100vh; padding: 1rem; border-right: 1px solid var(--primitive-color-neutral-100); background: var(--semantic-color-surface-default); }
    nav a { display: block; color: inherit; padding: .4rem 0; text-decoration: none; }
    main { max-width: 72rem; padding: 2rem; }
    section { padding: 1.5rem 0; border-bottom: 1px solid var(--primitive-color-neutral-100); }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { border-bottom: 1px solid var(--primitive-color-neutral-100); padding: .5rem; text-align: left; }
    .brand-card, article, .radius-box, .elevation-card { border: 1px solid var(--primitive-color-neutral-100); border-radius: var(--semantic-shape-control); padding: 1rem; }
    .swatch-grid, .shape-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr)); gap: 1rem; }
    .swatch { display: block; min-height: 4rem; border-radius: var(--semantic-shape-control); border: 1px solid var(--primitive-color-neutral-100); }
    .pass { color: oklch(0.38 0.12 150); margin-right: .5rem; }
    .fail { color: oklch(0.45 0.15 25); margin-right: .5rem; }
    .bars div { display: grid; grid-template-columns: 12rem 1fr 6rem; align-items: center; gap: 1rem; margin: .5rem 0; }
    .bars i { display: block; height: 1rem; background: var(--semantic-color-primary-default); border-radius: .25rem; }
    .demo-button { background: var(--component-button-background); color: var(--component-button-foreground); border: 0; border-radius: var(--component-button-radius); padding: .75rem var(--component-button-paddingX); transition: background var(--component-button-transition) ease; }
    .demo-button:hover { background: var(--component-button-backgroundHover); }
    .focus-demo:focus-visible, .demo-button:focus-visible { outline: .2rem solid var(--semantic-color-primary-default); outline-offset: .2rem; }
    @media (max-width: 760px) { body { display: block; } nav { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--primitive-color-neutral-100); } }
${reduce}`;
}
