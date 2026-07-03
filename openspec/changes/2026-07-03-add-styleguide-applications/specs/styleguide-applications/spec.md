# styleguide-applications spec delta

## ADDED Requirements

### Requirement: Applications exhibit section

The generated styleguide SHALL contain a section `id="applications"` between
`components` and `relationships`, presenting five same-token medium samples:
embedded website demo (16:9 iframe), two 16:9 slides, three 4:5 carousel
frames, 16:9 video title card + lower third, and a 9:16 shorts/reels cover.

#### Scenario: Same-token proof

- **WHEN** a styleguide is built from any recipe/tier/locale combination
- **THEN** every sample block resolves brand-affecting values exclusively
  through `var(--…)` custom properties already emitted for the page, reuses
  copy from the surface copy deck, and the build stays byte-deterministic
  and token-hash-neutral.

#### Scenario: Skeleton-aware placement

- **WHEN** two recipes with different `meta.skeleton` values are built
- **THEN** slide/video samples differ in headline alignment or ornament per
  the constrained `skeletonHint` map, without importing demo grammar modules.
