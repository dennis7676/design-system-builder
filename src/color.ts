/**
 * Color parsing + WCAG contrast. Supports oklch() and hex intent colors.
 * oklch → OKLab → linear sRGB → WCAG relative luminance → contrast ratio.
 */

export interface LinearRGB {
  r: number;
  g: number;
  b: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Parse "oklch(L C H)" — L in [0,1], C ≥ 0, H in degrees. */
function parseOklch(s: string): { L: number; C: number; h: number } | null {
  const m = s
    .trim()
    .match(/^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)\s*\)$/i);
  if (!m) return null;
  let L = parseFloat(m[1]!);
  if (m[1]!.endsWith("%")) L /= 100;
  return { L, C: parseFloat(m[2]!), h: parseFloat(m[3]!) };
}

/** Parse "#rgb" / "#rrggbb" into linear sRGB. */
function parseHex(s: string): LinearRGB | null {
  let hex = s.trim().replace(/^#/, "");
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;
  const srgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return { r: toLinear(srgb[0]!), g: toLinear(srgb[1]!), b: toLinear(srgb[2]!) };
}

/** sRGB gamma → linear. */
function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** OKLCH → linear sRGB (Björn Ottosson's matrices). */
function oklchToLinearRGB(L: number, C: number, hDeg: number): LinearRGB {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

/** Parse a color string into linear sRGB. Returns null if unparseable. */
export function parseColor(s: string): LinearRGB | null {
  const ok = parseOklch(s);
  if (ok) return oklchToLinearRGB(ok.L, ok.C, ok.h);
  return parseHex(s);
}

/** WCAG relative luminance from linear sRGB. */
export function relativeLuminance(c: LinearRGB): number {
  const r = clamp01(c.r);
  const g = clamp01(c.g);
  const b = clamp01(c.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colors (1..21). */
export function contrastRatio(fg: string, bg: string): number | null {
  const cf = parseColor(fg);
  const cb = parseColor(bg);
  if (!cf || !cb) return null;
  const lf = relativeLuminance(cf);
  const lb = relativeLuminance(cb);
  const lighter = Math.max(lf, lb);
  const darker = Math.min(lf, lb);
  return (lighter + 0.05) / (darker + 0.05);
}
