# add-motion-vocabulary

## Why

The video adapter spike (2026-07-03-add-video-adapter-spike) created the first
real consumer for easing tokens: Remotion's `Easing.bezier(x1, y1, x2, y2)`.
Per the 2026-07-02 checkpoint sequencing, the motion vocabulary was deliberately
held until this consumption surface existed, so easing is now designed against
a concrete contract instead of speculatively. This change:

1. Ships the expressive motion vocabulary (7th vocabulary axis, following the
   elevation/gradient precedent: per-recipe personality, surface consumption
   is expressive-only, gated by static goldens).
2. Unlocks the `motion.easing` DEFERRED override (recipe-selection
   `DEFERRED_OVERRIDES` has carried it as a stub since the pilot).
3. Removes `cubicBezier` from `VIDEO_SKIPPED_TYPES` — the spike's explicit
   skip accounting shrinks by one (shadow/gradient remain full-M4 scope).

## What Changes

### Token shape (DTCG-conform, breaking for nobody)

`cubicBezier` leaves use the DTCG value shape: `$value: [x1, y1, x2, y2]`
(4 numbers, x1/x2 clamped to [0,1] by the validator; y unbounded to allow
overshoot). No token in any recipe currently has `$type: "cubicBezier"`, so
changing the web realizer from string-passthrough to array-formatting breaks
zero existing documents and zero goldens.

### Per-recipe primitives (additive re-baseline)

Each of the 8 recipes gains `primitive.motion.easing.{standard, enter, exit}`
with archetype-matched personalities (values are normative, not illustrative):

| recipe | standard | enter | exit |
|---|---|---|---|
| minimal-tech | [0.2, 0, 0, 1] | [0, 0, 0, 1] | [0.3, 0, 1, 1] |
| enterprise | [0.25, 0.1, 0.25, 1] | [0, 0, 0.2, 1] | [0.4, 0, 1, 1] |
| pro-emotive | [0.4, 0, 0.2, 1] | [0, 0, 0.1, 1] | [0.4, 0, 1, 1] |
| expressive | [0.34, 1.2, 0.64, 1] | [0.16, 1.1, 0.3, 1] | [0.6, 0, 0.8, 0.6] |
| creative-multiscale | [0.68, -0.3, 0.32, 1.3] | [0.2, 1.25, 0.4, 1] | [0.7, -0.2, 0.9, 0.6] |
| warm-creator | [0.25, 0.46, 0.45, 0.94] | [0.1, 0.6, 0.3, 1] | [0.5, 0, 0.75, 0.7] |
| luxury | [0.19, 1, 0.22, 1] | [0.1, 0.8, 0.2, 1] | [0.55, 0, 0.85, 0.5] |
| retro | [0.7, 0, 0.3, 1] | [0.5, 0, 0.1, 1] | [0.9, 0, 0.5, 1] |

Rationale: functional archetypes (minimal-tech/enterprise/pro-emotive) stay
inside Material-style decisive curves; expressive archetypes gain bounded
overshoot (y outside [0,1]); luxury = easeOutExpo-family grace; retro = sharp
symmetric snap. Overshoot never appears on `exit` y2 > 1 (elements leaving
must settle, not bounce past).

### Semantic roles (alias-only)

`semantic.motion.easing.{standard, enter, exit}` referencing the primitives
(`$class: "adapter-derived"`, mirroring `semantic.motion.transition`). The
existing `transition` duration alias is untouched.

### Surfaces (expressive-only consumption)

- **Web (tokens.css)**: cubicBezier realizes to `cubic-bezier(x1, y1, x2, y2)`.
  demo.html interactive elements (buttons, links, form controls) consume
  `var(--semantic-motion-easing-standard)` with the existing transition
  duration var; no hardcoded curve literals (anti-hardcode golden mirrors
  G-D5).
- **Styleguide**: motion section row listing the three easing roles with
  their raw values (static, no animation runtime).
- **Video (tokens.ts)**: cubicBezier leaves emit as `[x1, y1, x2, y2]`
  readonly tuples (`as const`), consumable by `Easing.bezier(...)`. Remove
  `"cubicBezier"` from `VIDEO_SKIPPED_TYPES`; the generated header's skip
  echo shrinks accordingly (existing G-V goldens asserting the skip list
  must be updated, not deleted).

### DEFERRED unlock (constrained override)

- Remove `"motion.easing"` from `DEFERRED_OVERRIDES`.
- New override axis `motion.easing` with enum range
  `["subtle", "standard", "expressive", "dramatic"]` (validated by the
  existing enum-range machinery). Each preset maps to a full
  {standard, enter, exit} triple defined once in the override module:
  - subtle: [0.2, 0, 0, 1] / [0, 0, 0, 1] / [0.3, 0, 1, 1]
  - standard: [0.4, 0, 0.2, 1] / [0, 0, 0.1, 1] / [0.4, 0, 1, 1]
  - expressive: [0.34, 1.2, 0.64, 1] / [0.16, 1.1, 0.3, 1] / [0.6, 0, 0.8, 0.6]
  - dramatic: [0.68, -0.3, 0.32, 1.3] / [0.2, 1.25, 0.4, 1] / [0.7, -0.2, 0.9, 0.6]
- The override replaces the recipe's `primitive.motion.easing` triple
  wholesale and records provenance in `meta` (accent `colorOverride`
  precedent). Semantic aliases resolve through, so surfaces pick it up with
  zero additional wiring.
- SKILL interview: expose in Phase 2 next to the expression question ("동작
  느낌" — 4지선다, default = recipe 고유값 유지, 선택 시에만 override).

### Validator

- cubicBezier structural check: exactly 4 finite numbers, x1/x2 ∈ [0,1].
- No contrast interaction (motion is achromatic) — contrast machinery
  untouched.

## R1 / keystone impact

Adding leaves to recipe base trees changes `computeTokenHash(build(minimal-tech))`.
This is an **additive re-baseline** (typography P2 precedent):

1. Superset gate first: every leaf of the current keystone fixture must exist
   deep-equal in the new build (additions only, zero mutations).
2. Keystone regeneration is **L3** — implementation stops with the gate
   proven and the old keystone still in place (one intentionally-failing R1
   test is acceptable at handover); the operator regenerates the keystone
   only after explicit user approval.

## Non-goals

- shadow/gradient video realization (full-M4 remainder).
- Animation runtime, keyframes, or spring physics — vocabulary only.
- Per-recipe `transformContract.video` declarations.
- Duration vocabulary expansion (fast/normal stay as-is).

## Impact

- **Modified**: `references/recipes/*.json` (8, additive), `src/transformer.ts`
  (web cubicBezier array realizer + video skip-list), `src/recipe-selection.ts`
  (DEFERRED removal + enum axis), `src/tokens-builder.ts` (override
  application + meta provenance), `src/demo-generator.ts` (easing var
  consumption + styleguide motion row), `SKILL.md` (interview question),
  `golden/video.test.ts` (skip-list assertions).
- **Added**: `golden/motion.test.ts` (G-M goldens: per-recipe values, alias
  resolution, web/video realization, override wholesale-replacement +
  provenance, x-clamp validator, superset gate).
- **Keystone**: regenerated post-gate under L3 approval only.
