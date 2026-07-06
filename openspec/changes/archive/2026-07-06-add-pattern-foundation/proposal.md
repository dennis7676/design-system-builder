# add-pattern-foundation (C3 P3-0)

## Why

Commercial track item 3 continues: P1 shipped the 10-primitive contract,
P2 the 4 composites, both across all 8 recipes. P3 grows the vocabulary
to the page-level patterns a marketing/product page is assembled from —
`hero`, `pricing`, `featureGrid`, `footer`. Same discipline:
registry-driven, parity-gated, WCAG-proven, specimen-rendered. This
change is foundation + pilot (minimal-tech) only; rollout follows in
sequential batches on the main repo (worktree parallelism stays banned).

## P3 pattern set (fixed, 4)

Patterns ASSEMBLE primitives and composites — they never duplicate their
leaves. Hero and pricing render `button` primitives for CTAs; footer
renders `link` primitives; featureGrid cells are text. Pattern leaves
cover only what the assembly itself owns:

| pattern | leaf paths (under `component.{name}.`) |
|---|---|
| `hero` | `background`, `foreground`, `subForeground`, `paddingX`, `paddingY`, `gap` |
| `pricing` | `cardBackground`, `cardForeground`, `cardMutedForeground`, `cardBorder`, `cardRadius`, `featuredBackground`, `featuredForeground`, `featuredBorder`, `cardPadding`, `gap` |
| `featureGrid` | `background`, `titleForeground`, `bodyForeground`, `iconForeground`, `cellPadding`, `gap` |
| `footer` | `background`, `foreground`, `mutedForeground`, `border`, `paddingY`, `gap` |

## Keystone judgments

1. **Separate P3 registry, same namespace, same shape.** P3 entries
   reuse `ComponentCompositeDefinition` unchanged (name, leafPaths,
   contrastTargets, exemptions — identical needs, no new interface).
   `COMPONENT_P3_PATTERNS` + `COMPONENT_P3_ROLLOUT` (starts
   `["minimal-tech"]`) + `COMPONENT_P3_PATHS` live next to P1/P2 in
   `component-registry.ts`. The parity gate gains a third
   (registry, rollout) pair; P1/P2 stay fully rolled out while P3 ramps.
   Paths share `component.*` so adapter, styleguide, and contract pick
   them up unchanged.
2. **No state-vocabulary expansion.** The featured pricing tier is an
   explicit leaf family (`featuredBackground`/`featuredForeground`/
   `featuredBorder`), NOT a variant or state. `COMPONENT_STATES`
   untouched.
3. **Registry-declared contrast pairs** (P2 precedent; 11 pairs):
   - hero: foreground and subForeground on background (text)
   - pricing: cardForeground and cardMutedForeground on cardBackground;
     featuredForeground on featuredBackground (text); featuredBorder on
     `semantic.color.surface.default` (non-text — the featured ring must
     read against the page surface; errorBorder precedent)
   - featureGrid: titleForeground and bodyForeground on background
     (text); iconForeground on background (non-text)
   - footer: foreground and mutedForeground on background (text)
   No exemptions: `pricing.cardBorder` and `footer.border` are
   undeclared decorative hairlines (nav.border precedent — undeclared,
   not exempt).
4. **Alias-first values, divergence per archetype.** Pilot minimal-tech
   matches its P1/P2 rows: hairline borders, 0–2px cardRadius, mono
   uppercase treatments where its P2 nav used them, surface/foreground
   aliases elsewhere.
5. **One re-baseline, owned here.** Extending minimal-tech's
   `base.component` changes its tokenHash, and the contract components
   block gains the P3 snapshot for every recipe — keystone tokens golden
   and contract golden re-baseline ONCE in this change, loudly. Batches
   re-baseline only their own recipes' goldens.

## What Changes

### Registry + gates

- `src/component-registry.ts`: `COMPONENT_P3_PATTERNS` (the 4 above,
  `satisfies readonly ComponentCompositeDefinition[]`),
  `COMPONENT_P3_ROLLOUT = ["minimal-tech"]`, `COMPONENT_P3_PATHS`.
- `src/validator.ts`: third (registry, rollout) pair —
  `P3 pattern registry` — in the existing generalized `component-parity`
  check.
- `src/tokens-builder.ts`: P3 block in `applyComponentContrastPairs`
  mirroring the P2 block (declared targets, state "default").

### Pilot recipe

- `references/recipes/minimal-tech.json`: full P3 pattern tree per the
  archetype row.

### Specimen gallery

- `src/styleguide-generator.ts`: one specimen per rolled-out pattern
  (`data-specimen="hero"` etc.) — hero with headline/subhead and a
  button primitive CTA; pricing with two cards, one featured, each with
  a button; featureGrid with three cells (icon dot, title, body);
  footer with link primitives and muted small print. Var-only.
- `src/manifest.ts`: completeness extends to rolled-out patterns.
- Demo pages unchanged (skeleton grammars own them).

### Contract

- contract.json components block gains `p3RolloutRecipes` +
  `patterns` snapshot, assembled from the registry (DEC-0247 — no
  hand-copy). No new gate codes; GATE_CATALOG untouched.

### Goldens

- `golden/pattern.test.ts` (new): P3 parity positive/negative (all three
  sets), pilot specimen completeness, declared-pair derivation,
  non-rollout tokens byte-identity.
- Keystone tokens + contract goldens re-baselined once, diff called out.

## Rollout plan (sequential changes, main-repo codex, after this lands)

| batch | recipes |
|---|---|
| pattern-batch-a | enterprise, pro-emotive, luxury |
| pattern-batch-b | retro, warm-creator, expressive, creative-multiscale |

Batch contract mirrors P2: each batch edits ONLY its recipes' JSONs +
appends to `COMPONENT_P3_ROLLOUT` + owns its golden file; batch b asserts
full P3 parity across all 8.

## Non-goals

- P4 or further vocabulary, demo-page adoption of patterns, pricing
  interactivity (specimen is static), new ContrastState entries, new
  gate codes, motif interplay changes.

## Impact

- **Added**: `golden/pattern.test.ts`.
- **Modified**: `src/component-registry.ts`, `src/validator.ts`,
  `src/tokens-builder.ts`, `src/styleguide-generator.ts`,
  `src/manifest.ts`, `references/recipes/minimal-tech.json`,
  keystone tokens + contract goldens (one loud re-baseline).
- **Invariant**: recipes outside `COMPONENT_P3_ROLLOUT` build
  byte-identical tokens.json; P1/P2 parity untouched; 5-state enum
  untouched.
