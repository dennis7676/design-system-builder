# add-component-foundation (C3 P1-0)

## Why

Commercial track item 3 (user-confirmed 2026-07-04, Astryx benchmarking):
grow the demo vocabulary into a real component layer generated per recipe.
Astryx sets the consumability bar (150+ components); DSB answers at a
different layer — a *deterministic component token contract* per recipe,
proven by goldens and WCAG gates, not a component box. P1 ships the core
primitives; P2 composites / P3 patterns follow.

## P1 primitive set (fixed, 10)

`button` (primary/secondary/ghost variants) · `link` · `input` · `select` ·
`checkbox` · `radio` · `switch` · `card` · `badge` · `divider`

Interactive primitives carry state leaves (`default/hover/focus/active/
disabled`) matching the existing ContrastState vocabulary. `disabled` is
exempt from pair floors (WCAG 1.4.3 incidental exemption) — exempt, not
unchecked: the exemption is stated in the gate, not silently skipped.

## Keystone judgments

1. **Explicit per-recipe JSON, no runtime template.** Each recipe's
   `base.component` carries the full P1 tree. A hidden code template that
   synthesizes defaults would shrink authoring but adds an invisible layer
   between recipe JSON and tokenHash; in a system whose contract *is* the
   hash, explicitness wins. (A template may be used as an authoring aid by
   the implementer, never at runtime.)
2. **Parity gate over a rollout set.** New validator gate
   `component-parity`: every recipe key in `COMPONENT_P1_ROLLOUT` must
   expose exactly the leaf-path set in the `COMPONENT_P1_PATHS` registry
   (values differ, shape identical). Missing or extra paths → build error.
   The rollout set starts as `["minimal-tech"]` (pilot); each batch change
   appends its recipes; the final batch completes the set = full parity.
   This is what makes worktree-parallel batches safe *and* loud.
3. **Alias-first values.** Component leaves alias semantic tokens
   (`{semantic.color.primary.default}`, `{semantic.shape.radius…}`, spacing,
   typography roles) unless the recipe's archetype demands divergence —
   overrides are deliberate deltas per the expression matrix below, so the
   accent-override / hue-rotation machinery keeps working through the
   component layer for free.
4. **One re-baseline, owned here.** Extending `base.component` changes
   tokenHash for the pilot recipe — the keystone golden re-baselines ONCE in
   this change, loudly. Batches re-baseline only their own recipes' goldens.
   **Serialization: this change lands only after add-glass-round2 merges**
   (both touch builder/validator; glass owns the current re-baseline slot).

## Expression matrix (recipe × override axes)

Values are authored per recipe by the implementer following this intent;
the matrix pins *which axes diverge*, not exact numbers. Everything not
listed stays alias-first.

| recipe | archetype read | override axes for components |
|---|---|---|
| minimal-tech | spec-sheet hairline | radius 0–2px, hairline 1px borders, mono uppercase labels (badge/select), inputs bottom-hairline only |
| enterprise | briefing density | compact padding, 2px top-rule accents, squarish radius, strong 2px focus ring |
| luxury | editorial whitespace | generous padding, thin borders, letter-spaced small-cap badge, subdued hover (no lift) |
| retro | poster rhythm | 0 radius, thick 2px borders, hard offset shadow on button/card, bold labels |
| warm-creator | warm organic | pill radius on button/badge/switch, soft shadow, tactile hover lift |
| expressive | loud | high-chroma fills, larger radius, gradient accent on primary button (reuses gradient vocabulary), pronounced transitions |
| pro-emotive | balanced professional | medium radius, soft elevation on card, calm transition timing |
| creative-multiscale | scale contrast | deliberately split scales — badge tiny/mono vs card oversized padding, asymmetric input padding |

## What Changes (this change = foundation + pilot only)

### Registry + parity gate

- `src/component-registry.ts` (new): `COMPONENT_P1_PATHS` (the full leaf-path
  contract for the 10 primitives, including variant/state leaves) and
  `COMPONENT_P1_ROLLOUT` (starts `["minimal-tech"]`).
- `src/validator.ts`: `component-parity` gate as specified above.

### Pilot recipe

- `references/recipes/minimal-tech.json`: full P1 component tree following
  the matrix row (existing `component.button` absorbed into the new shape —
  its 6 legacy leaves migrate into the button variant/state structure).

### Generic contrastPairs derivation

- `src/tokens-builder.ts`: derive fg/bg contrastPairs for interactive
  primitives generically from the registry (per state, disabled exempt),
  so batches add zero pair-wiring code. Focus indicators gate at non-text
  3:1 against the adjacent surface.

### Specimen gallery (generic, batches touch zero render code)

- `src/styleguide-generator.ts`: extend the components stage to render a
  specimen per primitive (state rows for interactive ones), driven entirely
  from the component group, var-only. Marker per specimen
  (`data-specimen="button"` …) for goldens; `src/manifest.ts` completeness
  extends to require one specimen per registry primitive for rolled-out
  recipes.
- Demo pages unchanged (skeleton grammars own them — P2 may compose).

### Goldens

- `golden/component.test.ts` (new): parity gate positive/negative, pilot
  specimen completeness, contrastPairs derivation, keystone re-baseline.
- Keystone (`golden/sample.tokens.json`) re-baselined once, with the diff
  called out in the change.

## Rollout plan (separate changes, worktree-parallel codex after this lands)

| batch | recipes | family read |
|---|---|---|
| component-batch-a | enterprise, pro-emotive | professional / density |
| component-batch-b | luxury, retro, warm-creator | warm / heritage-expressive |
| component-batch-c | expressive, creative-multiscale | loud / multiscale |

Batch contract (mirrors skeleton-batch precedent): each batch edits ONLY its
recipes' JSONs + appends its recipes to `COMPONENT_P1_ROLLOUT` + owns
`golden/component-{a,b,c}.test.ts`; shared code is frozen by this
foundation change; batch c (or whichever lands last) asserts full-parity
across all 8 recipes. ROLLOUT append is the only shared-file touch point —
batches append disjoint lines; merge order is commit order.

## Non-goals

- P2 composites (form rows, dialogs, nav) / P3 patterns.
- shadcn/Tailwind adapter (demoted below this track).
- New demo-page compositions; component playground interactivity beyond the
  existing state toolbar.

## Impact

- **Added**: `src/component-registry.ts`, `golden/component.test.ts`.
- **Modified**: `src/validator.ts`, `src/tokens-builder.ts`,
  `src/styleguide-generator.ts`, `src/manifest.ts`,
  `references/recipes/minimal-tech.json`, keystone golden (one loud
  re-baseline).
- **Invariant**: recipes NOT in the rollout set build byte-identical to
  today (their goldens unchanged); parity gate silent for them.
