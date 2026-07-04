# usage-contract

## ADDED Requirements

### Requirement: contract.json emission

`generate` SHALL emit a deterministic `contract.json` alongside the other
surfaces, embedding `builtFromTokenHash`, and containing: consumption
do/don't rules, the public/internal token API surface (prefixes, classes,
units, leaf types), a component registry snapshot (rollout recipes, states,
per-primitive variants/properties/contrast roles), the gate catalog, the
accessibility floors (MIN_RATIO, disabled exemption, gradient
worst-case-stop), the finite enums (recipes, expression, skeleton, motion
presets), and guarantees each carrying a proof pointer.

#### Scenario: deterministic bytes

- **WHEN** the same tokens.json is generated twice
- **THEN** the two contract.json files are byte-identical

#### Scenario: hash embedded

- **WHEN** contract.json is emitted
- **THEN** its `builtFromTokenHash` equals the source tokens.json hash

### Requirement: contract derives from gate-read code

`buildContract` SHALL assemble registry, enum, and floor content from the
same exported constants the gates and builder read
(`COMPONENT_P1_REGISTRY`, `COMPONENT_P1_ROLLOUT`, tokens-schema enums,
`MIN_RATIO`) — not from hand-maintained copies — and a parity test SHALL
fail when the validator can emit a gate code absent from `GATE_CATALOG` or
the catalog lists a code the validator/gate/manifest cannot emit.

#### Scenario: registry change flows through

- **WHEN** a primitive is added to `COMPONENT_P1_REGISTRY`
- **THEN** the next build's contract.json reflects it with no contract.ts
  edit

#### Scenario: catalog drift fails tests

- **WHEN** a new gate code is added to the validator without a
  `GATE_CATALOG` entry
- **THEN** the parity test fails naming the missing code

### Requirement: manifest covers the contract

`validate --check-manifest` SHALL treat contract.json as a surface: a
missing file, unparseable JSON, or a `builtFromTokenHash` mismatch fails
the manifest check naming contract.json.

#### Scenario: drifted contract caught

- **WHEN** contract.json carries a stale hash after tokens.json changed
- **THEN** the manifest check fails naming contract.json

### Requirement: README guarantees carry proofs

The README guarantees section SHALL state each guarantee
(byte-reproducibility, WCAG gating including demo derived colors,
cross-surface consistency, golden regression safety, machine-readable
contract) followed by its proof pointer — the gate code symbol, golden
test file, or verification command — and SHALL cite the actual golden
count at landing time.

#### Scenario: no unproven claim

- **WHEN** the guarantees section is read
- **THEN** every claim names where its proof lives
