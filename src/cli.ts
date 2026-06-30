#!/usr/bin/env node
import { loadTokens } from "./index.js";
import { validateTokens } from "./validator.js";

function main(argv: string[]): number {
  const [cmd, ...rest] = argv;
  if (cmd !== "validate") {
    console.error("usage: design-system-builder validate <tokens.json> [--check-manifest]");
    return 2;
  }
  const file = rest.find((a) => !a.startsWith("--"));
  if (!file) {
    console.error("error: tokens.json path required");
    return 2;
  }
  const doc = loadTokens(file);
  const result = validateTokens(doc);

  for (const f of result.findings) {
    const tag = f.severity.toUpperCase().padEnd(5);
    console.error(`${tag} [${f.code}] ${f.path ? f.path + " — " : ""}${f.message}`);
  }
  console.error(`\ntokenHash: ${result.tokenHash}`);
  console.error(result.ok ? "✓ export gate PASS" : "✗ export gate BLOCKED (error 존재)");
  return result.ok ? 0 : 1;
}

process.exit(main(process.argv.slice(2)));
