# skeleton-batch-b

## ADDED Requirements

### Requirement: Expressive grammars

The demo generator SHALL render expressive with the collage grammar,
creative-multiscale with the mosaic grammar, and retro with the poster
grammar per the proposal tables, keeping the
5-region contract, var-only brand values, and the intent token hash
unchanged.

#### Scenario: expressive renders collage

- **WHEN** the demo generates for expressive
- **THEN** all 5 regions are present with collage structural markers
- **AND** the keystone hash is unchanged

#### Scenario: retro renders poster

- **WHEN** the demo generates for retro
- **THEN** all 5 regions are present with poster structural markers
- **AND** no card-grid or masthead appears
