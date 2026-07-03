# webfont-loading

## ADDED Requirements

### Requirement: Complete font source coverage

The font source manifest SHALL cover every family name appearing in any
recipe (base and locales) with exactly one of google / css-url / system,
and the css-url entries SHALL use the operator-verified pinned URLs from
proposal.md verbatim.

#### Scenario: new recipe family without a source fails the golden

- **WHEN** a fontFamily leaf names a family absent from the manifest
- **THEN** the completeness golden fails naming the family

### Requirement: Self-sufficient surfaces

Generated demo.html and styleguide.html SHALL include stylesheet links for
every non-system family in the document, and the CLI SHALL write a
`fonts.css` artifact with equivalent @import statements while leaving
tokens.css import-free.

#### Scenario: luxury ko demo loads its named fonts

- **WHEN** the demo generates for luxury with locales [ko]
- **THEN** the head contains one stylesheet link per non-system family
- **AND** google css2 URLs carry the document's weight union incl. 400/700

#### Scenario: unknown family is visibly marked

- **WHEN** a document contains a fontFamily leaf the manifest cannot resolve
- **THEN** the generated head contains a `webfont: no source` comment naming it
