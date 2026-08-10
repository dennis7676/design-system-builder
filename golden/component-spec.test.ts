/**
 * Golden — component spec source loader.
 *
 * verifies: FS-001 (docs/spec/spec.md — component spec source schema)
 *
 * The shipped specs in references/components are checked as-is, and the
 * failure modes are exercised against throwaway directories so a broken
 * spec file is caught here rather than surfacing as an empty section in
 * styleguide.html.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  loadComponentSpecs,
  registryComponentNames,
  specCoverage,
  SPEC_REQUIRED_FIELDS,
  type ComponentSpecSource,
} from "../src/component-spec.js";
import { defaultComponentSpecsDir } from "../src/package-paths.js";

const SHIPPED = loadComponentSpecs(defaultComponentSpecsDir());
const errors = (f: readonly { severity: string }[]) => f.filter((x) => x.severity === "error");
const codes = (f: readonly { code: string }[]) => f.map((x) => x.code);

/** Writes a throwaway spec dir containing only the given files. */
function fixture(files: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), "dsb-spec-"));
  for (const [name, body] of Object.entries(files)) {
    writeFileSync(join(dir, `${name}.json`), JSON.stringify(body), "utf8");
  }
  return dir;
}

const complete = (name: string, over: Partial<ComponentSpecSource> = {}): ComponentSpecSource => ({
  name,
  purpose: { what: `${name} is a thing.` },
  useWhen: "when it fits.",
  dontUseWhen: "when it does not.",
  vsPartner: [{ key: name === "button" ? "link" : "button", note: "use that instead." }],
  ...over,
});

/** Every registry component, filled — the baseline a fixture starts from. */
function allComplete(): Record<string, ComponentSpecSource> {
  const out: Record<string, ComponentSpecSource> = {};
  for (const n of registryComponentNames()) out[n] = complete(n);
  return out;
}

describe("shipped component specs", () => {
  it("covers every registry component 1:1", () => {
    expect(SHIPPED.specs.map((s) => s.name)).toEqual([...registryComponentNames()]);
    expect(SHIPPED.specs).toHaveLength(18);
  });

  it("loads without errors", () => {
    expect(errors(SHIPPED.findings)).toEqual([]);
  });

  it("fills all four required fields on every component", () => {
    for (const c of specCoverage(SHIPPED.specs)) {
      expect(`${c.field}: ${c.filled}/${c.total}`).toBe(`${c.field}: 18/18`);
    }
  });

  it("points every vsPartner key at a real component and never at itself", () => {
    const known = new Set(registryComponentNames());
    for (const spec of SHIPPED.specs) {
      for (const ref of spec.vsPartner ?? []) {
        expect(known.has(ref.key), `${spec.name} -> ${ref.key}`).toBe(true);
        expect(ref.key).not.toBe(spec.name);
        expect(ref.note.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it("gives a reason for every deferred field", () => {
    for (const spec of SHIPPED.specs) {
      for (const [field, reason] of Object.entries(spec._deferred ?? {})) {
        expect(reason.trim().length, `${spec.name}.${field}`).toBeGreaterThan(0);
      }
    }
  });

  it("warns — not errors — on the deferred P3 anatomy fields", () => {
    const deferred = SHIPPED.findings.filter((f) => f.code === "spec-deferred");
    // anatomy is optional, so deferring it produces no finding at all
    expect(deferred).toEqual([]);
    const withoutAnatomy = SHIPPED.specs.filter((s) => !s.anatomy);
    expect(withoutAnatomy.map((s) => s.name).sort()).toEqual([
      "featureGrid",
      "footer",
      "hero",
      "pricing",
    ]);
  });
});

describe("loader failure modes", () => {
  it("reports a missing spec file", () => {
    const files = allComplete();
    delete files.divider;
    const dir = fixture(files);
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-missing");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a file naming a component the registry does not have", () => {
    const dir = fixture({ ...allComplete(), tooltip: complete("tooltip") });
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-unknown-component");
    rmSync(dir, { recursive: true, force: true });
  });

  it("errors when a required field is empty with no _deferred entry", () => {
    const dir = fixture({ ...allComplete(), badge: complete("badge", { useWhen: null }) });
    const { findings } = loadComponentSpecs(dir);
    const f = errors(findings).find((x) => x.code === "spec-required-missing");
    expect(f?.path).toBe("badge.useWhen");
    rmSync(dir, { recursive: true, force: true });
  });

  it("downgrades to warning when the empty field is declared in _deferred", () => {
    const dir = fixture({
      ...allComplete(),
      badge: complete("badge", { useWhen: null, _deferred: { useWhen: "pending D-010" } }),
    });
    const { findings } = loadComponentSpecs(dir);
    expect(errors(findings)).toEqual([]);
    expect(codes(findings)).toContain("spec-deferred");
    rmSync(dir, { recursive: true, force: true });
  });

  it("errors when a _deferred reason is blank", () => {
    const dir = fixture({
      ...allComplete(),
      badge: complete("badge", { useWhen: null, _deferred: { useWhen: "   " } }),
    });
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-deferred-blank");
    rmSync(dir, { recursive: true, force: true });
  });

  it("errors when _deferred names a field that is not part of the schema", () => {
    const dir = fixture({
      ...allComplete(),
      badge: complete("badge", { _deferred: { colour: "typo for anatomy" } }),
    });
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-deferred-unknown-field");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a vsPartner pointing at an unknown component or at itself", () => {
    const dir = fixture({
      ...allComplete(),
      badge: complete("badge", { vsPartner: [{ key: "chip", note: "n/a" }] }),
      card: complete("card", { vsPartner: [{ key: "card", note: "n/a" }] }),
    });
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-vspartner-unknown");
    expect(codes(errors(findings))).toContain("spec-vspartner-self");
    rmSync(dir, { recursive: true, force: true });
  });

  it("rejects a vsPartner note that says nothing", () => {
    const dir = fixture({
      ...allComplete(),
      badge: complete("badge", { vsPartner: [{ key: "button", note: "" }] }),
    });
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-vspartner-blank-note");
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports unparseable JSON instead of throwing", () => {
    const dir = fixture(allComplete());
    writeFileSync(join(dir, "card.json"), "{ not json", "utf8");
    const { findings } = loadComponentSpecs(dir);
    expect(codes(errors(findings))).toContain("spec-unparseable");
    rmSync(dir, { recursive: true, force: true });
  });

  it("reports an unreadable directory instead of throwing", () => {
    const { specs, findings } = loadComponentSpecs(join(tmpdir(), "dsb-spec-does-not-exist"));
    expect(specs).toEqual([]);
    expect(codes(errors(findings))).toContain("spec-dir-unreadable");
  });
});

describe("coverage reporting", () => {
  it("reports every required field even when complete", () => {
    const report = specCoverage(SHIPPED.specs);
    expect(report.map((r) => r.field)).toEqual([...SPEC_REQUIRED_FIELDS]);
  });

  it("lists which components deferred a field", () => {
    const dir = fixture({
      ...allComplete(),
      badge: complete("badge", { useWhen: null, _deferred: { useWhen: "pending" } }),
    });
    const { specs } = loadComponentSpecs(dir);
    const useWhen = specCoverage(specs).find((r) => r.field === "useWhen")!;
    expect(useWhen.filled).toBe(17);
    expect(useWhen.deferred).toEqual(["badge"]);
    rmSync(dir, { recursive: true, force: true });
  });
});
