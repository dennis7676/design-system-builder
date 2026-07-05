# composite-batch-a (C3 P2 rollout: enterprise, pro-emotive, luxury)

## Why

Roll the P2 composite contract (nav/table/modal/formRow, shipped in
`add-composite-foundation`) out to the professional-family recipes.
Batch contract mirrors the P1 precedent: this change edits ONLY its
recipes' JSONs, appends its recipes to `COMPONENT_P2_ROLLOUT`, and owns
`golden/composite-a.test.ts`. Shared code is frozen by the foundation.
Batches run sequentially on the main repo (worktree parallelism banned).

## Expression intent (recipe × composite divergence)

Alias-first; diverge only where the archetype demands, mirroring each
recipe's P1 component row:

| recipe | composite divergence |
|---|---|
| enterprise | briefing density — compact table cell padding, 2px top-rule nav accent, squarish modal radius, strong error border |
| pro-emotive | balanced professional — medium modal radius, soft panel shadow, calm hover row shift |
| luxury | editorial whitespace — generous cell padding and modal padding, thin hairline table borders, letter-spaced nav, subdued stripe (barely-there) |

## What Changes

- `references/recipes/enterprise.json`, `pro-emotive.json`, `luxury.json`:
  full P2 composite trees.
- `src/component-registry.ts`: append the 3 recipes to
  `COMPONENT_P2_ROLLOUT` (the only shared-file touch).
- `golden/composite-a.test.ts` (new): per-recipe P2 parity, declared-pair
  gating, specimen completeness, build-hash pins for the 3 recipes.

## Non-goals

Shared code changes; other recipes; P3 patterns.

## Impact

- **Added**: `golden/composite-a.test.ts`.
- **Modified**: the 3 recipe JSONs, `COMPONENT_P2_ROLLOUT`.
- **Invariant**: recipes outside the (now 4-recipe) P2 rollout build
  byte-identical; P1 parity untouched; foundation code untouched.
