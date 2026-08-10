/**
 * Component spec source — FS-001 (docs/spec/spec.md).
 *
 * Identity prose for each component lives in `references/components/*.json`,
 * authored once and recipe-independent: a recipe decides what a button *looks*
 * like (radius, padding, motion) but not what a button *is* or how it differs
 * from a link. Recipe-specific exceptions arrive later as deltas (FS-002).
 *
 * Prose deliberately stays out of `tokens.json`: `computeTokenHash` covers the
 * `component` subtree (tokens-schema.ts INTENT_SUBTREE_KEYS), so a typo fix in
 * a sentence would move the hash and muddy the reproducibility seal.
 */
import { readFileSync, readdirSync } from "node:fs";
import {
  COMPONENT_P1_REGISTRY,
  COMPONENT_STATES,
  componentCompositeNames,
  componentPatternNames,
  componentPrimitiveNames,
  type ComponentPrimitiveDefinition,
} from "./component-registry.js";
import { entriesFrom } from "./surface-data.js";
import type { TokenGroup, TokensDocument } from "./tokens-schema.js";
import { computeTokenHash, type Finding } from "./validator.js";

/** Fields a human must author. Missing value requires a `_deferred` reason. */
export const SPEC_REQUIRED_FIELDS = [
  "purpose.what",
  "useWhen",
  "dontUseWhen",
  "vsPartner",
] as const;

/** Fields that may be absent without a reason. */
export const SPEC_OPTIONAL_FIELDS = ["purpose.why", "anatomy", "designRules"] as const;

export type SpecRequiredField = (typeof SPEC_REQUIRED_FIELDS)[number];

export interface VsPartnerRef {
  /** Component name that exists in the registry. */
  readonly key: string;
  /** One line: when to reach for that one instead. */
  readonly note: string;
}

export interface ComponentSpecPurpose {
  readonly what: string | null;
  readonly why?: string | null;
}

export interface ComponentSpecSource {
  readonly name: string;
  readonly purpose: ComponentSpecPurpose;
  readonly useWhen: string | null;
  readonly dontUseWhen: string | null;
  readonly vsPartner: readonly VsPartnerRef[] | null;
  readonly anatomy?: string | null;
  readonly designRules?: readonly string[] | null;
  /** field path → why it is intentionally empty. Blank reasons are rejected. */
  readonly _deferred?: Readonly<Record<string, string>>;
}

export interface ComponentSpecLoad {
  readonly specs: readonly ComponentSpecSource[];
  readonly findings: readonly Finding[];
}

/** Every component the registry rolls out, in rollout order. */
export function registryComponentNames(): readonly string[] {
  return [...componentPrimitiveNames(), ...componentCompositeNames(), ...componentPatternNames()];
}

function fieldValue(spec: ComponentSpecSource, field: SpecRequiredField): unknown {
  if (field === "purpose.what") return spec.purpose?.what ?? null;
  if (field === "useWhen") return spec.useWhen ?? null;
  if (field === "dontUseWhen") return spec.dontUseWhen ?? null;
  return spec.vsPartner ?? null;
}

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/**
 * Reads every spec file in `dir` and checks it against the registry.
 * Findings are returned, never thrown — the gate (FS-009) decides what blocks.
 */
export function loadComponentSpecs(dir: string): ComponentSpecLoad {
  const findings: Finding[] = [];
  const expected = registryComponentNames();
  const expectedSet = new Set(expected);

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch (error) {
    findings.push({
      severity: "error",
      code: "spec-dir-unreadable",
      message: `component spec directory unreadable: ${dir}`,
      meta: { error: error instanceof Error ? error.message : String(error) },
    });
    return { specs: [], findings };
  }

  const byName = new Map<string, ComponentSpecSource>();
  for (const file of files.sort()) {
    const name = file.replace(/\.json$/, "");
    let parsed: ComponentSpecSource;
    try {
      parsed = JSON.parse(readFileSync(`${dir}/${file}`, "utf8")) as ComponentSpecSource;
    } catch (error) {
      findings.push({
        severity: "error",
        code: "spec-unparseable",
        path: name,
        message: `${file}: not valid JSON`,
        meta: { error: error instanceof Error ? error.message : String(error) },
      });
      continue;
    }
    if (!expectedSet.has(name)) {
      findings.push({
        severity: "error",
        code: "spec-unknown-component",
        path: name,
        message: `${file}: no component named "${name}" in the registry`,
      });
      continue;
    }
    if (parsed.name !== name) {
      findings.push({
        severity: "error",
        code: "spec-name-mismatch",
        path: name,
        message: `${file}: name field is "${parsed.name}", expected "${name}"`,
      });
    }
    byName.set(name, { ...parsed, name });
  }

  for (const name of expected) {
    if (!byName.has(name)) {
      findings.push({
        severity: "error",
        code: "spec-missing",
        path: name,
        message: `no spec file for registry component "${name}" (expected ${name}.json)`,
      });
    }
  }

  for (const name of expected) {
    const spec = byName.get(name);
    if (!spec) continue;
    checkRequiredFields(spec, findings);
    checkVsPartner(spec, expectedSet, findings);
    checkDeferredKeys(spec, findings);
  }

  const specs = expected.map((n) => byName.get(n)).filter((s): s is ComponentSpecSource => !!s);
  return { specs, findings };
}

function checkRequiredFields(spec: ComponentSpecSource, findings: Finding[]): void {
  for (const field of SPEC_REQUIRED_FIELDS) {
    if (isFilled(fieldValue(spec, field))) continue;
    const reason = spec._deferred?.[field];
    if (reason === undefined) {
      findings.push({
        severity: "error",
        code: "spec-required-missing",
        path: `${spec.name}.${field}`,
        message: `${spec.name}: required field "${field}" is empty and not declared in _deferred`,
      });
    } else if (reason.trim().length === 0) {
      findings.push({
        severity: "error",
        code: "spec-deferred-blank",
        path: `${spec.name}.${field}`,
        message: `${spec.name}: _deferred["${field}"] has no reason`,
      });
    } else {
      findings.push({
        severity: "warn",
        code: "spec-deferred",
        path: `${spec.name}.${field}`,
        message: `${spec.name}.${field} deferred: ${reason}`,
        meta: { reason },
      });
    }
  }
}

function checkVsPartner(
  spec: ComponentSpecSource,
  known: ReadonlySet<string>,
  findings: Finding[],
): void {
  if (!Array.isArray(spec.vsPartner)) return;
  spec.vsPartner.forEach((ref, i) => {
    const at = `${spec.name}.vsPartner[${i}]`;
    if (typeof ref?.key !== "string" || typeof ref?.note !== "string") {
      findings.push({
        severity: "error",
        code: "spec-vspartner-shape",
        path: at,
        message: `${at}: expected { key, note } with string values`,
      });
      return;
    }
    if (ref.key === spec.name) {
      findings.push({
        severity: "error",
        code: "spec-vspartner-self",
        path: at,
        message: `${at}: a component cannot be its own alternative`,
      });
      return;
    }
    if (!known.has(ref.key)) {
      findings.push({
        severity: "error",
        code: "spec-vspartner-unknown",
        path: at,
        message: `${at}: "${ref.key}" is not a registry component`,
      });
    }
    if (ref.note.trim().length === 0) {
      findings.push({
        severity: "error",
        code: "spec-vspartner-blank-note",
        path: at,
        message: `${at}: note is empty — say when to use "${ref.key}" instead`,
      });
    }
  });
}

/** A `_deferred` key must name a field that is actually deferrable and empty. */
function checkDeferredKeys(spec: ComponentSpecSource, findings: Finding[]): void {
  const deferrable = new Set<string>([...SPEC_REQUIRED_FIELDS, ...SPEC_OPTIONAL_FIELDS]);
  for (const key of Object.keys(spec._deferred ?? {})) {
    if (!deferrable.has(key)) {
      findings.push({
        severity: "error",
        code: "spec-deferred-unknown-field",
        path: `${spec.name}._deferred.${key}`,
        message: `${spec.name}: _deferred names "${key}", which is not a spec field`,
      });
    }
  }
}

export interface SpecCoverage {
  readonly field: string;
  readonly filled: number;
  readonly total: number;
  readonly deferred: readonly string[];
}

/**
 * Per-field coverage across all specs. Always reported, including at 100% —
 * a number that only appears when it is bad teaches people to ignore it.
 */
export type ComponentTier = "primitive" | "composite" | "pattern";

export interface ComponentEntry {
  readonly name: string;
  readonly tier: ComponentTier;
  readonly purpose: ComponentSpecPurpose;
  readonly useWhen: string | null;
  readonly dontUseWhen: string | null;
  readonly vsPartner: readonly VsPartnerRef[];
  readonly anatomy: string | null;
  readonly designRules: readonly string[];
  readonly _deferred?: Readonly<Record<string, string>>;
  /** Registry-derived, deterministic — never authored by hand. */
  readonly variants: readonly string[];
  readonly states: readonly string[];
  readonly baseProperties: readonly string[];
  readonly stateProperties: readonly string[];
  /** Token paths this component actually realizes in this build (FS-008 anchors). */
  readonly tokenPaths: readonly string[];
}

export interface ComponentsDocument {
  readonly schemaVersion: string;
  readonly tokenHash: string;
  readonly components: Readonly<Record<string, ComponentEntry>>;
}

function tierOf(name: string): ComponentTier {
  if (componentPrimitiveNames().includes(name)) return "primitive";
  if (componentCompositeNames().includes(name)) return "composite";
  return "pattern";
}

/** Token paths under `component.<name>.` that exist in this build. */
function realizedPaths(doc: TokensDocument, name: string): readonly string[] {
  const tree = (doc as unknown as { component?: TokenGroup }).component;
  if (!tree) return [];
  const prefix = `component.${name}.`;
  return entriesFrom(tree, "component")
    .map((e) => e.path)
    .filter((p) => p.startsWith(prefix))
    .sort();
}

/**
 * Merges authored prose (FS-001) with registry-derived facts into the
 * consumer-facing document. The `tokenHash` ties it to the exact tokens.json
 * of the same build — a surface carrying a stale hash is a manifest error.
 */
export function buildComponentsDocument(
  doc: TokensDocument,
  specs: readonly ComponentSpecSource[],
): ComponentsDocument {
  const primitives = new Map<string, ComponentPrimitiveDefinition>(
    COMPONENT_P1_REGISTRY.map((d) => [d.name, d]),
  );
  const components: Record<string, ComponentEntry> = {};

  for (const spec of specs) {
    const primitive = primitives.get(spec.name);
    const entry: ComponentEntry = {
      name: spec.name,
      tier: tierOf(spec.name),
      purpose: { what: spec.purpose?.what ?? null, why: spec.purpose?.why ?? null },
      useWhen: spec.useWhen ?? null,
      dontUseWhen: spec.dontUseWhen ?? null,
      vsPartner: spec.vsPartner ?? [],
      anatomy: spec.anatomy ?? null,
      designRules: spec.designRules ?? [],
      ...(spec._deferred ? { _deferred: spec._deferred } : {}),
      variants: primitive?.variants ?? [],
      states: primitive?.stateProperties ? [...COMPONENT_STATES] : [],
      baseProperties: primitive?.baseProperties ?? [],
      stateProperties: primitive?.stateProperties ?? [],
      tokenPaths: realizedPaths(doc, spec.name),
    };
    components[spec.name] = entry;
  }

  return {
    schemaVersion: doc.schemaVersion,
    tokenHash: computeTokenHash(doc),
    components,
  };
}

/** Serialized form written to out/components.json — stable for byte-identical rebuilds. */
export function toComponentsJson(
  doc: TokensDocument,
  specs: readonly ComponentSpecSource[],
): string {
  return `${JSON.stringify(buildComponentsDocument(doc, specs), null, 2)}\n`;
}

export function specCoverage(specs: readonly ComponentSpecSource[]): readonly SpecCoverage[] {
  return SPEC_REQUIRED_FIELDS.map((field) => {
    const deferred: string[] = [];
    let filled = 0;
    for (const spec of specs) {
      if (isFilled(fieldValue(spec, field))) filled += 1;
      else if (spec._deferred?.[field]) deferred.push(spec.name);
    }
    return { field, filled, total: specs.length, deferred };
  });
}
