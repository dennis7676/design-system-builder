# add-edge-points

## Why

Uniqueness roadmap lever #4 (user-confirmed 2026-07-02): let a user opt into
high-personality effects *before* final confirmation, via concept-fit
proposals — the system suggests only edges that do not break the brand's
concept, the user selects, and a per-edge admission gate keeps every build
safe. This is Round 1 of 2: the full edge infrastructure plus one
end-to-end edge (**texture-grain**). **glass stays DEFERRED** (its
contrast-floor mechanism is Round 2; selecting it must fail loudly, reusing
the DEFERRED_OVERRIDES precedent).

## What Changes

### Edge enum + schema (`src/brand-schema.ts`)

- `brand.json` gains optional top-level `edges?: readonly string[]`.
- Edge enum v1 (versioned, finite): `["texture-grain", "glass"]`.
- `validateBrand()`: unknown edge name → CONFLICT naming the enum;
  `glass` present → CONFLICT `"glass is DEFERRED until its contrast-floor
  gate ships (Round 2)"`. Free-form edge values are impossible by
  construction.

### Concept-fit suggestion (`src/edge-point.ts`, new)

- `EDGE_MENU`: one **centralized** versioned table (not scattered into the 8
  recipe JSONs) — per edge: deterministic fitness predicate keyed on recipe
  id + tone vector fields + expression tier, and a one-line rationale
  template ("why this fits your concept").
- v1 rules (from the confirmed roadmap structure):
  - `texture-grain` fits retro / warm-creator / luxury recipes, and any
    recipe whose tone vector reads warm+organic; **never** offered to
    minimal-tech at `safe` tier.
  - `glass` fits cutting-edge ≥ 5 cool recipes — listed by `suggestEdges()`
    as `deferred: true` (visible but not selectable), so the menu is honest
    about Round 2 without ever producing an unbuildable brand.json.
- `suggestEdges(brand, recipe)` → `[{ edge, rationale, deferred }]`.
  Same brand.json ⇒ same proposals, byte-for-byte: no session drift.

### texture-grain edge (end to end)

- `applyEdges()` in `src/tokens-builder.ts`: when `edges` includes
  `texture-grain`, emit `semantic.texture.overlay` group — pinned SVG
  feTurbulence data-URI constant (versioned in edge-point.ts), blend mode,
  and an opacity leaf **capped at 0.06**.
- **Admission gate** (validator): recompute pair floors against the
  worst-case effective background — background blended with the texture's
  darkest and lightest extremes (same worst-case philosophy as the
  gradient stop gate). Gate reject ⇒ build fails, no matter who asked.
- Fitness violation (hand-edited brand.json carrying an unfit edge) →
  build-blocking CONFLICT carrying the fitness rationale: concept-fit is
  part of the reproducible process, not advice.
- Demo/styleguide consumption: texture overlay on hero/surface panels only,
  var-only (no hardcoded values in generators).

### Interview surface (`SKILL.md`)

- New "Edge selection" step immediately before Confirm (mirrors the export
  gate's `userConfirmed`): show only fitting edges, each with its rationale;
  user picks zero or more → `edges: []` written to brand.json → re-run
  dry-run. Deferred edges render as visible-but-locked with the Round 2 note.

## Non-goals

- glass implementation / contrast-floor mechanism (Round 2).
- Motif tokens (roadmap lever #3), edge-specific motion.
- New texture assets beyond the single pinned grain constant.

## Impact

- **Added**: `src/edge-point.ts`, `golden/edge-point.test.ts`.
- **Modified**: `src/brand-schema.ts`, `src/tokens-builder.ts`,
  `src/validator.ts` (+`src/gate.ts` conflict plumbing if needed),
  `src/transformer.ts` (only if the overlay needs a new leaf rendering),
  demo/styleguide generators (overlay consumption), `SKILL.md`.
- **R1 invariant**: brand.json without `edges` (or `edges: []`) builds
  **byte-identical** to today — keystone and all existing goldens
  unchanged; a golden proves it.
