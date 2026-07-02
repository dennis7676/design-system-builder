## Why

User verdict on the 8-recipe gallery: token-level divergence (colour, type, radius, shadow, gradient) reads clearly side-by-side, but **at a glance the eight demos still look like one page re-skinned** — because the applied demo uses a single fixed layout skeleton. A triptych probe (identical expressive tokens, three layout treatments) proved the lever: **layout archetype, not colour, moves the "at-a-glance" needle**. This change adds a shared, discrete **expression tier** — `safe | balanced | bold` — that scales layout geometry, density, and type scale on the applied demo, giving each brand a "settled ↔ daring" dial without touching a single token value.

Determinism is preserved by construction: a tier is a finite enum chosen in `brand.json` (inside the reproducibility seal), it maps to static layout CSS in the generator, and it never mutates colour tokens — so every WCAG pair the recipe passes is passed identically at every tier.

## What Changes

- `brand.json` gains an optional top-level `expression?: "safe" | "balanced" | "bold"`; `validateBrand` rejects out-of-enum values.
- `tokens-builder` echoes it into `meta.expression` (only when present). `meta` is excluded from `computeTokenHash`, so intent hashes — including the R1 keystone — are untouched.
- `demo-generator` branches its layout CSS/markup on `doc.meta.expression`:
  - **absent / `balanced`** → the current template, **byte-identical** to today's output (backward-compat anchor).
  - **`safe`** → quieter: narrower measure, symmetric 3-card grid, moderate type clamp, vocabulary (gradient/elevation) still consumed but on the current footprint.
  - **`bold`** → daring: split hero (copy ↔ brand panel), oversized display clamp with an explicit upper bound (triptych overflow lesson), asymmetric feature grid with a 2-row spotlight card.
- All tiers keep the five `data-demo-region` markers, the `builtFromTokenHash` snapshot, and the anti-hardcode discipline (brand values only via `var(--…)`/`color-mix` on vars; layout chrome literals only).
- Vocabulary interplay stays opt-in: bold on a flat recipe (minimal-tech/enterprise) renders the split-hero panel as a token-mixed solid — no shadow/gradient is invented.
- Golden coverage: absence⇒current-output regression, tier differentiation KPI (layout markers differ across tiers for one recipe), region completeness at every tier, anti-hardcode at bold, R1 keystone.

## Capabilities

### New Capabilities
- `expression-tier`: a shared three-step expression dial (`safe|balanced|bold`) selected in `brand.json`, echoed via `meta.expression`, and realized as deterministic layout archetypes on the applied demo surface.

`applied-demo-surface` needs no requirement change: its contracts (regions, token-driven styling, drift, completeness, keystone) are tier-independent and are re-asserted per tier by the new capability's "Tier discipline" requirement.

## Impact

- **Modified**: `src/brand-schema.ts` (field + validation), `src/tokens-builder.ts` (meta echo), `src/tokens-schema.ts` (meta type), `src/demo-generator.ts` (tier layouts), `golden/demo.test.ts` or new `golden/expression.test.ts`.
- **Untouched**: all `references/recipes/*.json`, `sample.tokens.json`, transformer, validator contrast gates, styleguide/DESIGN.md generators, CLI surface (build already forwards brand).
- **Determinism/R1**: no intent-tree change anywhere → R1–R10 + elevation/gradient/demo goldens stay green; `expression` lives inside confirmed `brand.json`, so identical input still yields byte-identical output.
