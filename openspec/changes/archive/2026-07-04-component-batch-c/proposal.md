# component-batch-c — loud / multiscale

## Why

C3 P1 rollout batch C of 3 (foundation `add-component-foundation`
shipped 2026-07-04). Extends the P1 component layer to: **expressive, creative-multiscale**.
Shared code is frozen by the foundation — this batch touches ONLY its
recipe JSONs, the rollout set, and its own golden file.

## What Changes

- `references/recipes/{expressive/creative-multiscale}.json`: full P1 component tree
  (exact `COMPONENT_P1_PATHS` shape) per the expression matrix rows:
  - expressive: high-chroma fills, larger radius, gradient accent on primary button (reuses gradient vocabulary), pronounced transitions
  - creative-multiscale: deliberately split scales — badge tiny/mono vs card oversized padding, asymmetric input padding
  Alias-first: leaves alias semantic tokens unless the matrix demands
  divergence.
- `src/component-registry.ts`: append expressive, creative-multiscale to `COMPONENT_P1_ROLLOUT`
  (append-only — do not reorder or touch other entries).
- `golden/component-c.test.ts` (new, this batch's ONLY golden file):
  parity acceptance per recipe, specimen completeness, pair floors green,
  tokenHash pins.
- Full-parity assertion: all 8 recipes rolled out (this batch lands last).

## Hard rules (batch contract)

- Do NOT modify shared code (validator/builder/generators/manifest), other
  recipes' JSONs, or other golden files.
- All contrast pairs must pass floors with real values (repair loop may
  correct; unrepairable = redesign the value, never weaken a floor).
- `npm test` green + `npx tsc --noEmit` clean.
