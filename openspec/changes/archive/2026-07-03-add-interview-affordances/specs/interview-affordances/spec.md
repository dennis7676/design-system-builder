# interview-affordances spec delta

## ADDED Requirements

### Requirement: Recipe candidate transparency

`cli build` SHALL print a deterministic top-3 recipe candidate table
(distance ascending, key tie-break) with hard-constraint outcomes and the
selected row marked, before confirmation.

#### Scenario: Nearest selection

- **WHEN** no `branding.recipe_override` is present
- **THEN** the nearest constraint-passing recipe is selected and marked in
  the table, byte-identical to prior behavior.

### Requirement: Persisted recipe override

`brand.json` MAY carry `branding.recipe_override`; when present the build
SHALL select that recipe iff it passes hard constraints, and SHALL fail
loudly (naming the constraint or listing valid keys) otherwise.

#### Scenario: Reproducible human choice

- **WHEN** the same brand.json with an override is built twice
- **THEN** outputs are byte-identical, and `meta.recipe` equals the
  override.

### Requirement: Interview priors stay out of the core

SKILL.md SHALL define mood-image intake and candidate choice as skill-layer
steps; images never persist into brand.json, and user answers override
image-derived priors.
