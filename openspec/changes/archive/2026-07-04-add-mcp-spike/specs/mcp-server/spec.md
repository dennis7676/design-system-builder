# mcp-server

## ADDED Requirements

### Requirement: Thin protocol adapter

The MCP server SHALL expose `dsb_build` and `dsb_validate` over stdio using
the official MCP SDK, calling the same core functions as the CLI with no
new business logic and no core-module edits.

#### Scenario: tools are discoverable

- **WHEN** an MCP client completes initialize and calls tools/list
- **THEN** exactly dsb_build and dsb_validate are returned, each with an input schema

### Requirement: Deterministic build over MCP

`dsb_build` SHALL produce the same tokenHash as the CLI for the same brand
input, and SHALL default to dry-run (`confirm: false`) without weakening
the export gate.

#### Scenario: golden sample brand matches CLI hash

- **WHEN** dsb_build runs with the golden sample brand and confirm true
- **THEN** the returned tokenHash equals the CLI's hash for the same input

#### Scenario: dry-run is the default

- **WHEN** dsb_build runs without confirm
- **THEN** the result marks a dry-run and the export gate is not confirmed

### Requirement: Faithful validation results

`dsb_validate` SHALL return the validator's findings with unchanged
severities and messages.

#### Scenario: corrupted document reports the same finding

- **WHEN** dsb_validate runs on a document with a known injected violation
- **THEN** the response contains the same finding code the CLI reports

### Requirement: Protocol robustness

Malformed tool input SHALL yield `{ ok: false, error }` in the tool result
without terminating the server process.

#### Scenario: bad input does not kill the server

- **WHEN** dsb_build receives input that is neither brand nor brandPath
- **THEN** the tool result is ok:false and a subsequent tools/call still succeeds
