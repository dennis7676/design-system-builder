# pattern-batch-b (C3 P3 rollout: retro, warm-creator, expressive, creative-multiscale)

## Why

Final P3 rollout batch: the expressive-family recipes. Batch contract
mirrors P2 batch b: edits ONLY its recipes' JSONs, appends to
`COMPONENT_P3_ROLLOUT`, owns `golden/pattern-b.test.ts`, and — as the
closing batch — asserts full P3 parity across all 8 recipes against the
recipe directory.

## Expression intent (recipe × pattern divergence)

Alias-first; diverge per archetype, mirroring each recipe's P1/P2 rows:

| recipe | pattern divergence |
|---|---|
| retro | poster rhythm — 0 cardRadius, thick 2px borders, bold featured tier treatment, chunky footer border |
| warm-creator | warm organic — pill-adjacent cardRadius, soft muted tones, generous gaps, tactile featureGrid cells |
| expressive | loud — high-chroma featured pricing tier, pronounced hero presence, larger cardRadius; gradient-adjacent treatments only if they reuse existing gradient vocabulary |
| creative-multiscale | scale contrast — deliberately split scales: dense featureGrid vs oversized hero paddingY, asymmetric gaps |

## What Changes

- `references/recipes/retro.json`, `warm-creator.json`,
  `expressive.json`, `creative-multiscale.json`: full P3 pattern trees.
- `src/component-registry.ts`: append the 4 recipes to
  `COMPONENT_P3_ROLLOUT` (the only shared-file touch).
- `golden/pattern-b.test.ts` (new): per-recipe P3 parity, declared-pair
  gating, specimen completeness, build-hash pins, and full-parity
  assertion across all 8 recipes against the recipe directory.

## Non-goals

Shared code changes; P4 vocabulary; demo-page adoption.

## Impact

- **Added**: `golden/pattern-b.test.ts`.
- **Modified**: the 4 recipe JSONs, `COMPONENT_P3_ROLLOUT`.
- **Invariant**: P3 rollout now covers all 8 recipes; P1/P2 parity
  untouched; foundation code untouched.
