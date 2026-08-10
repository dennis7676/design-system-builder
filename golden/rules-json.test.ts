/**
 * Golden — rules.json, the consumer contract.
 *
 * verifies: FS-004 (rules.json generation), FS-012 (reserved rule kinds)
 *
 * Every rule points at token path prefixes that exist in the build it was
 * generated from. A rule that governs nothing is worse than no rule: it reads
 * as coverage while checking air.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  RULE_KINDS,
  RULE_SEVERITIES,
  buildRulesDocument,
  toRulesJson,
  type RulesDocument,
} from "../src/rules-generator.js";
import { entriesFrom } from "../src/surface-data.js";
import { computeTokenHash } from "../src/validator.js";
import type { TokenGroup, TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const DOC = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const BUILT = buildRulesDocument(DOC);

/** Every token path in the document, for existence checks. */
const ALL_PATHS: readonly string[] = ["primitive", "semantic", "component"].flatMap((root) => {
  const tree = (DOC as unknown as Record<string, TokenGroup | undefined>)[root];
  return tree ? entriesFrom(tree, root).map((e) => e.path) : [];
});

const rule = (id: string) => BUILT.rules.find((r) => r.id === id);

describe("rules.json shape", () => {
  it("stamps the tokenHash of the same build", () => {
    expect(BUILT.tokenHash).toBe(computeTokenHash(DOC));
  });

  it("gives every rule the five required fields", () => {
    for (const r of BUILT.rules) {
      expect(typeof r.id, r.id).toBe("string");
      expect(RULE_KINDS, r.id).toContain(r.kind);
      expect(RULE_SEVERITIES, r.id).toContain(r.severity);
      expect(Array.isArray(r.appliesTo), r.id).toBe(true);
      expect(r.message.trim().length, r.id).toBeGreaterThan(0);
    }
  });

  it("allows only error and warn as severities", () => {
    expect([...RULE_SEVERITIES]).toEqual(["error", "warn"]);
    for (const r of BUILT.rules) expect(["error", "warn"]).toContain(r.severity);
  });

  it("uses unique rule ids", () => {
    const ids = BUILT.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("appliesTo grounding", () => {
  it("matches at least one real token path for every prefix of every rule", () => {
    for (const r of BUILT.rules) {
      expect(r.appliesTo.length, r.id).toBeGreaterThan(0);
      for (const prefix of r.appliesTo) {
        const hit = ALL_PATHS.some((p) => p.startsWith(`${prefix}.`));
        expect(hit, `${r.id} -> ${prefix}`).toBe(true);
      }
    }
  });

  it("scopes the colour rule to prefixes that actually hold colour tokens", () => {
    const colour = rule("no-hardcoded-color")!;
    expect(colour.appliesTo).toContain("semantic.color");
    expect(colour.appliesTo).not.toContain("primitive.duration");
  });

  it("scopes the duration rule away from colour-only prefixes", () => {
    const duration = rule("no-hardcoded-duration")!;
    expect(duration.appliesTo).toContain("primitive.duration");
    expect(duration.appliesTo).not.toContain("semantic.color");
  });
});

describe("rule set", () => {
  it("ships the four value rules the first checker implements", () => {
    const value = BUILT.rules.filter((r) => r.kind === "value").map((r) => r.id).sort();
    expect(value).toEqual([
      "no-hardcoded-color",
      "no-hardcoded-dimension",
      "no-hardcoded-duration",
      "unknown-token-ref",
    ]);
  });

  it("reserves nesting and selection kinds without pretending they are checked", () => {
    expect([...RULE_KINDS]).toEqual(["value", "nesting", "selection"]);
    expect(rule("radius-nesting")?.kind).toBe("nesting");
  });

  it("treats a one-off duration as a warning, not a block", () => {
    expect(rule("no-hardcoded-duration")?.severity).toBe("warn");
    expect(rule("no-hardcoded-color")?.severity).toBe("error");
  });

  it("omits a rule whose token type is absent rather than pointing at nothing", () => {
    const noDurations = JSON.parse(JSON.stringify(DOC)) as Record<string, unknown>;
    const strip = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      const rec = node as Record<string, unknown>;
      for (const [k, v] of Object.entries(rec)) {
        if (v && typeof v === "object" && (v as Record<string, unknown>).$type === "duration") {
          delete rec[k];
        } else strip(v);
      }
    };
    strip(noDurations);
    const built = buildRulesDocument(noDurations as unknown as TokensDocument);
    expect(built.rules.map((r) => r.id)).not.toContain("no-hardcoded-duration");
    expect(built.rules.map((r) => r.id)).toContain("no-hardcoded-color");
  });

  it("serializes identically on repeat builds", () => {
    expect(toRulesJson(DOC)).toBe(toRulesJson(DOC));
    expect(toRulesJson(DOC).endsWith("\n")).toBe(true);
  });
});

describe("cli generate", () => {
  it("writes rules.json carrying the same tokenHash as components.json", () => {
    const cli = join(repoRoot, "dist/cli.js");
    if (!existsSync(cli)) {
      throw new Error("dist/cli.js missing — run `npm run build` before this suite");
    }
    const out = mkdtempSync(join(tmpdir(), "dsb-rules-"));
    execFileSync("node", [cli, "generate", join(here, "sample.tokens.json"), "--out-dir", out], {
      cwd: repoRoot,
    });
    const rules = JSON.parse(readFileSync(join(out, "rules.json"), "utf8")) as RulesDocument;
    const components = JSON.parse(readFileSync(join(out, "components.json"), "utf8")) as {
      tokenHash: string;
    };
    rmSync(out, { recursive: true, force: true });
    expect(rules.tokenHash).toBe(computeTokenHash(DOC));
    expect(rules.tokenHash).toBe(components.tokenHash);
    expect(rules.rules.length).toBeGreaterThanOrEqual(4);
  });
});
