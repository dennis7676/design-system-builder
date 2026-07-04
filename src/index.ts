export * from "./tokens-schema.js";
export * from "./color.js";
export * from "./validator.js";
export * from "./transformer.js";
export * from "./adapters/css-adapter.js";
export * from "./adapters/video-adapter.js";
export * from "./styleguide-generator.js";
export * from "./design-md-generator.js";
export * from "./demo-generator.js";
export * from "./manifest.js";
export * from "./brand-schema.js";
export * from "./recipe-selection.js";
export * from "./tokens-builder.js";
export * from "./gate.js";
export * from "./font-sources.js";
export * from "./edge-point.js";
export * from "./component-registry.js";
export * from "./contract.js";

import { readFileSync } from "node:fs";
import type { TokensDocument } from "./tokens-schema.js";

/** Load and parse a tokens.json file (no validation). */
export function loadTokens(path: string): TokensDocument {
  return JSON.parse(readFileSync(path, "utf8")) as TokensDocument;
}
