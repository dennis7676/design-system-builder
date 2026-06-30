import type { TokensDocument } from "../tokens-schema.js";
import { toRealizedWeb } from "../transformer.js";

export function toCssVars(doc: TokensDocument): string {
  const lines = [":root {"];
  for (const [path, value] of toRealizedWeb(doc)) {
    lines.push(`  --${path.replaceAll(".", "-")}: ${value};`);
  }
  lines.push("}");
  return lines.join("\n");
}
