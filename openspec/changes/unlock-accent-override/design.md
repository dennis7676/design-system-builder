# Design — unlock-accent-override

## D1. Why hue-delta rotation (not single-leaf replacement)

Measured palettes (2026-07-02): every recipe carries 1–4 chromatic leaves in
one hue family (e.g. retro: brand.600 H40 + brand.700 H40 + mustard accent +
a warm-tinted neutral.600 C0.04 H55). Replacing only "the accent" would tear
these relationships. Rotating ALL chromatic leaves by one delta preserves the
recipe's internal colour grammar while landing the user's hue. Threshold:
chroma ≥ 0.03 (below = intentional neutral).

Anchor = the primitive leaf that `semantic.color.primary.default` resolves
to. `delta = ((requestedHue − anchorHue) mod 360)`.

## D2. Why L is fixed and C is clamped

- L carries the recipe's tonal architecture (hover ramps, dark anchors) and
  is the main contrast driver — held constant by default.
- C is aspirational: the recipe's chroma may not exist in sRGB at the new
  hue. Clamp: binary search the max in-gamut C at (L, H′), 24 iterations,
  `min(recipeC, maxC)`. Deterministic, no dithering.
- Implementation needs `oklchToLinearRGB` (for gamut test) and formatting
  back to `oklch(L C H)` strings with fixed precision (3 decimals L/C,
  integer-ish H rounded to 1 decimal) so output is byte-stable.

## D3. Contrast repair — nearest-fix, bounded, deterministic

Rotation changes relative luminance at equal L (worst case: hues 60–110 at
L≈0.5 are far lighter than blue — white-on-primary text drops below 4.5).
Repair loop per failing pair, in declared `contrastPairs` order:

1. Identify the bg-role leaf (the pair's `bg` resolution target).
2. Step its L by 0.005 per iteration, direction = away from fg luminance
   (darken bg under a light fg, lighten under a dark fg), re-clamping C at
   each step, until the pair passes its floor (text 4.5 / large 3 / non-text
   3 — whatever the validator's existing floor for that pair role is).
3. Bound: |ΔL| ≤ 0.06. Exceeded ⇒ build error
   `accent-contrast-unrepairable` carrying the pair, measured ratio, and the
   attempted range. The gate stays the oracle; no silent fallback.
4. A leaf repaired for one pair is re-checked against all earlier pairs
   (single re-pass; the loop is over a fixed pair list, so termination is
   structural).

Corrections echo at `meta.colorOverride.corrections[]` as
`{ path, from, to, pair }` — meta documents, primitives carry the truth.

## D4. cold_warm subsumption

`tone_vector.cold_warm` was deferred for the same contrast reason. With
accent unlocked it becomes redundant: warmth = a hue choice. Keeping both
would demand precedence rules between two colour knobs (which wins when both
are set?) for zero expressive gain. It leaves `DEFERRED_OVERRIDES`; an
attempt to use it now fails as an unknown axis with a message pointing to
`visual.accent`. `motion.easing` remains deferred (motion increment).

## D5. Validation surface

`validateBrand`: `visual.accent` must be an integer in [0, 359]. Type-level:
`OVERRIDE_RANGES` gains the axis with a numeric range marker (existing map is
enum-valued; extend the type to allow a numeric-range descriptor rather than
forcing hue strings).

## D6. Goldens (golden/accent.test.ts)

| Gate | Assertion |
|---|---|
| G-C1 anchor | no-override build of every recipe byte-identical to pre-change; R1 keystone hash unmoved |
| G-C2 sweep | hues {60, 110, 200, 275, 350} × 8 recipes: build succeeds (or a bounded, explicit unrepairable error — expected NONE; if any hue/recipe combination is legitimately unrepairable the golden pins that exact failure), gate PASS, every text pair ≥ 4.5 post-repair |
| G-C3 relationships | for retro (multi-hue recipe): pairwise hue deltas between chromatic leaves preserved (mod 360, ±0.5°) |
| G-C4 gamut | every output colour parses (parseColor non-null) and round-trips within sRGB |
| G-C5 determinism | same brand.json built twice ⇒ byte-identical tokens.json including meta.colorOverride |
| G-C6 brand gate | accepts 0/359, rejects -1/360/"warm"/3.5; cold_warm now unknown-axis with subsumption hint; motion.easing still deferred |

## D7. Placement & interplay

`applyOverrides` already runs before locale splice and before the doc is
assembled; accent rotation slots inside it (order: radius → speed → accent).
`computeTypeScale` reads font sizes only — untouched. Elevation/gradient
tokens: gradient stops are colour leaves; if chromatic they rotate with the
same delta (they are primitives in the same tree) and the existing
worst-case-stop gradient gate re-validates them — no special casing.

## D8. Out of scope

Named-colour input ("#e91e63", "rose") — hue integer only in this increment;
a hue-extraction front-end can come with the interview exposure. Per-leaf
manual colour overrides. Dark mode derivation.
