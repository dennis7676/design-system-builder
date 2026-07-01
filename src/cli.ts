#!/usr/bin/env node
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import {
  checkManifest,
  generateDemo,
  generateDesignMd,
  generateStyleguide,
  loadTokens,
  toCssVars,
} from "./index.js";
import { validateTokens } from "./validator.js";
import { validateBrand, type BrandJson } from "./brand-schema.js";
import { loadRecipes, selectRecipe } from "./recipe-selection.js";
import { buildTokens } from "./tokens-builder.js";
import { canGenerate } from "./gate.js";

function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  if (cmd === "generate") return generate(rest);
  if (cmd === "build") return build(rest);
  if (cmd !== "validate") {
    console.error("usage: design-system-builder validate <tokens.json> [--check-manifest]");
    console.error("   or: design-system-builder generate <tokens.json> [--out-dir <dir>]");
    console.error("   or: design-system-builder build <brand.json> [--recipes <dir>] [--out <tokens.json>] [--confirm]");
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
        demoHtml: generateDemo(doc),
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
  const demoHtml = generateDemo(doc);
  if (outDir === undefined) {
    console.log(styleguideHtml);
    return 0;
  }
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/tokens.css`, `${css}\n`);
  writeFileSync(`${outDir}/styleguide.html`, styleguideHtml);
  writeFileSync(`${outDir}/DESIGN.md`, designMd);
  writeFileSync(`${outDir}/demo.html`, demoHtml);
  console.error(`wrote ${outDir}/tokens.css, ${outDir}/styleguide.html, ${outDir}/DESIGN.md, ${outDir}/demo.html`);
  return 0;
}

function flagValue(argv: string[], flag: string): string | undefined {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : undefined;
}

function build(argv: string[]): number {
  const file = argv.find((a) => !a.startsWith("--") && !isFlagValue(argv, a));
  if (!file) {
    console.error("error: brand.json path required");
    return 2;
  }
  const recipesDir = flagValue(argv, "--recipes") ?? "references/recipes";
  const outFile = flagValue(argv, "--out");
  const userConfirmed = argv.includes("--confirm");

  const brand = JSON.parse(readFileSync(file, "utf8")) as BrandJson;
  const fieldErrors = validateBrand(brand);
  for (const e of fieldErrors) console.error(`BRAND [${e.path}] ${e.message}`);

  const recipes = loadRecipes(recipesDir);
  const selection = selectRecipe(brand, recipes);
  console.error(`recipe: ${selection.recipeKey ?? "(none)"}  candidates: [${selection.candidates.join(", ")}]`);
  for (const d of selection.distances) console.error(`  tone_distance ${d.key}: ${d.distance.toFixed(3)}`);
  for (const c of selection.conflicts) console.error(`CONFLICT [${c.code}] ${c.message}`);

  const gate = canGenerate({ brand, selection, userConfirmed });
  if (!gate.ok) {
    console.error("✗ export gate BLOCKED:");
    for (const r of gate.reasons) console.error(`  - ${r}`);
    if (!userConfirmed && gate.reasons.length === 1) {
      console.error("  (pass --confirm once the above is reviewed)");
    }
    return 1;
  }

  const doc = buildTokens(brand, selection.recipe!);
  const validation = validateTokens(doc);
  const errs = validation.findings.filter((f) => f.severity === "error");
  for (const f of validation.findings) {
    console.error(`${f.severity.toUpperCase().padEnd(5)} [${f.code}] ${f.path ? f.path + " — " : ""}${f.message}`);
  }
  if (errs.length > 0) {
    console.error("✗ built tokens.json failed validation");
    return 1;
  }
  console.error(`tokenHash: ${validation.tokenHash}`);

  const json = JSON.stringify(doc, null, 2) + "\n";
  if (outFile === undefined) {
    console.log(json);
  } else {
    mkdirSync(dirOf(outFile), { recursive: true });
    writeFileSync(outFile, json);
    console.error(`✓ wrote ${outFile}`);
  }
  return 0;
}

function isFlagValue(argv: string[], token: string): boolean {
  const i = argv.indexOf(token);
  return i > 0 && (argv[i - 1] === "--recipes" || argv[i - 1] === "--out");
}

function dirOf(p: string): string {
  const idx = p.lastIndexOf("/");
  return idx <= 0 ? "." : p.slice(0, idx);
}

process.exit(main(process.argv.slice(2)));
