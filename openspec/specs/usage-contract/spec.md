# usage-contract Specification

## Purpose
TBD - created by archiving change 2026-07-05-add-usage-contract. Update Purpose after archive.
## Requirements
### Requirement: contract.json emission

`generate` SHALL emit a deterministic `contract.json` alongside the other
surfaces, embedding `builtFromTokenHash`, and containing: consumption
do/don't rules, the public/internal token API surface (prefixes, classes,
units, leaf types), a component registry snapshot (rollout recipes, states,
per-primitive variants/properties/contrast roles), a video contract snapshot
(declared realizable paths, skipped video leaf types, and parity gate code),
the gate catalog, the accessibility floors (MIN_RATIO, disabled exemption,
gradient worst-case-stop), the finite enums (recipes, expression, skeleton,
motion presets), and guarantees each carrying a proof pointer.

#### Scenario: deterministic bytes

- **WHEN** the same tokens.json is generated twice
- **THEN** the two contract.json files are byte-identical

#### Scenario: hash embedded

- **WHEN** contract.json is emitted
- **THEN** its `builtFromTokenHash` equals the source tokens.json hash

#### Scenario: video section is derived

- **WHEN** contract.json is emitted for a recipe in the video contract
- **THEN** its `video.realizablePaths` equals that recipe's declared static
  video contract paths
- **AND** its `video.skippedTypes` names the video skipped leaf types
- **AND** its `video.gate` is `video-contract-parity`

### Requirement: contract derives from gate-read code

`buildContract` SHALL assemble registry, enum, floor, and video contract content
from the same exported constants the gates and builder read
(`COMPONENT_P1_REGISTRY`, `COMPONENT_P1_ROLLOUT`, tokens-schema enums,
`MIN_RATIO`, `VIDEO_CONTRACT`, and `VIDEO_SKIPPED_TYPES`) — not from
hand-maintained copies — and a parity test SHALL fail when the validator can
emit a gate code absent from `GATE_CATALOG` or the catalog lists a code the
validator/gate/manifest cannot emit.

#### Scenario: registry change flows through

- **WHEN** a primitive is added to `COMPONENT_P1_REGISTRY`
- **THEN** the next build's contract.json reflects it with no contract.ts
  edit

#### Scenario: video contract change flows through

- **WHEN** a path is added to a recipe in `VIDEO_CONTRACT`
- **THEN** the next build's contract.json reflects it with no contract.ts edit

#### Scenario: catalog drift fails tests

- **WHEN** a new gate code is added to the validator without a
  `GATE_CATALOG` entry
- **THEN** the parity test fails naming the missing code

### Requirement: manifest covers the contract

`validate --check-manifest` SHALL treat contract.json as a surface: a
missing file, unparseable JSON, or a `builtFromTokenHash` mismatch fails
the manifest check naming contract.json.

#### Scenario: drifted contract caught

- **WHEN** contract.json carries a stale hash after tokens.json changed
- **THEN** the manifest check fails naming contract.json

### Requirement: README guarantees carry proofs

The README guarantees section SHALL state each guarantee
(byte-reproducibility, WCAG gating including demo derived colors,
cross-surface consistency, golden regression safety, machine-readable
contract) followed by its proof pointer — the gate code symbol, golden
test file, or verification command — and SHALL cite the actual golden
count at landing time.

#### Scenario: no unproven claim

- **WHEN** the guarantees section is read
- **THEN** every claim names where its proof lives

### Requirement: video contract parity gate

Every recipe listed in the static `VIDEO_CONTRACT` manifest SHALL realize at
least the manifest's declared video path set. The gate SHALL use superset
semantics: missing declared paths fail, while extra realized paths are allowed
for later M4 expansion. The manifest and gate SHALL NOT mutate primitive,
semantic, component, transformContract, or contrastPairs token intent.

#### Scenario: all rolled-out recipes pass

- **WHEN** each of the 8 recipes is built and validated
- **THEN** `video-contract-parity` emits no findings

#### Scenario: missing declared path fails loudly

- **WHEN** a declared video path is no longer present in the realized video set
- **THEN** validation emits `video-contract-parity`
- **AND** the finding names the missing path

#### Scenario: token hash seal holds

- **WHEN** all 8 recipes are built after adding the video contract
- **THEN** each `computeTokenHash(doc)` equals its pre-change value

### Requirement: video realizes gradient and shadow leaves structurally

The video adapter SHALL realize `gradient` and `shadow` leaves into structured
Remotion-consumable TypeScript values, not CSS strings. Gradient values SHALL
emit `{ kind: "linear" | "radial", angle: number | null, stops:
Array<{ color: "#rrggbb", position: number }> }`. Shadow values SHALL emit an
array of `{ offsetX: number, offsetY: number, blur: number, spread: number,
color: "#rrggbb", inset: boolean }` layers.

#### Scenario: gradient emits normalized stops

- **WHEN** a video-exportable gradient leaf is realized
- **THEN** it appears in `toRealizedVideo(doc).values`
- **AND** every stop color is a six-digit lowercase hex color
- **AND** every stop position is normalized to the inclusive `[0,1]` range
- **AND** the path does not appear in `skipped`

#### Scenario: shadow emits layer objects

- **WHEN** a video-exportable shadow leaf is realized
- **THEN** it appears in `toRealizedVideo(doc).values`
- **AND** each shadow layer has numeric px offsets, blur, spread, a six-digit
  lowercase hex color, and an `inset` boolean
- **AND** the path does not appear in `skipped`

### Requirement: video gradient-shadow expansion is additive

Expanding video realization to `gradient` and `shadow` SHALL NOT mutate the
intent token document and SHALL NOT alter `tokens.ts` bytes for documents that
do not contain video-exportable `gradient` or `shadow` leaves.

#### Scenario: token hash seal holds

- **WHEN** all 8 recipes are built after video gradient/shadow realization
- **THEN** each `computeTokenHash(doc)` equals its pre-change sealed value

#### Scenario: no-gradient/no-shadow output is byte-stable

- **WHEN** `toTokensTs(doc)` runs for a document with no gradient or shadow
  leaves
- **THEN** the generated `tokens.ts` bytes match the frozen pre-expansion
  output

### Requirement: generate emits a video font loader sidecar

`generate` SHALL write a deterministic `fonts.video.ts` file alongside the
video `tokens.ts` artifact. The sidecar SHALL be derived from the document's
ordered video `fontAssets` family set and SHALL NOT alter `tokens.ts` or token
intent.

#### Scenario: sidecar is written beside tokens

- **WHEN** generated artifacts are written to an output directory
- **THEN** `fonts.video.ts` exists beside `tokens.ts`
- **AND** `tokens.ts` still exports the existing `fontAssets` array

#### Scenario: sidecar bytes are deterministic

- **WHEN** `toFontsTs(doc)` runs twice for the same document
- **THEN** both outputs are byte-identical

### Requirement: video font loader respects font source classification

The video font loader sidecar SHALL classify collected families with the
existing font source model. Families classified as `google` SHALL emit
`@remotion/google-fonts/<Package>` imports and `loadVideoFonts()` calls, where
`<Package>` is the family name with spaces removed. Families classified as
`css-url` SHALL emit `cdnFontStylesheets` entries with their configured CDN
URL and SHALL NOT emit Google font imports. Families classified as `system`
SHALL be excluded from generated loaders.

#### Scenario: google family imports loadFont

- **WHEN** a document uses `Inter`
- **THEN** `fonts.video.ts` imports
  `@remotion/google-fonts/Inter`
- **AND** `loadVideoFonts()` calls the generated Inter loader

#### Scenario: css-url family uses stylesheet metadata

- **WHEN** a document uses `SUIT`
- **THEN** `fonts.video.ts` includes `SUIT` in `cdnFontStylesheets` with its
  configured CDN URL
- **AND** it does not import `@remotion/google-fonts/SUIT`

#### Scenario: system family is not loaded

- **WHEN** a document uses `-apple-system`
- **THEN** `fonts.video.ts` does not load it through `loadVideoFonts`
- **AND** it does not include it in `cdnFontStylesheets`

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

