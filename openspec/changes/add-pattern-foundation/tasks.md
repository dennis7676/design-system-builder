# tasks — add-pattern-foundation

## 1. registry + gates

- [x] 1.1 `src/component-registry.ts`: `COMPONENT_P3_PATTERNS`
      (hero/pricing/featureGrid/footer per proposal table, reusing
      `ComponentCompositeDefinition`) + `COMPONENT_P3_ROLLOUT =
      ["minimal-tech"]` + `COMPONENT_P3_PATHS` + accessor defaults kept
      P2-compatible (add P3 variants mirroring the P2 helpers)
- [x] 1.2 `src/validator.ts`: third (registry, rollout) pair
      `P3 pattern registry` in the generalized `component-parity` check
- [x] 1.3 `src/tokens-builder.ts`: P3 block in
      `applyComponentContrastPairs` from declared `contrastTargets`
      (state "default", minRatio passthrough)

## 2. pilot recipe

- [x] 2.1 `references/recipes/minimal-tech.json`: full P3 pattern tree,
      alias-first, archetype divergence per proposal (hairline borders,
      0–2px cardRadius, mono uppercase where its P2 nav used them) —
      keystone tokens + contract goldens re-baselined ONCE, diff called
      out in report

## 3. specimens + manifest

- [x] 3.1 `src/styleguide-generator.ts`: 4 pattern specimens (var-only,
      data-specimen marked; hero composes a button primitive; pricing
      two cards one featured each with a button; featureGrid 3 cells;
      footer composes link primitives)
- [x] 3.2 `src/manifest.ts`: completeness requires pattern specimens for
      P3-rolled-out recipes

## 4. contract

- [x] 4.1 contract.json components block gains `p3RolloutRecipes` +
      `patterns` snapshot, assembled from the registry (no hand-copy);
      GATE_CATALOG untouched (no new gate codes)

## 5. goldens + verification

- [x] 5.1 `golden/pattern.test.ts`: P3 parity positive/negative (all
      three sets), pilot specimen completeness, declared-pair
      derivation, non-rollout tokens byte-identity
- [x] 5.2 `npx tsc --noEmit` clean
- [x] 5.3 `npm test` all green (report final count)
- [x] 5.4 CLI round-trip on examples brand: build+generate, styleguide
      contains the 4 pattern specimens, contract.json contains patterns
      snapshot, validate --check-manifest passes (surfaces co-located
      with tokens.json)
