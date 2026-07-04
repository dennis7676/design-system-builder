import { hasTokenPath } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

export function hasGlassSurface(doc: TokensDocument): boolean {
  return hasTokenPath(doc, /^semantic\.glass\.surface\./);
}

export function glassPanelCss(doc: TokensDocument, selectors: readonly string[]): string {
  if (!hasGlassSurface(doc) || selectors.length === 0) return "";
  const base = selectors.join(", ");
  const text = selectors.map((selector) => `${selector} :is(h1, h2, h3, p, a, small, strong, span, .lead, .meta-label, .application-copy)`).join(", ");
  return `
    ${base} { position: relative; isolation: isolate; padding: var(--semantic-space-inset); border-radius: var(--semantic-shape-control); color: var(--semantic-color-primary-foreground); border: 1px solid var(--semantic-glass-surface-border); background: color-mix(in oklch, var(--semantic-glass-surface-fill) calc(var(--semantic-glass-surface-opacity) * 100%), transparent); backdrop-filter: blur(var(--semantic-glass-surface-blur)); -webkit-backdrop-filter: blur(var(--semantic-glass-surface-blur)); }
    ${text} { color: inherit; }`;
}
