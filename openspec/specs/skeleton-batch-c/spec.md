# skeleton-batch-c Specification

## Purpose
TBD - created by archiving change 2026-07-03-skeleton-batch-c. Update Purpose after archive.
## Requirements
### Requirement: Narrative grammars

The demo generator SHALL render warm-creator with the journal grammar and
pro-emotive with the story grammar per the proposal tables, keeping the
5-region contract, var-only brand values, and the intent token hash
unchanged.

#### Scenario: warm-creator renders journal

- **WHEN** the demo generates for warm-creator
- **THEN** all 5 regions are present with journal structural markers
- **AND** the keystone hash is unchanged

#### Scenario: pro-emotive renders story

- **WHEN** the demo generates for pro-emotive
- **THEN** all 5 regions are present with story structural markers
- **AND** no card-grid or masthead appears

