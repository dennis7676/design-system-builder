## ADDED Requirements

### Requirement: Applied demo page generation
The system SHALL provide `generateDemo(doc)` that returns a single self-contained HTML page presenting a realistic applied product layout with the regions `nav`, `hero`, `features`, `form`, and `footer`, each marked with a `data-demo-region="<name>"` attribute.

#### Scenario: Self-contained page with all regions
- **WHEN** `generateDemo(doc)` is called with a valid tokens document
- **THEN** the output starts with `<!doctype html>`, contains a single `<html>…</html>`, has balanced `<section>`/tag counts, and contains one `data-demo-region` marker for each of nav, hero, features, form, footer

### Requirement: Token-driven styling only
The demo page SHALL derive every brand-expressive property (color, typography family/size/weight, radius, motion duration) from CSS custom properties emitted by `toCssVars(doc)` via `var(--…)` references. It MUST NOT embed literal token values for these properties; layout chrome (grid, clamp, hairline borders) MAY use literals, consistent with the styleguide's `baseCss`.

#### Scenario: Divergent recipes produce divergent output (differentiation KPI)
- **WHEN** the demo is generated for two structurally divergent recipes (e.g. `luxury` and `minimal-tech`)
- **THEN** the emitted `:root` block differs in the brand variables `--semantic-color-primary-default` and `--semantic-typography-heading-family`, proving the page is styled by tokens rather than hardcoded values

### Requirement: Demo surface drift detection
The demo page SHALL embed its own `builtFromTokenHash` (in a `<script id="token-snapshot" type="application/json">` block), and `checkManifest` SHALL report a `manifest-drift` finding with `meta.surface = "demo"` when that hash is missing or does not equal `computeTokenHash(doc)`.

#### Scenario: Stale demo hash is flagged
- **WHEN** the demo HTML's embedded hash is replaced with a stale value and `checkManifest` runs
- **THEN** an error-severity finding `{ code: "manifest-drift", meta.surface: "demo" }` is returned

### Requirement: Demo surface completeness
`checkManifest` SHALL report a `surface-incomplete` finding with `meta.surface = "demo"` and the missing `element` when any required region (nav, hero, features, form, footer) is absent from the demo HTML.

#### Scenario: Missing region is flagged
- **WHEN** a required `data-demo-region` block is removed from the demo HTML and `checkManifest` runs
- **THEN** an error-severity finding `{ code: "surface-incomplete", meta.surface: "demo" }` is returned

#### Scenario: Baseline demo passes all manifest gates
- **WHEN** `checkManifest` runs over a freshly generated demo surface for the sample tokens
- **THEN** it returns zero error-severity findings for the demo surface

### Requirement: Keystone preservation
Introducing the demo surface MUST NOT modify `tokens.json` intent, recipe base trees, the `minimal-tech` recipe, or `sample.tokens.json`, so the R1 intent-hash keystone and existing golden tests remain green.

#### Scenario: Existing golden suite stays green
- **WHEN** the demo surface and its checks are added and the full test suite runs
- **THEN** all pre-existing recipe/validator/surface tests pass unchanged and only additive demo tests are new
