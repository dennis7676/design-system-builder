# skeleton-batch-b — 표현 계열 (collage, mosaic, poster)

## Why

Grammar diffusion batch B of 3 (user-approved full diffusion, 2026-07-03).
Expressive archetypes: expressive = poster collage with overlap, creative-
multiscale = extreme-scale mosaic (its F6 identity), retro = vintage
poster/zine. Same axis and plumbing as luxury editorial (hash-neutral).

## Shared rules

Identical to batch A's shared rules (see
`openspec/changes/2026-07-03-skeleton-batch-a/proposal.md` — region contract,
var-only discipline, copy decks unchanged, hero ≥20ch + balance, ko block
per grammar, one module per grammar, own golden file
`golden/skeleton-b.test.ts` only, no assertions about recipes outside this
batch, suite fully green). Modules: `src/demo-collage.ts`,
`src/demo-mosaic.ts`, `src/demo-poster.ts`.

## Grammar: `collage` (expressive)

| region | composition |
|---|---|
| nav | wordmark left + links right, sitting on a primary-tinted band (`color-mix(in oklch, primary 12%, surface)` via the css vars), no hairline |
| hero | asymmetric 2-col with overlap: left col = eyebrow + display headline (≥20ch, balance) + lead + CTA pair; right col = a color panel (primary background, radius from tokens) that the headline block OVERLAPS via negative margin (headline z-index above); panel holds the brand's first letter as an oversized display glyph (deterministic, heroBold precedent) |
| features | 3 cards stagger-offset vertically (nth-child translateY steps: 0 / 2rem / 4rem via literals — chrome), card #2 INVERTED (primary background, on-primary foreground via `--semantic-color-primary-foreground` fallback ButtonText); card base = existing card styling with elevation vars when present |
| form | slanted band: full-bleed section background tinted primary at low mix with `clip-path: polygon(0 6%, 100% 0, 100% 94%, 0 100%)` (chrome literal); centered boxed form card on top |
| footer | oversized wordmark line (display-size, balance) + single link row + `.fine` |

Structural markers: `collage-hero`, `collage-panel`, `collage-stagger`,
`collage-band`, no `masthead`.

## Grammar: `mosaic` (creative-multiscale)

| region | composition |
|---|---|
| nav | minimal: small wordmark left + inline links right, no border — the mosaic below is the statement |
| hero | full-bleed mosaic grid (CSS grid, 4 cols × 2 rows on desktop): headline tile spans 2×2 (display size × 1.15 clamp, balance); lead tile 2×1; CTA tile 1×1 (primary button fills tile); glyph tile 1×1 (brand initial, display family); each tile separated by hairline gaps (grid gap 1px on a hairline background — chrome) |
| features | mosaic continuation: 3 cards sized 2fr/1fr/1fr on one row (first card = h2-scale title, others h3) — extreme scale contrast is the point; card interiors reuse standard card styling |
| form | one compact tile: narrow boxed card (max-width 26rem) left-aligned inside the grid rhythm |
| footer | closing mosaic strip: wordmark tile (large) + fine tile (caption scale) side by side with hairline gap |

Structural markers: `mosaic-grid`, `mosaic-headline`, `mosaic-tile`,
no `masthead`.

## Grammar: `poster` (retro)

| region | composition |
|---|---|
| nav | centered wordmark between a double rule (3px solid above links row, 1px below — chrome literals); links centered in mono uppercase |
| hero | centered; eyebrow rendered as a bordered capsule badge (1px border, radius 999px, mono uppercase); display headline full-width (≥20ch, balance); decorative divider line `✱ ✱ ✱` (static text, caption scale); lead; CTA pair centered |
| features | centered stack of 3 rows: each = circled number badge (1px border circle, mono) + h3 title (large) + body (measure 40ch centered); rows separated by double rules (1px + 3px pair) |
| form | ticket style: centered card with `border: 2px dashed` hairline-colored, radius 0; h2 + stacked fields |
| footer | double rule + centered single row: wordmark + `.fine` |

Structural markers: `poster-badge`, `poster-rule`, `poster-ticket`,
no `masthead`, no `.card-grid`.

## Impact

- **Modified**: `references/recipes/expressive.json`,
  `creative-multiscale.json`, `retro.json` (root skeleton field),
  `src/demo-generator.ts` (3 imports + 3 dispatch lines).
- **Added**: `src/demo-collage.ts`, `src/demo-mosaic.ts`,
  `src/demo-poster.ts`, `golden/skeleton-b.test.ts`.
- **Untouched**: keystone, token trees, standard generator, editorial module,
  `golden/skeleton.test.ts`.
