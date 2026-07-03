# skeleton-batch-c — 내러티브 계열 (journal, story)

## Why

Grammar diffusion batch C of 3 (user-approved full diffusion, 2026-07-03).
Narrative archetypes: warm-creator = personal journal/letter, pro-emotive =
flowing product story with alternating emphasis bands. Same axis and
plumbing as luxury editorial (hash-neutral).

## Shared rules

Identical to batch A's shared rules (see
`openspec/changes/2026-07-03-skeleton-batch-a/proposal.md` — region contract,
var-only discipline, copy decks unchanged, hero ≥20ch + balance, ko block
per grammar, one module per grammar, own golden file
`golden/skeleton-c.test.ts` only, no assertions about recipes outside this
batch, suite fully green). Modules: `src/demo-journal.ts`,
`src/demo-story.ts`.

## Grammar: `journal` (warm-creator)

| region | composition |
|---|---|
| nav | wordmark left + small links right, NO border/hairline — whitespace only (generous block padding) |
| hero | single narrow column (max-width 34rem) LEFT-aligned: eyebrow in italic (font-style italic, body family — not mono); h1-scale headline (NOT display — journal is intimate; ≥20ch, balance); lead; CTA = ghost button restyled as underlined text link (transparent background, no border, underline with offset) |
| features | essay list in the same narrow column: h2 above; then per item an en-dash `–` prefix + h3 title inline, body below; items separated by whitespace only (no rules); no numbers, no cards |
| form | same narrow column: h2 + lead + stacked fields; inputs soft — 1px full border with the largest radius token; submit = primary button full-width |
| footer | signature block: italic wordmark (h3 scale) + `.fine`; centered; no columns, no rules |

Structural markers: `journal-column`, `journal-list`, `journal-signature`,
no `masthead`, no `.card-grid`.

## Grammar: `story` (pro-emotive)

| region | composition |
|---|---|
| nav | standard-like bar (wordmark + links + primary CTA) but transparent background sitting inside the hero's tinted field (nav has no own background/border) |
| hero | split: left = eyebrow + display headline (≥20ch, balance) + lead + CTA pair; right = story panel with `semantic.gradient.hero` background when the token exists (fallback: primary), radius, holding the brand initial glyph (display family); the WHOLE hero section carries a soft primary tint background band (`color-mix(in oklch, primary 8%, surface)`) |
| features | 3 alternating story bands: odd = text left / panel right, even = mirrored; text side = h3 + body; panel side = tinted panel (primary mix 10%, radius) with an oversized mono index `01..03`; bands separated by generous padding, no rules |
| form | full-bleed primary-tinted band (mix 10%) containing a centered boxed card (surface background, radius, elevation vars when present) with h2 + lead + stacked fields |
| footer | standard 3-column footer content, but topped with a 2px gradient hairline (linear-gradient from primary to transparent — via vars, chrome for the gradient direction only) |

Structural markers: `story-band`, `story-panel`, `story-alt`,
no `masthead`, no `.card-grid`.

## Impact

- **Modified**: `references/recipes/warm-creator.json`,
  `pro-emotive.json` (root skeleton field), `src/demo-generator.ts`
  (2 imports + 2 dispatch lines).
- **Added**: `src/demo-journal.ts`, `src/demo-story.ts`,
  `golden/skeleton-c.test.ts`.
- **Untouched**: keystone, token trees, standard generator, editorial module,
  `golden/skeleton.test.ts`.
