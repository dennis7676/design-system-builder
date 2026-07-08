import { toHexColor } from "./color.js";
import { TokenSurfaceError } from "./surface-data.js";
import { isGradientValue, type LeafToken } from "./tokens-schema.js";

export interface VideoGradientStop {
  readonly color: string;
  readonly position: number;
}

export interface VideoGradientValue {
  readonly kind: "linear" | "radial";
  readonly angle: number | null;
  readonly stops: readonly VideoGradientStop[];
}

export interface VideoShadowLayer {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: string;
  readonly inset: boolean;
}

export type VideoShadowValue = readonly VideoShadowLayer[];

export function realizeVideoGradient(value: LeafToken["$value"]): VideoGradientValue {
  if (!isGradientValue(value)) throw new TokenSurfaceError("gradient intent expected");
  return {
    kind: value.kind,
    angle: value.kind === "linear" ? parseGradientAngle(value.angle) : null,
    stops: value.stops.map((stop, index) => realizeVideoGradientStop(stop, index, value.stops.length)),
  };
}

export function realizeVideoShadow(value: LeafToken["$value"]): VideoShadowValue {
  if (typeof value !== "string") throw new TokenSurfaceError("shadow string expected");
  return splitCssList(value).map(realizeVideoShadowLayer);
}

function parseGradientAngle(angle: string | undefined): number | null {
  if (angle === undefined) return null;
  const match = angle.trim().match(/^([+-]?(?:\d+|\d*\.\d+))deg$/i);
  if (match === null) throw new TokenSurfaceError(`gradient angle must use deg: ${angle}`);
  return Number(match[1]);
}

function realizeVideoGradientStop(stop: string, index: number, total: number): VideoGradientStop {
  const match = stop.trim().match(/^(.*?)\s+([+-]?(?:\d+|\d*\.\d+))%\s*$/);
  const color = match === null ? stop.trim() : match[1]?.trim();
  if (color === undefined || color.length === 0) throw new TokenSurfaceError(`gradient stop color expected: ${stop}`);
  return {
    color: videoColorToHex(color),
    position: match === null ? fallbackStopPosition(index, total) : clamp01(Number(match[2]) / 100),
  };
}

function fallbackStopPosition(index: number, total: number): number {
  if (total <= 1) return 0;
  return index / (total - 1);
}

function realizeVideoShadowLayer(layer: string): VideoShadowLayer {
  const tokens = splitCssTokens(layer);
  const inset = tokens.includes("inset");
  const color = tokens.find(isCssColorToken);
  if (color === undefined) throw new TokenSurfaceError(`shadow color expected: ${layer}`);
  const lengths = tokens
    .filter((token) => token !== "inset" && token !== color)
    .map(parsePxLength);
  const [offsetX, offsetY, blur = 0, spread = 0] = lengths;
  if (offsetX === undefined || offsetY === undefined) {
    throw new TokenSurfaceError(`shadow offset lengths expected: ${layer}`);
  }
  return {
    offsetX,
    offsetY,
    blur,
    spread,
    color: videoColorToHex(color),
    inset,
  };
}

function splitCssList(value: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value) {
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (char === "," && depth === 0) {
      items.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim().length > 0) items.push(current.trim());
  return items;
}

function splitCssTokens(value: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let depth = 0;
  for (const char of value.trim()) {
    if (char === "(") depth++;
    if (char === ")") depth = Math.max(0, depth - 1);
    if (/\s/.test(char) && depth === 0) {
      if (current.length > 0) tokens.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (current.length > 0) tokens.push(current);
  return tokens;
}

function isCssColorToken(token: string): boolean {
  return token.startsWith("#") || /^[a-z]+\(.*\)$/i.test(token);
}

function parsePxLength(token: string): number {
  const match = token.match(/^([+-]?(?:\d+|\d*\.\d+))(?:px)?$/i);
  if (match === null) throw new TokenSurfaceError(`shadow length must be a px number: ${token}`);
  return Number(match[1]);
}

function videoColorToHex(color: string): string {
  return toHexColor(normalizeVideoColor(color));
}

function normalizeVideoColor(color: string): string {
  const trimmed = color.trim();
  const oklch = trimmed.match(/^oklch\(\s*(.*?)\s*\/\s*[+-]?(?:\d+|\d*\.\d+)%?\s*\)$/i);
  if (oklch !== null) return `oklch(${oklch[1]?.trim() ?? ""})`;
  return rgbToHex(trimmed) ?? trimmed;
}

function rgbToHex(color: string): string | null {
  const match = color.match(
    /^rgba?\(\s*([+-]?(?:\d+|\d*\.\d+)%?)\s*,\s*([+-]?(?:\d+|\d*\.\d+)%?)\s*,\s*([+-]?(?:\d+|\d*\.\d+)%?)(?:\s*,\s*[+-]?(?:\d+|\d*\.\d+)%?)?\s*\)$/i,
  );
  if (match === null) return null;
  const channels = [match[1], match[2], match[3]];
  if (channels.some((channel) => channel === undefined)) return null;
  return `#${channels.map((channel) => rgbChannelToHex(channel ?? "0")).join("")}`;
}

function rgbChannelToHex(channel: string): string {
  const value = channel.endsWith("%") ? (Number(channel.slice(0, -1)) / 100) * 255 : Number(channel);
  return Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0");
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
