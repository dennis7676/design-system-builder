import {
  type DimensionIntent,
  type LeafToken,
  type LeafType,
  type TokensDocument,
  isDimensionIntent,
} from "./tokens-schema.js";
import { resolveToken, tokenEntries, tokenMap, TokenSurfaceError } from "./surface-data.js";

export function toRealizedWeb(doc: TokensDocument): Map<string, string> {
  const leaves = tokenMap(doc);
  const base = doc.transformContract.dimension?.web?.base ?? 16;
  const out = new Map<string, string>();
  for (const entry of tokenEntries(doc)) {
    if (!isWebExportable(entry.leaf)) continue;
    const resolved = resolveToken(entry.path, leaves);
    out.set(entry.path, realize(resolved.$type, resolved.$value, base));
  }
  return out;
}

function isWebExportable(leaf: LeafToken): boolean {
  if (!leaf.$class.startsWith("target-only:")) return true;
  return leaf.$class === "target-only:web";
}

function realize(type: LeafType, value: LeafToken["$value"], base: number): string {
  switch (type) {
    case "color":
      if (typeof value !== "string") throw new TokenSurfaceError("color string expected");
      return value;
    case "dimension":
      return realizeDimension(value, base);
    case "duration":
      return realizeDuration(value);
    case "fontFamily":
      if (!Array.isArray(value)) throw new TokenSurfaceError("fontFamily array expected");
      return value.map(formatFamily).join(", ");
    case "fontWeight":
    case "number":
      if (typeof value !== "number") throw new TokenSurfaceError(`${type} number expected`);
      return String(value);
    case "shadow":
    case "cubicBezier":
      if (typeof value !== "string") throw new TokenSurfaceError(`${type} string expected`);
      return value;
  }
}

function realizeDimension(value: LeafToken["$value"], base: number): string {
  const dimension = requireDimension(value);
  switch (dimension.unit) {
    case "abstract":
      return `${formatNumber(dimension.value)}rem`;
    case "px-base":
      return `${formatNumber(dimension.value / base)}rem`;
    case "ms":
      throw new TokenSurfaceError("dimension cannot use ms unit");
  }
}

function realizeDuration(value: LeafToken["$value"]): string {
  const duration = requireDimension(value);
  if (duration.unit !== "ms") throw new TokenSurfaceError("duration must use ms unit");
  return `${formatNumber(duration.value)}ms`;
}

function requireDimension(value: LeafToken["$value"]): DimensionIntent {
  if (!isDimensionIntent(value)) throw new TokenSurfaceError("dimension intent expected");
  return value;
}

function formatFamily(name: string): string {
  if (!/\s/.test(name)) return name;
  return `"${name.replaceAll('"', '\\"')}"`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}
