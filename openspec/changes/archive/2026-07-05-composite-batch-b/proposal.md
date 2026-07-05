# composite-batch-b (C3 P2 rollout: retro, warm-creator, expressive, creative-multiscale — full parity)

## Why

Final P2 rollout batch: the expressive/heritage-family recipes. After
this change every recipe in the catalog carries the full P2 composite
contract — this batch asserts **full P2 parity across all 8 recipes**.
Batch contract mirrors P1: edits ONLY its recipes' JSONs, appends to
`COMPONENT_P2_ROLLOUT`, owns `golden/composite-b.test.ts`. Runs after
composite-batch-a lands (sequential, main repo).

## Expression intent (recipe × composite divergence)

Alias-first; diverge per archetype, mirroring each recipe's P1 row:

| recipe | composite divergence |
|---|---|
| retro | poster rhythm — 0 radius, thick 2px table/modal borders, hard offset modal shadow, bold nav labels |
| warm-creator | warm organic — pill-adjacent modal radius, soft shadow, tactile row hover, generous formRow gap |
| expressive | loud — high-chroma nav accent, pronounced stripe contrast, larger modal radius, gradient-adjacent panel treatment only if it reuses existing gradient vocabulary |
| creative-multiscale | scale contrast — deliberately split scales: dense table vs oversized modal padding, asymmetric formRow gap |

## What Changes

- `references/recipes/retro.json`, `warm-creator.json`, `expressive.json`,
  `creative-multiscale.json`: full P2 composite trees.
- `src/component-registry.ts`: append the 4 recipes to
  `COMPONENT_P2_ROLLOUT` → rollout complete (8/8).
- `golden/composite-b.test.ts` (new): per-recipe P2 parity,
  declared-pair gating, specimen completeness, build-hash pins, and a
  **full-parity assertion**: every catalog recipe is in
  `COMPONENT_P2_ROLLOUT`.

## Non-goals

Shared code changes; P3 patterns; demo-page adoption.

## Impact

- **Added**: `golden/composite-b.test.ts`.
- **Modified**: the 4 recipe JSONs, `COMPONENT_P2_ROLLOUT`.
- **Invariant**: P1 parity untouched; foundation and batch-a pins
  untouched except entries for recipes entering the rollout.
