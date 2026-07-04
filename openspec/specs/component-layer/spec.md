# component-layer Specification

## Purpose
TBD - created by archiving change add-component-foundation. Update Purpose after archive.
## Requirements
### Requirement: P1 primitive registry

`COMPONENT_P1_PATHS` SHALL define, in code, the exact component leaf-path
contract for the 10 P1 primitives (button with primary/secondary/ghost
variants, link, input, select, checkbox, radio, switch, card, badge,
divider), including state leaves (default/hover/focus/active/disabled) for
interactive primitives. The registry is the single source the parity gate,
pair derivation, and specimen gallery all read from.

#### Scenario: registry drives everything

- **WHEN** a primitive is added to the registry
- **THEN** parity, contrastPairs, and specimen expectations extend without
  touching gate, builder, or generator code

### Requirement: component parity gate

Every recipe listed in `COMPONENT_P1_ROLLOUT` SHALL expose exactly the
registry's component leaf-path set — values differ per recipe, shape is
identical; a missing or extra path fails the build with an error naming the
diff. Recipes outside the rollout set SHALL build byte-identical to before
this change.

#### Scenario: missing path fails loudly

- **WHEN** a rolled-out recipe omits `component.input.border.focus`
- **THEN** the build fails naming the missing path

#### Scenario: extra path fails loudly

- **WHEN** a rolled-out recipe carries a component path not in the registry
- **THEN** the build fails naming the extra path

#### Scenario: non-rollout recipes untouched

- **WHEN** a recipe outside the rollout set builds
- **THEN** its output is byte-identical to the pre-change generator

### Requirement: generic state contrastPairs

The builder SHALL derive fg/bg contrastPairs for interactive primitives
generically from the registry, one pair per state, with `disabled` exempt
from pair floors (WCAG 1.4.3 incidental exemption, stated in the gate) and
focus indicators proven at non-text 3:1 against the adjacent surface.

#### Scenario: pairs come from the registry

- **WHEN** the pilot recipe builds
- **THEN** every interactive primitive contributes per-state pairs without
  recipe-specific wiring code

#### Scenario: disabled is exempt, not skipped

- **WHEN** a disabled-state pair falls below the text floor
- **THEN** the build passes and the gate records the exemption

### Requirement: specimen gallery

The styleguide SHALL render one specimen per registry primitive for
rolled-out recipes, driven entirely from the component token group,
var-only, with `data-specimen` markers and state rows for interactive
primitives; manifest completeness SHALL require every specimen.

#### Scenario: specimen completeness gates the surface

- **WHEN** a specimen is missing for a registry primitive
- **THEN** the manifest completeness check fails

### Requirement: alias-first component values

Component leaves SHALL alias semantic tokens by default; divergence from
the alias is a deliberate per-recipe delta following the expression matrix
in the proposal, so accent-override and hue rotation keep flowing through
the component layer.

#### Scenario: hue rotation reaches components

- **WHEN** a brand applies an accent hue override
- **THEN** component color leaves that alias semantic tokens follow the
  rotation with no component-level edits

