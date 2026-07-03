# skeleton-batch-a

## ADDED Requirements

### Requirement: Information-dense grammars

The demo generator SHALL render minimal-tech with the spec-sheet grammar and
enterprise with the briefing grammar per the proposal tables, keeping the
5-region contract, var-only brand values, and the intent token hash
unchanged.

#### Scenario: minimal-tech renders spec-sheet

- **WHEN** the demo generates for minimal-tech
- **THEN** all 5 regions are present with spec-sheet structural markers
- **AND** the keystone hash is unchanged

#### Scenario: enterprise renders briefing

- **WHEN** the demo generates for enterprise
- **THEN** all 5 regions are present with briefing structural markers
- **AND** no card-grid or masthead appears
