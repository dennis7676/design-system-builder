# edge-points Specification

## Purpose
Edge-point HITL: finite versioned edge enum, deterministic concept-fit suggestions, per-edge admission gates (Round 1: texture-grain shipped, glass deferred).
## Requirements

### Requirement: Finite versioned edge enum

`brand.json` SHALL accept an optional `edges` array whose members come from
the versioned enum `["texture-grain", "glass"]`. Unknown names SHALL fail
validation with a CONFLICT naming the enum. `glass` SHALL fail validation
with a CONFLICT stating it is DEFERRED until Round 2.

#### Scenario: unknown edge is rejected

- **WHEN** brand.json contains `edges: ["vaporwave"]`
- **THEN** validateBrand returns a CONFLICT listing the allowed enum

#### Scenario: deferred glass is rejected loudly

- **WHEN** brand.json contains `edges: ["glass"]`
- **THEN** the build fails with a CONFLICT naming the Round 2 contrast-floor prerequisite

### Requirement: Deterministic concept-fit suggestions

`suggestEdges(brand, recipe)` SHALL return, for identical inputs, an
identical ordered list of `{ edge, rationale, deferred }` entries, computed
only from static rules over recipe id, tone vector, and expression tier.
texture-grain SHALL NOT be suggested for minimal-tech at safe tier. glass
SHALL only appear (as `deferred: true`) for cutting-edge ≥ 5 cool recipes.

#### Scenario: reproducible proposals

- **WHEN** suggestEdges runs twice on the same brand.json and recipe
- **THEN** the outputs are deeply equal

#### Scenario: minimal-tech at safe gets no texture proposal

- **WHEN** the selected recipe is minimal-tech and expression tier is safe
- **THEN** the suggestion list does not contain texture-grain

### Requirement: texture-grain tokens and admission gate

When `edges` includes `texture-grain`, the built document SHALL contain a
`semantic.texture.overlay` group (pinned data-URI, blend mode, opacity leaf
≤ 0.06), and the validator SHALL re-prove all applicable pair floors against
the worst-case effective background (background blended with the texture's
darkest and lightest extremes). A floor violation SHALL fail the build.

#### Scenario: opacity above the cap fails

- **WHEN** a texture overlay opacity leaf exceeds 0.06
- **THEN** validation fails naming the cap

#### Scenario: worst-case blend violating a floor fails

- **WHEN** the blended worst-case background drops a required pair below its floor
- **THEN** validation fails naming the pair and the blended ratio

### Requirement: Fitness is part of the process

A brand.json carrying an edge whose fitness predicate rejects the selected
recipe/tone/tier SHALL fail the build with a CONFLICT carrying the fitness
rationale.

#### Scenario: hand-added unfit edge cannot build

- **WHEN** brand.json for minimal-tech at safe carries `edges: ["texture-grain"]`
- **THEN** the build fails with the concept-fit CONFLICT

### Requirement: No-edge builds are byte-identical

A brand.json without `edges` (or with `edges: []`) SHALL produce output
byte-identical to the pre-change generator: keystone and all existing
goldens SHALL pass unmodified.

#### Scenario: keystone unchanged

- **WHEN** the R1 keystone brand builds with no edges field
- **THEN** the emitted tokens.json bytes equal the committed keystone
