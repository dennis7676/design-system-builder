# composite-layer Specification

## Purpose
TBD - created by archiving change add-composite-foundation. Update Purpose after archive.
## Requirements
### Requirement: P2 composite registry

`COMPONENT_P2_COMPOSITES` SHALL define, in code, the exact leaf-path
contract for the 4 P2 composites (nav, table, modal, formRow) under the
shared `component.*` namespace, including each composite's declared
`contrastTargets` (fg/bg/role path triples) and explicit exemptions;
composites compose primitives and never duplicate primitive leaves.

#### Scenario: registry drives everything

- **WHEN** a composite is added to the registry
- **THEN** parity, declared contrastPairs, specimen expectations, and the
  contract.json snapshot extend without touching gate, builder, generator,
  or contract code

### Requirement: independent parity per rollout set

The `component-parity` gate SHALL check `COMPONENT_P2_ROLLOUT` extended
to the full 8-recipe catalog (retro, warm-creator, expressive,
creative-multiscale joining), each recipe exposing exactly the P2
composite leaf-path set, and a golden SHALL assert full P2 parity —
every catalog recipe present in the rollout.

#### Scenario: full catalog parity

- **WHEN** the catalog builds after this change
- **THEN** all 8 recipes pass P2 parity and the full-parity assertion
  holds

### Requirement: registry-declared contrast pairs

The builder SHALL derive contrastPairs from each composite's declared
`contrastTargets` (not from the P1 fg/bg-per-state convention), gated by
the existing `contrast-fail` machinery, and `modal.overlayBackground`
SHALL be recorded as an explicit non-text decorative exemption rather
than silently skipped.

#### Scenario: table row pairs gated

- **WHEN** the pilot recipe builds
- **THEN** cellForeground is paired against rowBackground,
  rowStripeBackground, and rowHoverBackground at the text floor

#### Scenario: overlay exempt, not unchecked

- **WHEN** the pilot recipe builds
- **THEN** an exemption record for modal.overlayBackground appears in
  findings

### Requirement: no state-vocabulary expansion

Composite stateful needs SHALL be expressed as named explicit leaves
(`rowHoverBackground`, `errorForeground`, `errorBorder`) and
`COMPONENT_STATES` SHALL remain unchanged by this change.

#### Scenario: state enum untouched

- **WHEN** the change lands
- **THEN** `COMPONENT_STATES` is byte-identical and no primitive contract
  changed

### Requirement: composite specimens

The styleguide SHALL render one var-only specimen per rolled-out
composite (`data-specimen` marked): a nav strip composing link/button
primitives, a 3-row striped table, a static modal panel over its scrim,
and a form row showing label, help, and error; manifest completeness
SHALL require these specimens for rolled-out recipes.

#### Scenario: missing specimen fails manifest

- **WHEN** a rolled-out recipe's styleguide lacks `data-specimen="table"`
- **THEN** the manifest completeness check fails

