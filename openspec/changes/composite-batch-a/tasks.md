# tasks — composite-batch-a

- [x] 1.1 `references/recipes/enterprise.json`: full P2 composite tree
      (briefing density divergence per proposal)
- [x] 1.2 `references/recipes/pro-emotive.json`: full P2 composite tree
      (balanced professional divergence)
- [x] 1.3 `references/recipes/luxury.json`: full P2 composite tree
      (editorial whitespace divergence)
- [x] 1.4 `src/component-registry.ts`: append the 3 recipes to
      `COMPONENT_P2_ROLLOUT` (only shared-file touch)
- [x] 1.5 `golden/composite-a.test.ts`: per-recipe P2 parity,
      declared-pair gating, specimen completeness, build-hash pins
- [x] 1.6 update foundation's `NON_P2_BUILD_SHA256`-style pins if the
      foundation test enumerates non-rollout recipes (the 3 recipes leave
      that set) — do NOT change other recipes' pins
- [x] 1.7 `npx tsc --noEmit` clean + `npm test` all green (report count)
- [x] 1.8 CLI spot-check: build a brand selecting one batch recipe,
      generate, styleguide contains 4 composite specimens,
      contract p2RolloutRecipes reflects 4 recipes
