# add-video-adapter-spike

## Why

The project's declared core differentiator — multi-target adapters, especially
tokens.json → video (Remotion) — has received zero increments while the
expressive vocabulary axis shipped six in a row (elevation, gradient,
expression, locale, typography, accent). M4 (PRD v2.4 §9) closes the
"tokens→Remotion direct path" gap that no existing generator covers
(deep-research R4: `vercel-labs/skill-remotion-geist` is the closest prior
art, but it hardcodes Geist rather than consuming a generated token SSOT).

Sequencing rationale (2026-07-02 handoff checkpoint): motion-vocabulary work
(`motion.easing`, currently DEFERRED) gains its first real consumer inside
M4, so the video adapter goes first and the motion vocabulary is designed
against an existing consumption surface instead of speculatively.

This change is deliberately a SPIKE — one surface, minimal wiring — to
de-risk the full M4 before committing to per-recipe contract declarations.

## What Changes

- **Schema (type-only, hash-neutral).** `TransformContract` gains an optional
  `video` key (`color: "hex"`, `duration: "ms"`, `dimension: { base, unit:
  "px" }`). No recipe JSON is touched, so no token document changes and the
  R1 keystone hash is provably unchanged (gated by G-V0).
- **Transformer.** New `toRealizedVideo(doc)` alongside `toRealizedWeb`:
  colors realize to `#rrggbb` hex (Remotion `interpolateColors` cannot take
  oklch; SSR forbids CSS-variable runtime dependency), dimensions to px
  numbers, durations to ms numbers, fontFamily to string arrays,
  fontWeight/number pass through. `target-only:` filtering mirrors web
  (`target-only:video` only). `shadow` / `gradient` / `cubicBezier` are
  EXPLICITLY skipped in the spike (returned in a `skipped` list, echoed in
  the generated header — no silent caps); they are full-M4 + motion-vocabulary
  scope.
- **Color util.** `linearToHex` / `toHexColor` in `src/color.ts` (gamma
  encode + clamp of the existing linear-RGB path).
- **Video adapter.** `src/adapters/video-adapter.ts` → `toTokensTs(doc)`
  emitting a self-contained `tokens.ts`: nested `as const` token tree,
  `fontAssets` (unique families for load wiring), and `toFrames(ms, fps,
  rounding)` — the helper is a single source shared between the adapter
  module (unit-testable) and the emitted text.
- **Wiring.** `index.ts` re-export + `build` CLI writes `tokens.ts` next to
  `tokens.css`.

## Capabilities

### New Capabilities
- `video-adapter` (spike tier): a token document realizes deterministically
  to a self-contained Remotion-consumable `tokens.ts` with hex colors, px/ms
  numerics, font asset inventory, and frame conversion, with explicit skip
  accounting for not-yet-realizable types.

### Modified Capabilities
- none (web pipeline untouched; keystone hash unchanged).

## Non-goals (full M4, not this spike)

- Per-recipe `transformContract.video` declarations (additive re-baseline
  via superset gate, operator-approved keystone regeneration).
- `motion.easing` DEFERRED unlock + cubicBezier → `Easing.bezier` tuples.
- shadow/gradient video realization strategy.
- Actual `@remotion/google-fonts` loadFont code generation; the spike emits
  the asset inventory + guidance comment only.
- Remotion example composition / runtime E2E.

## Impact

- **Modified**: `src/tokens-schema.ts` (optional type key), `src/color.ts`
  (+2 pure functions), `src/transformer.ts` (+`toRealizedVideo`),
  `src/index.ts`, `src/cli.ts` (one output line).
- **Added**: `src/adapters/video-adapter.ts`, `golden/video.test.ts`
  (G-V0–G-V6).
- **Untouched**: all recipe JSONs, `golden/sample.tokens.json`, gate,
  validator, contrast machinery.
- **Determinism/R1**: zero token-document bytes change; G-V0 locks
  `computeTokenHash(build(minimal-tech)) === keystone` after the schema edit.
