## ADDED Requirements

### Requirement: Korean measure
When `meta.locales` includes `ko`, generated surfaces SHALL cap body-copy
measure with em-based budgets reflecting full-width character counts (body
25–35 chars mobile / 35–45 desktop ⇒ ≈ 35em desktop cap; headline 8–15 chars
⇒ ≈ 15em cap) instead of Latin `ch` values. Non-ko output SHALL be
byte-identical to the pre-change generator output.

#### Scenario: ko demo carries em-based measure
- **WHEN** a ko demo is generated
- **THEN** body-copy containers carry an em-based max-width within the
  declared budget and the hero headline is capped near 15em
- **WHEN** the same recipe is generated without locales
- **THEN** the demo is byte-identical to the pre-change output

### Requirement: Korean body leading floor
The generator ko path SHALL enforce an effective body line-height of at
least `1.7` on generated surfaces when `meta.locales` includes `ko`, without
modifying the token document.

#### Scenario: Floor applies over a lower token
- **WHEN** a ko demo is generated for a recipe whose body lineHeight token is
  `1.5`
- **THEN** the rendered body line-height is `1.7` while `tokens.json` still
  carries `1.5`

### Requirement: Identity-matched Korean family promotions
Recipes whose Latin identity has a same-class Korean counterpart SHALL name
it in `locales.ko` once visually approved: enterprise → `IBM Plex Sans KR`,
creative-multiscale → `SUIT`, warm-creator → `Gowun Dodum`. Promotion
requires operator visual sign-off per rendered screenshot before the recipe
map changes, and golden coverage extends G-L2 to the promoted families.

#### Scenario: Promoted stack carries the matched family
- **WHEN** enterprise is built with `locales: ["ko"]` after promotion
- **THEN** its sans stacks contain `IBM Plex Sans KR` before the generic
  keyword
