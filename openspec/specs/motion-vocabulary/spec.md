# motion-vocabulary Specification

## Purpose
TBD - created by archiving change 2026-07-03-add-motion-vocabulary. Update Purpose after archive.
## Requirements
### Requirement: Per-recipe easing personality

Every recipe SHALL define `primitive.motion.easing.{standard, enter, exit}`
as cubicBezier leaves whose `$value` is a 4-number array `[x1, y1, x2, y2]`
with x1/x2 ∈ [0,1], matching the normative table in proposal.md verbatim.

#### Scenario: expressive recipe carries overshoot

- **WHEN** `build(expressive)` runs
- **THEN** `primitive.motion.easing.standard.$value` equals `[0.34, 1.2, 0.64, 1]`
- **AND** `semantic.motion.easing.standard` resolves to the same tuple

#### Scenario: validator rejects out-of-range x

- **WHEN** a document contains a cubicBezier leaf with x1 = 1.2
- **THEN** validation fails with a structural error naming the path

### Requirement: Dual-surface realization

cubicBezier leaves SHALL realize to `cubic-bezier(x1, y1, x2, y2)` on the web
surface and to readonly `[x1, y1, x2, y2]` tuples in the video adapter's
generated `tokens.ts`, and `cubicBezier` SHALL no longer appear in
`VIDEO_SKIPPED_TYPES`.

#### Scenario: video adapter emits Easing.bezier-consumable tuple

- **WHEN** `toTokensTs(build(minimal-tech))` runs
- **THEN** the emitted source contains the easing tuple as `as const` numbers
- **AND** the generated header's skipped list contains only shadow/gradient kinds

### Requirement: motion.easing override unlock

The `motion.easing` override axis SHALL be removed from `DEFERRED_OVERRIDES`
and accept exactly one of `subtle | standard | expressive | dramatic`,
replacing the recipe's easing triple wholesale with provenance recorded in
`meta`.

#### Scenario: dramatic preset replaces luxury easing

- **WHEN** a brand selects luxury with `overrides: { "motion.easing": "dramatic" }`
- **THEN** `primitive.motion.easing.standard.$value` equals `[0.68, -0.3, 0.32, 1.3]`
- **AND** `meta` records the override provenance

#### Scenario: unknown preset rejected

- **WHEN** a brand passes `overrides: { "motion.easing": "bouncy" }`
- **THEN** validation fails with the enum-range error

