# usage-contract

## ADDED Requirements

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
