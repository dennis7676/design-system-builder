/**
 * compliance — does this code honour the design system? (FS-011, FS-012)
 *
 * Static analysis only, by design (D-005): no browser, no rendering, so the
 * same input always yields the same output and it runs in CI. The cost is
 * that styles composed at runtime are invisible here; that limit is stated
 * rather than hidden.
 *
 * Only `kind: "value"` rules are checked in this first pass. Rules of a
 * reserved kind are counted and reported as skipped — a silently ignored rule
 * would read as a passing check.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { parseColor } from "./color.js";
import { toRealizedWeb } from "./transformer.js";
import type { ComplianceRule, RulesDocument } from "./rules-generator.js";
import type { TokensDocument } from "./tokens-schema.js";

export const SCANNED_EXTENSIONS = [".css", ".tsx", ".jsx"] as const;

/** Generated surfaces are the system itself, not consumers of it. */
const GENERATED_FILENAMES = new Set([
  "tokens.css",
  "fonts.css",
  "tokens.ts",
  "fonts.video.ts",
]);

const SKIPPED_DIRECTORIES = new Set(["node_modules", ".git", "dist", "coverage", ".next"]);

export interface Violation {
  readonly file: string;
  readonly line: number;
  readonly ruleId: string;
  readonly severity: ComplianceRule["severity"];
  readonly found: string;
  /** Nearest token path, when one can be computed. */
  readonly suggestion: string | null;
  readonly message: string;
}

export interface ComplianceReport {
  readonly violations: readonly Violation[];
  readonly filesScanned: number;
  readonly rulesChecked: readonly string[];
  readonly rulesSkipped: readonly string[];
  readonly errorCount: number;
  readonly warnCount: number;
}

export function collectSourceFiles(root: string): readonly string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    let names: string[];
    try {
      names = readdirSync(dir).sort();
    } catch {
      return;
    }
    for (const name of names) {
      const full = join(dir, name);
      let isDir: boolean;
      try {
        isDir = statSync(full).isDirectory();
      } catch {
        continue;
      }
      if (isDir) {
        if (!SKIPPED_DIRECTORIES.has(name) && !name.startsWith(".")) walk(full);
        continue;
      }
      if (!SCANNED_EXTENSIONS.includes(extname(name) as (typeof SCANNED_EXTENSIONS)[number])) continue;
      if (GENERATED_FILENAMES.has(name)) continue;
      out.push(full);
    }
  };
  try {
    if (statSync(root).isDirectory()) walk(root);
    else if (SCANNED_EXTENSIONS.includes(extname(root) as (typeof SCANNED_EXTENSIONS)[number])) {
      out.push(root);
    }
  } catch {
    return [];
  }
  return out.sort();
}

// ── token index ───────────────────────────────────────────────────────────────

interface TokenIndex {
  /** CSS custom property name → token path. */
  readonly variables: ReadonlyMap<string, string>;
  readonly colors: readonly { path: string; value: string }[];
  readonly dimensions: readonly { path: string; rem: number }[];
  readonly durations: readonly { path: string; ms: number }[];
}

function buildTokenIndex(doc: TokensDocument): TokenIndex {
  const realized = toRealizedWeb(doc);
  const variables = new Map<string, string>();
  const colors: { path: string; value: string }[] = [];
  const dimensions: { path: string; rem: number }[] = [];
  const durations: { path: string; ms: number }[] = [];

  for (const [path, value] of realized) {
    variables.set(`--${path.replaceAll(".", "-")}`, path);
    if (parseColor(value)) colors.push({ path, value });
    const rem = /^(-?\d*\.?\d+)rem$/.exec(value);
    if (rem) dimensions.push({ path, rem: Number(rem[1]) });
    const ms = /^(-?\d*\.?\d+)ms$/.exec(value);
    if (ms) durations.push({ path, ms: Number(ms[1]) });
  }
  return { variables, colors, dimensions, durations };
}

// ── nearest-token suggestions ─────────────────────────────────────────────────

/**
 * Semantic first, then primitive, then component-scoped. When several tokens
 * hold the same value — which aliasing makes common — the one a consumer
 * should actually type is the role-named one, not a component's private copy.
 */
function tierRank(path: string): number {
  if (path.startsWith("semantic.")) return 0;
  if (path.startsWith("primitive.")) return 1;
  return 2;
}

function betterCandidate(
  next: { path: string; d: number },
  best: { path: string; d: number } | null,
): boolean {
  if (!best) return true;
  if (next.d !== best.d) return next.d < best.d;
  const rank = tierRank(next.path) - tierRank(best.path);
  return rank !== 0 ? rank < 0 : next.path < best.path;
}

/** hex stays as-is; rgb()/hsl() are converted so they can be compared too. */
export function colorLiteralToHex(literal: string): string | null {
  const s = literal.trim();
  if (s.startsWith("#")) return s;
  const nums = /^(rgba?|hsla?)\(([^)]*)\)$/i.exec(s);
  if (!nums) return null;
  const parts = (nums[2] ?? "")
    .split(/[\s,/]+/)
    .filter((p) => p.length > 0)
    .map((p) => Number(p.replace("%", "")));
  const [a, b, c] = parts;
  if (a === undefined || b === undefined || c === undefined) return null;
  if (!Number.isFinite(a) || !Number.isFinite(b) || !Number.isFinite(c)) return null;
  const hex = (n: number): string =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  if ((nums[1] ?? "").toLowerCase().startsWith("rgb")) return `#${hex(a)}${hex(b)}${hex(c)}`;
  // hsl → rgb
  const h = ((a % 360) + 360) % 360;
  const sat = b / 100;
  const light = c / 100;
  const k = (n: number): number => (n + h / 30) % 12;
  const chroma = sat * Math.min(light, 1 - light);
  const f = (n: number): number =>
    light - chroma * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${hex(f(0) * 255)}${hex(f(8) * 255)}${hex(f(4) * 255)}`;
}

function nearestColor(literal: string, index: TokenIndex): string | null {
  const hex = colorLiteralToHex(literal);
  const target = hex ? parseColor(hex) : null;
  if (!target) return null;
  let best: { path: string; d: number } | null = null;
  for (const token of index.colors) {
    const c = parseColor(token.value);
    if (!c) continue;
    const d = (c.r - target.r) ** 2 + (c.g - target.g) ** 2 + (c.b - target.b) ** 2;
    if (betterCandidate({ path: token.path, d }, best)) best = { path: token.path, d };
  }
  return best?.path ?? null;
}

function nearestNumeric(
  value: number,
  candidates: readonly { path: string; [k: string]: unknown }[],
  key: "rem" | "ms",
): string | null {
  let best: { path: string; d: number } | null = null;
  for (const c of candidates) {
    const d = Math.abs((c[key] as number) - value);
    if (betterCandidate({ path: c.path, d }, best)) best = { path: c.path, d };
  }
  return best?.path ?? null;
}

/** Levenshtein distance, used only to suggest a fix for a misspelled variable. */
function editDistance(a: string, b: string): number {
  let prev: number[] = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const cur: number[] = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const deletion = (prev[j] ?? 0) + 1;
      const insertion = (cur[j - 1] ?? 0) + 1;
      const substitution = (prev[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1);
      cur[j] = Math.min(deletion, insertion, substitution);
    }
    prev = cur;
  }
  return prev[b.length] ?? 0;
}

function nearestVariable(name: string, index: TokenIndex): string | null {
  let best: { path: string; d: number } | null = null;
  for (const [variable, path] of index.variables) {
    const d = editDistance(name, variable);
    if (betterCandidate({ path, d }, best)) best = { path, d };
  }
  // beyond this the "suggestion" is noise, not help
  return best && best.d <= Math.max(4, Math.floor(name.length / 2)) ? best.path : null;
}

// ── scanning ──────────────────────────────────────────────────────────────────

const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g;
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?)\([^)]*\)/g;
const DIMENSION = /(?<![\w.#-])(\d+(?:\.\d+)?)(px|rem)\b/g;
const DURATION = /(?<![\w.#-])(\d+(?:\.\d+)?)(ms|s)\b/g;
const CSS_VAR = /var\(\s*(--[\w-]+)/g;

/** Comment-only lines, so a commented-out example is not a violation. */
function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return t.startsWith("//") || t.startsWith("/*") || t.startsWith("*");
}

function checkLine(
  line: string,
  file: string,
  lineNo: number,
  byId: ReadonlyMap<string, ComplianceRule>,
  index: TokenIndex,
  out: Violation[],
): void {
  if (isCommentLine(line)) return;

  const colourRule = byId.get("no-hardcoded-color");
  if (colourRule) {
    for (const re of [HEX, FUNCTIONAL_COLOR]) {
      re.lastIndex = 0;
      for (const m of line.matchAll(re)) {
        out.push({
          file,
          line: lineNo,
          ruleId: colourRule.id,
          severity: colourRule.severity,
          found: m[0],
          suggestion: nearestColor(m[0], index),
          message: colourRule.message,
        });
      }
    }
  }

  const dimensionRule = byId.get("no-hardcoded-dimension");
  if (dimensionRule) {
    DIMENSION.lastIndex = 0;
    for (const m of line.matchAll(DIMENSION)) {
      const raw = Number(m[1]);
      if (raw === 0) continue;
      const rem = m[2] === "rem" ? raw : raw / 16;
      out.push({
        file,
        line: lineNo,
        ruleId: dimensionRule.id,
        severity: dimensionRule.severity,
        found: m[0],
        suggestion: nearestNumeric(rem, index.dimensions, "rem"),
        message: dimensionRule.message,
      });
    }
  }

  const durationRule = byId.get("no-hardcoded-duration");
  if (durationRule) {
    DURATION.lastIndex = 0;
    for (const m of line.matchAll(DURATION)) {
      const raw = Number(m[1]);
      if (raw === 0) continue;
      const ms = m[2] === "s" ? raw * 1000 : raw;
      out.push({
        file,
        line: lineNo,
        ruleId: durationRule.id,
        severity: durationRule.severity,
        found: m[0],
        suggestion: nearestNumeric(ms, index.durations, "ms"),
        message: durationRule.message,
      });
    }
  }

  const unknownRule = byId.get("unknown-token-ref");
  if (unknownRule) {
    CSS_VAR.lastIndex = 0;
    for (const m of line.matchAll(CSS_VAR)) {
      const name = m[1];
      if (!name || index.variables.has(name)) continue;
      out.push({
        file,
        line: lineNo,
        ruleId: unknownRule.id,
        severity: unknownRule.severity,
        found: name,
        suggestion: nearestVariable(name, index),
        message: unknownRule.message,
      });
    }
  }
}

export function runCompliance(
  root: string,
  rulesDoc: RulesDocument,
  doc: TokensDocument,
): ComplianceReport {
  const index = buildTokenIndex(doc);
  const checked = rulesDoc.rules.filter((r) => r.kind === "value");
  const skipped = rulesDoc.rules.filter((r) => r.kind !== "value");
  const byId = new Map(checked.map((r) => [r.id, r]));

  const files = collectSourceFiles(root);
  const violations: Violation[] = [];
  for (const file of files) {
    const display = relative(root, file) || basename(file);
    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, i) => checkLine(line, display, i + 1, byId, index, violations));
  }

  violations.sort(
    (a, b) =>
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.ruleId.localeCompare(b.ruleId) ||
      a.found.localeCompare(b.found),
  );

  return {
    violations,
    filesScanned: files.length,
    rulesChecked: checked.map((r) => r.id),
    rulesSkipped: skipped.map((r) => r.id),
    errorCount: violations.filter((v) => v.severity === "error").length,
    warnCount: violations.filter((v) => v.severity === "warn").length,
  };
}

/** Human-readable report. Deterministic for identical input. */
export function formatComplianceReport(report: ComplianceReport): string {
  const lines: string[] = [];
  for (const v of report.violations) {
    const mark = v.severity === "error" ? "✗" : "!";
    const fix = v.suggestion ? ` → ${v.suggestion}` : "";
    lines.push(`${mark} ${v.file}:${v.line} [${v.ruleId}] ${v.found}${fix}`);
  }
  if (lines.length === 0) lines.push("위반 없음");
  lines.push("");
  lines.push(
    `파일 ${report.filesScanned}개 · 규칙 ${report.rulesChecked.length}개 검사` +
      (report.rulesSkipped.length > 0
        ? ` · ${report.rulesSkipped.length}개 미구현 kind로 건너뜀 (${report.rulesSkipped.join(", ")})`
        : ""),
  );
  lines.push(`error ${report.errorCount} · warn ${report.warnCount}`);
  return lines.join("\n");
}
