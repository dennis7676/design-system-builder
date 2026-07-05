# tasks — add-composite-foundation

## 1. registry + gates

- [x] 1.1 `src/component-registry.ts`: `ComponentCompositeDefinition`
      (name, leafPaths, contrastTargets, exemptions) +
      `COMPONENT_P2_COMPOSITES` (nav/table/modal/formRow per proposal
      table) + `COMPONENT_P2_ROLLOUT = ["minimal-tech"]` +
      `COMPONENT_P2_PATHS`
- [x] 1.2 `src/validator.ts`: `component-parity` generalized over
      (registry, rollout) pairs; messages name the set
- [x] 1.3 `src/tokens-builder.ts`: contrastPairs from `contrastTargets`;
      overlay exemption recorded (INFO, mirrors contrast-exempt style)

## 2. pilot recipe

- [x] 2.1 `references/recipes/minimal-tech.json`: full P2 composite tree,
      alias-first, archetype divergence per proposal (hairline table
      borders, 0–2px modal radius, mono uppercase nav) — keystone golden
      re-baselined ONCE, diff called out in report

## 3. specimens + manifest

- [x] 3.1 `src/styleguide-generator.ts`: 4 composite specimens
      (var-only, data-specimen marked; nav composes link/button
      primitives; table 3 rows with stripe+hover; static modal panel
      over scrim; form row with label/help/error)
- [x] 3.2 `src/manifest.ts`: completeness requires composite specimens
      for P2-rolled-out recipes

## 4. contract

- [x] 4.1 contract.json components block gains composite snapshot +
      p2 rollout, assembled from the registry (no hand-copy); confirm
      GATE_CATALOG parity test still passes (no new gate codes expected)

## 5. goldens + verification

- [x] 5.1 `golden/composite.test.ts`: P2 parity positive/negative,
      pilot specimen completeness, declared-pair derivation, overlay
      exemption, non-rollout byte-identity
- [x] 5.2 `npx tsc --noEmit` clean
- [x] 5.3 `npm test` all green (report final count)
- [x] 5.4 CLI round-trip on examples brand: build+generate, styleguide
      contains the 4 specimens, contract.json contains composites,
      validate --check-manifest passes (surfaces co-located with
      tokens.json)
