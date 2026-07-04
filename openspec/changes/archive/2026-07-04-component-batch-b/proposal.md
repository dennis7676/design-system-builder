# component-batch-b — warm / heritage-expressive

## Why

C3 P1 rollout batch B of 3 (foundation `add-component-foundation`
shipped 2026-07-04). Extends the P1 component layer to: **luxury, retro, warm-creator**.
Shared code is frozen by the foundation — this batch touches ONLY its
recipe JSONs, the rollout set, and its own golden file.

## What Changes

- `references/recipes/{luxury/retro/warm-creator}.json`: full P1 component tree
  (exact `COMPONENT_P1_PATHS` shape) per the expression matrix rows:
  - luxury: generous padding, thin borders, letter-spaced small-cap badge, subdued hover (no lift)
  - retro: 0 radius, thick 2px borders, hard offset shadow on button/card, bold labels
  - warm-creator: pill radius on button/badge/switch, soft shadow, tactile hover lift
  Alias-first: leaves alias semantic tokens unless the matrix demands
  divergence.
- `src/component-registry.ts`: append luxury, retro, warm-creator to `COMPONENT_P1_ROLLOUT`
  (append-only — do not reorder or touch other entries).
- `golden/component-b.test.ts` (new, this batch's ONLY golden file):
  parity acceptance per recipe, specimen completeness, pair floors green,
  tokenHash pins.

## Hard rules (batch contract)

- Do NOT modify shared code (validator/builder/generators/manifest), other
  recipes' JSONs, or other golden files.
- All contrast pairs must pass floors with real values (repair loop may
  correct; unrepairable = redesign the value, never weaken a floor).
- `npm test` green + `npx tsc --noEmit` clean.
