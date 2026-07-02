# typography-foundation Specification

## Purpose
TBD - created by archiving change add-typography-foundation. Update Purpose after archive.
## Requirements
### Requirement: Computed type-scale echo
`buildTokens` SHALL compute each recipe's characteristic type-scale ratio as
`round((size.display / size.body) ** 0.5, 4)` from the base ramp and echo it
at `meta.typeScale = { ratio, anchors }` where `anchors` mirrors the base
`caption/body/heading/display` values. A recipe MAY declare an explicit
`typeScale.ratio` outside `base`, which takes precedence. `meta` is
hash-excluded, so token-document intent hashes are unchanged by the echo.

#### Scenario: Echo matches the ramp
- **WHEN** minimal-tech is built with no options
- **THEN** `meta.typeScale.ratio` is `1.5` and `anchors.display` is `2.25`,
  and the intent hash equals the pre-change keystone

### Requirement: Six-role semantic typography hierarchy
Every recipe SHALL expose `semantic.typography` roles `display`, `h1`, `h2`,
`h3`, `body`, `caption`, each bundling `family`, `size`, `weight`,
`lineHeight`, `tracking`. `h1` SHALL alias the pre-existing heading anchor;
`display`, `body`, `caption` SHALL alias their pre-existing size anchors;
`h2`/`h3` SHALL alias new primitive sizes derived by geometric interpolation
inside the body→heading leg (`h3 = body·ρ^(1/3)`, `h2 = body·ρ^(2/3)`,
ρ = heading/body, 3-decimal round). The pre-existing `semantic.typography.
heading` and `body` nodes SHALL be preserved unchanged.

#### Scenario: Roles resolve on every recipe
- **WHEN** any of the 8 recipes is built
- **THEN** all six roles resolve to terminal values for all five fields, and
  heading-tier roles of serif recipes carry the recipe's serif family

#### Scenario: Hierarchy legibility band
- **WHEN** any recipe is built
- **THEN** `h1.size / body.size` is within `[1.25, 2.0]` and the resolved
  ramp is strictly monotone `caption < body < h3 < h2 < h1 ≤ display`

### Requirement: Tracking tokens
Every recipe SHALL declare `primitive.font.tracking = { heading, body,
caption }` as `$type: "number"` leaves (em by convention), initially
`-0.01 / 0 / 0.04`, consumed by the role bundles. The ko generator path SHALL
continue neutralizing negative tracking on heading-tier roles while
preserving caption's positive tracking.

#### Scenario: ko neutralizes only negative tracking
- **WHEN** a ko demo is generated for a recipe with heading tracking `-0.01`
- **THEN** rendered heading-tier tracking is `normal` while caption retains
  its positive tracking

### Requirement: Additive re-baseline of the keystone
The pre-change keystone SHALL be preserved verbatim as
`golden/fixtures/pre-typography-sample.tokens.json`. A gate (G-T0) SHALL
assert that every leaf path of that fixture exists with a deeply-equal value
in freshly built minimal-tech output. `golden/sample.tokens.json` SHALL be
regenerated only after G-T0 passes and the operator approves the audited
diff; the R1 keystone test itself is unchanged.

#### Scenario: Old document is a value-identical subset
- **WHEN** G-T0 walks the fixture against a fresh build
- **THEN** zero leaves are missing or value-changed (additions tolerated)

### Requirement: Surfaces consume the hierarchy
The demo and styleguide SHALL size all role-mapped text elements from
semantic typography variables (responsive `clamp()` MAY wrap a
variable-derived base), with no literal `rem`/`px` font-size on role
elements. The styleguide SHALL render a type-scale section showing all six
roles. Consuming the roles SHALL leave zero `font.size.*` orphan-token WARNs.

#### Scenario: No hardcoded role sizing
- **WHEN** a demo is generated for any recipe
- **THEN** hero/heading/card-title/caption elements derive font-size from
  `--semantic-typography-*` variables and the validator reports zero
  `font.size.*` orphan warnings

