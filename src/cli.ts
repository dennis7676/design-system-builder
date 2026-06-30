#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import {
  checkManifest,
  generateDesignMd,
  generateStyleguide,
  loadTokens,
  toCssVars,
} from "./index.js";
import { validateTokens } from "./validator.js";

function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  if (cmd === "generate") return generate(rest);
  if (cmd !== "validate") {
    console.error("usage: design-system-builder validate <tokens.json> [--check-manifest]");
    console.error("   or: design-system-builder generate <tokens.json> [--out-dir <dir>]");
    return 2;
  }
  const file = rest.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("error: tokens.json path required");
    return 2;
  }
  const doc = loadTokens(file);
  const result = validateTokens(doc);
  const findings = [...result.findings];

  if (rest.includes("--check-manifest")) {
    findings.push(
      ...checkManifest(doc, {
        styleguideHtml: generateStyleguide(doc),
        designMd: generateDesignMd(doc),
      }),
    );
  }

  for (const f of findings) {
    const tag = f.severity.toUpperCase().padEnd(5);
    console.error(`${tag} [${f.code}] ${f.path ? f.path + " — " : ""}${f.message}`);
  }
  console.error(`\ntokenHash: ${result.tokenHash}`);
  const ok = !findings.some((f) => f.severity === "error");
  console.error(ok ? "✓ export gate PASS" : "✗ export gate BLOCKED (error 존재)");
  return ok ? 0 : 1;
}

function generate(argv: string[]): number {
  const file = argv.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("error: tokens.json path required");
    return 2;
  }
  const outDirFlag = argv.indexOf("--out-dir");
  const outDir = outDirFlag >= 0 ? argv[outDirFlag + 1] : undefined;
  if (outDirFlag >= 0 && outDir === undefined) {
    console.error("error: --out-dir requires a path");
    return 2;
  }
  const doc = loadTokens(file);
  const css = toCssVars(doc);
  const styleguideHtml = generateStyleguide(doc);
  const designMd = generateDesignMd(doc);
  if (outDir === undefined) {
    console.log(styleguideHtml);
    return 0;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/tokens.css`, `${css}\n`);
  writeFileSync(`${outDir}/styleguide.html`, styleguideHtml);
  writeFileSync(`${outDir}/DESIGN.md`, designMd);
  console.error(`wrote ${outDir}/tokens.css, ${outDir}/styleguide.html, ${outDir}/DESIGN.md`);
  return 0;
}

process.exit(main(process.argv.slice(2)));
