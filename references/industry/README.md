# Industry reference lookups (interview seed data)

**Read-only lookup tables for the interview phase only.** Nothing here is loaded
by the deterministic compiler — the recipe loader reads `references/recipes/*.json`
exclusively (`src/package-paths.ts`). These CSVs seed *suggestions* the LLM offers
during elicitation; the reproducibility boundary is still the confirmed `brand.json`.

## Provenance

- Source: [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — `.claude/skills/ui-ux-pro-max/data/`
- License: MIT (compatible; retain attribution)
- Imported commit: `12b486b22e67` (v2.10.2), 2026-07-10
- Scope: **4 interview-relevant tables only** (colors, products, typography, styles).
  Deliberately excluded: `google-fonts.csv` (743 KB bulk), per-framework `stacks/*`,
  `ux-guidelines.csv` (overlaps our `gate`/`validator`), `charts/icons/motion` (out of token scope).

## Files

| File | Rows | What it is | Interview use |
|------|------|-----------|---------------|
| `colors.csv` | ~160 | Product-type → full semantic palette (Primary/Secondary/Accent/Background/Card/Muted/Border/Destructive/Ring). Accents are **pre-adjusted for WCAG 3:1**. | Phase 2 (Visual): seed `overrides["visual.accent"]` hue + sanity-check against our WCAG floor. |
| `products.csv` | ~160 | Product-type → recommended style + secondary styles + landing/dashboard pattern + palette focus. | Phase 0/1: propose a starting archetype + style direction from the product type. |
| `typography.csv` | ~73 | Curated Google-Fonts heading/body pairings with mood keywords + best-for. | Phase 1/2: offer font-feel candidates before we map to token font stacks. |
| `styles.csv` | ~84 | UI style catalog (Minimalism, Glassmorphism, Bento, AI-Native…) with keywords, effects, accessibility, framework fit. | Phase 1/2: name a visual style direction and its trade-offs. |

## Rules

1. **Suggest, never bind.** The compiler is deterministic; these only inform what the
   interview *proposes*. Every value still passes through `brand.json` confirmation and
   the build gate (WCAG floors are re-proven regardless of what a CSV claims).
2. **Our gate wins on conflict.** If a CSV accent fails our contrast proof, the build's
   bounded nearest-fix overrides it — do not hand-copy a hex that our gate would reject.
3. **Do not wire these into `src/`.** Keeping them out of the loader path is what makes
   this a zero-risk, golden-test-neutral addition.
