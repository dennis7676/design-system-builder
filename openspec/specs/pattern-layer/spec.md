# pattern-layer Specification

## Purpose
TBD - created by archiving change add-pattern-foundation. Update Purpose after archive.
## Requirements

### Requirement: P3 pattern registry

`COMPONENT_P3_PATTERNS` SHALL define, in code, the exact leaf-path
contract for the 4 P3 patterns (hero, pricing, featureGrid, footer)
under the shared `component.*` namespace, reusing the
`ComponentCompositeDefinition` shape (leafPaths, declared
`contrastTargets`, exemptions); patterns assemble primitives and
composites and never duplicate their leaves.

#### Scenario: registry drives everything

- **WHEN** a pattern is added to the registry
- **THEN** parity, declared contrastPairs, specimen expectations, and the
  contract.json snapshot extend without touching gate, builder, generator,
  or contract code

### Requirement: independent parity per rollout set

The `component-parity` gate SHALL check the P3 (registry, rollout) pair
independently alongside P1 and P2 — both stay fully gated while P3 ramps
through `COMPONENT_P3_ROLLOUT` — and failures SHALL name the set, the
recipe, and the missing or extra path; recipes outside the P3 rollout
SHALL build byte-identical tokens.json to before this change.

#### Scenario: P3 pilot missing a path fails loudly

- **WHEN** minimal-tech omits `component.pricing.featuredBackground`
- **THEN** the build fails naming the P3 set and the missing path

#### Scenario: non-rollout recipes untouched

- **WHEN** a recipe outside `COMPONENT_P3_ROLLOUT` builds
- **THEN** its tokens.json is byte-identical to the pre-change generator

### Requirement: registry-declared contrast pairs

The builder SHALL derive contrastPairs from each pattern's declared
`contrastTargets`, gated by the existing `contrast-fail` machinery:
hero foreground/subForeground on background (text); pricing
cardForeground/cardMutedForeground on cardBackground and
featuredForeground on featuredBackground (text) and featuredBorder on
`semantic.color.surface.default` (non-text); featureGrid
titleForeground/bodyForeground on background (text) and iconForeground
on background (non-text); footer foreground/mutedForeground on
background (text).

#### Scenario: featured tier gated

- **WHEN** the pilot recipe builds
- **THEN** featuredForeground is paired against featuredBackground at the
  text floor and featuredBorder against the surface at the non-text floor

### Requirement: no state-vocabulary expansion

The featured pricing tier SHALL be expressed as named explicit leaves
(`featuredBackground`, `featuredForeground`, `featuredBorder`) and
`COMPONENT_STATES` SHALL remain unchanged by this change.

#### Scenario: state enum untouched

- **WHEN** the change lands
- **THEN** `COMPONENT_STATES` is byte-identical and no primitive or
  composite contract changed

### Requirement: pattern specimens

The styleguide SHALL render one var-only specimen per rolled-out pattern
(`data-specimen` marked): a hero with headline, subhead, and a button
primitive CTA; a pricing pair with one featured card; a three-cell
featureGrid with icon dot, title, and body; a footer with link
primitives and muted small print; manifest completeness SHALL require
these specimens for P3-rolled-out recipes.

#### Scenario: missing specimen fails manifest

- **WHEN** a rolled-out recipe's styleguide lacks `data-specimen="pricing"`
- **THEN** the manifest completeness check fails
