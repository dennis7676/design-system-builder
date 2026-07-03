# layout-probe spec delta

## ADDED Requirements

### Requirement: Standing browser layout smoke

The repo SHALL provide `npm run probe:layout` which renders every recipe's
styleguide in en and ko in a real browser and mechanically asserts layout
invariants that node-based goldens cannot observe.

#### Scenario: Frame containment

- **WHEN** any `#applications .application-frame` has visible descendant
  content extending more than 2px past its client box (vertical or
  horizontal)
- **THEN** the probe reports the page, frame, and overflow in px and exits
  non-zero.

#### Scenario: Chrome adjacency gap

- **WHEN** a GAP_RULES entry's `below` element sits less than `minGap` px
  under its `above` element within `container` (e.g. playground toolbar vs
  component stage, 8px)
- **THEN** the probe fails that page with the measured gap.

#### Scenario: No system browser

- **WHEN** no system Chrome/Edge/Chromium channel can launch
- **THEN** the probe prints SKIP and exits 0 (or exits 2 when
  `LAYOUT_PROBE_STRICT=1`), never attempting a browser download.
