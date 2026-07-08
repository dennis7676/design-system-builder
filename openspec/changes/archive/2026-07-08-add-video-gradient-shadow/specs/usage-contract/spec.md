# usage-contract

## ADDED Requirements

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
