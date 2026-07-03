import type { BrandJson, BrandOverrides } from "./brand-schema.js";
import { normalizeToneVector } from "./brand-schema.js";
import { MOTION_EASING_PRESETS, type MotionEasingPreset, type MotionEasingTriple } from "./motion-easing.js";
import type { Recipe } from "./recipe-selection.js";
import { aliasPath, isAlias, isGradientValue, MIN_RATIO, type ColorOverrideCorrection, type ColorOverrideMeta, type ContrastPair, type CubicBezierValue, type LeafToken, type MotionOverrideMeta, type Philosophy, type TokenGroup, type TokensDocument } from "./tokens-schema.js";
import { clampOklchChroma, contrastRatio, formatOklch, parseColor, parseOklch, relativeLuminance, type Oklch } from "./color.js";
import { flatten } from "./validator.js";

export class BuildError extends Error {
  constructor(message: string, readonly code?: string, readonly meta?: Record<string, unknown>) {
    super(message); this.name = "BuildError";
  }
}

const RADIUS_FACTOR = { tighter: 0.5, looser: 1.5 } as const;
const SPEED_FACTOR = { snappier: 0.75, calmer: 1.5 } as const;
const CHROMA_THRESHOLD = 0.03;
const CONTRAST_REPAIR_STEP = 0.005;
const CONTRAST_REPAIR_BOUND = 0.06;
const PRIMARY_PATH = "semantic.color.primary.default";

export interface BuildOptions { readonly generatedAt?: string; }

const SCHEMA_VERSION = "2026-06-30";

export function buildTokens(brand: BrandJson, recipe: Recipe, opts: BuildOptions = {}): TokensDocument {
  if (recipe.base === null || recipe.philosophy === null) {
    throw new BuildError(
      `recipe '${recipe.key}' is a deferred stub with no base token tree; cannot build`,
    );
  }
  const base = structuredClone(recipe.base) as MutableBase;
  const typeScale = computeTypeScale(base.primitive, recipe.typeScale?.ratio);

  const overrideMeta = applyOverrides(base, brand.overrides ?? {});
  applyLocaleFonts(base, brand, recipe);

  return {
    version: "1.0.0",
    schemaVersion: SCHEMA_VERSION,
    meta: {
      generatedAt: opts.generatedAt ?? "1970-01-01T00:00:00Z",
      recipe: recipe.key,
      toneVector: normalizeToneVector(brand.branding.tone_vector),
      requiredTargets: targetsFor(brand),
      philosophy: recipe.philosophy as Philosophy,
      typeScale,
      ...(brand.expression !== undefined ? { expression: brand.expression } : {}),
      ...(brand.product.locales !== undefined && brand.product.locales.length > 0 ? { locales: [...brand.product.locales] } : {}),
      ...(recipe.skeleton !== undefined ? { skeleton: recipe.skeleton } : {}),
      ...(overrideMeta.colorOverride !== undefined ? { colorOverride: overrideMeta.colorOverride } : {}),
      ...(overrideMeta.motionOverride !== undefined ? { motionOverride: overrideMeta.motionOverride } : {}),
    },
    transformContract: base.transformContract,
    contrastPairs: base.contrastPairs,
    primitive: base.primitive,
    semantic: base.semantic,
    component: base.component,
  };
}

function computeTypeScale(
  primitive: TokensDocument["primitive"],
  explicitRatio: number | undefined,
): TokensDocument["meta"]["typeScale"] {
  const anchors = { caption: dimensionValueAt(primitive, ["font", "size", "caption"]), body: dimensionValueAt(primitive, ["font", "size", "body"]), heading: dimensionValueAt(primitive, ["font", "size", "heading"]), display: dimensionValueAt(primitive, ["font", "size", "display"]) };
  return { ratio: explicitRatio ?? round4(Math.sqrt(anchors.display / anchors.body)), anchors };
}

function dimensionValueAt(root: Record<string, unknown>, path: readonly string[]): number {
  let node: unknown = root;
  for (const key of path) {
    if (!isRecord(node)) throw new BuildError(`expected token group at ${path.join(".")}`);
    node = node[key];
  }
  if (!isRecord(node)) throw new BuildError(`expected dimension leaf at ${path.join(".")}`);
  const value = node["$value"];
  if (!isRecord(value) || typeof value["value"] !== "number") throw new BuildError(`expected numeric dimension value at ${path.join(".")}`);
  return value["value"];
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }

function targetsFor(brand: BrandJson): string[] {
  return brand.product.medium === "web" ? ["web"] : [brand.product.medium];
}

interface OverrideMeta {
  readonly colorOverride?: ColorOverrideMeta;
  readonly motionOverride?: MotionOverrideMeta;
}

function applyOverrides(base: MutableBase, overrides: BrandOverrides): OverrideMeta {
  if (overrides["visual.radius"] !== undefined) scaleDimensionGroup(base.primitive, "radius", RADIUS_FACTOR[overrides["visual.radius"]]);
  if (overrides["motion.speed"] !== undefined) scaleDimensionGroup(base.primitive, "duration", SPEED_FACTOR[overrides["motion.speed"]]);
  const motionOverride = overrides["motion.easing"] === undefined
    ? undefined
    : applyMotionEasingOverride(base, overrides["motion.easing"]);
  const colorOverride = overrides["visual.accent"] === undefined
    ? undefined
    : applyAccentOverride(base, overrides["visual.accent"]);
  return {
    ...(colorOverride !== undefined ? { colorOverride } : {}),
    ...(motionOverride !== undefined ? { motionOverride } : {}),
  };
}

type MutableBase = Pick<TokensDocument, "transformContract" | "contrastPairs" | "primitive" | "semantic" | "component">;
type LeafMap = Map<string, LeafToken>;
type LeafHit = readonly [string, LeafToken];
type ColorTarget = { readonly path: string; readonly leaf: LeafToken; readonly index?: number };
type PairMeasurement = { readonly ratio: number; readonly min: number; readonly fg: string; readonly bgTargets: readonly ColorTarget[] };
type RepairState = { readonly originals: Map<string, Oklch>; readonly chroma: Map<string, number>; readonly corrections: Map<string, ColorOverrideCorrection> };
type RepairContext = { readonly base: MutableBase; readonly pair: ContrastPair; readonly state: RepairState };

function applyMotionEasingOverride(base: MutableBase, preset: MotionEasingPreset): MotionOverrideMeta {
  const primitiveMotion = tokenGroupAt(base.primitive, "motion");
  primitiveMotion.easing = easingLeaves(MOTION_EASING_PRESETS[preset]);
  return { preset };
}

function tokenGroupAt(root: TokenGroup, key: string): TokenGroup {
  const node = root[key];
  if (node === undefined || !isTokenGroup(node)) {
    const group: TokenGroup = {};
    root[key] = group;
    return group;
  }
  return node;
}

function isTokenGroup(value: unknown): value is TokenGroup {
  return isRecord(value) && !("$value" in value);
}

function easingLeaves(triple: MotionEasingTriple): TokenGroup {
  return {
    standard: { $type: "cubicBezier", $value: copyCubicBezier(triple.standard), $class: "portable" },
    enter: { $type: "cubicBezier", $value: copyCubicBezier(triple.enter), $class: "portable" },
    exit: { $type: "cubicBezier", $value: copyCubicBezier(triple.exit), $class: "portable" },
  };
}

function copyCubicBezier(value: CubicBezierValue): CubicBezierValue {
  const [x1, y1, x2, y2] = value;
  return [x1, y1, x2, y2];
}

function applyAccentOverride(base: MutableBase, requestedHue: number): ColorOverrideMeta {
  const leaves = allLeaves(base);
  const anchor = resolveLeaf(PRIMARY_PATH, leaves);
  const parsed = anchor === null ? null : parseOklch(String(anchor[1].$value));
  if (anchor === null || !anchor[0].startsWith("primitive.") || parsed === null) {
    throw new BuildError(`accent anchor unresolved: ${PRIMARY_PATH}`);
  }
  // Anchor rule: the requested hue must land on the recipe's CHROMATIC
  // identity. A recipe with an achromatic primary (luxury: near-black primary
  // + gold accent) anchors on its highest-chroma leaf instead — otherwise the
  // delta would be computed against H=0 and the visible accent would land on
  // an arbitrary hue (observed pre-fix: luxury@350 sent gold to H75).
  const chromatic = parsed.C >= CHROMA_THRESHOLD ? parsed : highestChromaLeaf(leaves);
  if (chromatic === null) {
    // Fully achromatic palette: a silent no-op would claim the requested hue
    // in meta while emitting untouched neutrals — fail loudly instead.
    throw new BuildError(
      `accent-anchor-achromatic: neither ${PRIMARY_PATH} nor any primitive colour leaf has chroma ≥ ${CHROMA_THRESHOLD}; a hue override has nothing to rotate`,
      "accent-anchor-achromatic",
    );
  }
  const delta = normalizeDelta(requestedHue - chromatic.H);
  rotateChromaticLeaves(base, delta);
  const corrections = repairContrastPairs(base);
  return { requestedHue, delta, corrections };
}

function highestChromaLeaf(leaves: LeafMap): Oklch | null {
  let best: Oklch | null = null;
  for (const [path, leaf] of leaves) {
    if (!path.startsWith("primitive.") || leaf.$type !== "color" || typeof leaf.$value !== "string") continue;
    const color = parseOklch(leaf.$value);
    if (color !== null && color.C >= CHROMA_THRESHOLD && (best === null || color.C > best.C)) best = color;
  }
  return best;
}

function rotateChromaticLeaves(base: MutableBase, delta: number): void {
  for (const [path, leaf] of allLeaves(base)) {
    if (path.startsWith("primitive.") && leaf.$type === "color" && typeof leaf.$value === "string") {
      leaf.$value = rotateColor(leaf.$value, delta);
    } else if (leaf.$type === "gradient" && isGradientValue(leaf.$value)) {
      leaf.$value.stops = leaf.$value.stops.map((stop) => rotateColor(stop, delta));
    }
  }
}

function rotateColor(value: string, delta: number): string {
  const color = parseOklch(value);
  return color === null || color.C < CHROMA_THRESHOLD ? value : formatOklch(clampOklchChroma({ L: color.L, C: color.C, H: color.H + delta }));
}

function repairContrastPairs(base: MutableBase): ColorOverrideCorrection[] {
  const state: RepairState = { originals: new Map(), chroma: new Map(), corrections: new Map() };
  for (let pass = 0; pass < 2; pass++) {
    for (const pair of base.contrastPairs) {
      const measurement = measurePair(pair, allLeaves(base));
      if (measurement.ratio >= measurement.min) continue;
      repairPair({ base, pair, state }, measurement);
    }
  }
  const failing = base.contrastPairs
    .map((pair) => ({ pair, measurement: measurePair(pair, allLeaves(base)) }))
    .find((item) => item.measurement.ratio < item.measurement.min);
  if (failing !== undefined) {
    throw unrepairable(failing.pair, failing.measurement);
  }
  return [...state.corrections.values()];
}

function repairPair(context: RepairContext, measurement: PairMeasurement): void {
  let current = measurement;
  while (current.ratio < current.min) {
    const target = worstTarget(current.fg, current.bgTargets);
    const before = parseOklch(targetValue(target));
    if (before === null) throw unrepairable(context.pair, current);
    if (!context.state.originals.has(target.path)) {
      context.state.originals.set(target.path, before);
      context.state.chroma.set(target.path, before.C);
    }
    const start = context.state.originals.get(target.path);
    const targetChroma = context.state.chroma.get(target.path);
    if (start === undefined || targetChroma === undefined) throw unrepairable(context.pair, current);
    const nextL = before.L + repairDirection(current.fg, targetValue(target)) * CONTRAST_REPAIR_STEP;
    if (Math.abs(nextL - start.L) > CONTRAST_REPAIR_BOUND + 1e-10) throw unrepairable(context.pair, current);
    const next = formatOklch(clampOklchChroma({ L: nextL, C: targetChroma, H: before.H }));
    setTargetValue(target, next);
    context.state.corrections.set(target.path, { path: target.path, from: formatOklch(start), to: next, pair: pairLabel(context.pair) });
    current = measurePair(context.pair, allLeaves(context.base));
  }
}

function allLeaves(base: MutableBase): LeafMap {
  return new Map([...flatten(base.primitive, "primitive"), ...flatten(base.semantic, "semantic"), ...flatten(base.component, "component")]);
}

function resolveLeaf(path: string, leaves: LeafMap): LeafHit | null {
  const seen = new Set<string>();
  let current = path;
  for (;;) {
    const leaf = leaves.get(current);
    if (leaf === undefined) return null;
    if (!isAlias(leaf.$value)) return [current, leaf];
    if (seen.has(current)) return null;
    seen.add(current);
    current = aliasPath(leaf.$value);
  }
}

function measurePair(pair: ContrastPair, leaves: LeafMap): PairMeasurement {
  const fgEntry = resolveLeaf(pair.fg, leaves);
  const bgEntry = resolveLeaf(pair.bg, leaves);
  const fg = fgEntry !== null && fgEntry[1].$type === "color" && typeof fgEntry[1].$value === "string"
    ? fgEntry[1].$value
    : null;
  const bgTargets = bgEntry === null ? [] : colorTargets(bgEntry[0], bgEntry[1]);
  if (fg === null || bgTargets.length === 0) {
    return { ratio: 0, min: pair.minRatio ?? MIN_RATIO[pair.role], fg: "", bgTargets: [] };
  }
  const ratios = bgTargets.map((target) => contrastRatio(fg, targetValue(target)) ?? 0);
  return { ratio: Math.min(...ratios), min: pair.minRatio ?? MIN_RATIO[pair.role], fg, bgTargets };
}

function colorTargets(path: string, leaf: LeafToken): readonly ColorTarget[] {
  if (leaf.$type === "color" && typeof leaf.$value === "string") return [{ path, leaf }];
  if (leaf.$type !== "gradient" || !isGradientValue(leaf.$value)) return [];
  return leaf.$value.stops.map((_, index) => ({ path: `${path}.stops[${index}]`, leaf, index }));
}

function targetValue(target: ColorTarget): string {
  return target.index === undefined ? (typeof target.leaf.$value === "string" ? target.leaf.$value : "") : (isGradientValue(target.leaf.$value) ? target.leaf.$value.stops[target.index] ?? "" : "");
}

function setTargetValue(target: ColorTarget, value: string): void {
  if (target.index === undefined) target.leaf.$value = value;
  else if (isGradientValue(target.leaf.$value)) target.leaf.$value.stops[target.index] = value;
}

function worstTarget(fg: string, targets: readonly ColorTarget[]): ColorTarget {
  let worst = targets[0];
  let ratio = worst === undefined ? Number.POSITIVE_INFINITY : contrastRatio(fg, targetValue(worst)) ?? 0;
  for (const target of targets.slice(1)) {
    const next = contrastRatio(fg, targetValue(target)) ?? 0;
    if (next < ratio) {
      worst = target;
      ratio = next;
    }
  }
  if (worst === undefined) throw new BuildError("accent contrast target unresolved");
  return worst;
}

function repairDirection(fg: string, bg: string): number {
  const fgColor = parseColor(fg);
  const bgColor = parseColor(bg);
  return fgColor !== null && bgColor !== null && relativeLuminance(fgColor) <= relativeLuminance(bgColor) ? 1 : -1;
}

function unrepairable(pair: ContrastPair, measurement: PairMeasurement): BuildError {
  return new BuildError(
    `accent-contrast-unrepairable: ${pairLabel(pair)} measured ${measurement.ratio.toFixed(2)}:1 < ${measurement.min}:1 after ±${CONTRAST_REPAIR_BOUND}`,
    "accent-contrast-unrepairable",
    { pair: pairLabel(pair), ratio: Number(measurement.ratio.toFixed(2)), required: measurement.min, attemptedRange: CONTRAST_REPAIR_BOUND },
  );
}

function pairLabel(pair: ContrastPair): string { return `${pair.fg} on ${pair.bg} (${pair.role}/${pair.state})`; }

function normalizeDelta(delta: number): number {
  const normalized = ((delta % 360) + 360) % 360; return normalized > 180 ? normalized - 360 : normalized;
}

function applyLocaleFonts(
  base: { primitive: Record<string, unknown> },
  brand: BrandJson,
  recipe: Recipe,
): void {
  const wanted = brand.product.locales ?? [];
  if (wanted.length === 0 || recipe.locales === undefined) return;
  const family = (base.primitive as { font?: { family?: Record<string, { $value?: unknown }> } }).font?.family;
  if (family === undefined) return;
  for (const loc of wanted) {
    const spec = recipe.locales[loc];
    if (spec === undefined) continue;
    for (const [cls, extra] of Object.entries(spec.append)) {
      const leaf = family[cls];
      if (leaf === undefined || !Array.isArray(leaf.$value)) continue;
      const stack = leaf.$value as string[];
      const fresh = extra.filter((f) => !stack.includes(f));
      stack.splice(Math.min(1, stack.length), 0, ...fresh);
    }
  }
}

interface DimensionLeaf { $value: { value: number; unit: string }; }

function scaleDimensionGroup(primitive: Record<string, unknown>, group: string, factor: number): void {
  const node = primitive[group];
  if (node === undefined || node === null || typeof node !== "object") return;
  for (const leaf of Object.values(node as Record<string, unknown>)) {
    const l = leaf as Partial<DimensionLeaf>;
    if (l.$value !== undefined && typeof l.$value === "object" && typeof l.$value.value === "number") {
      l.$value.value = round4(l.$value.value * factor);
    }
  }
}

function round4(n: number): number { return Math.round(n * 10000) / 10000; }
