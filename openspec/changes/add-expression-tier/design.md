# Design — expression tier (safe | balanced | bold)

## Decision 1 — shared discrete tier, not per-recipe archetypes, not a continuous scalar

User-selected direction ("3단 tier 공유형"). Rationale:

- **Discrete beats continuous**: a `0..1` scalar makes goldens unfalsifiable (infinite outputs) and mid-values visually mushy. Three named steps keep the golden surface finite (existing `tighter/looser` override idiom) and each step is explainable in one sentence.
- **Shared beats per-recipe**: per-recipe archetypes maximize differentiation but cost 8×3 bespoke layouts now. The shared dial already moves the at-a-glance needle (triptych proof) because tier layout composes with each recipe's own tokens/vocabulary — luxury-bold ≠ expressive-bold even on the same skeleton. Per-recipe skeletons remain a future increment (d6 ceiling logic), not precluded by this schema.

## Decision 2 — `balanced` IS the current template (backward-compat anchor)

`expression` absent ⇒ tier resolves to `balanced` ⇒ **generateDemo output is byte-identical to today**. This gives:

- zero golden churn (G-D1..D5 untouched),
- a semantic anchor: today's demo already sits mid-amplitude (gradient hero + elevation when declared, symmetric grid),
- only two new CSS branches to author (`safe`, `bold`).

`safe` and `bold` are additive branches in `demoCss`/markup helpers. No shared-CSS refactor beyond extracting the branch point — minimal-code gate: the diff is two template branches plus an enum.

## Decision 3 — propagation: brand → meta.expression → generator (not a generator argument)

`generateDemo(doc)` keeps its single-argument signature. The tier travels inside the tokens document as `meta.expression`, set by `buildTokens` **only when brand.expression is present**.

- `computeTokenHash` hashes the intent subtree (meta excluded) → R1 and every recipe hash invariant hold with zero care needed.
- `tokens.json` remains the single artifact a surface needs — no side-channel parameter to thread through CLI `generate`.
- Conditional echo (vs always defaulting `"balanced"` into meta) keeps existing fixtures/tokens.json files byte-stable.

## Decision 4 — what a tier scales (and what it never touches)

| Axis | safe | balanced (= today) | bold |
|---|---|---|---|
| Hero | single column, left, moderate clamp | current hero (gradient bg when declared) | split 2-col: copy ↔ brand panel (`--semantic-gradient-hero` or color-mix solid), glyph accent |
| Display clamp | `clamp(2.2rem, 5vw, 3.2rem)` | current `clamp(2.4rem, 6vw, 4rem)` | `clamp(3rem, 7vw, 4.75rem)` — hard upper bound; triptych showed unbounded scale overflows headings |
| Features grid | symmetric `repeat(3,1fr)` | current auto-fit | asymmetric `2fr 1fr`, first card `grid-row: span 2` spotlight |
| Density | inset ×1 | current | inset ×1.1, section padding ×1.25 |
| Vocabulary | consumed as declared | consumed as declared | consumed as declared, larger footprint (panel, spotlight card bg) |
| **Colour tokens** | **never** | **never** | **never** |
| **Contrast pairs** | **unchanged** | **unchanged** | **unchanged** |

Bold on a flat recipe: panel/spotlight backgrounds use `color-mix(in oklch, var(--surface) …%, var(--primary))` — same device the current template already uses for cards — so flat identity (no shadow/gradient) survives at bold.

## Decision 5 — scope: demo surface only

Styleguide and DESIGN.md are *documentation* surfaces (token catalog); layout amplitude is an *applied* concern. Tier branches live in `demo-generator.ts` only. If tiers later matter for styleguide hero chrome, that is a separate change.

## Interview / skill layer (deferred, same change family)

The SKILL interview currently asks zero vocabulary/amplitude questions. Adding one AskUserQuestion step ("정돈 ↔ 도전: safe/balanced/bold") is a docs-only edit to the skill front door and can ride the same change or follow immediately after; the CLI/schema path in this change is complete without it (field is optional).

## Alternatives rejected

- **OKLCH chroma amplification (colour axis)**: deferred-override territory (`visual.accent`, hue shifts); high blast radius on the WCAG floor for a lever the triptych showed is *not* the at-a-glance discriminator.
- **5-step tier**: mid-steps visually ambiguous; golden surface + verification doubles for no demonstrated gain.
- **LLM-improvised layout ("창발")**: breaks brand.json → byte-identical reproducibility, the project's reason to exist. Rejected outright; expressiveness comes from a finite, versioned combination space instead.
