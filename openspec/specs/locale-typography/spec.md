# locale-typography Specification

## Purpose
TBD - created by archiving change add-locale-typography. Update Purpose after archive.
## Requirements
### Requirement: Locale field
`brand.json` SHALL accept an optional `product.locales` string array. The pilot
recognizes only `"ko"`; `validateBrand` SHALL reject unrecognized values and
SHALL accept absence or an empty array.

#### Scenario: ko accepted, unknown rejected
- **WHEN** brand.json carries `product.locales: ["ko"]`
- **THEN** `validateBrand` returns no error for the locales path
- **WHEN** it carries `product.locales: ["xx"]`
- **THEN** an error at path `product.locales` is returned

### Requirement: Korean font-stack splice
When `locales` includes `ko`, `buildTokens` SHALL splice the recipe's declared
Korean families (recipe `locales.ko`, outside `base`) into every
`primitive.font.family.*` stack it maps, inserted before the trailing generic
keyword. Builds without `ko` SHALL be byte-identical to pre-change output, and
the R1 keystone hash SHALL be unchanged with and without the field.

#### Scenario: Localized stack carries Korean families
- **WHEN** luxury is built with `locales: ["ko"]`
- **THEN** its heading/display family stacks contain `"Noto Serif KR"` and end with their original generic keyword, and body stacks contain `"Pretendard"`

#### Scenario: Non-localized build unmoved
- **WHEN** any recipe is built without `locales`
- **THEN** tokens.json is byte-identical to the pre-change builder's output

### Requirement: Korean rendering rules on surfaces
The generators (`generateDemo`, `generateStyleguide`) SHALL, when
`meta.locales` includes `ko`: emit a `ko` lang attribute on the root element,
apply `word-break: keep-all` with `overflow-wrap: anywhere` to text content,
omit negative letter-spacing on headings, and keep the bold tier's display
line-height at or above `1.12`. The demo SHALL render a fixed Korean copy deck
while keeping all five `data-demo-region` markers and the token-snapshot
contract.

#### Scenario: ko demo carries the rules
- **WHEN** the demo is generated for a ko build at bold
- **THEN** the HTML root has `lang="ko"`, the CSS contains `word-break: keep-all`, no negative letter-spacing on `h1`, a display line-height ≥ 1.12, Korean copy in the hero, and `checkDemo` reports zero errors

#### Scenario: Latin demo unchanged
- **WHEN** the demo is generated for a build without locales
- **THEN** output is byte-identical to the pre-change generator at every expression tier

