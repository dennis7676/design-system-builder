# unlock-accent-override

## Why

`visual.accent` has been DEFERRED since the pilot: a brand asking for its
actual colour (Crystal Ball's "warm feminine" gap, 2026-06-30) gets only the
recipe's structural tone. The blocker was never the splice — it is that hue
rotation moves WCAG contrast (relative luminance depends on hue at equal
OKLCH L; yellows at L≈0.5 are markedly lighter than blues), so an unlocked
accent without contrast re-derivation would let user input break the
accessibility guarantee that defines the tool.

Roadmap SSOT (`docs/uniqueness-roadmap.md` lever #1, user-approved order):
fix L, steer H/C, re-run pair floors, nearest-fix instead of rejection.

## What Changes

- `brand.json overrides["visual.accent"]` accepts an **integer hue 0–359**
  (validateBrand gate). The axis leaves `DEFERRED_OVERRIDES`.
- `tone_vector.cold_warm` is **subsumed, not separately unlocked**: a brand
  that wants warmth names a hue. Two overlapping colour knobs would only add
  precedence conflicts. It is removed from `DEFERRED_OVERRIDES` and documented
  as subsumed; `motion.easing` stays deferred (motion vocabulary increment).
- Builder (`applyOverrides`): compute `delta = requestedHue − hue(anchor)`
  where anchor = the primitive leaf behind `semantic.color.primary.default`.
  For every primitive colour leaf with chroma ≥ 0.03: rotate H by delta
  (mod 360), keep L, clamp C to the sRGB gamut at (L, H′) via deterministic
  binary search. Achromatic neutrals are untouched. Relative hue
  relationships between chromatic leaves are preserved by construction.
- **Contrast repair (nearest-fix)**: after rotation, evaluate every
  `contrastPairs` floor. For a failing pair, step the bg-role leaf's L away
  from the fg in 0.005 increments, bounded ±0.06, first pass wins. Repairs
  are echoed at `meta.colorOverride` (requestedHue, delta, corrections[]).
  Beyond the bound the build FAILS with the measured ratio — the gate stays
  the oracle; the user picks another hue.
- Goldens `golden/accent.test.ts`: no-override anchor (byte-identical, R1
  keystone), worst-case hue sweep {60, 110, 200, 275, 350} × 8 recipes with
  gate PASS and text floors ≥ 4.5 post-repair, hue-relationship preservation,
  gamut validity, and determinism (same input ⇒ byte-identical output).

## Capabilities

### New Capabilities
- `accent-override`: a brand can name its accent hue and receive a system
  whose entire chromatic palette rotates coherently to it, with WCAG floors
  re-proven on every declared pair — deterministically, with L-preserving
  nearest-fix repair and a hard gate when repair is impossible.

## Impact

- **Modified**: `src/brand-schema.ts` (override type + validation),
  `src/recipe-selection.ts` (DEFERRED_OVERRIDES shrink), `src/color.ts`
  (oklch parse/format helpers, gamut clamp), `src/tokens-builder.ts`
  (rotation + repair), `src/tokens-schema.ts` (meta.colorOverride), new
  `golden/accent.test.ts`.
- **Untouched**: recipes, validator contrast machinery (it is the oracle),
  generators, typography, existing goldens.
- **Determinism/R1**: override absent ⇒ builder path unchanged ⇒ keystone and
  all 140 goldens stay green byte-for-byte. Override present ⇒ intent hash
  moves by design (overrides mutate primitives — same semantics as
  visual.radius/motion.speed).
