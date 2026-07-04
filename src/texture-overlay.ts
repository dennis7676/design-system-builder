import { hasTokenPath } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

export function hasTextureOverlay(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /^semantic\.texture\.overlay\./);
}

export function textureOverlayCss(doc: TokensDocument, selectors: readonly string[]): string {
  if (!hasTextureOverlay(doc) || selectors.length === 0) return "";
  const base = selectors.join(", ");
  const after = selectors.map((selector) => `${selector}::after`).join(", ");
  const children = selectors.map((selector) => `${selector} > *`).join(", ");
  return `
    ${base} { position: relative; isolation: isolate; }
    ${after} { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: inherit; background-image: var(--semantic-texture-overlay-image); background-repeat: repeat; mix-blend-mode: var(--semantic-texture-overlay-blendMode); opacity: var(--semantic-texture-overlay-opacity); z-index: 0; }
    ${children} { position: relative; z-index: 1; }`;
}
