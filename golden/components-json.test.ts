/**
 * Golden — components.json, the consumer-facing component surface.
 *
 * verifies: FS-003 (docs/spec/spec.md — components.json generation)
 *
 * Authored prose (FS-001) plus registry-derived facts, stamped with the
 * tokenHash of the same build. The hash is what lets manifest catch a surface
 * that drifted away from the tokens it claims to describe.
 */
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildComponentsDocument,
  loadComponentSpecs,
  toComponentsJson,
  type ComponentsDocument,
} from "../src/component-spec.js";
import { defaultComponentSpecsDir } from "../src/package-paths.js";
import { computeTokenHash } from "../src/validator.js";
import { registryComponentNames } from "../src/component-spec.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const DOC = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const SPECS = loadComponentSpecs(defaultComponentSpecsDir()).specs;
const BUILT = buildComponentsDocument(DOC, SPECS);

describe("components.json content", () => {
  it("stamps the tokenHash of the same build", () => {
    expect(BUILT.tokenHash).toBe(computeTokenHash(DOC));
    expect(BUILT.tokenHash.startsWith("sha256:")).toBe(true);
  });

  it("carries every registry component", () => {
    expect(Object.keys(BUILT.components)).toEqual([...registryComponentNames()]);
  });

  it("carries the four authored fields on every component", () => {
    for (const [name, entry] of Object.entries(BUILT.components)) {
      expect(entry.purpose.what, name).toBeTruthy();
      expect(entry.useWhen, name).toBeTruthy();
      expect(entry.dontUseWhen, name).toBeTruthy();
      expect(entry.vsPartner.length, name).toBeGreaterThan(0);
    }
  });

  it("keeps vsPartner references resolvable inside the document itself", () => {
    for (const entry of Object.values(BUILT.components)) {
      for (const ref of entry.vsPartner) {
        expect(BUILT.components[ref.key], `${entry.name} -> ${ref.key}`).toBeDefined();
      }
    }
  });

  it("derives registry facts rather than reading them from the spec files", () => {
    const button = BUILT.components.button;
    expect(button.tier).toBe("primitive");
    expect(button.variants).toEqual(["primary", "secondary", "ghost"]);
    expect(button.states).toContain("hover");
    expect(button.baseProperties).toContain("radius");
    expect(button.stateProperties).toEqual(["background", "foreground", "border"]);
    // divider has no states in the registry, so none are invented here
    expect(BUILT.components.divider.stateProperties).toEqual([]);
    expect(BUILT.components.divider.states).toEqual([]);
  });

  it("tags each tier from the registry rollout it belongs to", () => {
    expect(BUILT.components.button.tier).toBe("primitive");
    expect(BUILT.components.nav.tier).toBe("composite");
    expect(BUILT.components.hero.tier).toBe("pattern");
  });

  it("lists only token paths that this build actually realizes", () => {
    for (const entry of Object.values(BUILT.components)) {
      for (const path of entry.tokenPaths) {
        expect(path.startsWith(`component.${entry.name}.`), path).toBe(true);
      }
    }
    expect(BUILT.components.button.tokenPaths.length).toBeGreaterThan(0);
  });

  it("keeps a deferred field null and carries its reason through", () => {
    const hero = BUILT.components.hero;
    expect(hero.anatomy).toBeNull();
    expect(hero._deferred?.anatomy).toMatch(/D-008/);
  });

  it("serializes identically on repeat builds", () => {
    const a = toComponentsJson(DOC, SPECS);
    const b = toComponentsJson(DOC, loadComponentSpecs(defaultComponentSpecsDir()).specs);
    expect(a).toBe(b);
    expect(a.endsWith("\n")).toBe(true);
  });
});

describe("cli generate", () => {
  it("writes components.json alongside the other surfaces, byte-identical across runs", () => {
    const cli = join(repoRoot, "dist/cli.js");
    if (!existsSync(cli)) {
      throw new Error("dist/cli.js missing — run `npm run build` before this suite");
    }
    const tokens = join(here, "sample.tokens.json");
    const runs = [0, 1].map(() => {
      const out = mkdtempSync(join(tmpdir(), "dsb-gen-"));
      execFileSync("node", [cli, "generate", tokens, "--out-dir", out], { cwd: repoRoot });
      const text = readFileSync(join(out, "components.json"), "utf8");
      rmSync(out, { recursive: true, force: true });
      return text;
    });
    expect(runs[0]).toBe(runs[1]);
    const parsed = JSON.parse(runs[0]) as ComponentsDocument;
    expect(parsed.tokenHash).toBe(computeTokenHash(DOC));
    expect(Object.keys(parsed.components)).toHaveLength(18);
  });
});
