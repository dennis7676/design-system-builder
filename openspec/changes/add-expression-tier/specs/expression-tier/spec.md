## ADDED Requirements

### Requirement: Expression tier field
`brand.json` SHALL accept an optional top-level `expression` field whose value is one of `"safe"`, `"balanced"`, `"bold"`. `validateBrand` SHALL reject any other value and SHALL accept its absence.

#### Scenario: Valid tier accepted
- **WHEN** a brand.json carries `expression: "bold"` and is otherwise valid
- **THEN** `validateBrand` returns no error for the `expression` path

#### Scenario: Out-of-enum tier rejected
- **WHEN** a brand.json carries `expression: "wild"`
- **THEN** `validateBrand` returns an error at path `expression`

### Requirement: Tier propagation via meta
`buildTokens` SHALL echo `brand.expression` into `meta.expression` **only when the brand field is present**. Because `computeTokenHash` covers the intent subtree excluding `meta`, setting or omitting the tier MUST NOT change any intent token hash, including the R1 keystone.

#### Scenario: Absent field leaves artifacts byte-stable
- **WHEN** a brand.json without `expression` is built
- **THEN** the resulting tokens.json contains no `meta.expression` key and equals today's output byte-for-byte

#### Scenario: Tier does not move the keystone
- **WHEN** minimal-tech is built with and without `expression: "bold"`
- **THEN** both documents' intent token hashes equal the `sample.tokens.json` keystone hash

### Requirement: Deterministic tier layouts on the applied demo
`generateDemo` SHALL resolve the tier as `doc.meta.expression ?? "balanced"` and emit one of three static layout treatments. The `balanced` treatment SHALL be byte-identical to the pre-change demo output. The `safe` and `bold` treatments SHALL differ from `balanced` and from each other in machine-checkable layout markers (hero structure, feature-grid template, display clamp), while colour tokens and contrast pairs remain untouched at every tier.

#### Scenario: Default reproduces current output
- **WHEN** `generateDemo` runs on a document without `meta.expression`
- **THEN** its output is string-equal to the output for the same document with `meta.expression: "balanced"` and to the pre-change generator's output

#### Scenario: Tiers are pairwise distinct (differentiation KPI)
- **WHEN** one expressive recipe is rendered at safe, balanced, and bold
- **THEN** the three outputs pairwise differ in layout markers, and the bold output alone contains the split-hero panel and the `grid-row: span 2` spotlight card

### Requirement: Tier discipline
Every tier SHALL preserve the applied-demo contracts: all five `data-demo-region` markers, the embedded `builtFromTokenHash` snapshot, and token-driven styling (brand-expressive values only via `var(--…)` or `color-mix` over vars). Bold on a flat recipe SHALL NOT introduce shadow or gradient values the recipe does not declare.

#### Scenario: Bold keeps the completeness and anti-hardcode contracts
- **WHEN** the bold demo is generated for an expressive recipe and for minimal-tech
- **THEN** `checkDemo` reports zero error-severity findings for both, the bold CSS contains no literal colour outside `:root`, and the minimal-tech bold output contains no `box-shadow`/`gradient` value
