/**
 * Deterministic export gate (design §3.4, d5).
 *
 * Validates tokens.json (intent SSOT). Surface-dependent gates (drift, surface
 * completeness, motion-reduce presence) live in manifest.ts / generators — this
 * module covers the tokens.json-only gates.
 */
import { createHash } from "node:crypto";
import {
  type TokensDocument,
  type LeafToken,
  type TokenNode,
  type ContrastPair,
  type DimensionUnit,
  isLeaf,
  isAlias,
  isDimensionIntent,
  aliasPath,
  INTENT_SUBTREE_KEYS,
  MIN_RATIO,
} from "./tokens-schema.js";
import { contrastRatio } from "./color.js";

export type Severity = "error" | "warn" | "info";

export interface Finding {
  severity: Severity;
  code: string;
  path?: string;
  message: string;
  meta?: Record<string, unknown>;
}

export interface ValidationResult {
  ok: boolean; // true when no error-level findings
  tokenHash: string;
  findings: Finding[];
}

const VALID_UNITS: DimensionUnit[] = ["abstract", "px-base", "ms"];
/** Core categories whose tokens must each be covered by a decisionTrace (G-trace). */
const CORE_CATEGORIES: Record<string, RegExp> = {
  color: /(^|\.)color(\.|$)/,
  typography: /(^|\.)(font|typography)(\.|$)/,
  spacing: /(^|\.)space(\.|$)/,
  shape: /(^|\.)(radius|shape)(\.|$)/,
  motion: /(^|\.)(duration|motion)(\.|$)/,
};
/** Physical-value patterns that must not appear in intent rationale (C1 leak / G22). */
const PHYSICAL_VALUE = /\b\d+(?:\.\d+)?\s?(px|rem|em|ms|s)\b|#[0-9a-fA-F]{3,8}\b/;

// ── flatten ──────────────────────────────────────────────────────────────────

export function flatten(tree: Record<string, TokenNode>, prefix = ""): Map<string, LeafToken> {
  const out = new Map<string, LeafToken>();
  for (const [key, node] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (isLeaf(node)) out.set(path, node);
    else for (const [p, leaf] of flatten(node, path)) out.set(p, leaf);
  }
  return out;
}

/** All intent token leaves (primitive + semantic + component). */
function allLeaves(doc: TokensDocument): Map<string, LeafToken> {
  return new Map([
    ...flatten(doc.primitive, "primitive"),
    ...flatten(doc.semantic, "semantic"),
    ...flatten(doc.component, "component"),
  ]);
}

// ── canonical tokenHash (intent subtree only — excludes meta; d5) ─────────────

/** Stable JSON: object keys sorted recursively. Arrays keep order. */
function canonical(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return `{${keys
    .map((k) => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`)
    .join(",")}}`;
}

/** SHA-256 over the INTENT subtree only (meta excluded → non-circular). */
export function computeTokenHash(doc: TokensDocument): string {
  const subtree: Record<string, unknown> = {};
  const docRec = doc as unknown as Record<string, unknown>;
  for (const k of INTENT_SUBTREE_KEYS) subtree[k] = docRec[k];
  return "sha256:" + createHash("sha256").update(canonical(subtree)).digest("hex");
}

// ── alias resolution + cycle detection ────────────────────────────────────────

interface AliasResolution {
  /** terminal (non-alias) leaf, or null if unresolved. */
  resolved: LeafToken | null;
  error?: Finding;
}

function resolveAlias(
  start: string,
  leaves: Map<string, LeafToken>,
): AliasResolution {
  const seen = new Set<string>();
  let path = start;
  // walk the alias chain
  for (;;) {
    const leaf = leaves.get(path);
    if (!leaf) {
      return {
        resolved: null,
        error: { severity: "error", code: "alias-unresolved", path: start, message: `참조 대상 없음: ${path}` },
      };
    }
    if (!isAlias(leaf.$value)) return { resolved: leaf };
    const next = aliasPath(leaf.$value as string);
    if (seen.has(path)) {
      return {
        resolved: null,
        error: { severity: "error", code: "alias-cycle", path: start, message: `순환 alias: ${[...seen, path].join(" → ")}` },
      };
    }
    seen.add(path);
    path = next;
  }
}

// ── main validate ─────────────────────────────────────────────────────────────

export function validateTokens(doc: TokensDocument): ValidationResult {
  const findings: Finding[] = [];
  const leaves = allLeaves(doc);
  const referenced = new Set<string>();

  // 1. $class coverage + type/unit + alias resolution
  for (const [path, leaf] of leaves) {
    if (!leaf.$class) {
      findings.push({ severity: "error", code: "class-missing", path, message: "$class 누락" });
    } else if (
      leaf.$class !== "portable" &&
      leaf.$class !== "adapter-derived" &&
      !leaf.$class.startsWith("target-only:")
    ) {
      findings.push({ severity: "error", code: "class-invalid", path, message: `$class 미허용: ${leaf.$class}` });
    }

    if (isAlias(leaf.$value)) {
      const target = aliasPath(leaf.$value as string);
      referenced.add(target);
      const res = resolveAlias(path, leaves);
      if (res.error) findings.push(res.error);
      else if (res.resolved && res.resolved.$type !== leaf.$type) {
        findings.push({
          severity: "error",
          code: "alias-type",
          path,
          message: `alias 타입 불일치: ${leaf.$type} ← ${res.resolved.$type} (${target})`,
        });
      }
    } else if ((leaf.$type === "dimension" || leaf.$type === "duration")) {
      if (!isDimensionIntent(leaf.$value)) {
        findings.push({ severity: "error", code: "unit-invalid", path, message: `dimension은 {value,unit} 정규형이어야 함 (받음: ${JSON.stringify(leaf.$value)})` });
      } else if (!VALID_UNITS.includes(leaf.$value.unit)) {
        findings.push({ severity: "error", code: "unit-invalid", path, message: `미허용 unit: ${leaf.$value.unit}` });
      }
    }
  }

  // 2. orphan tokens — only primitives. semantic/component leaves are the public
  //    API consumed directly by surfaces (styleguide/DESIGN.md), so "unreferenced
  //    by another token" is expected for them, not an orphan.
  for (const [path, leaf] of leaves) {
    if (!path.startsWith("primitive.")) continue;
    if (leaf.$class?.startsWith("target-only:")) continue;
    if (!referenced.has(path)) {
      findings.push({ severity: "warn", code: "orphan-token", path, message: "어디서도 참조되지 않음" });
    }
  }

  // 3. WCAG contrast over contrastPairs + foreground pairing
  checkContrast(doc, leaves, findings);

  // 4. G-trace coverage
  checkTraceCoverage(doc, leaves, findings);

  // 5. intent-leak (G22) — physical values in rationale/decisionTrace
  checkIntentLeak(doc, findings);

  const ok = !findings.some((f) => f.severity === "error");
  return { ok, tokenHash: computeTokenHash(doc), findings };
}

function colorValueOf(path: string, leaves: Map<string, LeafToken>): string | null {
  const res = resolveAlias(path, leaves);
  if (!res.resolved) return null;
  const v = res.resolved.$value;
  return typeof v === "string" ? v : null;
}

function checkContrast(
  doc: TokensDocument,
  leaves: Map<string, LeafToken>,
  findings: Finding[],
): void {
  for (const pair of doc.contrastPairs) {
    const min = pair.minRatio ?? MIN_RATIO[pair.role];
    const fg = colorValueOf(pair.fg, leaves);
    const bg = colorValueOf(pair.bg, leaves);
    if (fg === null || bg === null) {
      findings.push({ severity: "error", code: "contrast-unresolved", message: `contrastPair 색 미해소: ${pair.fg} / ${pair.bg}` });
      continue;
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) {
      findings.push({ severity: "error", code: "contrast-unparseable", message: `색 파싱 실패: ${fg} / ${bg}` });
      continue;
    }
    if (ratio < min) {
      findings.push({
        severity: "error",
        code: "contrast-fail",
        message: `대비 미달 ${ratio.toFixed(2)}:1 < ${min}:1 (${pair.fg} on ${pair.bg}, ${pair.role}/${pair.state})`,
        meta: { ratio: Number(ratio.toFixed(2)), required: min, role: pair.role, state: pair.state },
      });
    }
  }

  // foreground pairing: every semantic.color group with a non-foreground bg role
  // that appears as a `bg` in contrastPairs must have a foreground partner.
  const pairBgRoles = new Set(doc.contrastPairs.map((p) => p.bg));
  for (const bg of pairBgRoles) {
    if (bg.endsWith(".foreground")) continue;
    const group = bg.replace(/\.[^.]+$/, "");
    const hasForeground = leaves.has(`${group}.foreground`);
    const hasPair = doc.contrastPairs.some((p) => p.bg === bg);
    if (!hasForeground && !hasPair) {
      findings.push({ severity: "error", code: "foreground-missing", path: bg, message: `${group}에 foreground 대응 없음` });
    }
  }
}

function matchesGlob(glob: string, path: string): boolean {
  // simple glob: "*" matches any run of non-empty chars within a segment context
  const re = new RegExp("^" + glob.split("*").map(escapeRe).join(".*") + "$");
  return re.test(path);
}
const escapeRe = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&");

function checkTraceCoverage(
  doc: TokensDocument,
  leaves: Map<string, LeafToken>,
  findings: Finding[],
): void {
  const traces = doc.meta.philosophy.decisionTrace ?? [];
  const allCovered = traces.flatMap((t) => t.coversTokenPath);

  for (const [category, re] of Object.entries(CORE_CATEGORIES)) {
    // does the token tree contain this category at all?
    const present = [...leaves.keys()].some((p) => re.test(p));
    if (!present) continue; // motion etc. is conditional — absent = N/A
    // is at least one covered path in this category?
    const covered = allCovered.some((glob) =>
      [...leaves.keys()].some((p) => re.test(p) && matchesGlob(glob, p)),
    );
    if (!covered) {
      findings.push({
        severity: "error",
        code: "trace-coverage",
        message: `decisionTrace가 '${category}' 카테고리 토큰을 커버하지 않음 (coversTokenPath)`,
        meta: { category },
      });
    }
  }
}

function checkIntentLeak(doc: TokensDocument, findings: Finding[]): void {
  const ph = doc.meta.philosophy;
  const probes: Array<[string, string]> = [["rationale", ph.rationale]];
  ph.decisionTrace?.forEach((t, i) => probes.push([`decisionTrace[${i}].rationale`, t.rationale]));
  for (const [where, text] of probes) {
    if (text && PHYSICAL_VALUE.test(text)) {
      findings.push({
        severity: "warn",
        code: "intent-leak",
        path: `meta.philosophy.${where}`,
        message: `물리값(px/ms/hex)이 intent 서술에 포함됨 — C1 leak 후보`,
      });
    }
  }
}
