import type { TokensDocument } from "./tokens-schema.js";
import { computeTokenHash, type Finding } from "./validator.js";
import {
  aliasRows,
  contrastKey,
  contrastResults,
  entriesFrom,
  hasTokenPath,
} from "./surface-data.js";
import { pathTail, tokenEntriesUnder } from "./render-utils.js";

export interface Surfaces {
  readonly styleguideHtml: string;
  readonly designMd: string;
}

const REQUIRED_ELEMENTS = [
  "philosophy",
  "colors",
  "typography",
  "spacing",
  "shapes",
  "components",
  "relationships",
  "accessibility",
] as const;

type RequiredElement = (typeof REQUIRED_ELEMENTS)[number];

export function checkManifest(doc: TokensDocument, surfaces: Surfaces): Finding[] {
  const findings: Finding[] = [];
  checkDrift(doc, surfaces, findings);
  checkCompleteness(doc, surfaces, findings);
  checkA11yRecords(doc, surfaces, findings);
  checkMotionReduce(doc, surfaces, findings);
  return findings;
}

function checkDrift(doc: TokensDocument, surfaces: Surfaces, findings: Finding[]): void {
  const expected = computeTokenHash(doc);
  const styleguideHash = styleguideBuiltHash(surfaces.styleguideHtml);
  const designHash = designMdBuiltHash(surfaces.designMd);
  if (styleguideHash !== expected) {
    findings.push({
      severity: "error",
      code: "manifest-drift",
      message: "styleguide builtFromTokenHash missing or stale",
      meta: { surface: "styleguide", expected, actual: styleguideHash },
    });
  }
  if (designHash !== expected) {
    findings.push({
      severity: "error",
      code: "manifest-drift",
      message: "DESIGN.md builtFromTokenHash missing or stale",
      meta: { surface: "DESIGN.md", expected, actual: designHash },
    });
  }
}

function checkCompleteness(doc: TokensDocument, surfaces: Surfaces, findings: Finding[]): void {
  for (const element of REQUIRED_ELEMENTS) {
    if (!styleguideComplete(doc, element, surfaces.styleguideHtml)) {
      findings.push(incomplete("styleguide", element));
    }
    if (!designMdComplete(doc, element, surfaces.designMd)) {
      findings.push(incomplete("DESIGN.md", element));
    }
  }
}

function checkA11yRecords(doc: TokensDocument, surfaces: Surfaces, findings: Finding[]): void {
  for (const result of contrastResults(doc)) {
    const key = contrastKey(result.pair);
    const ratio = result.ratio.toFixed(2);
    const status = result.pass ? "PASS" : "FAIL";
    if (!surfaces.styleguideHtml.includes(`data-contrast-row="${key}"`) || !surfaces.styleguideHtml.includes(ratio) || !surfaces.styleguideHtml.includes(status)) {
      findings.push(a11yMissing("styleguide", key));
    }
    const mdRowPrefix = `| ${result.pair.fg} | ${result.pair.bg} | ${result.pair.role} | ${result.pair.state} | ${ratio} |`;
    if (!surfaces.designMd.includes(mdRowPrefix) || !surfaces.designMd.includes(`| ${status} |`)) {
      findings.push(a11yMissing("DESIGN.md", key));
    }
  }
}

function checkMotionReduce(doc: TokensDocument, surfaces: Surfaces, findings: Finding[]): void {
  if (!hasMotion(doc)) return;
  const styleguideHasReduce = surfaces.styleguideHtml.includes("prefers-reduced-motion: reduce");
  const designHasReduce = /Motion reduce:.*prefers-reduced-motion: reduce/s.test(surfaces.designMd);
  if (!styleguideHasReduce || !designHasReduce) {
    findings.push({
      severity: "error",
      code: "motion-reduce-missing",
      message: "motion tokens require reduced-motion records in styleguide and DESIGN.md",
      meta: { styleguide: styleguideHasReduce, designMd: designHasReduce },
    });
  }
}

function styleguideBuiltHash(html: string): string | null {
  const script = html.match(/<script id="token-snapshot" type="application\/json">([\s\S]*?)<\/script>/);
  const json = script?.[1];
  if (json === undefined) return null;
  const hash = json.match(/"builtFromTokenHash"\s*:\s*"([^"]+)"/);
  return hash?.[1] ?? null;
}

function designMdBuiltHash(markdown: string): string | null {
  const hash = markdown.match(/^---\s*\nbuiltFromTokenHash:\s*"([^"]+)"\s*\n---/);
  return hash?.[1] ?? null;
}

function styleguideComplete(doc: TokensDocument, element: RequiredElement, html: string): boolean {
  const section = new RegExp(`<section id="${element}"[\\s\\S]*?</section>`).exec(html)?.[0] ?? "";
  if (section === "") return false;
  switch (element) {
    case "philosophy":
      return section.includes("brand-card") && count(section, "data-trace-row") >= doc.meta.philosophy.decisionTrace.length;
    case "colors":
      return count(section, "data-color-swatch") >= colorCount(doc);
    case "typography":
      return count(section, "data-type-sample") >= typographyRoleCount(doc);
    case "spacing":
      return count(section, "data-spacing-bar") >= tokenEntriesUnder(doc.primitive, "space", "primitive.space").length;
    case "shapes":
      return count(section, "data-shape-box") >= tokenEntriesUnder(doc.primitive, "radius", "primitive.radius").length;
    case "components":
      return section.includes("data-component-demo") && count(section, "data-component-row") >= entriesFrom(doc.component, "component").length;
    case "relationships":
      return count(section, "data-alias-row") >= aliasRows(doc).length;
    case "accessibility":
      return count(section, "data-contrast-row") >= doc.contrastPairs.length && section.includes("data-focus-demo");
  }
}

function designMdComplete(doc: TokensDocument, element: RequiredElement, markdown: string): boolean {
  switch (element) {
    case "philosophy":
      return markdown.includes("## 1. Philosophy") && doc.meta.philosophy.decisionTrace.every((trace) => markdown.includes(`| ${trace.axis} |`));
    case "colors":
      return markdown.includes("## 2. Color") && tokenEntriesUnder(doc.semantic, "color", "semantic.color").every((entry) => markdown.includes(pathTail(entry.path, "semantic.color")));
    case "typography":
      return markdown.includes("## 3. Typography") && typographyRoles(doc).every((role) => markdown.includes(`| ${role} |`));
    case "spacing":
      return markdown.includes("## 4. Spacing") && tokenEntriesUnder(doc.primitive, "space", "primitive.space").every((entry) => markdown.includes(entry.path));
    case "shapes":
      return markdown.includes("## 5. Shape") && tokenEntriesUnder(doc.primitive, "radius", "primitive.radius").every((entry) => markdown.includes(entry.path));
    case "components":
      return markdown.includes("## 8. Components") && entriesFrom(doc.component, "component").every((entry) => markdown.includes(entry.path));
    case "relationships":
      return markdown.includes("## 9. Token Relationships") && aliasRows(doc).every((row) => markdown.includes(row.path));
    case "accessibility":
      return markdown.includes("## 10. Accessibility") && markdown.includes("| FG | BG | Role | State | Ratio | Min ratio | Result |");
  }
}

function incomplete(surface: string, element: RequiredElement): Finding {
  return {
    severity: "error",
    code: "surface-incomplete",
    message: `${surface} missing required ${element} content`,
    meta: { surface, element },
  };
}

function a11yMissing(surface: string, key: string): Finding {
  return {
    severity: "error",
    code: "a11y-record",
    message: `${surface} missing contrast result row`,
    meta: { surface, contrastPair: key },
  };
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}

function colorCount(doc: TokensDocument): number {
  return tokenEntriesUnder(doc.semantic, "color", "semantic.color").filter((entry) => entry.leaf.$type === "color").length;
}

function typographyRoleCount(doc: TokensDocument): number {
  return typographyRoles(doc).length;
}

function typographyRoles(doc: TokensDocument): readonly string[] {
  return [...new Set(tokenEntriesUnder(doc.semantic, "typography", "semantic.typography")
    .map((entry) => pathTail(entry.path, "semantic.typography").split(".")[0])
    .filter((role) => role !== undefined))];
}

function count(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
