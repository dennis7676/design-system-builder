# motif-enum

## ADDED Requirements

### Requirement: Finite versioned motif enum

`brand.json` SHALL accept an optional single-valued `motif` field whose
value comes from the versioned enum `["glyph", "geometric", "rule-lines",
"none"]`. Unknown values SHALL fail validation with a CONFLICT naming the
enum.

#### Scenario: unknown motif is rejected

- **WHEN** brand.json contains `motif: "mascot"`
- **THEN** validateBrand returns a CONFLICT listing the allowed enum

#### Scenario: array form is rejected

- **WHEN** brand.json contains `motif: ["glyph"]`
- **THEN** validation fails stating motif is a single value

### Requirement: Deterministic concept-fit suggestions

`suggestMotifs(brand, recipe)` SHALL return, for identical inputs, an
identical ordered list of `{ motif, rationale }` entries, computed only
from static rules over recipe key, tone vector, and expression tier.
`glyph` and `none` SHALL always be suggested. `geometric` SHALL be
suggested only for recipes minimal-tech/expressive/creative-multiscale or
tones with `classic_cutting_edge >= 5` or `static_dynamic >= 5`.
`rule-lines` SHALL be suggested only for recipes luxury/enterprise/retro
or tones with `classic_cutting_edge <= 3` and `serious_playful <= 4`.

#### Scenario: reproducible proposals

- **WHEN** suggestMotifs runs twice on the same brand.json and recipe
- **THEN** the outputs are deeply equal

#### Scenario: geometric is not offered to a classic warm brand

- **WHEN** the selected recipe is luxury and the tone vector has
  classic_cutting_edge 2 and static_dynamic 3
- **THEN** the suggestion list contains rule-lines but not geometric

### Requirement: Motif tokens are emitted only when chosen

When brand.json carries `motif`, the built document SHALL contain a
`semantic.motif` group with `kind` (`$type` "motif-kind"), `ink` (color
aliased to the hero-panel primary), and `scale` (dimension matching the
legacy glyph clamp basis). When `motif` is absent, no `semantic.motif`
group SHALL exist.

#### Scenario: chosen motif emits the group

- **WHEN** brand.json carries `motif: "geometric"`
- **THEN** tokens.json contains semantic.motif.kind = "geometric" with ink and scale leaves

#### Scenario: absent motif emits nothing

- **WHEN** brand.json has no motif field
- **THEN** tokens.json contains no semantic.motif group

### Requirement: Motif ink admission gate

When a `semantic.motif` group exists with `kind != "none"`, the validator
SHALL prove the (motif ink, hero-panel background) pair meets the non-text
3:1 floor. A violation SHALL fail the build naming the pair and ratio. The
gate SHALL be registered in GATE_CATALOG.

#### Scenario: low-contrast ink fails

- **WHEN** a built document's motif ink is 2.2:1 against the hero-panel background
- **THEN** validation fails naming motif-ink-floor and the ratio

#### Scenario: none is exempt

- **WHEN** a built document carries semantic.motif.kind = "none"
- **THEN** the motif-ink-floor gate reports no violation

### Requirement: Fitness is part of the process

A brand.json carrying a motif whose fitness predicate rejects the selected
recipe/tone/tier SHALL fail the build with a CONFLICT carrying the fitness
rationale.

#### Scenario: hand-added unfit motif cannot build

- **WHEN** brand.json for luxury with classic_cutting_edge 2 and
  static_dynamic 3 carries `motif: "geometric"`
- **THEN** the build fails with the motif-fit-rejected CONFLICT

### Requirement: Demos render the motif from tokens

When `motif` is present, every existing glyph slot (generator bold hero,
story, collage, mosaic, spec-sheet) SHALL render the chosen motif consuming
only `--semantic-motif-*` custom properties: `glyph` renders the
first-letter letterform, `geometric` renders the pinned three-primitive
SVG composition, `rule-lines` renders hairline rules, `none` renders an
empty panel. Motif markup SHALL stay `aria-hidden`.

#### Scenario: geometric replaces the letterform

- **WHEN** a demo builds with `motif: "geometric"`
- **THEN** the hero panel contains the pinned SVG composition and no first-letter glyph

#### Scenario: var-only consumption

- **WHEN** any demo renders a motif
- **THEN** its motif markup/CSS references only --semantic-motif-* variables for ink and scale

### Requirement: No-motif builds are byte-identical

A brand.json without `motif` SHALL produce output byte-identical to the
pre-change generator: keystone and all existing goldens SHALL pass
unmodified.

#### Scenario: keystone unchanged

- **WHEN** the keystone brand builds with no motif field
- **THEN** the emitted artifacts byte-equal the committed goldens
