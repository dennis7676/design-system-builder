# recipe-skeleton Specification

## Purpose
TBD - created by archiving change 2026-07-03-add-recipe-skeleton-spike. Update Purpose after archive.
## Requirements
### Requirement: Recipe-declared skeleton axis

The build SHALL accept an optional recipe-root `skeleton: "editorial"`
declaration (absent means standard), SHALL echo it as `meta.skeleton`, and
SHALL keep the intent token hash unaffected by the declaration.

#### Scenario: luxury declares editorial, keystone unaffected

- **WHEN** `build(luxury)` runs
- **THEN** `meta.skeleton` equals `"editorial"`
- **AND** `computeTokenHash(build(minimal-tech))` still equals the keystone

### Requirement: Editorial demo grammar

When `meta.skeleton` is `"editorial"`, the demo SHALL render all 5
`data-demo-region` regions with editorial composition (masthead nav without
CTA, full-height centered hero with single ghost CTA, numbered spread rows
without a card grid, unboxed invitation form, colophon footer), consuming
brand values only via `var(--…)`.

#### Scenario: luxury demo is structurally editorial

- **WHEN** `generateDemo(build(luxury))` runs
- **THEN** all 5 regions are present
- **AND** the markup contains a masthead and no `.card-grid`

#### Scenario: non-luxury demos are byte-identical

- **WHEN** the demo generates for any of the 7 non-editorial recipes
- **THEN** the output is byte-identical to the pre-change generator

