# add-glass-round2

## Why

Commercial track item 2 (user-confirmed 2026-07-04): lift the last DEFERRED
edge. Glass is only honest if a deterministic gate proves text on a
translucent panel stays readable over *any* backdrop — the backdrop behind a
glass panel is statically unknowable, so the gate must bound it, not guess it.

## Keystone judgment: luminance-interval worst-case (not two-extreme)

The texture gate's two-extreme blend check does **not** transfer to glass.
With texture, overlay opacity ≤ 0.06 barely moves the background; with glass,
backing opacity α ∈ [0.6, 1] leaves up to 40% backdrop contribution, and the
effective background sweeps a *continuous* luminance interval:

- Effective surface: `eff = fill·α + backdrop·(1−α)`, backdrop ∈ [0,1]³.
- Relative luminance is monotone per channel, so reachable eff luminance is
  exactly the closed interval `[lum(blend(fill,#000,α)), lum(blend(fill,#fff,α))]`,
  and **every** interior luminance is reachable by some backdrop.
- If the foreground's luminance falls **inside** that interval, some backdrop
  drives contrast toward 1:1 — a naive two-extreme check PASSES this case.
  That is the trap this gate exists to close.

Gate verdict per fg-on-glass pair:

1. fg luminance ∈ interval → `glass-contrast-collapse` (fail, always).
2. fg luminance outside → worst-case ratio is at the **nearest endpoint**;
   ratio < pair floor → `glass-contrast-fail`.

Blur independence invariant: backdrop-filter blur output at any pixel is a
convex combination of backdrop pixels, which stays inside the backdrop cube —
the gate verdict is independent of the blur radius by construction.

Design consequence (worked example, stated in the spec so it is not
"discovered" later): dark fill (lum ≈ 0.05) under white text needs
α ≳ 0.86 to guarantee AA 4.5:1 against an arbitrary backdrop. Honest glass
is fairly opaque; shipped defaults must already pass the gate.

## What Changes

### Deferred lift

- `src/brand-schema.ts`: remove the `edge-deferred` CONFLICT for `glass`;
  glass is now admitted through fitness + the admission gate.
- `src/edge-point.ts`: `EDGE_MENU` glass entry `deferred: false` with a real
  concept rationale; `suggestEdges()` surfaces glass as selectable for
  `classic_cutting_edge ≥ 5 && cold_warm ≤ 3` (unchanged predicate).
  `validateEdgeFitness()` now rejects unfit hand-added glass like any edge.

### Glass tokens (`src/tokens-builder.ts` applyEdges)

- `edges` includes `"glass"` → `semantic.glass.surface` group:
  - `fill` (color) — derived deterministically from the recipe surface palette,
  - `opacity` (number) — backing α, shipped default passes the gate (≈ 0.88),
  - `blur` (dimension, px),
  - `border` (color).
- Philosophy principle + coverage axis `edge.glass` covering
  `semantic.glass.surface.*` (mirror texture-grain).
- Register `contrastPairs` for every foreground placed on glass panels with
  `bg = "semantic.glass.surface.fill"`. Validator recognizes glass pairs by
  the `semantic.glass.` bg path prefix — no new pair fields.

### Contrast-floor admission gate (`src/validator.ts`)

- `checkGlassSurface(doc, leaves, findings)` mirrors `checkTextureOverlay`:
  - `semantic.glass.surface.*` absent → no-op (no-glass builds untouched).
  - opacity must be a number with
    `GLASS_BACKING_OPACITY_FLOOR (0.6) ≤ α ≤ 1`, else `glass-opacity-floor`.
  - luminance-interval worst-case per glass pair as specified above, with
    findings meta carrying ratio/required/interval endpoints/fg luminance.
- Reuse the linear blend helper (extract the shared formula from
  `blendedTextureBackground` rather than duplicating it).

### Render (var-only)

- Transformer/demo: glass panel consumes only vars —
  `backdrop-filter: blur(var(--semantic-glass-surface-blur))`, background
  composed from fill+opacity (transformer emits an rgba/color-mix var),
  border from the border token. Applied on glass-fitting recipes only.
- Styleguide: edge section renders the glass panel over a deliberately busy
  adversarial backdrop (visual honesty about what the gate proves).
- Video adapter: no new `$type` expected (color/number/dimension reused);
  if one is introduced it joins `VIDEO_SKIPPED_TYPES`.

### Interview surface (`SKILL.md`)

- Edge selection step: glass unlocked (no longer shown as Round-2-locked),
  with its rationale and a one-line note that the gate forces high backing
  opacity — the trade-off is visible at selection time.

## Non-goals

- Motif enum (Commercial track item 5), component expansion (item 3).
- New edges beyond the v1 enum; edge-specific motion.
- Per-page backdrop sampling or any non-deterministic "measured" gate.

## Impact

- **Modified**: `src/brand-schema.ts`, `src/edge-point.ts`,
  `src/tokens-builder.ts`, `src/validator.ts`, `src/transformer.ts` (only if
  a composed background var is needed), demo/styleguide generators,
  `SKILL.md`.
- **Added**: glass golden fixtures + `golden/glass-edge.test.ts` (or extend
  `golden/edge-point.test.ts`).
- **Invariants**: brand.json without `edges` (or without `glass`) builds
  **byte-identical** to today — keystone, texture golden, and all existing
  goldens unchanged; a golden proves it. Gate verdict independent of blur.
