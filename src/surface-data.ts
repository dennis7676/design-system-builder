import {
  type ContrastPair,
  type LeafToken,
  type TokenGroup,
  type TokensDocument,
  aliasPath,
  isAlias,
  isDimensionIntent,
  isGradientValue,
} from "./tokens-schema.js";
import { contrastRatio } from "./color.js";
import { flatten } from "./validator.js";
import { MIN_RATIO } from "./tokens-schema.js";

export class TokenSurfaceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TokenSurfaceError";
  }
}

export interface TokenEntry {
  readonly path: string;
  readonly leaf: LeafToken;
}

export interface AliasRow {
  readonly path: string;
  readonly target: string;
  readonly terminal: string;
  readonly chain: readonly string[];
}

export interface ContrastResult {
  readonly pair: ContrastPair;
  readonly ratio: number;
  readonly minRatio: number;
  readonly pass: boolean;
}

export function contrastKey(pair: ContrastPair): string {
  return `${pair.fg}|${pair.bg}|${pair.role}|${pair.state}`;
}

export function tokenEntries(doc: TokensDocument): readonly TokenEntry[] {
  return [
    ...entriesFrom(doc.primitive, "primitive"),
    ...entriesFrom(doc.semantic, "semantic"),
    ...entriesFrom(doc.component, "component"),
  ];
}

export function tokenMap(doc: TokensDocument): Map<string, LeafToken> {
  return new Map(tokenEntries(doc).map((entry) => [entry.path, entry.leaf]));
}

export function resolveToken(path: string, leaves: ReadonlyMap<string, LeafToken>): LeafToken {
  const chain = resolveChain(path, leaves);
  const terminal = chain[chain.length - 1];
  const leaf = terminal === undefined ? undefined : leaves.get(terminal);
  if (leaf === undefined) throw new TokenSurfaceError(`unresolved token: ${path}`);
  return leaf;
}

export function resolveValue(path: string, leaves: ReadonlyMap<string, LeafToken>): LeafToken["$value"] {
  return resolveToken(path, leaves).$value;
}

export function aliasRows(doc: TokensDocument): readonly AliasRow[] {
  const leaves = tokenMap(doc);
  return tokenEntries(doc).flatMap((entry) => {
      const target = targetPath(entry.leaf);
      if (target === null) return [];
      const chain = resolveChain(entry.path, leaves);
      const terminal = chain[chain.length - 1];
      if (terminal === undefined) throw new TokenSurfaceError(`empty alias chain: ${entry.path}`);
      return { path: entry.path, target, terminal, chain };
    });
}

export function contrastResults(doc: TokensDocument): readonly ContrastResult[] {
  const leaves = tokenMap(doc);
  return doc.contrastPairs.map((pair) => {
    const fg = resolveValue(pair.fg, leaves);
    const bgRaw = resolveValue(pair.bg, leaves);
    if (typeof fg !== "string") {
      throw new TokenSurfaceError(`contrast color unresolved: ${pair.fg} / ${pair.bg}`);
    }
    // Gradient bg → report the worst-case stop (mirrors the validator gate).
    const bg = isGradientValue(bgRaw) ? worstStop(fg, bgRaw.stops) : bgRaw;
    if (typeof bg !== "string") {
      throw new TokenSurfaceError(`contrast color unresolved: ${pair.fg} / ${pair.bg}`);
    }
    const ratio = contrastRatio(fg, bg);
    if (ratio === null) {
      throw new TokenSurfaceError(`contrast color unparseable: ${fg} / ${bg}`);
    }
    const rounded = Number(ratio.toFixed(2));
    const minRatio = pair.minRatio ?? MIN_RATIO[pair.role];
    return { pair, ratio: rounded, minRatio, pass: rounded >= minRatio };
  });
}

/** The gradient stop with the lowest contrast against fg (worst case). */
function worstStop(fg: string, stops: readonly string[]): string {
  let worst = stops[0] ?? fg;
  let worstRatio = Infinity;
  for (const s of stops) {
    const r = contrastRatio(fg, s);
    if (r !== null && r < worstRatio) {
      worstRatio = r;
      worst = s;
    }
  }
  return worst;
}

export function hasTokenPath(doc: TokensDocument, pattern: RegExp): boolean {
  return tokenEntries(doc).some((entry) => pattern.test(entry.path));
}

export function entriesFrom(tree: TokenGroup, prefix: string): readonly TokenEntry[] {
  return [...flatten(tree, prefix)].map(([path, leaf]) => ({ path, leaf }));
}

export function rawDimensionValue(value: LeafToken["$value"]): number {
  if (!isDimensionIntent(value)) throw new TokenSurfaceError("dimension value expected");
  return value.value;
}

function resolveChain(path: string, leaves: ReadonlyMap<string, LeafToken>): readonly string[] {
  const seen = new Set<string>();
  const chain: string[] = [];
  let cursor = path;
  for (;;) {
    if (seen.has(cursor)) throw new TokenSurfaceError(`alias cycle: ${[...seen, cursor].join(" -> ")}`);
    const leaf = leaves.get(cursor);
    if (leaf === undefined) throw new TokenSurfaceError(`unresolved token: ${cursor}`);
    seen.add(cursor);
    chain.push(cursor);
    if (!isAlias(leaf.$value)) return chain;
    cursor = aliasPath(leaf.$value);
  }
}

function targetPath(leaf: LeafToken): string | null {
  return isAlias(leaf.$value) ? aliasPath(leaf.$value) : null;
}
