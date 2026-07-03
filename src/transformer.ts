import {
  type DimensionIntent,
  type LeafToken,
  type LeafType,
  type TokensDocument,
  isCubicBezierValue,
  isDimensionIntent,
  isGradientValue,
} from "./tokens-schema.js";
import { resolveToken, tokenEntries, tokenMap, TokenSurfaceError } from "./surface-data.js";
import { toHexColor } from "./color.js";

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

export type VideoRealizedValue = string | number | readonly string[] | readonly number[];

export interface RealizedVideo {
  /** path → Remotion-consumable value (hex string, px/ms number, family array). */
  values: Map<string, VideoRealizedValue>;
  /** paths whose $type the video target cannot realize yet (full-M4 scope). */
  skipped: string[];
}

/** $types the video spike deliberately does not realize (shadow/gradient = full M4). */
const VIDEO_SKIPPED_TYPES: ReadonlySet<LeafType> = new Set(["shadow", "gradient"]);

export function toRealizedVideo(doc: TokensDocument): RealizedVideo {
  const leaves = tokenMap(doc);
  const base = doc.transformContract.dimension?.video?.base
    ?? doc.transformContract.dimension?.web?.base
    ?? 16;
  const values = new Map<string, VideoRealizedValue>();
  const skipped: string[] = [];
  for (const entry of tokenEntries(doc)) {
    if (!isVideoExportable(entry.leaf)) continue;
    const resolved = resolveToken(entry.path, leaves);
    if (VIDEO_SKIPPED_TYPES.has(resolved.$type)) {
      skipped.push(entry.path);
      continue;
    }
    values.set(entry.path, realizeVideo(resolved.$type, resolved.$value, base));
  }
  return { values, skipped };
}

function isVideoExportable(leaf: LeafToken): boolean {
  if (!leaf.$class.startsWith("target-only:")) return true;
  return leaf.$class === "target-only:video";
}

function realizeVideo(type: LeafType, value: LeafToken["$value"], base: number): VideoRealizedValue {
  switch (type) {
    case "color":
      if (typeof value !== "string") throw new TokenSurfaceError("color string expected");
      return toHexColor(value);
    case "dimension": {
      const dimension = requireDimension(value);
      switch (dimension.unit) {
        case "abstract":
          return dimension.value * base;
        case "px-base":
          return dimension.value;
        case "ms":
          throw new TokenSurfaceError("dimension cannot use ms unit");
      }
      break;
    }
    case "duration": {
      const duration = requireDimension(value);
      if (duration.unit !== "ms") throw new TokenSurfaceError("duration must use ms unit");
      return duration.value;
    }
    case "fontFamily":
      if (!Array.isArray(value)) throw new TokenSurfaceError("fontFamily array expected");
      return value;
    case "fontWeight":
    case "number":
      if (typeof value !== "number") throw new TokenSurfaceError(`${type} number expected`);
      return value;
    case "cubicBezier":
      return requireCubicBezier(value);
    case "shadow":
    case "gradient":
      throw new TokenSurfaceError(`${type} is not video-realizable in the spike`);
  }
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
    case "cubicBezier":
      return realizeCubicBezier(value);
    case "shadow":
      if (typeof value !== "string") throw new TokenSurfaceError("shadow string expected");
      return value;
    case "gradient":
      return realizeGradient(value);
  }
}

function realizeGradient(value: LeafToken["$value"]): string {
  if (!isGradientValue(value)) throw new TokenSurfaceError("gradient intent expected");
  const stops = value.stops.join(", ");
  return value.kind === "radial"
    ? `radial-gradient(${stops})`
    : `linear-gradient(${value.angle ?? "180deg"}, ${stops})`;
}

function realizeCubicBezier(value: LeafToken["$value"]): string {
  const [x1, y1, x2, y2] = requireCubicBezier(value);
  return `cubic-bezier(${formatNumber(x1)}, ${formatNumber(y1)}, ${formatNumber(x2)}, ${formatNumber(y2)})`;
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

function requireCubicBezier(value: LeafToken["$value"]): readonly [number, number, number, number] {
  if (!isCubicBezierValue(value)) throw new TokenSurfaceError("cubicBezier array expected");
  return value;
}

function formatFamily(name: string): string {
  if (!/\s/.test(name)) return name;
  return `"${name.replaceAll('"', '\\"')}"`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}
