# add-composite-foundation (C3 P2-0)

## Why

Commercial track item 3 continues: P1 shipped the 10-primitive contract
across all 8 recipes; P2 grows the vocabulary to the composites a real
product page is actually assembled from — `nav`, `table`, `modal`,
`formRow`. Same discipline: registry-driven, parity-gated, WCAG-proven,
specimen-rendered. This change is foundation + pilot (minimal-tech) only;
rollout follows in sequential batches (worktree parallelism is banned —
two consecutive codex hangs on 07-04; batches go one at a time on the
main repo).

## P2 composite set (fixed, 4)

Composites COMPOSE primitives — they never duplicate primitive leaves.
Nav renders `link`/`button` primitives inside itself; table cells are
text; modal hosts arbitrary content. Composite leaves cover only what
the composition itself owns:

| composite | leaf paths (under `component.{name}.`) |
|---|---|
| `nav` | `background`, `foreground`, `border`, `paddingX`, `paddingY` |
| `table` | `headerBackground`, `headerForeground`, `rowBackground`, `rowStripeBackground`, `rowHoverBackground`, `cellForeground`, `border`, `cellPaddingX`, `cellPaddingY` |
| `modal` | `overlayBackground`, `panelBackground`, `panelForeground`, `panelBorder`, `panelRadius`, `panelShadow`, `padding` |
| `formRow` | `gap`, `labelForeground`, `helpForeground`, `errorForeground`, `errorBorder` |

## Keystone judgments

1. **Separate P2 registry, same namespace.** `COMPONENT_P2_COMPOSITES` +
   `COMPONENT_P2_ROLLOUT` (starts `["minimal-tech"]`) live next to the P1
   registry in `component-registry.ts`. The parity gate checks each
   rollout set against its own registry independently — P1 stays fully
   rolled out while P2 ramps. Paths share the `component.*` namespace so
   the adapter, styleguide, and contract.json pick them up unchanged.
2. **No state-vocabulary expansion.** Table hover and form error are
   explicit leaves (`rowHoverBackground`, `errorForeground`/`errorBorder`),
   NOT new entries in `COMPONENT_STATES`. Extending the 5-state enum would
   ripple through every interactive primitive's contract; composites'
   stateful needs are finite and named, so name them.
3. **Registry-declared contrast pairs.** P1 derived pairs from the
   fg/bg-per-state convention; composite pairs don't fit that shape
   (stripe/hover rows, header, label/help/error on the form surface).
   Each composite definition carries explicit `contrastTargets`:
   `{fg, bg, role}` path triples the builder turns into contrastPairs.
   Declared in the registry = visible in the contract, gated by the
   existing `contrast-fail` machinery. Pairs for the pilot:
   - nav: foreground on background (text)
   - table: headerForeground on headerBackground; cellForeground on each
     of rowBackground / rowStripeBackground / rowHoverBackground (text)
   - modal: panelForeground on panelBackground (text)
   - formRow: labelForeground / helpForeground / errorForeground on
     `{semantic.color.surface}` (text); errorBorder on surface (non-text)
4. **Modal overlay is exempt, and says so.** `overlayBackground` is a
   non-text decorative scrim — it gets an explicit exemption record
   (P1 disabled precedent: exempt, not unchecked), no new gate. Panel
   legibility is carried by panelForeground/panelBackground pairs;
   pilot aliases panelBackground to an opaque semantic surface.
5. **Alias-first values, divergence per archetype.** Same rule as P1:
   composite leaves alias semantic/primitive tokens unless the recipe's
   archetype demands divergence (minimal-tech: hairline table borders,
   0–2px radius modal, mono uppercase nav — matching its P1 row).
6. **One re-baseline, owned here.** Extending minimal-tech's
   `base.component` changes its tokenHash — keystone golden re-baselines
   ONCE in this change, loudly. Batches re-baseline only their own
   recipes' goldens.

## What Changes

### Registry + gates

- `src/component-registry.ts`: `ComponentCompositeDefinition` interface
  (name, leaf paths, contrastTargets, exemptions), `COMPONENT_P2_COMPOSITES`
  (the 4 above), `COMPONENT_P2_ROLLOUT = ["minimal-tech"]`,
  `COMPONENT_P2_PATHS` export mirroring P1.
- `src/validator.ts`: `component-parity` generalizes to check (registry,
  rollout) pairs — P1 and P2 independently; error messages name which set.
- `src/tokens-builder.ts`: contrastPairs from `contrastTargets`
  declarations; overlay exemption recorded as an explicit finding
  (INFO, mirroring contrast-exempt).

### Pilot recipe

- `references/recipes/minimal-tech.json`: full P2 composite tree per the
  archetype row.

### Specimen gallery

- `src/styleguide-generator.ts`: one specimen per rolled-out composite
  (`data-specimen="nav"` etc.) — nav strip reusing link/button primitives,
  3-row striped table, static modal panel over scrim, form row with
  label/help/error. Var-only. `src/manifest.ts` completeness extends to
  rolled-out composites.
- Demo pages unchanged (skeleton grammars own them).

### Contract

- contract.json `components` block gains the composite registry snapshot +
  P2 rollout (assembled from the registry per DEC-0247 — no contract.ts
  hand-copy; GATE_CATALOG untouched unless a new code is introduced).

### Goldens

- `golden/composite.test.ts` (new): P2 parity positive/negative (both
  sets), pilot specimen completeness, declared-pair derivation, overlay
  exemption recorded, keystone re-baseline.
- Keystone (`golden/sample.tokens.json`) re-baselined once, diff called
  out.

## Rollout plan (sequential changes, main-repo codex, after this lands)

| batch | recipes |
|---|---|
| composite-batch-a | enterprise, pro-emotive, luxury |
| composite-batch-b | retro, warm-creator, expressive, creative-multiscale |

Batch contract mirrors P1: each batch edits ONLY its recipes' JSONs +
appends to `COMPONENT_P2_ROLLOUT` + owns its golden file; batch b asserts
full P2 parity across all 8.

## Non-goals

- P3 patterns (hero, pricing…), demo-page adoption of composites,
  interactive modal behavior (specimen is static), new ContrastState
  entries, new gate codes beyond parity generalization.

## Impact

- **Added**: `golden/composite.test.ts`.
- **Modified**: `src/component-registry.ts`, `src/validator.ts`,
  `src/tokens-builder.ts`, `src/styleguide-generator.ts`,
  `src/manifest.ts`, `references/recipes/minimal-tech.json`,
  keystone golden (one loud re-baseline), contract snapshot follows
  automatically.
- **Invariant**: recipes outside `COMPONENT_P2_ROLLOUT` build
  byte-identical; P1 parity untouched; 5-state enum untouched.
