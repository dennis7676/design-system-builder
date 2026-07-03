# skeleton-batch-a — 정보밀도 계열 (spec-sheet, briefing)

## Why

Grammar diffusion batch A of 3 (user-approved full diffusion, 2026-07-03).
Information-dense archetypes: minimal-tech reads like a technical spec
document, enterprise like a numbered briefing/report. Same axis and plumbing
as the shipped luxury editorial (`meta.skeleton` echo, hash-neutral).

## Shared rules (all grammars, both batches' precedent)

- Same 5 `data-demo-region` names; completeness contract invariant.
- Brand values ONLY via `var(--…)`; layout chrome literals allowed.
- Copy decks unchanged (EN/KO reuse; grammars may consume subsets).
- Hero headline: `max-width ≥ 20ch` + `text-wrap: balance` (editorial
  measure lesson — no >3-line wrapping at 1440px).
- ko block per grammar (editorial precedent): body keep-all +
  overflow-wrap anywhere + line-height floor 1.7; hero h1 em-cap
  (`min(24ch, 16em)`) + `letter-spacing: normal` on display/heading roles.
- One module per grammar: `src/demo-spec-sheet.ts`, `src/demo-briefing.ts`
  (mirror `demo-editorial.ts`'s exported signature); `demo-generator.ts`
  gains one import + one dispatch line each.
- Own golden file `golden/skeleton-a.test.ts` ONLY — do not touch
  `skeleton.test.ts` or assert anything about recipes outside this batch
  (parallel batches own those).
- Hash-neutral: recipe root `"skeleton"` field only; token trees untouched;
  suite fully green (no intentional red).

## Grammar: `spec-sheet` (minimal-tech)

| region | composition |
|---|---|
| nav | left wordmark + right link row in mono (lowercase, letter-spacing .06em), full-width 1px hairline below; no CTA button |
| hero | LEFT-aligned; mono index line `001 — {eyebrow}` above; display headline (≥20ch, balance); lead; CTA row = primary + ghost, left-aligned; thin hairline frame line down the left edge of the section (2px left border on the section) |
| features | spec table grid: 3 rows × [mono index cell `01..03` / h3 title / body], ALL cell borders visible (hairline grid, collapsed), generous cell padding; section h2 above in mono uppercase small |
| form | inline sheet: h2 + lead left-aligned; fields laid out in a single row on desktop (grid 3 cols + submit), labels in mono uppercase small; inputs bottom-hairline only |
| footer | single row between two hairlines: left wordmark (h3 scale), right `.fine` in mono |

Structural markers for goldens: `spec-nav`, `spec-hero`, `spec-table`
(class names must include these), no `.card-grid`, no `masthead`.

## Grammar: `briefing` (enterprise)

| region | composition |
|---|---|
| nav | two bars: utility strip on top (mono uppercase small, static text `BRIEFING` left + brand name right, hairline below) + main bar (wordmark left, links center-right, primary CTA button) |
| hero | numbered 2-col: left col = mono `01` section number + headline (h-scale between h1 and display: use display size × .82 via clamp) + lead + CTA pair; right col = 3 stacked metric rows built from the copy deck card TITLES (label = mono index, value = h3-styled title), hairline-separated; cols split by a vertical hairline |
| features | mono `02` number + h2; then 3 summary rows: [h3 title | body] two-col rows with a 2px top rule on the first row and hairlines between; no cards |
| form | mono `03` number + 2-col: left = h2 + lead, right = the form (stacked fields, boxed with 1px border + radius) |
| footer | 3 link columns (standard footer content) but with a 2px top rule and `.fine` right-aligned |

Structural markers: `briefing-utility`, `briefing-hero`, `briefing-rows`,
no `.card-grid`, no `masthead`.

## Impact

- **Modified**: `references/recipes/minimal-tech.json` + `enterprise.json`
  (root skeleton field), `src/demo-generator.ts` (2 imports + 2 dispatch
  lines).
- **Added**: `src/demo-spec-sheet.ts`, `src/demo-briefing.ts`,
  `golden/skeleton-a.test.ts` (5-region completeness, structural markers,
  anti-hardcode on new CSS, meta echo + keystone hash unchanged, ko render).
- **Untouched**: keystone, token trees, standard generator, editorial module,
  `golden/skeleton.test.ts`.
