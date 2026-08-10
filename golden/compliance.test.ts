/**
 * Golden — compliance checker.
 *
 * verifies: FS-011 (value rules over source), FS-012 (reserved kinds skipped loudly)
 *
 * The checker reads source, never a rendered page (D-005), so these tests are
 * plain files in a temp directory rather than a browser fixture.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectSourceFiles,
  colorLiteralToHex,
  formatComplianceReport,
  runCompliance,
} from "../src/compliance.js";
import { buildRulesDocument } from "../src/rules-generator.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "..");
const DOC = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const RULES = buildRulesDocument(DOC);

let root = "";

const CARD_TSX = `export function Card() {
  // #ffffff inside a comment is not a violation
  return <div style={{ background: "#F8F8F7", padding: "24px", transition: "all 300ms" }} />;
}
`;

const THEME_CSS = `.card {
  background: var(--semantic-color-surface-default);
  color: var(--semantic-color-surface-forground);
  border-radius: 0.25rem;
  margin: 0px;
  border: 1px solid rgb(200, 200, 200);
}
`;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "dsb-consumer-"));
  mkdirSync(join(root, "src"), { recursive: true });
  writeFileSync(join(root, "src/Card.tsx"), CARD_TSX, "utf8");
  writeFileSync(join(root, "src/theme.css"), THEME_CSS, "utf8");
  // must be ignored: generated surface, skipped directory, unscanned extension
  writeFileSync(join(root, "src/tokens.css"), ":root { --x: #123456; }\n", "utf8");
  writeFileSync(join(root, "src/notes.md"), "#ffffff\n", "utf8");
  mkdirSync(join(root, "node_modules/pkg"), { recursive: true });
  writeFileSync(join(root, "node_modules/pkg/a.css"), ".x { color: #abcdef; }\n", "utf8");
});

afterAll(() => rmSync(root, { recursive: true, force: true }));

const report = () => runCompliance(root, RULES, DOC);
const idsAt = (file: string, line: number) =>
  report()
    .violations.filter((v) => v.file.endsWith(file) && v.line === line)
    .map((v) => v.ruleId)
    .sort();

describe("file collection", () => {
  it("scans only css/tsx/jsx and skips generated surfaces and node_modules", () => {
    const files = collectSourceFiles(root).map((f) => f.replace(root, ""));
    expect(files.some((f) => f.endsWith("Card.tsx"))).toBe(true);
    expect(files.some((f) => f.endsWith("theme.css"))).toBe(true);
    expect(files.some((f) => f.endsWith("tokens.css"))).toBe(false);
    expect(files.some((f) => f.endsWith("notes.md"))).toBe(false);
    expect(files.some((f) => f.includes("node_modules"))).toBe(false);
  });
});

describe("value rules", () => {
  it("flags a hardcoded colour and names a token to use instead", () => {
    const v = report().violations.find((x) => x.found === "#F8F8F7");
    expect(v?.ruleId).toBe("no-hardcoded-color");
    expect(v?.severity).toBe("error");
    expect(v?.suggestion).toMatch(/^semantic\./);
  });

  it("flags px and rem dimensions but not zero", () => {
    expect(idsAt("Card.tsx", 3)).toContain("no-hardcoded-dimension");
    expect(idsAt("theme.css", 4)).toContain("no-hardcoded-dimension");
    expect(idsAt("theme.css", 5)).toEqual([]); // margin: 0px
  });

  it("flags a duration as a warning, not an error", () => {
    const v = report().violations.find((x) => x.found === "300ms");
    expect(v?.ruleId).toBe("no-hardcoded-duration");
    expect(v?.severity).toBe("warn");
  });

  it("flags a misspelled css variable and suggests the real token", () => {
    const v = report().violations.find((x) => x.ruleId === "unknown-token-ref");
    expect(v?.found).toBe("--semantic-color-surface-forground");
    expect(v?.suggestion).toBe("semantic.color.surface.foreground");
  });

  it("accepts a css variable that resolves to a real token", () => {
    const refs = report().violations.filter(
      (v) => v.found === "--semantic-color-surface-default",
    );
    expect(refs).toEqual([]);
  });

  it("ignores literals on comment-only lines", () => {
    expect(idsAt("Card.tsx", 2)).toEqual([]);
  });

  it("suggests a token for functional colour notation too", () => {
    const v = report().violations.find((x) => x.found.startsWith("rgb("));
    expect(v?.suggestion).toBeTruthy();
  });

  it("prefers the semantic layer when several tokens hold the same value", () => {
    for (const v of report().violations) {
      if (v.suggestion?.startsWith("component.")) continue; // no semantic equivalent exists
      expect(v.suggestion === null || /^(semantic|primitive)\./.test(v.suggestion)).toBe(true);
    }
  });
});

describe("colour literal conversion", () => {
  it("passes hex through and converts rgb and hsl", () => {
    expect(colorLiteralToHex("#abcdef")).toBe("#abcdef");
    expect(colorLiteralToHex("rgb(255, 0, 0)")).toBe("#ff0000");
    expect(colorLiteralToHex("hsl(0, 100%, 50%)")).toBe("#ff0000");
    expect(colorLiteralToHex("not-a-colour")).toBeNull();
  });
});

describe("reserved kinds", () => {
  it("checks only value rules and names the ones it skipped", () => {
    const r = report();
    expect(r.rulesChecked).toEqual([
      "no-hardcoded-color",
      "no-hardcoded-dimension",
      "no-hardcoded-duration",
      "unknown-token-ref",
    ]);
    expect(r.rulesSkipped).toEqual(["radius-nesting"]);
  });

  it("states the skipped count in the report rather than staying silent", () => {
    expect(formatComplianceReport(report())).toContain("건너뜀");
  });

  it("finishes without error when the rule set contains an unimplemented kind", () => {
    const onlyReserved = { ...RULES, rules: RULES.rules.filter((r) => r.kind !== "value") };
    const r = runCompliance(root, onlyReserved, DOC);
    expect(r.violations).toEqual([]);
    expect(r.rulesChecked).toEqual([]);
    expect(r.rulesSkipped.length).toBeGreaterThan(0);
  });
});

describe("determinism and exit code", () => {
  it("produces identical output on repeat runs", () => {
    expect(formatComplianceReport(report())).toBe(formatComplianceReport(report()));
  });

  it("exits 1 when errors exist and 0 when they do not", () => {
    const cli = join(repoRoot, "dist/cli.js");
    if (!existsSync(cli)) throw new Error("dist/cli.js missing — run `npm run build` first");
    const out = mkdtempSync(join(tmpdir(), "dsb-surfaces-"));
    execFileSync("node", [cli, "generate", join(here, "sample.tokens.json"), "--out-dir", out], {
      cwd: repoRoot,
    });
    const args = ["--rules", join(out, "rules.json"), "--tokens", join(here, "sample.tokens.json")];

    let dirtyCode = 0;
    let dirtyOut = "";
    try {
      dirtyOut = execFileSync("node", [cli, "compliance", root, ...args], {
        cwd: repoRoot,
        encoding: "utf8",
      });
    } catch (e) {
      const err = e as { status: number; stdout: string };
      dirtyCode = err.status;
      dirtyOut = err.stdout;
    }
    expect(dirtyCode).toBe(1);
    expect(dirtyOut).toMatch(/no-hardcoded-color/);
    expect(dirtyOut).toMatch(/Card\.tsx:3/);

    const clean = mkdtempSync(join(tmpdir(), "dsb-clean-"));
    writeFileSync(
      join(clean, "ok.css"),
      ".x { color: var(--semantic-color-surface-default); }\n",
      "utf8",
    );
    const cleanOut = execFileSync("node", [cli, "compliance", clean, ...args], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    expect(cleanOut).toContain("위반 없음");

    rmSync(out, { recursive: true, force: true });
    rmSync(clean, { recursive: true, force: true });
  });

  it("refuses to check against a rules.json from a different build", () => {
    const cli = join(repoRoot, "dist/cli.js");
    const out = mkdtempSync(join(tmpdir(), "dsb-stale-"));
    writeFileSync(
      join(out, "rules.json"),
      JSON.stringify({ schemaVersion: "x", tokenHash: "sha256:stale", rules: [] }),
      "utf8",
    );
    let code = 0;
    try {
      execFileSync("node", [
        cli,
        "compliance",
        root,
        "--rules",
        join(out, "rules.json"),
        "--tokens",
        join(here, "sample.tokens.json"),
      ]);
    } catch (e) {
      code = (e as { status: number }).status;
    }
    expect(code).toBe(2);
    rmSync(out, { recursive: true, force: true });
  });
});
