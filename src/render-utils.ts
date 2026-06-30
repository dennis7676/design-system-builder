import { type LeafToken, type TokenGroup, isAlias, isLeaf } from "./tokens-schema.js";
import { entriesFrom, resolveToken, tokenMap, type TokenEntry } from "./surface-data.js";
import type { TokensDocument } from "./tokens-schema.js";

export function htmlEscape(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function mdEscape(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

export function groupOf(parent: TokenGroup, key: string): TokenGroup | null {
  const node = parent[key];
  if (node === undefined || isLeaf(node)) return null;
  return node;
}

export function tokenEntriesUnder(
  parent: TokenGroup,
  key: string,
  prefix: string,
): readonly TokenEntry[] {
  const group = groupOf(parent, key);
  return group === null ? [] : entriesFrom(group, prefix);
}

export function tokenRef(leaf: LeafToken): string {
  return isAlias(leaf.$value) ? leaf.$value.slice(1, -1) : "";
}

export function descriptionFor(doc: TokensDocument, entry: TokenEntry): string {
  if (entry.leaf.$description !== undefined) return entry.leaf.$description;
  const terminal = resolveToken(entry.path, tokenMap(doc));
  return terminal.$description ?? "";
}

export function pathTail(path: string, prefix: string): string {
  return path.startsWith(`${prefix}.`) ? path.slice(prefix.length + 1) : path;
}
