# composite-layer

## MODIFIED Requirements

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
