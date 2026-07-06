# mcp-server

## ADDED Requirements

### Requirement: full pipeline over MCP

The MCP server SHALL expose the whole pipeline as tools — dsb_recipes
(catalog), dsb_suggest (read-only concept-fit preview), dsb_build,
dsb_generate (artifact writer), dsb_validate — each wrapping the same
core path as the CLI with no duplicated logic.

#### Scenario: generate parity with CLI

- **WHEN** dsb_generate runs on tokens built from the examples brand
- **THEN** the written artifacts are byte-identical to CLI generate
  output for the same tokens

#### Scenario: suggest is read-only

- **WHEN** dsb_suggest runs on a brand
- **THEN** it returns the selected recipe, conflicts, edge and motif
  suggestions, and writes nothing

### Requirement: explicit write gating

dsb_generate SHALL be the only writing tool, SHALL require `outDir`,
and SHALL refuse a non-empty existing outDir unless `force: true`.

#### Scenario: non-empty outDir refused

- **WHEN** dsb_generate targets a non-empty directory without force
- **THEN** the call fails loudly and writes nothing

### Requirement: cwd-independent recipes resolution

The MCP server and the CLI default SHALL resolve the recipes directory
relative to the package root, so an npm-installed binary works from any
working directory; the CLI `--recipes` flag SHALL still override.

#### Scenario: server spawned from a foreign cwd

- **WHEN** the MCP server is spawned with cwd outside the package
- **THEN** dsb_build and dsb_recipes work against the packaged recipes
