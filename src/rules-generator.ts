/**
 * rules.json — the consumer contract (FS-004, FS-012).
 *
 * Kept separate from contract.json on purpose: contract.json answers "is this
 * build valid?" for the producer, rules.json answers "did this screen honour
 * the system?" for the consumer. Different readers, different lifetimes — a
 * checker should not have to load gate codes to lint a stylesheet.
 *
 * Every rule's `appliesTo` is derived from the tokens actually present in the
 * build, so a rule can never point at a path this design system does not have.
 */
import { entriesFrom } from "./surface-data.js";
import type { LeafType, TokenGroup, TokensDocument } from "./tokens-schema.js";
import { computeTokenHash } from "./validator.js";

/**
 * `value` is implemented by the first checker. `nesting` and `selection` are
 * reserved so the schema does not have to change when they land — a checker
 * skips unknown kinds and reports how many it skipped (D-009).
 */
export const RULE_KINDS = ["value", "nesting", "selection"] as const;
export type RuleKind = (typeof RULE_KINDS)[number];

export const RULE_SEVERITIES = ["error", "warn"] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

export interface ComplianceRule {
  readonly id: string;
  readonly kind: RuleKind;
  readonly severity: RuleSeverity;
  /** Token path prefixes this rule governs, each present in this build. */
  readonly appliesTo: readonly string[];
  /** One line, addressed to whoever has to fix the violation. */
  readonly message: string;
}

export interface RulesDocument {
  readonly schemaVersion: string;
  readonly tokenHash: string;
  readonly rules: readonly ComplianceRule[];
}

const ROOTS = ["primitive", "semantic", "component"] as const;

interface LeafEntry {
  readonly path: string;
  readonly type: LeafType | undefined;
}

function allLeaves(doc: TokensDocument): readonly LeafEntry[] {
  const record = doc as unknown as Record<string, TokenGroup | undefined>;
  return ROOTS.flatMap((root) => {
    const tree = record[root];
    if (!tree) return [];
    return entriesFrom(tree, root).map((e) => ({
      path: e.path,
      type: e.leaf.$type as LeafType | undefined,
    }));
  });
}

/** Two-segment prefixes (e.g. `semantic.color`, `component.button`) holding a leaf of `type`. */
function prefixesFor(leaves: readonly LeafEntry[], type: LeafType): readonly string[] {
  const out = new Set<string>();
  for (const leaf of leaves) {
    if (leaf.type !== type) continue;
    const parts = leaf.path.split(".");
    if (parts.length >= 2) out.add(`${parts[0]}.${parts[1]}`);
  }
  return [...out].sort();
}

function rootPrefixes(leaves: readonly LeafEntry[]): readonly string[] {
  const out = new Set<string>();
  for (const leaf of leaves) {
    const parts = leaf.path.split(".");
    if (parts.length >= 2) out.add(`${parts[0]}.${parts[1]}`);
  }
  return [...out].sort();
}

/**
 * Builds the rule set for this document. Rules whose governed token type is
 * absent from the build are omitted rather than shipped pointing at nothing.
 */
export function buildRulesDocument(doc: TokensDocument): RulesDocument {
  const leaves = allLeaves(doc);
  const rules: ComplianceRule[] = [];

  const colour = prefixesFor(leaves, "color");
  if (colour.length > 0) {
    rules.push({
      id: "no-hardcoded-color",
      kind: "value",
      severity: "error",
      appliesTo: colour,
      message:
        "색을 리터럴(hex·rgb·hsl)로 쓰지 않습니다. 역할에 맞는 색 토큰을 참조하세요.",
    });
  }

  const dimension = prefixesFor(leaves, "dimension");
  if (dimension.length > 0) {
    rules.push({
      id: "no-hardcoded-dimension",
      kind: "value",
      severity: "error",
      appliesTo: dimension,
      message:
        "간격·크기·반경을 px·rem 리터럴로 쓰지 않습니다. 스케일 위의 토큰을 참조하세요.",
    });
  }

  const duration = prefixesFor(leaves, "duration");
  if (duration.length > 0) {
    rules.push({
      id: "no-hardcoded-duration",
      kind: "value",
      // warn, not error: the duration scale is intentionally small, so a
      // one-off timing is a smell worth surfacing but not worth blocking.
      severity: "warn",
      appliesTo: duration,
      message: "지속시간을 ms·s 리터럴로 쓰지 않습니다. 모션 토큰을 참조하세요.",
    });
  }

  const everything = rootPrefixes(leaves);
  if (everything.length > 0) {
    rules.push({
      id: "unknown-token-ref",
      kind: "value",
      severity: "error",
      appliesTo: everything,
      message:
        "이 디자인 시스템에 없는 토큰을 참조하고 있습니다. 오탈자이거나 토큰이 아직 없습니다.",
    });
  }

  const radius = prefixesFor(leaves, "dimension").filter((p) => p.endsWith(".radius"));
  if (radius.length > 0) {
    rules.push({
      id: "radius-nesting",
      // reserved kind — the first checker skips it (D-009)
      kind: "nesting",
      severity: "error",
      appliesTo: radius,
      message:
        "중첩된 요소의 모서리 반경은 바깥보다 작아야 합니다. 같거나 크면 두 경계가 서로를 밀어냅니다.",
    });
  }

  return { schemaVersion: doc.schemaVersion, tokenHash: computeTokenHash(doc), rules };
}

/** Serialized form written to out/rules.json — stable for byte-identical rebuilds. */
export function toRulesJson(doc: TokensDocument): string {
  return `${JSON.stringify(buildRulesDocument(doc), null, 2)}\n`;
}
