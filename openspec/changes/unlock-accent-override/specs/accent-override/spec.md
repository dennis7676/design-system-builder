## ADDED Requirements

### Requirement: Accent hue override field
`brand.json` SHALL accept `overrides["visual.accent"]` as an integer hue in
[0, 359]. `validateBrand` SHALL reject non-integers and out-of-range values.
`tone_vector.cold_warm` SHALL no longer be a recognized override axis; using
it SHALL produce an unknown-axis error that names `visual.accent` as the
replacement. `motion.easing` SHALL remain deferred.

#### Scenario: Range gate
- **WHEN** brand.json carries `overrides: {"visual.accent": 275}`
- **THEN** validateBrand returns no error for that path
- **WHEN** it carries `360`, `-1`, `3.5`, or `"warm"`
- **THEN** an error at `overrides.visual.accent` is returned

### Requirement: Coherent chromatic rotation
When the accent override is present, `buildTokens` SHALL rotate every
primitive colour leaf with chroma ≥ 0.03 by the single delta between the
requested hue and the anchor hue. The anchor SHALL be the primitive leaf
resolved by `semantic.color.primary.default` when it is chromatic, otherwise
the highest-chroma primitive colour leaf (achromatic-primary recipes anchor
on their visible accent); a fully achromatic palette SHALL fail with
`accent-anchor-achromatic`. Rotation preserves each leaf's OKLCH lightness
and clamping chroma to the sRGB gamut at the new hue via deterministic
binary search. Achromatic leaves SHALL be untouched. Pairwise hue deltas
between chromatic leaves SHALL be preserved (±0.5°).

#### Scenario: Anchor lands on the requested hue
- **WHEN** minimal-tech is built with accent hue 350
- **THEN** the anchor leaf's hue is 350 (±0.5°), its lightness is unchanged
  or carries a recorded repair, and every other chromatic leaf moved by the
  same delta

### Requirement: Contrast re-derivation with bounded nearest-fix
After rotation, every `contrastPairs` floor SHALL be re-evaluated. A failing
pair SHALL be repaired by stepping the bg-role leaf's lightness away from
the foreground in 0.005 increments, re-clamping chroma each step, bounded at
|ΔL| ≤ 0.06; repairs SHALL be echoed at `meta.colorOverride.corrections[]`.
If the bound is exceeded the build SHALL fail with
`accent-contrast-unrepairable` carrying the pair and measured ratio. Builds
without the override SHALL be byte-identical to pre-change output.

#### Scenario: Worst-case hue is repaired, not rejected
- **WHEN** minimal-tech (white-on-primary text pair) is built with accent
  hue 110
- **THEN** the build succeeds, the text pair measures ≥ 4.5, and any
  lightness change is listed in meta.colorOverride.corrections

#### Scenario: No-override anchor
- **WHEN** any recipe is built without the override
- **THEN** tokens.json is byte-identical to the pre-change builder's output
  and the R1 keystone hash is unmoved

### Requirement: Deterministic output
The same brand.json with an accent override SHALL produce byte-identical
tokens.json on repeated builds, including `meta.colorOverride`.

#### Scenario: Double build
- **WHEN** the same override build runs twice
- **THEN** the two tokens.json outputs are byte-identical
