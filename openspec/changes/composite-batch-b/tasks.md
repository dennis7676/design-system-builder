# tasks — composite-batch-b

- [ ] 1.1 `references/recipes/retro.json`: full P2 composite tree
      (poster rhythm divergence)
- [ ] 1.2 `references/recipes/warm-creator.json`: full P2 composite tree
      (warm organic divergence)
- [ ] 1.3 `references/recipes/expressive.json`: full P2 composite tree
      (loud divergence)
- [ ] 1.4 `references/recipes/creative-multiscale.json`: full P2
      composite tree (scale contrast divergence)
- [ ] 1.5 `src/component-registry.ts`: append the 4 recipes to
      `COMPONENT_P2_ROLLOUT` → 8/8 complete
- [ ] 1.6 `golden/composite-b.test.ts`: per-recipe parity, pair gating,
      specimen completeness, build-hash pins, full-parity assertion
- [ ] 1.7 remove the 4 recipes' entries from any non-rollout pin lists
      (foundation/batch-a goldens) — touch nothing else there
- [ ] 1.8 `npx tsc --noEmit` clean + `npm test` all green (report count)
- [ ] 1.9 CLI spot-check: build a brand selecting one batch recipe,
      generate, styleguide contains 4 composite specimens, contract
      p2RolloutRecipes lists all 8
