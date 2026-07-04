# edge-points — delta (add-glass-round2)

## MODIFIED Requirements

### Requirement: Finite versioned edge enum

`brand.json` SHALL accept an optional `edges` array whose members come from
the versioned enum `["texture-grain", "glass"]`. Unknown names SHALL fail
validation with a CONFLICT naming the enum. `glass` SHALL be admitted
(DEFERRED lifted) and gated by the glass contrast-floor admission gate.

#### Scenario: unknown edge is rejected

- **WHEN** brand.json contains `edges: ["vaporwave"]`
- **THEN** validateBrand returns a CONFLICT listing the allowed enum

#### Scenario: glass is admitted

- **WHEN** brand.json contains `edges: ["glass"]` on a fitting concept
- **THEN** validateBrand returns no edge-deferred CONFLICT and the build
  proceeds to the admission gate

### Requirement: Deterministic concept-fit suggestions

`suggestEdges(brand, recipe)` SHALL return, for identical inputs, an
identical ordered list of `{ edge, rationale, deferred }` entries, computed
only from static rules over recipe id, tone vector, and expression tier.
texture-grain SHALL NOT be suggested for minimal-tech at safe tier. glass
SHALL appear as `deferred: false` for concepts with
`classic_cutting_edge ≥ 5` and `cold_warm ≤ 3`, with a concept rationale.

#### Scenario: reproducible proposals

- **WHEN** suggestEdges runs twice on the same brand.json and recipe
- **THEN** the outputs are deeply equal

#### Scenario: glass is selectable on fitting concepts

- **WHEN** the tone vector has classic_cutting_edge ≥ 5 and cold_warm ≤ 3
- **THEN** the suggestion list contains glass with `deferred: false`

## ADDED Requirements

### Requirement: glass tokens

When `edges` includes `glass`, the built document SHALL contain a
`semantic.glass.surface` group with `fill` (color), `opacity` (number),
`blur` (dimension), and `border` (color) leaves, a philosophy principle,
and a coverage axis `edge.glass` covering `semantic.glass.surface.*`.
Foregrounds placed on glass panels SHALL be registered as contrastPairs
with `bg = "semantic.glass.surface.fill"`. Builds without `glass` SHALL be
byte-identical to builds made before this change.

#### Scenario: no-glass build is byte-identical

- **WHEN** a brand.json without glass is built before and after this change
- **THEN** every emitted artifact is byte-identical (tokenHash unchanged)

### Requirement: glass contrast-floor admission gate

The validator SHALL prove every fg-on-glass pair floor against the
worst-case effective background over **any** backdrop, using the
luminance-interval method: effective luminance spans the closed interval
between the fill blended with #000000 and with #ffffff at the backing
opacity α. If the foreground luminance lies inside the interval the build
SHALL fail with `glass-contrast-collapse`; otherwise the worst-case ratio
is taken at the nearest interval endpoint and SHALL meet the pair floor or
fail with `glass-contrast-fail`. Backing opacity SHALL be a number within
`[0.6, 1]` or the build fails with `glass-opacity-floor`. The gate verdict
SHALL be independent of the blur value.

#### Scenario: interior collapse is caught

- **WHEN** a foreground's luminance lies inside the effective-background
  luminance interval (a case a two-extreme check would pass)
- **THEN** the build fails with `glass-contrast-collapse`

#### Scenario: nearest-endpoint floor binds

- **WHEN** the foreground luminance is outside the interval but the ratio at
  the nearest endpoint is below the pair floor
- **THEN** the build fails with `glass-contrast-fail` carrying ratio,
  required floor, and interval endpoints

#### Scenario: opacity floor binds

- **WHEN** `semantic.glass.surface.opacity` is 0.4
- **THEN** the build fails with `glass-opacity-floor`

#### Scenario: blur independence

- **WHEN** two builds differ only in `semantic.glass.surface.blur`
- **THEN** the gate verdicts are identical

#### Scenario: shipped defaults pass

- **WHEN** a fitting brand selects glass with builder defaults
- **THEN** the build succeeds with no glass findings
