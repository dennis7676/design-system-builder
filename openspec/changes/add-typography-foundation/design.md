# Design — add-typography-foundation

## D1. Why the ratio is computed, not declared

Measured ramps (2026-07-02): only minimal-tech, warm-creator (1.5/1.5) and
pro-emotive (1.333/1.333) are ratio-consistent; creative-multiscale
(1.75/1.714), enterprise (1.375/1.455), expressive (1.5/1.667), luxury
(2.0/1.5) and retro (1.75/1.571) are not. A declared `ratio` would either lie
about the ramp or force value changes (rejected option B). So:

- `ratio = round((display.value / body.value) ** 0.5, 4)` — geometric mean of
  the two ramp legs, deterministic from base, zero drift surface.
- Echoed at `meta.typeScale = { ratio, anchors: { caption, body, heading,
  display } }` (anchors echo base values for surface/debug use; meta is
  hash-excluded so R1 is untouched).
- Recipes MAY later override with an explicit `typeScale.ratio` outside
  `base` (same placement pattern as `locales`); none do in this change.
  Precedence: explicit override > computed.

## D2. New sizes h2/h3 — interpolation inside the body→heading leg

ρ = heading/body per recipe. `h3 = body·ρ^(1/3)`, `h2 = body·ρ^(2/3)`,
rounded to 3 decimals, materialized as `primitive.font.size.h2/.h3` in each
recipe's base (additive; existing leaves untouched). Interpolating inside the
body→heading leg (not heading→display) keeps document headings within the
KRDS hierarchy band while leaving display free as the expressive top end.

Worked example, minimal-tech (ρ=1.5): h3 ≈ 1.145, h2 ≈ 1.310, h1 = 1.5.
Luxury (ρ=2.0): h3 ≈ 1.260, h2 ≈ 1.587, h1 = 2.0.

## D3. Role bundles (semantic.typography)

| role    | family              | size (alias)            | weight  | lineHeight | tracking |
|---------|---------------------|-------------------------|---------|------------|----------|
| display | heading family¹     | primitive size.display  | bold    | tight      | heading  |
| h1      | heading family¹     | primitive size.heading  | bold    | tight      | heading  |
| h2      | heading family¹     | primitive size.h2       | bold    | tight      | heading  |
| h3      | heading family¹     | primitive size.h3       | bold    | normal     | body     |
| body    | sans                | primitive size.body     | regular | normal     | body     |
| caption | sans                | primitive size.caption  | regular | normal     | caption  |

¹ whatever family the recipe's existing `semantic.typography.heading.family`
references (serif recipes keep serif headings).

Existing `semantic.typography.heading` node is KEPT as-is (back-compat for
current consumers) — `h1` is its role-named equivalent. lineHeight reuses the
existing two-step primitives (tight ≈ headings 1.1–1.3, normal ≈ body
1.5–1.6 — already inside the research bands per recipe); no new lineHeight
primitives (minimal-code).

## D4. Tracking tokens

`primitive.font.tracking = { heading: -0.01, body: 0, caption: 0.04 }`
(`$type: "number"`, em by convention — same unit treatment as lineHeight
numbers; avoids inventing a new dimension unit). Uniform initial values
across recipes; per-recipe personality overrides are future work. Research
basis: headings tolerate slight negative tracking (Latin), small sizes need
positive compensation against stroke crowding. The ko generator path already
neutralizes NEGATIVE tracking and must keep doing so for heading/display
roles; caption's positive tracking survives ko (stroke-crowding compensation
applies to Hangul too).

## D5. Surface consumption (demo + styleguide)

Replace hardcoded font sizing with semantic vars while keeping responsive
behavior: `.hero h1` uses `clamp()` whose base/max derive from
`--semantic-typography-display-size` (e.g. `clamp(calc(var(..)*0.62), 6vw,
var(..))` — exact formula implementor's choice, gated by G-T5's "no literal
rem font-size on role elements"), `.card h3` → h3 bundle, `.fine`/captions →
caption bundle, `.lead` stays body-derived. Styleguide gains a type-scale
section rendering all six roles with their resolved values (same
builtFromTokenHash discipline as existing sections).

## D6. G-T0 additive re-baseline gate (the R1 mechanism)

1. Preserve the current keystone verbatim as
   `golden/fixtures/pre-typography-sample.tokens.json` (committed BEFORE any
   builder change, in the same commit as this spec).
2. G-T0: walk every leaf path of the fixture; assert it exists in the new
   `build(minimal-tech)` output with a deeply-equal value. Fails if any leaf
   moved or changed — only additions are tolerated.
3. Only after G-T0 is green AND the operator approves the audited diff is
   `golden/sample.tokens.json` regenerated (single commit, flagged L3).
4. R1 keystone test itself is unchanged — it keeps asserting
   `hash(build(minimal-tech)) === hash(golden)`; it simply anchors to the new
   golden after the swap.

## D7. ko measure & leading (generator path only)

Full-width Hangul ≈ 1em per character, so budgets are em-based: body copy
`max-width: min(<latin ch value>, 35em)` at desktop with the mobile
breakpoint already present in the demo grid; hero headline capped ≈ 15em.
Body line-height floor: ko path emits `body { line-height: max(1.7, <token>) }`
equivalent (implementor picks mechanism; must not touch the token document).
Values SSOT: `docs/locale-typography-ko.md` §2 table.

## D8. Phase ordering & risk gradient

P1 (no hash movement) → P2 (hash moves, gated + approved) → P3 (generator
only) → P4 (visual sign-off, locales meta only). Each phase lands as its own
commit; test suite green at every commit boundary.
