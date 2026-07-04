# component-batch-a — professional / density

## Why

C3 P1 rollout batch A of 3 (foundation `add-component-foundation`
shipped 2026-07-04). Extends the P1 component layer to: **enterprise, pro-emotive**.
Shared code is frozen by the foundation — this batch touches ONLY its
recipe JSONs, the rollout set, and its own golden file.

## What Changes

- `references/recipes/{enterprise/pro-emotive}.json`: full P1 component tree
  (exact `COMPONENT_P1_PATHS` shape) per the expression matrix rows:
  - enterprise: compact padding, 2px top-rule accents, squarish radius, strong 2px focus ring
  - pro-emotive: medium radius, soft elevation on card, calm transition timing
  Alias-first: leaves alias semantic tokens unless the matrix demands
  divergence.
- `src/component-registry.ts`: append enterprise, pro-emotive to `COMPONENT_P1_ROLLOUT`
  (append-only — do not reorder or touch other entries).
- `golden/component-a.test.ts` (new, this batch's ONLY golden file):
  parity acceptance per recipe, specimen completeness, pair floors green,
  tokenHash pins.

## Hard rules (batch contract)

- Do NOT modify shared code (validator/builder/generators/manifest), other
  recipes' JSONs, or other golden files.
- All contrast pairs must pass floors with real values (repair loop may
  correct; unrepairable = redesign the value, never weaken a floor).
- `npm test` green + `npx tsc --noEmit` clean.
