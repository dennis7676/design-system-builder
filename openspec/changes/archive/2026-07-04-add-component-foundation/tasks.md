# add-component-foundation — tasks

## 1. Registry + parity gate

- [x] 1.1 `src/component-registry.ts` (new): `COMPONENT_P1_PATHS` — full
      leaf-path contract for the 10 primitives (button primary/secondary/
      ghost variants; state leaves default/hover/focus/active/disabled on
      interactive primitives) — and `COMPONENT_P1_ROLLOUT = ["minimal-tech"]`.
- [x] 1.2 `src/validator.ts`: `component-parity` gate — every rolled-out
      recipe exposes exactly the registry path set (missing/extra → error
      naming the diff); recipes outside the set are untouched.

## 2. Pilot recipe (minimal-tech)

- [x] 2.1 `references/recipes/minimal-tech.json`: full P1 component tree per
      the expression-matrix row (radius 0–2px, hairline borders, mono
      uppercase labels, inputs bottom-hairline). Legacy `component.button`
      leaves migrate into the new variant/state shape. Alias-first: leaves
      alias semantic tokens unless the matrix demands divergence.

## 3. Generic contrastPairs + a11y

- [x] 3.1 `src/tokens-builder.ts`: derive fg/bg contrastPairs for
      interactive primitives generically from the registry, per state.
      `disabled` exempt from floors (WCAG 1.4.3 incidental) — exemption
      stated in the gate, not silently skipped.
- [x] 3.2 Focus indicators gate at non-text 3:1 against the adjacent
      surface.

## 4. Specimen gallery (generic — batches touch zero render code)

- [x] 4.1 `src/styleguide-generator.ts`: specimen per primitive driven from
      the component group, state rows for interactive ones, var-only,
      `data-specimen="<primitive>"` markers.
- [x] 4.2 `src/manifest.ts`: completeness requires one specimen per registry
      primitive for rolled-out recipes.

## 5. Goldens + verification

- [x] 5.1 `golden/component.test.ts`: parity positive/negative (missing and
      extra path both fail), pilot specimen completeness, generic pair
      derivation, disabled exemption.
- [x] 5.2 Keystone re-baseline — ONCE, in this change, diff called out in
      the commit. Non-rollout recipes' goldens byte-identical (test-proven).
- [x] 5.3 `npm test` green + `npx tsc --noEmit` clean.
