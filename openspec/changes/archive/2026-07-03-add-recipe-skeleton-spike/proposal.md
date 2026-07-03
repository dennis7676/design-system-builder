# add-recipe-skeleton-spike

## Why

Today all 8 recipes render the demo page from identical markup — only token
values differ. That proves token-driven divergence, but the roadmap's
per-recipe skeleton axis asks a stronger question: should recipes differ in
**layout grammar** (composition, section anatomy), not just in values? Per
the 2026-07-01 green-light and the 2026-07-03 user decision, this lands as a
SPIKE: luxury only, visual judgment afterwards, diffusion to other recipes is
a separate decision.

The expression tier already varies hero structure (`heroBold`) inside the
same region contract — the skeleton axis generalizes that precedent from
"brand-chosen tier" to "recipe-declared structural identity".

## What Changes

### Skeleton axis (recipe-declared, hash-neutral)

- Recipe root gains optional `skeleton?: "standard" | "editorial"` (absent ⇒
  standard). luxury.json declares `"skeleton": "editorial"`; all other
  recipes stay undeclared.
- The built document echoes it as `meta.skeleton` (mirroring
  `meta.expression`/`meta.locales`). `meta` is excluded from
  `computeTokenHash`, so **R1 keystone is untouched — no re-baseline, no L3**.

### Editorial grammar (luxury demo only)

Same 5 `data-demo-region` names (nav/hero/features/form/footer — the
completeness contract is invariant); different composition:

| region | standard | editorial |
|---|---|---|
| nav | left logo + links + CTA button | centered masthead: wordmark over a thin centered link row, **no CTA button**, hairline below |
| hero | left-aligned copy + CTA pair | full-height centered: eyebrow (letter-spaced small caps), oversized display headline, narrow-measure lead, **single ghost CTA** |
| features | h2 + 3-card grid | editorial spread: numbered rows (01/02/03), alternating two-column title↔prose, hairline separators, **no `.card-grid`** |
| form | boxed signup card | centered narrow invitation: no card box, single column, fields stacked with hairline underlines |
| footer | 3 link columns + brand | colophon: centered single column, wordmark + tagline + fine print, **no link columns** |

Rules:
- Copy decks unchanged (EN/KO reuse; editorial simply uses a subset — e.g.
  drops `ctaPrimary` in hero, drops footer column links).
- Token discipline identical: brand values only via `var(--…)`; layout chrome
  literals allowed per baseCss precedent; anti-hardcode golden applies.
- Expression tier: when skeleton=editorial the tier's structural fork
  (`heroBold`) does not apply (editorial owns its hero); tier-derived CSS
  scaling (tierCss) still applies unchanged.
- Styleguide/DESIGN.md are out of scope (demo surface only).

### Backward-compat anchor

For every recipe except luxury the generated demo must be **byte-identical**
to the pre-change generator (golden anchor, mirroring the G-X1
balanced-tier precedent). Luxury's own pre-change demo is intentionally
superseded.

## Non-goals

- Diffusion to the other 7 recipes (post-spike visual judgment decides).
- New copy decks, new regions, or region renames.
- Styleguide skeleton variation (styleguide showcase upgrade is a separate
  track per the 2026-07-03 user decision).
- brand.json-level skeleton override (structural identity is the recipe's,
  not the brand interview's — revisit only if the spike diffuses).

## Impact

- **Modified**: `references/recipes/luxury.json` (root field only — base
  token tree untouched), recipe schema/loader type, `src/tokens-builder.ts`
  (meta echo), `src/demo-generator.ts` (editorial region variants),
  `SKILL.md` only if it documents skeleton (no interview question).
- **Added**: `golden/skeleton.test.ts` (G-K).
- **Untouched**: keystone, all token values, contrast machinery, styleguide,
  video adapter.
