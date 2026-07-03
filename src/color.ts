/**
 * Color parsing + WCAG contrast. Supports oklch() and hex intent colors.
 * oklch → OKLab → linear sRGB → WCAG relative luminance → contrast ratio.
 */

export interface LinearRGB {
  r: number;
  g: number;
  b: number;
}

export interface Oklch {
  L: number;
  C: number;
  H: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** Parse "oklch(L C H)" — L in [0,1], C ≥ 0, H in degrees. */
export function parseOklch(s: string): Oklch | null {
  const m = s
    .trim()
    .match(/^oklch\(\s*([+-]?(?:\d+|\d*\.\d+)%?)\s+([+-]?(?:\d+|\d*\.\d+))\s+([+-]?(?:\d+|\d*\.\d+))\s*\)$/i);
  if (!m) return null;
  let L = parseFloat(m[1]!);
  if (m[1]!.endsWith("%")) L /= 100;
  return { L, C: parseFloat(m[2]!), H: normalizeHue(parseFloat(m[3]!)) };
}

export function formatOklch(color: Oklch): string {
  return `oklch(${color.L.toFixed(3)} ${color.C.toFixed(3)} ${normalizeHue(color.H).toFixed(1)})`;
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
export function oklchToLinearRGB(L: number, C: number, hDeg: number): LinearRGB {
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

export function isInSrgbGamut(color: Oklch): boolean {
  const rgb = oklchToLinearRGB(color.L, color.C, color.H);
  const epsilon = 1e-10;
  return (
    rgb.r >= -epsilon && rgb.r <= 1 + epsilon &&
    rgb.g >= -epsilon && rgb.g <= 1 + epsilon &&
    rgb.b >= -epsilon && rgb.b <= 1 + epsilon
  );
}

export function maxSrgbChroma(L: number, H: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (isInSrgbGamut({ L, C: mid, H })) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function clampOklchChroma(color: Oklch): Oklch {
  // Quantize L/H to the serialized precision FIRST: the gamut ceiling must be
  // computed for the values that will actually be emitted, or a chroma that
  // fits the pre-rounding L can escape the gamut of the rounded one
  // (observed near L≈0.004 in an adversarial probe, 2026-07-02).
  const L = Math.round(color.L * 1000) / 1000;
  const H = Math.round(normalizeHue(color.H) * 10) / 10;
  const limited = Math.min(Math.max(0, color.C), maxSrgbChroma(L, H));
  return {
    L,
    C: Math.floor((limited + 1e-12) * 1000) / 1000,
    H,
  };
}

/** Linear sRGB → gamma-encoded #rrggbb (out-of-gamut channels clamped). */
export function linearToHex(rgb: LinearRGB): string {
  const encode = (c: number) => {
    const lin = clamp01(c);
    const srgb = lin <= 0.0031308 ? lin * 12.92 : 1.055 * Math.pow(lin, 1 / 2.4) - 0.055;
    return Math.round(clamp01(srgb) * 255)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${encode(rgb.r)}${encode(rgb.g)}${encode(rgb.b)}`;
}

/** oklch()/hex intent string → #rrggbb. Throws on unparseable input. */
export function toHexColor(s: string): string {
  const rgb = parseColor(s);
  if (!rgb) throw new Error(`unparseable color: ${s}`);
  return linearToHex(rgb);
}

/** Parse a color string into linear sRGB. Returns null if unparseable. */
export function parseColor(s: string): LinearRGB | null {
  const ok = parseOklch(s);
  if (ok) return oklchToLinearRGB(ok.L, ok.C, ok.H);
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

function normalizeHue(h: number): number {
  return ((h % 360) + 360) % 360;
}
