export * from "./tokens-schema.js";
export * from "./color.js";
export * from "./validator.js";

import { readFileSync } from "node:fs";
import type { TokensDocument } from "./tokens-schema.js";

/** Load and parse a tokens.json file (no validation). */
export function loadTokens(path: string): TokensDocument {
  return JSON.parse(readFileSync(path, "utf8")) as TokensDocument;
}
