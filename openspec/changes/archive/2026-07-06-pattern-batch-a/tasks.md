# tasks — pattern-batch-a

- [x] 1.1 `references/recipes/enterprise.json`: full P3 pattern tree
      (briefing density divergence per proposal)
- [x] 1.2 `references/recipes/pro-emotive.json`: full P3 pattern tree
      (balanced professional divergence)
- [x] 1.3 `references/recipes/luxury.json`: full P3 pattern tree
      (editorial whitespace divergence)
- [x] 1.4 `src/component-registry.ts`: append the 3 recipes to
      `COMPONENT_P3_ROLLOUT` (only shared-file touch)
- [x] 1.5 `golden/pattern-a.test.ts`: per-recipe P3 parity,
      declared-pair gating, specimen completeness, build-hash pins
- [x] 1.6 update the foundation's non-rollout pins if its test
      enumerates non-rollout recipes (the 3 recipes leave that set) —
      do NOT change other recipes' pins
- [x] 1.7 `npx tsc --noEmit` clean + `npm test` all green (report count)
- [x] 1.8 CLI spot-check: build a brand selecting one batch recipe,
      generate, styleguide contains the 4 pattern specimens,
      contract p3RolloutRecipes reflects 4 recipes
