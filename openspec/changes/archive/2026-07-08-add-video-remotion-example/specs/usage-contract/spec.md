# usage-contract

## ADDED Requirements

### Requirement: video output has a runnable Remotion example

The repository SHALL contain a runnable Remotion example that consumes the
generated video artifacts end-to-end. The example SHALL import the generated
`tokens.ts` and `fonts.video.ts`, render at least one still frame through
Remotion, and depend on `@remotion/*` only within the example directory (never
the repo-root `package.json`).

#### Scenario: example renders a frame from generated tokens

- **WHEN** the example's end-to-end script runs
- **THEN** it bundles a Remotion composition that imports the committed
  `tokens.ts` and `fonts.video.ts`
- **AND** it renders one still frame to a non-empty PNG without error

#### Scenario: example asserts token-hash parity

- **WHEN** the example's end-to-end script runs
- **THEN** it reads the tokenHash from the committed `tokens.ts` header
- **AND** it fails unless that hash equals the sealed `creative-multiscale` hash

#### Scenario: example stays isolated from the root build

- **WHEN** the root `tsc` and `vitest` runs execute
- **THEN** the example sources are outside their include globs
- **AND** the root package.json declares no `@remotion/*` or `react` dependency
