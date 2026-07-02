/**
 * tokens.json schema — intent-only SSOT (design spec §3.3, d5).
 *
 * Invariants:
 *  - tokens.json stores INTENT only: no realized/media values (CSS rem, ms strings, etc.).
 *    Realized values are produced by adapters (transformer.ts) and are NOT the SSOT.
 *  - Every leaf carries `$class` ∈ {portable, adapter-derived, target-only:<target>}.
 *  - dimensions are normalized to { value, unit } — never CSS unit strings like "8px".
 *  - The drift `tokenHash` is computed over the INTENT subtree only (excludes `meta`).
 */

/** Token classes — the portability seam the validator enforces (design §3.3). */
export type TokenClass = "portable" | "adapter-derived" | `target-only:${string}`;

/** Dimension intent unit (design §3.3 — CSS unit strings are realized-only). */
export type DimensionUnit = "abstract" | "px-base" | "ms";

export interface DimensionIntent {
  value: number;
  unit: DimensionUnit;
}

/** A reference to another token, written as "{path.to.token}". */
export type AliasValue = string;

/** A gradient intent — realized to a CSS `linear-gradient()`/`radial-gradient()`.
 * `stops` are concrete colour strings (oklch/hex); the validator reads them for
 * the worst-case-stop contrast gate. */
export interface GradientValue {
  kind: "linear" | "radial";
  /** linear only, e.g. "160deg"; defaults to "180deg" when omitted. */
  angle?: string;
  stops: string[];
}

export type LeafType =
  | "color"
  | "dimension"
  | "duration"
  | "fontFamily"
  | "fontWeight"
  | "number"
  | "shadow"
  | "gradient"
  | "cubicBezier";

/**
 * A leaf token. `$value` is either a concrete intent value or an alias "{...}".
 *  - color   → oklch/hex string (intent color space)
 *  - dimension/duration → DimensionIntent
 *  - fontFamily → string[] (portable)
 *  - alias   → "{semantic.color.primary.default}"
 */
export interface LeafToken {
  $type: LeafType;
  $value: string | number | string[] | DimensionIntent | AliasValue | GradientValue;
  $class: TokenClass;
  $description?: string;
}

/** A token node is either a leaf or a nested group. */
export type TokenNode = LeafToken | TokenGroup;
export interface TokenGroup {
  [key: string]: TokenNode;
}

export function isLeaf(node: TokenNode): node is LeafToken {
  return (
    typeof node === "object" &&
    node !== null &&
    "$value" in node &&
    "$type" in node
  );
}

export function isDimensionIntent(v: unknown): v is DimensionIntent {
  return (
    typeof v === "object" &&
    v !== null &&
    "value" in v &&
    "unit" in v &&
    typeof (v as DimensionIntent).value === "number"
  );
}

/** Is `$value` a structured gradient intent. */
export function isGradientValue(v: unknown): v is GradientValue {
  return (
    typeof v === "object" &&
    v !== null &&
    "stops" in v &&
    Array.isArray((v as GradientValue).stops) &&
    "kind" in v
  );
}

/** Is `$value` an alias reference like "{a.b.c}". */
export function isAlias(v: unknown): v is AliasValue {
  return typeof v === "string" && /^\{[^}]+\}$/.test(v);
}

/** Extract the dotted path from an alias value "{a.b.c}" → "a.b.c". */
export function aliasPath(v: AliasValue): string {
  return v.slice(1, -1);
}

// ── WCAG contrastPairs registry (design §3.3, codex Critical 4) ──────────────

export type ContrastRole = "text" | "large-text" | "non-text";
export type ContrastState =
  | "default"
  | "hover"
  | "focus"
  | "active"
  | "disabled";

export interface ContrastPair {
  /** alias path or token path of the foreground color */
  fg: string;
  /** alias path or token path of the background color */
  bg: string;
  role: ContrastRole;
  state: ContrastState;
  /** minimum ratio; if omitted, derived from role via MIN_RATIO. */
  minRatio?: number;
}

/** WCAG 2.x minimum ratios by role (design §3.3 / §3.4). */
export const MIN_RATIO: Record<ContrastRole, number> = {
  text: 4.5,
  "large-text": 3,
  "non-text": 3,
};

// ── meta (intent metadata only; NO drift hash stored here — d5) ──────────────

export interface DecisionTraceEntry {
  axis: string;
  value: number | string;
  /** intent vocabulary only — no physical values (px/ms/hex). */
  rationale: string;
  /** token paths (glob allowed) this decision covers — G-trace machine check. */
  coversTokenPath: string[];
}

export interface Philosophy {
  principles: string[];
  rationale: string;
  decisionTrace: DecisionTraceEntry[];
}

export interface TransformContract {
  dimension?: { web?: { base: number; unit: "rem" | "px" } };
  duration?: { web?: "ms" };
  color?: { web?: "oklch" | "hex" };
}

export interface ColorOverrideCorrection {
  readonly path: string;
  readonly from: string;
  readonly to: string;
  readonly pair: string;
}

export interface ColorOverrideMeta {
  readonly requestedHue: number;
  readonly delta: number;
  readonly corrections: readonly ColorOverrideCorrection[];
}

export interface TokensMeta {
  generatedAt: string;
  recipe: string;
  toneVector: Record<string, number>;
  requiredTargets: string[];
  philosophy: Philosophy;
  typeScale: {
    ratio: number;
    anchors: {
      caption: number;
      body: number;
      heading: number;
      display: number;
    };
  };
  /**
   * Expression dial echoed from brand.json (present only when the brand set
   * it). Meta is excluded from the intent tokenHash, so this never moves the
   * R1 keystone or any recipe hash. Consumers resolve absent ⇒ "balanced".
   */
  expression?: "safe" | "balanced" | "bold";
  /**
   * Content locales echoed from brand.json (present only when set). Meta is
   * hash-excluded; generators use it for script-conditional rendering rules.
   */
  locales?: string[];
  colorOverride?: ColorOverrideMeta;
}

export interface TokensDocument {
  version: string;
  schemaVersion: string;
  meta: TokensMeta;
  transformContract: TransformContract;
  contrastPairs: ContrastPair[];
  primitive: TokenGroup;
  semantic: TokenGroup;
  component: TokenGroup;
}

/**
 * Keys of TokensDocument that form the INTENT subtree the drift `tokenHash`
 * is computed over. `meta` is deliberately excluded so the hash is non-circular
 * (changing generatedAt must not change tokenHash) — d5.
 */
export const INTENT_SUBTREE_KEYS = [
  "primitive",
  "semantic",
  "component",
  "transformContract",
  "contrastPairs",
] as const;
