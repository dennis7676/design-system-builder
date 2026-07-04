import type { TokensDocument } from "./tokens-schema.js";
import { computeTokenHash } from "./validator.js";
import { toRealizedWeb } from "./transformer.js";
import {
  aliasRows,
  contrastResults,
  entriesFrom,
  hasTokenPath,
  tokenEntries,
} from "./surface-data.js";
import {
  descriptionFor,
  mdEscape,
  pathTail,
  tokenEntriesUnder,
  tokenRef,
} from "./render-utils.js";

export function generateDesignMd(doc: TokensDocument): string {
  const hash = computeTokenHash(doc);
  const realized = toRealizedWeb(doc);
  const parts = [
    "---",
    `builtFromTokenHash: "${hash}"`,
    "---",
    `# ${doc.meta.recipe} Design System`,
    philosophy(doc),
    colors(doc),
    typography(doc, realized),
    spacing(doc, realized),
    shapes(doc, realized),
  ];
  const elevation = elevationSection(doc, realized);
  if (elevation !== "") parts.push(elevation);
  const motion = motionSection(doc, realized);
  if (motion !== "") parts.push(motion);
  parts.push(components(doc, realized), relationships(doc), accessibility(doc));
  return `${parts.join("\n\n")}\n`;
}

function philosophy(doc: TokensDocument): string {
  const principleRows = doc.meta.philosophy.principles
    .map((principle, index) => `| ${index + 1} | ${mdEscape(principle)} |`)
    .join("\n");
  const traceRows = doc.meta.philosophy.decisionTrace
    .map((trace) =>
      `| ${mdEscape(trace.axis)} | ${mdEscape(String(trace.value))} | ${mdEscape(trace.rationale)} | ${mdEscape(trace.coversTokenPath.join(", "))} |`,
    )
    .join("\n");
  return [
    "## 1. Philosophy",
    mdEscape(doc.meta.philosophy.rationale),
    "| # | Principle |",
    "| - | - |",
    principleRows,
    "| Axis | Value | Rationale | Covers |",
    "| - | - | - | - |",
    traceRows,
  ].join("\n");
}

function colors(doc: TokensDocument): string {
  const rows = tokenEntriesUnder(doc.semantic, "color", "semantic.color")
    .filter((entry) => entry.leaf.$type === "color")
    .map((entry) =>
      `| ${mdEscape(pathTail(entry.path, "semantic.color"))} | ${mdEscape(tokenRef(entry.leaf) || entry.path)} | ${mdEscape(descriptionFor(doc, entry))} |`,
    )
    .join("\n");
  return ["## 2. Color", "| Role | Token ref | $description |", "| - | - | - |", rows].join("\n");
}

function typography(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const roles = roleRows("semantic.typography", tokenEntriesUnder(doc.semantic, "typography", "semantic.typography"), realized);
  return ["## 3. Typography", "| Role | Size | Weight | Line height | Family |", "| - | - | - | - | - |", roles].join("\n");
}

function spacing(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const rows = [
    ...tokenEntriesUnder(doc.primitive, "space", "primitive.space"),
    ...tokenEntriesUnder(doc.semantic, "space", "semantic.space"),
  ].map((entry) => `| ${entry.path} | ${realized.get(entry.path) ?? ""} | ${mdEscape(tokenRef(entry.leaf))} |`).join("\n");
  return ["## 4. Spacing", "| Token | Realized | Alias target |", "| - | - | - |", rows].join("\n");
}

function shapes(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const rows = [
    ...tokenEntriesUnder(doc.primitive, "radius", "primitive.radius"),
    ...tokenEntriesUnder(doc.semantic, "shape", "semantic.shape"),
  ].map((entry) => `| ${entry.path} | ${realized.get(entry.path) ?? ""} | ${mdEscape(tokenRef(entry.leaf))} |`).join("\n");
  return ["## 5. Shape", "| Token | Realized | Alias target |", "| - | - | - |", rows].join("\n");
}

function elevationSection(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const rows = tokenEntries(doc)
    .filter((entry) => entry.leaf.$type === "shadow")
    .map((entry) => `| ${entry.path} | ${realized.get(entry.path) ?? ""} |`)
    .join("\n");
  return rows === "" ? "" : ["## 6. Elevation", "| Token | Realized |", "| - | - |", rows].join("\n");
}

function motionSection(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  if (!hasMotion(doc)) return "";
  const rows = tokenEntries(doc)
    .filter((entry) => /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/.test(entry.path))
    .map((entry) => `| ${entry.path} | ${realized.get(entry.path) ?? ""} | ${mdEscape(tokenRef(entry.leaf))} |`)
    .join("\n");
  return ["## 7. Motion", "| Token | Realized | Alias target |", "| - | - | - |", rows].join("\n");
}

function components(doc: TokensDocument, realized: ReadonlyMap<string, string>): string {
  const rows = entriesFrom(doc.component, "component")
    .map((entry) => `| ${mdEscape(componentName(entry.path))} | ${entry.path} | ${mdEscape(tokenRef(entry.leaf))} | ${realized.get(entry.path) ?? ""} | default, hover, focus, active, disabled |`)
    .join("\n");
  return ["## 8. Components", "| Component | Token | Maps to | Realized | Core states |", "| - | - | - | - | - |", rows].join("\n");
}

function componentName(path: string): string {
  return path.split(".")[1] ?? "component";
}

function relationships(doc: TokensDocument): string {
  const rows = aliasRows(doc)
    .map((row) => `| ${row.terminal} ← ${row.target} ← ${row.path} | ${row.path} | ${row.chain.join(" -> ")} |`)
    .join("\n");
  return ["## 9. Token Relationships", "| Hierarchy | Intent path | Alias chain |", "| - | - | - |", rows].join("\n");
}

function accessibility(doc: TokensDocument): string {
  const rows = contrastResults(doc)
    .map((result) =>
      `| ${result.pair.fg} | ${result.pair.bg} | ${result.pair.role} | ${result.pair.state} | ${result.ratio.toFixed(2)} | ${result.minRatio} | ${result.pass ? "PASS" : "FAIL"} |`,
    )
    .join("\n");
  const reduce = hasMotion(doc)
    ? "\nMotion reduce: when motion tokens exist, `prefers-reduced-motion: reduce` disables transitions and animations."
    : "";
  return [
    "## 10. Accessibility",
    "| FG | BG | Role | State | Ratio | Min ratio | Result |",
    "| - | - | - | - | - | - | - |",
    rows,
    "Focus demo: controls retain visible focus with a high-contrast outline.",
    reduce,
  ].join("\n");
}

function roleRows(
  prefix: string,
  entries: readonly { readonly path: string }[],
  realized: ReadonlyMap<string, string>,
): string {
  const roles = new Map<string, Map<string, string>>();
  for (const entry of entries) {
    const parts = pathTail(entry.path, prefix).split(".");
    const role = parts[0];
    const prop = parts[1];
    if (role === undefined || prop === undefined) continue;
    const values = roles.get(role) ?? new Map<string, string>();
    values.set(prop, realized.get(entry.path) ?? "");
    roles.set(role, values);
  }
  return [...roles]
    .map(([role, values]) =>
      `| ${role} | ${values.get("size") ?? ""} | ${values.get("weight") ?? ""} | ${values.get("lineHeight") ?? ""} | ${mdEscape(values.get("family") ?? "")} |`,
    )
    .join("\n");
}

function hasMotion(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /(^|\.)duration(\.|$)|(^|\.)motion(\.|$)/);
}
