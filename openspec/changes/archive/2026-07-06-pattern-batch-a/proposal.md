# pattern-batch-a (C3 P3 rollout: enterprise, pro-emotive, luxury)

## Why

Roll the P3 pattern contract (hero/pricing/featureGrid/footer, shipped in
`add-pattern-foundation`) out to the professional-family recipes. Batch
contract mirrors the P1/P2 precedent: this change edits ONLY its recipes'
JSONs, appends its recipes to `COMPONENT_P3_ROLLOUT`, and owns
`golden/pattern-a.test.ts`. Shared code is frozen by the foundation.
Batches run sequentially on the main repo (worktree parallelism banned).

## Expression intent (recipe × pattern divergence)

Alias-first; diverge only where the archetype demands, mirroring each
recipe's P1/P2 rows:

| recipe | pattern divergence |
|---|---|
| enterprise | briefing density — compact hero paddingY, dense featureGrid cellPadding, strong featured pricing border, 2px top-rule footer border accent |
| pro-emotive | balanced professional — medium cardRadius, calm muted foregrounds, even gaps |
| luxury | editorial whitespace — generous hero paddingY and cardPadding, thin hairline borders, subdued mutedForeground (still WCAG-passing), airy featureGrid gap |

## What Changes

- `references/recipes/enterprise.json`, `pro-emotive.json`, `luxury.json`:
  full P3 pattern trees.
- `src/component-registry.ts`: append the 3 recipes to
  `COMPONENT_P3_ROLLOUT` (the only shared-file touch).
- `golden/pattern-a.test.ts` (new): per-recipe P3 parity, declared-pair
  gating, specimen completeness, build-hash pins for the 3 recipes.

## Non-goals

Shared code changes; other recipes; P4 vocabulary; demo-page adoption.

## Impact

- **Added**: `golden/pattern-a.test.ts`.
- **Modified**: the 3 recipe JSONs, `COMPONENT_P3_ROLLOUT`.
- **Invariant**: recipes outside the (now 4-recipe) P3 rollout build
  byte-identical tokens.json; P1/P2 parity untouched; foundation code
  untouched.
