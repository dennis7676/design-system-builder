# gradient-vocabulary Specification

## Purpose
TBD - created by archiving change add-gradient-vocabulary. Update Purpose after archive.
## Requirements
### Requirement: Gradient token type
The schema SHALL support a `gradient` leaf `$type` whose `$value` is `{ kind: "linear" | "radial", angle?: string, stops: string[] }`, and `transformer` SHALL realize it into a CSS `linear-gradient(...)` or `radial-gradient(...)` string.

#### Scenario: Gradient realizes to CSS
- **WHEN** a `gradient` leaf `{ kind: "linear", angle: "160deg", stops: ["oklch(0.98 0 0)", "oklch(0.95 0.04 300)"] }` is realized for web
- **THEN** the output is `linear-gradient(160deg, oklch(0.98 0 0), oklch(0.95 0.04 300))`

### Requirement: Worst-case-stop contrast gate
When a `contrastPair.bg` resolves to a `gradient` leaf, the validator SHALL compute the contrast ratio of the foreground colour against **each** gradient stop and SHALL fail (`contrast-fail`) if the **minimum** ratio across stops is below the role's floor. A gradient background passes only when every stop clears the floor.

#### Scenario: A dark stop fails the gate
- **WHEN** a text `contrastPair` has a gradient bg whose stops include a dark colour that drops below 4.5:1 against the foreground
- **THEN** `validateTokens` returns an error-severity `contrast-fail` finding for that pair

#### Scenario: Uniformly light stops pass
- **WHEN** every stop of a text-background gradient clears the 4.5:1 floor against the foreground
- **THEN** the pair produces no contrast finding

### Requirement: Expressive recipes declare a hero gradient
Each expressive recipe (`expressive`, `warm-creator`, `retro`, `pro-emotive`, `creative-multiscale`, `luxury`) SHALL declare `semantic.gradient.hero` with a text `contrastPair` against `semantic.color.surface.foreground`, and the built document MUST pass the export gate with zero error-severity findings.

#### Scenario: Expressive recipe builds with a gated gradient
- **WHEN** an expressive recipe is built
- **THEN** its document contains `semantic.gradient.hero` and `validateTokens` returns zero error-severity findings

### Requirement: Flat recipes remain gradient-free
`minimal-tech` and `enterprise` SHALL NOT declare any gradient token, and introducing gradients MUST NOT modify `sample.tokens.json` or the R1 keystone.

#### Scenario: Flat recipe stays gradient-free and keystone holds
- **WHEN** `minimal-tech` is built
- **THEN** it carries no `gradient` leaf and `computeTokenHash(built) === computeTokenHash(SAMPLE)`

### Requirement: Applied demo renders token-driven gradient
The applied `demo.html` hero SHALL derive its background from `var(--semantic-gradient-hero)` when the document declares a gradient, and MUST NOT hardcode a gradient literal. When no gradient token exists, the hero renders a plain surface.

#### Scenario: Expressive demo hero uses the gradient token
- **WHEN** `generateDemo(doc)` runs for a recipe with a hero gradient
- **THEN** the demo CSS contains `var(--semantic-gradient-hero)` for the hero background and no hardcoded `linear-gradient(`/`radial-gradient(` literal on brand surfaces

#### Scenario: Flat demo hero has no gradient
- **WHEN** `generateDemo(doc)` runs for `minimal-tech`
- **THEN** the demo emits no gradient-backed hero

