# demo-derived-contrast Specification

## Purpose
TBD - created by archiving change 2026-07-05-add-usage-contract. Update Purpose after archive.
## Requirements
### Requirement: derived demo text colors are gated

Every `color-mix(in oklch, …)` foreground the demo generators emit SHALL be
produced through a single helper that recomputes the oklch interpolation
build-time (using the existing color.ts pipeline) and enforces
`MIN_RATIO[role]` against the mix's surface, throwing with usage site, mix
percentage, computed ratio, and floor on failure; demo generators SHALL NOT
hand-write color-mix foreground strings.

#### Scenario: failing mix blocks the build

- **WHEN** a demo generator requests a mix whose computed contrast falls
  below the role floor for any recipe's realized values
- **THEN** generation fails naming the usage site, percentage, ratio, and
  floor

#### Scenario: all recipes sweep clean

- **WHEN** all 8 recipes generate all demo skeletons
- **THEN** every emitted color-mix foreground passes its role floor

### Requirement: violations fixed deterministically

Where a current hand-written percentage fails, the generator SHALL adopt
the minimum passing percentage in 2% steps (a deterministic value change,
not a runtime clamp), with affected demo goldens re-baselined loudly —
each re-baseline named in the change.

#### Scenario: no silent runtime clamping

- **WHEN** a mix percentage needed raising
- **THEN** the raised value is a source-code constant and the golden diff
  shows the change

