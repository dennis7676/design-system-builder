# composite-layer

## MODIFIED Requirements

### Requirement: independent parity per rollout set

The `component-parity` gate SHALL check each (registry, rollout) pair
independently with `COMPONENT_P2_ROLLOUT` extended to include enterprise,
pro-emotive, and luxury — each exposing exactly the P2 composite leaf-path
set — and recipes outside the extended rollout SHALL build byte-identical
to before this change.

#### Scenario: batch recipes gain full P2 parity

- **WHEN** enterprise, pro-emotive, or luxury builds
- **THEN** the P2 parity gate passes with the full composite path set

#### Scenario: remaining recipes untouched

- **WHEN** a recipe outside the extended P2 rollout builds
- **THEN** its output is byte-identical to the pre-change generator
