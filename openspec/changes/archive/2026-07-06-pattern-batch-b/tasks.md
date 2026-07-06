# tasks — pattern-batch-b

- [x] 1.1 `references/recipes/retro.json`: full P3 pattern tree
      (poster rhythm divergence per proposal)
- [x] 1.2 `references/recipes/warm-creator.json`: full P3 pattern tree
      (warm organic divergence)
- [x] 1.3 `references/recipes/expressive.json`: full P3 pattern tree
      (loud divergence)
- [x] 1.4 `references/recipes/creative-multiscale.json`: full P3 pattern
      tree (scale contrast divergence)
- [x] 1.5 `src/component-registry.ts`: append the 4 recipes to
      `COMPONENT_P3_ROLLOUT` (only shared-file touch)
- [x] 1.6 `golden/pattern-b.test.ts`: per-recipe P3 parity,
      declared-pair gating, specimen completeness, build-hash pins,
      full 8-recipe P3 parity against the recipe directory
- [x] 1.7 update foundation/batch-a non-rollout pins if their tests
      enumerate non-rollout recipes (this set becomes empty) — do NOT
      change other recipes' pins
- [x] 1.8 `npx tsc --noEmit` clean + `npm test` all green (report count)
- [x] 1.9 CLI spot-check: build a brand selecting one batch recipe,
      generate, styleguide contains the 4 pattern specimens,
      contract p3RolloutRecipes reflects all 8 recipes
