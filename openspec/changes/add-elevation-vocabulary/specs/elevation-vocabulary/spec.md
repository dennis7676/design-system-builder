## ADDED Requirements

### Requirement: Expressive recipes declare elevation tokens
Each expressive recipe (`expressive`, `warm-creator`, `retro`, `pro-emotive`, `creative-multiscale`, `luxury`) SHALL declare `primitive.shadow.*` tokens (`$type: "shadow"`) and expose them through `semantic.elevation.*` role aliases, tuned to the recipe's personality. The built document MUST pass the export gate with zero error-severity findings.

#### Scenario: Expressive recipe builds with elevation and passes the gate
- **WHEN** an expressive recipe is built (no overrides)
- **THEN** the tokens document contains at least one `semantic.elevation.*` leaf resolving to a `shadow` value, and `validateTokens` returns zero error-severity findings

### Requirement: Flat recipes remain elevation-free
The `minimal-tech` and `enterprise` recipes SHALL NOT declare any `shadow`/elevation token, preserving flatness as their identity and keeping the R1 intent-hash keystone intact.

#### Scenario: minimal-tech stays flat and keystone holds
- **WHEN** `minimal-tech` is built and its intent hash is compared to `sample.tokens.json`
- **THEN** the built document carries no `shadow` leaf **and** `computeTokenHash(built) === computeTokenHash(SAMPLE)`

### Requirement: Applied demo renders token-driven elevation
The applied `demo.html` surface SHALL apply elevation to its elevated card regions (feature cards and the signup card) exclusively via `box-shadow: var(--semantic-elevation-*)`, never a hardcoded shadow literal. When the tokens document carries no elevation token, the demo MUST emit no `box-shadow` so flat recipes render flat.

#### Scenario: Expressive demo paints elevation from tokens
- **WHEN** `generateDemo(doc)` runs for a recipe that declares elevation
- **THEN** the demo HTML contains `box-shadow: var(--semantic-elevation-` on its card regions and contains no hardcoded shadow literal

#### Scenario: Flat demo paints no elevation
- **WHEN** `generateDemo(doc)` runs for `minimal-tech`
- **THEN** the demo HTML contains no `box-shadow` declaration sourced from an elevation token

### Requirement: Keystone preservation
Introducing elevation MUST NOT modify `sample.tokens.json` intent, the `minimal-tech` recipe base tree, or the R1 keystone, so all pre-existing golden tests remain green and only additive elevation tests are new.

#### Scenario: Existing golden suite stays green
- **WHEN** elevation tokens and demo consumption are added and the full suite runs
- **THEN** all pre-existing recipe/validator/surface/demo tests pass unchanged and only additive elevation tests are new
