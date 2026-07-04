import type { TokensDocument } from "./tokens-schema.js";
import { toCssVars } from "./adapters/css-adapter.js";
import { computeTokenHash } from "./validator.js";
import { toRealizedWeb } from "./transformer.js";
import {
  aliasRows,
  COPY,
  contrastKey,
  contrastResults,
  type DemoCopy,
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
import { textureOverlayCss } from "./texture-overlay.js";

const TYPOGRAPHY_ROLES = ["display", "h1", "h2", "h3", "body", "caption", "heading"] as const;

// Chrome copy (page furniture) is locale-aware; token data (paths, values,
// CSS property names, state names, PASS/FAIL) stays in English by design.
const CHROME = {
  en: {
    navAria: "Sections",
    titleSuffix: "Design System",
    sections: {
      philosophy: "Philosophy",
      colors: "Colors",
      typography: "Typography",
      spacing: "Spacing",
      shapes: "Shapes",
      elevation: "Elevation",
      motion: "Motion",
      components: "Components",
      applications: "Applications",
      relationships: "Token Relationships",
      accessibility: "Accessibility",
    },
    navRelationships: "Relationships",
    philosophyEyebrow: "Generated design system",
    designPrinciples: "Design principles",
    decisionTrace: "Decision trace",
    colorsLead:
      "Semantic roles describe where color is used, not only what value it resolves to. Pair surface roles with foreground roles, and reserve primary roles for clear action states.",
    typographyLead:
      "The ramp uses the realized typography tokens directly, so specimens show the same scale and weight that components consume.",
    easingRoles: "Easing roles",
    motionDemo: "Motion demo",
    componentsLead:
      "Component tokens bind semantic decisions into reusable states. Use the control to simulate the primary button state without leaving this static file.",
    previewAria: "Preview button state",
    primaryButton: "Primary button",
    composedExample: "Composed example",
    tokenCardTitle: "Token-backed card",
    tokenCardBody: "Surface, foreground, spacing, radius, and button tokens combine into a real product pattern.",
    continueLabel: "Continue",
    componentTokenMap: "Component token map",
    applicationsLead:
      "Every sample below consumes the very tokens documented on this page &mdash; same CSS custom properties, no per-medium overrides &mdash; and the drift goldens verify that mechanically.",
    appWebsite: "Website",
    appSlideDeck: "Slide deck",
    appCarousel: "Carousel",
    appVideoLand: "Video landscape",
    appShortsCover: "Shorts cover",
    iframeTitle: "Website demo",
    focusDemo: "Focus demo",
  },
  ko: {
    navAria: "섹션",
    titleSuffix: "디자인 시스템",
    sections: {
      philosophy: "철학",
      colors: "색상",
      typography: "타이포그래피",
      spacing: "간격",
      shapes: "형태",
      elevation: "엘리베이션",
      motion: "모션",
      components: "컴포넌트",
      applications: "적용 사례",
      relationships: "토큰 관계",
      accessibility: "접근성",
    },
    navRelationships: "토큰 관계",
    philosophyEyebrow: "생성된 디자인 시스템",
    designPrinciples: "디자인 원칙",
    decisionTrace: "결정 근거",
    colorsLead:
      "시맨틱 역할은 색이 어떤 값인지보다 어디에 쓰이는지를 설명합니다. surface 역할은 foreground 역할과 짝지어 쓰고, primary 역할은 명확한 액션 상태에만 아껴 쓰세요.",
    typographyLead:
      "타입 램프는 실제 타이포그래피 토큰을 그대로 사용하므로, 여기 보이는 크기와 굵기가 컴포넌트가 소비하는 값과 동일합니다.",
    easingRoles: "이징 역할",
    motionDemo: "모션 데모",
    componentsLead:
      "컴포넌트 토큰은 시맨틱 결정을 재사용 가능한 상태로 묶습니다. 아래 컨트롤로 이 정적 파일 안에서 기본 버튼 상태를 미리 볼 수 있습니다.",
    previewAria: "버튼 상태 미리보기",
    primaryButton: "기본 버튼",
    composedExample: "조합 예시",
    tokenCardTitle: "토큰 기반 카드",
    tokenCardBody: "surface, foreground, 간격, 곡률, 버튼 토큰이 모여 실제 제품 패턴이 됩니다.",
    continueLabel: "계속하기",
    componentTokenMap: "컴포넌트 토큰 맵",
    applicationsLead:
      "아래 모든 샘플은 이 페이지에 문서화된 토큰을 그대로 소비합니다 &mdash; 같은 CSS 커스텀 프로퍼티, 매체별 오버라이드 없음 &mdash; drift 골든이 이를 기계적으로 검증합니다.",
    appWebsite: "웹사이트",
    appSlideDeck: "슬라이드 덱",
    appCarousel: "캐러셀",
    appVideoLand: "가로 영상",
    appShortsCover: "쇼츠 커버",
    iframeTitle: "웹사이트 데모",
    focusDemo: "포커스 데모",
  },
} as const;

type ChromeCopy = (typeof CHROME)["en" | "ko"];

class StyleguideSurfaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StyleguideSurfaceError";
  }
}

export function generateStyleguide(doc: TokensDocument): string {
  const hash = computeTokenHash(doc);
  const ko = doc.meta.locales?.includes("ko") ?? false;
  const realized = toRealizedWeb(doc);
  const t: ChromeCopy = ko ? CHROME.ko : CHROME.en;
  const sections = [
    philosophy(doc, t),
    colors(doc, realized, ko, t),
    typography(doc, realized, ko, t),
    spacing(doc, realized, t),
    shapes(doc, realized, t),
  ];
  const elevation = elevationSection(doc, realized, t);
  if (elevation !== "") sections.push(elevation);
  if (hasMotion(doc)) sections.push(motionSection(doc, realized, t));
  sections.push(components(doc, ko, t), applications(doc, ko, t), relationships(doc, t), accessibility(doc, t));
  const snapshot = JSON.stringify({ builtFromTokenHash: hash, generatedAt: doc.meta.generatedAt });
  return [
    "<!doctype html>",
    `<html lang="${ko ? "ko" : "en"}">`,
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${htmlEscape(doc.meta.recipe)} ${t.titleSuffix}</title>`,
    ...webfontHeadTags(doc),
    `<style>${baseCss(doc)}${koCss(ko)}</style>`,
    "</head>",
    "<body>",
    `<nav aria-label="${t.navAria}">${nav(doc, t)}</nav>`,
    `<main>${sections.join("\n")}</main>`,
    `<script id="token-snapshot" type="application/json">${snapshot}</script>`,
    `<script>${styleguideInlineJs()}</script>`,
    "</body>",
    "</html>",
  ].join("\n");
}

function nav(doc: TokensDocument, t: ChromeCopy): string {
  const items = [
    ["philosophy", t.sections.philosophy],
    ["colors", t.sections.colors],
    ["typography", t.sections.typography],
    ["spacing", t.sections.spacing],
    ["shapes", t.sections.shapes],
  ];
  if (hasElevation(doc)) items.push(["elevation", t.sections.elevation]);
  if (hasMotion(doc)) items.push(["motion", t.sections.motion]);
  items.push(["components", t.sections.components], ["applications", t.sections.applications], ["relationships", t.navRelationships], ["accessibility", t.sections.accessibility]);
  return items.map(([id, label]) => `<a href="#${id}" data-nav-link="${id}">${label}</a>`).join("");
}

function philosophy(doc: TokensDocument, t: ChromeCopy): string {
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
  return section("philosophy", t.sections.philosophy, `<div class="hero-panel"><p class="eyebrow">${t.philosophyEyebrow}</p><h1>${htmlEscape(doc.meta.recipe)}</h1><p class="lead">${htmlEscape(doc.meta.philosophy.rationale)}</p><div class="tone-grid">${tone}</div></div><div class="brand-card"><strong>${t.designPrinciples}</strong><ul>${principles}</ul></div><div class="table-card"><h3>${t.decisionTrace}</h3><table><tbody>${trace}</tbody></table></div>`);
}

function colors(doc: TokensDocument, realized: ReadonlyMap<string, string>, ko: boolean, t: ChromeCopy): string {
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
      return `<article data-color-swatch class="color-card"><span class="swatch" style="background:${htmlEscape(value)}"></span><div><p class="meta-label">${htmlEscape(role)}</p><strong>${htmlEscape(value)}</strong><small>${htmlEscape(usageHint(role, ko ? "" : descriptionFor(doc, entry), ko))}</small><div class="badge-row">${badges}</div></div></article>`;
    })
    .join("");
  return section("colors", t.sections.colors, `<p class="section-lead">${t.colorsLead}</p><div class="swatch-grid">${swatches}</div>`);
}

function typography(doc: TokensDocument, realized: ReadonlyMap<string, string>, ko: boolean, t: ChromeCopy): string {
  // ko neutralizes NEGATIVE tracking on rendered specimens (Hangul crowding);
  // positive caption tracking is kept. The dl still documents the token value.
  const renderTracking = (t: string): string => (ko && Number(t) < 0 ? "0" : t);
  const samples = typographyRoles(doc, realized)
    .map((role) => `<article data-type-sample data-type-role="${role.name}" class="type-card"><div class="type-meta">${htmlEscape(role.name)} &middot; ${htmlEscape(role.size)} &middot; ${htmlEscape(role.weight)}</div><p style="font:${role.weight} ${role.size}/${role.lineHeight} ${htmlEscape(role.family)};letter-spacing:${htmlEscape(renderTracking(role.tracking))}em">${htmlEscape(typeSentence(role.name, ko))}</p><dl class="type-fields"><div><dt>family</dt><dd>${htmlEscape(role.family)}</dd></div><div><dt>size</dt><dd>${htmlEscape(role.size)}</dd></div><div><dt>weight</dt><dd>${htmlEscape(role.weight)}</dd></div><div><dt>line-height</dt><dd>${htmlEscape(role.lineHeight)}</dd></div><div><dt>tracking</dt><dd>${htmlEscape(role.tracking)}</dd></div></dl></article>`)
    .join("");
  return section("typography", t.sections.typography, `<p class="section-lead">${t.typographyLead}</p><div class="type-ramp">${samples}</div>`);
}

function spacing(doc: TokensDocument, realized: ReadonlyMap<string, string>, t: ChromeCopy): string {
  const bars = tokenEntriesUnder(doc.primitive, "space", "primitive.space")
    .map((entry) => `<div data-spacing-bar><span>${entry.path}</span><i style="width:calc(${realized.get(entry.path) ?? "0rem"} * 4)"></i><code>${realized.get(entry.path) ?? ""}</code></div>`)
    .join("");
  return section("spacing", t.sections.spacing, `<div class="bars">${bars}</div>`);
}

function shapes(doc: TokensDocument, realized: ReadonlyMap<string, string>, t: ChromeCopy): string {
  const boxes = tokenEntriesUnder(doc.primitive, "radius", "primitive.radius")
    .map((entry) => `<div data-shape-box class="radius-box" style="border-radius:${realized.get(entry.path) ?? "0"}">${entry.path}<br><code>${realized.get(entry.path) ?? ""}</code></div>`)
    .join("");
  return section("shapes", t.sections.shapes, `<div class="shape-grid">${boxes}</div>`);
}

function elevationSection(doc: TokensDocument, realized: ReadonlyMap<string, string>, t: ChromeCopy): string {
  const cards = tokenEntries(doc)
    .filter((entry) => entry.leaf.$type === "shadow")
    .map((entry) => `<div data-elevation-card class="elevation-card" style="box-shadow:${realized.get(entry.path) ?? "none"}">${entry.path}</div>`)
    .join("");
  return cards === "" ? "" : section("elevation", t.sections.elevation, cards);
}

function motionSection(doc: TokensDocument, realized: ReadonlyMap<string, string>, t: ChromeCopy): string {
  const rows = tokenEntries(doc)
    .filter((entry) => /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/.test(entry.path))
    .map((entry) => `<tr data-motion-row><td>${entry.path}</td><td>${realized.get(entry.path) ?? ""}</td><td>${htmlEscape(tokenRef(entry.leaf))}</td></tr>`)
    .join("");
  const easing = easingRows(doc);
  const easingTable = easing === "" ? "" : `<h3>${t.easingRoles}</h3><table><tbody>${easing}</tbody></table>`;
  return section("motion", t.sections.motion, `${easingTable}<table><tbody>${rows}</tbody></table><button class="demo-button">${t.motionDemo}</button>`);
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

function components(doc: TokensDocument, ko: boolean, t: ChromeCopy): string {
  const mappings = entriesFrom(doc.component, "component")
    .map((entry) => `<tr data-component-row><td>${entry.path}</td><td>${htmlEscape(tokenRef(entry.leaf))}</td><td>${htmlEscape(componentUsage(entry.path, ko))}</td></tr>`)
    .join("");
  return section("components", t.sections.components, `<p class="section-lead">${t.componentsLead}</p><div class="playground" data-playground><div class="playground-toolbar" role="group" aria-label="${t.previewAria}"><button type="button" data-playground-state="default" class="is-selected">Default</button><button type="button" data-playground-state="hover">Hover</button><button type="button" data-playground-state="focus">Focus</button><button type="button" data-playground-state="disabled">Disabled</button></div><div class="component-stage"><div><button data-component-demo class="demo-button playground-target">${t.primaryButton}</button><div class="state-row"><button class="demo-button state-hover" type="button">Hover</button><button class="demo-button state-focus" type="button">Focus</button><button class="demo-button" type="button" disabled>Disabled</button></div></div><article class="sample-card"><p class="meta-label">${t.composedExample}</p><h3>${t.tokenCardTitle}</h3><p>${t.tokenCardBody}</p><button class="demo-button" type="button">${t.continueLabel}</button></article></div></div><div class="table-card"><h3>${t.componentTokenMap}</h3><table><tbody>${mappings}</tbody></table></div>`);
}

function applications(doc: TokensDocument, ko: boolean, t: ChromeCopy): string {
  const copy: DemoCopy = ko ? COPY.ko : COPY.en;
  const brand = htmlEscape(doc.meta.recipe);
  const hint = skeletonHint(doc.meta.skeleton ?? "standard");
  const cards = copy.cards;
  const firstCard = cards[0];
  const secondCard = cards[1];
  if (firstCard === undefined || secondCard === undefined) {
    throw new StyleguideSurfaceError("application copy deck requires at least two cards");
  }
  const slideRows = cards
    .map(([title, body]) => `<li><strong data-copy-source="deck">${htmlEscape(title)}</strong><span data-copy-source="deck">${htmlEscape(body)}</span></li>`)
    .join("");
  const carousel = [
    `<div data-app-carousel-frame class="application-frame app-ratio-4x5 app-carousel-frame"><p class="app-eyebrow">${htmlEscape(copy.eyebrow(brand))}</p><h3 data-copy-source="deck">${htmlEscape(copy.headline)}</h3><span class="app-swipe" aria-hidden="true">&rarr;</span></div>`,
    `<div data-app-carousel-frame class="application-frame app-ratio-4x5 app-carousel-frame"><span class="app-marker">2/3</span><h3 data-copy-source="deck">${htmlEscape(firstCard[0])}</h3><p data-copy-source="deck" class="application-copy">${htmlEscape(firstCard[1])}</p></div>`,
    `<div data-app-carousel-frame class="application-frame app-ratio-4x5 app-carousel-frame"><span class="app-marker">3/3</span><h3 data-copy-source="deck">${htmlEscape(copy.featuresTitle)}</h3><span data-copy-source="deck" class="app-cta-chip">${htmlEscape(copy.ctaPrimary)}</span></div>`,
  ].join("");
  return section(
    "applications",
    t.sections.applications,
    `<p class="section-lead">${t.applicationsLead}</p><div class="applications-grid"><article data-application="app-website" class="application-sample"><p class="application-label">${t.appWebsite} &middot; 16:9</p><div class="application-frame app-ratio-16x9 app-website-frame"><div class="app-website-scale"><iframe src="demo.html" loading="lazy" title="${t.iframeTitle}"></iframe></div></div></article><article data-application="app-slide" class="application-sample app-wide"><p class="application-label">${t.appSlideDeck} &middot; 16:9</p><div class="app-frame-row"><div data-app-slide-frame class="application-frame app-ratio-16x9 app-slide-frame" data-skeleton-align="${hint.align}" data-skeleton-ornament="${hint.ornament}"><p class="app-eyebrow">${htmlEscape(copy.eyebrow(brand))}</p><h3 data-copy-source="deck">${htmlEscape(copy.headline)}</h3><span class="app-wordmark">${brand}</span><i class="app-ornament" aria-hidden="true"></i></div><div data-app-slide-frame class="application-frame app-ratio-16x9 app-slide-frame app-slide-content" data-skeleton-align="${hint.align}" data-skeleton-ornament="${hint.ornament}"><h3 data-copy-source="deck">${htmlEscape(copy.featuresTitle)}</h3><ul>${slideRows}</ul><footer><span>${brand}</span><span>02</span></footer></div></div></article><article data-application="app-carousel" class="application-sample app-wide"><p class="application-label">${t.appCarousel} &middot; 4:5</p><div class="app-carousel-row">${carousel}</div></article><article data-application="app-video-land" class="application-sample app-wide"><p class="application-label">${t.appVideoLand} &middot; 16:9</p><div class="app-frame-row"><div class="application-frame app-ratio-16x9 app-video-card" data-skeleton-align="${hint.align}" data-skeleton-ornament="${hint.ornament}"><span class="app-wordmark">${brand}</span><h3 data-copy-source="deck">${htmlEscape(copy.headline)}</h3></div><div class="application-frame app-ratio-16x9 app-lower-third"><div class="app-lower-bar"><strong data-copy-source="deck">${htmlEscape(secondCard[0])}</strong><span>${brand}</span></div></div></div></article><article data-application="app-video-port" class="application-sample"><p class="application-label">${t.appShortsCover} &middot; 9:16</p><div class="application-frame app-ratio-9x16 app-portrait-card" data-skeleton-align="${hint.align}" data-skeleton-ornament="${hint.ornament}"><p class="app-eyebrow">${htmlEscape(copy.eyebrow(brand))}</p><h3 data-copy-source="deck">${htmlEscape(copy.headline)}</h3><span data-copy-source="deck" class="app-cta-chip">${htmlEscape(copy.ctaPrimary)}</span><span class="app-wordmark">${brand}</span></div></article></div>`,
  );
}

function relationships(doc: TokensDocument, t: ChromeCopy): string {
  const rows = aliasRows(doc)
    .map((row) => `<tr data-alias-row><td>${htmlEscape(row.terminal)}</td><td>${htmlEscape(row.target)}</td><td>${htmlEscape(row.path)}</td></tr>`)
    .join("");
  return section("relationships", t.sections.relationships, `<table><thead><tr><th>Primitive</th><th>Semantic</th><th>Component</th></tr></thead><tbody>${rows}</tbody></table>`);
}

function accessibility(doc: TokensDocument, t: ChromeCopy): string {
  const rows = contrastResults(doc)
    .map((result) => `<tr data-contrast-row="${htmlEscape(contrastKey(result.pair))}"><td>${result.pair.fg}</td><td>${result.pair.bg}</td><td>${result.pair.role}</td><td>${result.pair.state}</td><td>${result.ratio.toFixed(2)}</td><td>${result.minRatio}</td><td>${result.pass ? "PASS" : "FAIL"}</td></tr>`)
    .join("");
  return section("accessibility", t.sections.accessibility, `<table><tbody>${rows}</tbody></table><button data-focus-demo class="focus-demo">${t.focusDemo}</button>`);
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

type SkeletonName = NonNullable<TokensDocument["meta"]["skeleton"]>;

interface SkeletonHint {
  readonly align: "left" | "center";
  readonly ornament: "hairline" | "card" | "index";
}

const SKELETON_HINTS: Record<SkeletonName, SkeletonHint> = {
  standard: { align: "left", ornament: "hairline" },
  editorial: { align: "left", ornament: "hairline" },
  "spec-sheet": { align: "left", ornament: "hairline" },
  briefing: { align: "center", ornament: "index" },
  collage: { align: "left", ornament: "card" },
  mosaic: { align: "center", ornament: "card" },
  poster: { align: "center", ornament: "hairline" },
  journal: { align: "left", ornament: "index" },
  story: { align: "center", ornament: "card" },
};

function skeletonHint(skeleton: SkeletonName): SkeletonHint {
  return SKELETON_HINTS[skeleton];
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
    .component-stage { align-items: stretch; margin-top: 1.25rem; }
    .sample-card { display: grid; gap: .4rem; align-content: start; }
    .applications-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr)); gap: 1rem; }
    .application-sample { min-width: 0; display: grid; gap: .5rem; align-content: start; }
    .application-sample.app-wide { grid-column: span 2; }
    .application-label, .app-eyebrow, .app-marker, .app-slide-content footer, .app-lower-bar span { margin: 0; font-family: var(--primitive-font-family-mono, ui-monospace, monospace); font-size: .72rem; text-transform: uppercase; letter-spacing: .08em; color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 58%, var(--semantic-color-surface-default, Canvas)); }
    .application-frame { container-type: size; position: relative; overflow: hidden; min-width: 0; border: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); border-radius: var(--semantic-shape-control, .5rem); background: color-mix(in oklch, var(--semantic-color-surface-default, Canvas) 94%, var(--semantic-color-primary-default, currentColor)); color: var(--semantic-color-surface-foreground, CanvasText); }
    .app-ratio-16x9 { aspect-ratio: 16 / 9; }
    .app-ratio-4x5 { aspect-ratio: 4 / 5; }
    .app-ratio-9x16 { aspect-ratio: 9 / 16; }
    .app-frame-row, .app-carousel-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
    .app-carousel-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .app-website-frame { background: var(--semantic-color-surface-default, Canvas); }
    .app-website-scale { width: 1280px; height: 720px; transform: scale(.25); transform-origin: top left; }
    .app-website-frame iframe { width: 1280px; height: 720px; border: 0; background: var(--semantic-color-surface-default, Canvas); }
    .app-slide-frame, .app-video-card, .app-portrait-card, .app-carousel-frame { display: grid; gap: clamp(.35rem, 2.4cqw, 1rem); padding: clamp(.8rem, 5cqw, 1.8rem); align-content: safe center; }
    .application-frame .app-eyebrow { font-size: clamp(.55rem, 3.2cqw, .72rem); line-height: 1.3; }
    .app-slide-frame[data-skeleton-align="left"], .app-video-card[data-skeleton-align="left"], .app-portrait-card[data-skeleton-align="left"] { justify-items: start; text-align: left; }
    .app-slide-frame[data-skeleton-align="center"], .app-video-card[data-skeleton-align="center"], .app-portrait-card[data-skeleton-align="center"] { justify-items: center; text-align: center; }
    .app-slide-frame h3, .app-video-card h3, .app-portrait-card h3, .app-carousel-frame h3 { max-width: 22ch; margin: 0; text-wrap: balance; font: var(--semantic-typography-display-weight) clamp(1rem, 8cqw, var(--semantic-typography-display-size))/var(--semantic-typography-display-lineHeight) var(--semantic-typography-display-family); font-size: clamp(1rem, min(7.5cqw, 11cqh), var(--semantic-typography-display-size)); line-height: min(var(--semantic-typography-display-lineHeight), 1.22); letter-spacing: calc(var(--semantic-typography-display-tracking) * 1em); overflow-wrap: anywhere; }
    .app-slide-content { align-content: stretch; }
    .app-slide-content h3 { max-width: none; font: var(--semantic-typography-h2-weight) var(--semantic-typography-h2-size)/var(--semantic-typography-h2-lineHeight) var(--semantic-typography-h2-family); letter-spacing: calc(var(--semantic-typography-h2-tracking) * 1em); font-size: min(var(--semantic-typography-h2-size), 4.5cqw); }
    .app-slide-content ul { display: grid; gap: .25rem; margin: 0; padding: 0; list-style: none; }
    .app-slide-content li { display: grid; grid-template-columns: minmax(5.5rem, .7fr) minmax(0, 1.3fr); gap: .6rem; padding-block: .3rem; border-top: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); font-size: min(var(--semantic-typography-body-size), 3cqw); line-height: 1.45; }
    .app-slide-content strong { font: var(--semantic-typography-h3-weight) min(var(--semantic-typography-body-size), 3.2cqw)/1.45 var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .application-copy, .app-slide-content span { color: color-mix(in oklch, var(--semantic-color-surface-foreground, CanvasText) 72%, var(--semantic-color-surface-default, Canvas)); }
    .app-slide-content footer { display: flex; justify-content: space-between; align-self: end; justify-self: stretch; border-top: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); padding-top: .45rem; }
    @container (max-width: 30rem) { .app-slide-content li { grid-template-columns: 1fr; gap: .1rem; } .app-slide-content li span { display: none; } }
    .app-wordmark { align-self: end; font: var(--semantic-typography-h1-weight) min(var(--semantic-typography-h1-size), 3.8cqw)/min(var(--semantic-typography-h1-lineHeight), 1.2) var(--semantic-typography-h1-family); letter-spacing: calc(var(--semantic-typography-h1-tracking) * 1em); }
    .app-ornament { width: min(7rem, 42%); height: .25rem; border-radius: 999px; background: var(--semantic-color-primary-default, currentColor); }
    [data-skeleton-ornament="card"] .app-ornament { width: min(5rem, 38%); height: 2.5rem; border: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); background: color-mix(in oklch, var(--semantic-color-surface-default, Canvas) 84%, var(--semantic-color-primary-default, currentColor)); }
    [data-skeleton-ornament="index"] .app-ornament::before { content: "01"; font-family: var(--primitive-font-family-mono, ui-monospace, monospace); color: var(--semantic-color-primary-default, currentColor); }
    .app-carousel-frame { align-content: space-between; min-height: 0; }
    .app-carousel-frame h3 { font-size: clamp(.95rem, 11cqw, calc(var(--semantic-typography-display-size) * .9)); }
    .app-swipe { justify-self: end; font: var(--semantic-typography-h1-weight) var(--semantic-typography-h1-size)/var(--semantic-typography-h1-lineHeight) var(--semantic-typography-h1-family); color: var(--semantic-color-primary-default, currentColor); }
    .app-cta-chip { display: inline-flex; align-items: center; justify-content: center; width: fit-content; border-radius: var(--component-button-radius, var(--semantic-shape-control, .5rem)); padding: .7rem var(--component-button-paddingX, 1.25rem); background: var(--component-button-background, var(--semantic-color-primary-default, ButtonFace)); color: var(--component-button-foreground, ButtonText); }
    .app-video-card { min-height: 0; align-content: space-between; }
    .app-video-card .app-wordmark { align-self: start; font-size: min(var(--semantic-typography-h1-size), 4.5cqw); }
    .app-lower-third { background: color-mix(in oklch, var(--semantic-color-surface-default, Canvas) 86%, var(--semantic-color-surface-foreground, CanvasText)); }
    .app-lower-bar { position: absolute; left: clamp(1rem, 4vw, 2rem); bottom: clamp(1rem, 4vw, 2rem); min-width: min(24rem, 72%); display: grid; gap: .2rem; padding: .85rem 1rem; border-left: .32rem solid var(--semantic-color-primary-default, currentColor); background: var(--semantic-color-surface-default, Canvas); }
    .app-lower-bar strong { font: var(--semantic-typography-h3-weight) var(--semantic-typography-h3-size)/var(--semantic-typography-h3-lineHeight) var(--semantic-typography-h3-family); letter-spacing: calc(var(--semantic-typography-h3-tracking) * 1em); }
    .app-portrait-card { align-content: space-between; }
    .app-portrait-card h3 { font-size: clamp(1rem, 9.5cqw, calc(var(--semantic-typography-display-size) * 1.08)); }
    @media (max-width: 760px) { body { display: block; } nav { position: static; height: auto; border-right: 0; border-bottom: 1px solid var(--primitive-color-neutral-100, color-mix(in oklch, currentColor 14%, transparent)); } main { padding: 1rem; } h1 { font-size: calc(var(--semantic-typography-display-size) * .72); } .hero-panel, .tone-chip, .brand-card, .table-card, .color-card, .type-card, .radius-box, .elevation-card, .sample-card, .playground { padding: 1rem; } .color-card { grid-template-columns: 1fr; } .swatch { min-height: 6rem; } .bars div { grid-template-columns: 1fr; } }
${reduce}${textureOverlayCss(doc, [".hero-panel", ".brand-card", ".table-card", ".color-card", ".type-card", ".radius-box", ".elevation-card", ".sample-card", ".playground", ".application-frame", ".app-lower-bar"])}`;
}

function koCss(ko: boolean): string {
  if (!ko) return "";
  return `
    body { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    h1 { max-width: min(13ch, 15em); letter-spacing: normal; line-height: max(1.12, var(--semantic-typography-display-lineHeight)); }
    h2 { letter-spacing: normal; }
    .lead, .section-lead { max-width: 35em; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .application-copy { word-break: keep-all; overflow-wrap: anywhere; line-height: max(1.7, var(--semantic-typography-body-lineHeight)); }
    .app-slide-frame h3, .app-video-card h3, .app-portrait-card h3, .app-carousel-frame h3, .app-wordmark, .app-slide-content h3, .app-slide-content strong, .app-lower-bar strong { letter-spacing: normal; }`;
}
