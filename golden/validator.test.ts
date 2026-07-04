/**
 * Golden fixtures — tokens.json-only gates (design §4.1).
 * Surface-dependent fixtures (G7/G8/G9/G10/G16/G18/G20/G21/G23) land with the
 * adapters/generators (P3/P4).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validateTokens, computeTokenHash } from "../src/validator.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE = JSON.parse(
  readFileSync(join(here, "sample.tokens.json"), "utf8"),
) as TokensDocument;

/** Deep clone so each fixture mutates an isolated copy. */
const clone = (): TokensDocument => structuredClone(SAMPLE);
const codes = (r: ReturnType<typeof validateTokens>) =>
  r.findings.map((f) => f.code);

describe("baseline", () => {
  it("sample passes the export gate (0 errors)", () => {
    const r = validateTokens(SAMPLE);
    const errs = r.findings.filter((f) => f.severity === "error");
    expect(errs, JSON.stringify(errs, null, 2)).toEqual([]);
    expect(r.ok).toBe(true);
  });
});

describe("G4 — alias cycle", () => {
  it("detects a primary→alt→primary cycle", () => {
    const d = clone();
    // make primary.default point to a new alt, and alt point back → cycle
    (d.semantic.color as any).primary.default.$value = "{semantic.color.primary.alt}";
    (d.semantic.color as any).primary.alt = {
      $type: "color",
      $value: "{semantic.color.primary.default}",
      $class: "portable",
    };
    expect(codes(validateTokens(d))).toContain("alias-cycle");
  });
});

describe("G5 — WCAG contrast fail", () => {
  it("flags a low-contrast pair", () => {
    const d = clone();
    // make primary.foreground a mid-grey on the blue primary → fails 4.5:1
    (d.primitive.color as any).neutral["50"].$value = "oklch(0.55 0 0)";
    const r = validateTokens(d);
    expect(codes(r)).toContain("contrast-fail");
    expect(r.ok).toBe(false);
  });
});

describe("G6 — $class missing", () => {
  it("errors when a leaf lacks $class", () => {
    const d = clone();
    delete (d.primitive.color as any).blue["600"].$class;
    expect(codes(validateTokens(d))).toContain("class-missing");
  });
});

describe("G12 — unresolved alias", () => {
  it("errors on reference to a missing token", () => {
    const d = clone();
    (d.component.button as any).primary.background.default.$value = "{semantic.color.nope.default}";
    expect(codes(validateTokens(d))).toContain("alias-unresolved");
  });
});

describe("G13 — alias type mismatch", () => {
  it("errors when a dimension aliases a color", () => {
    const d = clone();
    (d.component.button as any).primary.radius.$value = "{semantic.color.primary.default}";
    expect(codes(validateTokens(d))).toContain("alias-type");
  });
});

describe("G14 — invalid unit", () => {
  it("errors on a CSS unit string instead of {value,unit}", () => {
    const d = clone();
    (d.primitive.space as any).sm.$value = "8px";
    expect(codes(validateTokens(d))).toContain("unit-invalid");
  });
});

describe("G15 — tokenHash determinism (non-circular)", () => {
  it("hash is unchanged when only meta.generatedAt differs", () => {
    const a = clone();
    const b = clone();
    b.meta.generatedAt = "2099-01-01T00:00:00Z";
    expect(computeTokenHash(a)).toBe(computeTokenHash(b));
  });
  it("hash changes when an intent value changes", () => {
    const a = clone();
    const b = clone();
    (b.primitive.color as any).blue["600"].$value = "oklch(0.40 0.13 255)";
    expect(computeTokenHash(a)).not.toBe(computeTokenHash(b));
  });
});

describe("G17 — target-only ignored for inactive target", () => {
  it("a target-only:video token does not error under requiredTargets=[web]", () => {
    const d = clone();
    (d.primitive.color as any).blue["600"].$class = "target-only:video";
    const r = validateTokens(d);
    expect(codes(r)).not.toContain("class-invalid");
    // it becomes an orphan-style case only if unreferenced; here it's referenced.
    expect(r.findings.filter((f) => f.severity === "error" && f.path === "primitive.color.blue.600")).toEqual([]);
  });
});

describe("G19 — trace coverage", () => {
  it("errors when no decisionTrace covers the color category", () => {
    const d = clone();
    d.meta.philosophy.decisionTrace = d.meta.philosophy.decisionTrace.map((t) => ({
      ...t,
      coversTokenPath: t.coversTokenPath.filter((p) => !/color/.test(p)),
    }));
    expect(codes(validateTokens(d))).toContain("trace-coverage");
  });
});

describe("G22 — intent leak", () => {
  it("warns when a physical value appears in rationale", () => {
    const d = clone();
    d.meta.philosophy.rationale = "모서리를 8px로 타이트하게";
    const r = validateTokens(d);
    expect(codes(r)).toContain("intent-leak");
    // warning only — does not block
    expect(r.findings.find((f) => f.code === "intent-leak")?.severity).toBe("warn");
  });
});
