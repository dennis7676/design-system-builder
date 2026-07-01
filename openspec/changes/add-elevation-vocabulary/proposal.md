## Why

User testing of B1's divergent recipes (min/warm/retro demos + styleguides) confirmed the recipes *do* differ — yet all three still read as **flat**. Root cause is not the interview or recipe selection: it is that the recipe **vocabulary is flat**. All 8 recipes carry **zero** `shadow`/`gradient`/`blur` tokens (grep-verified), and the interview has **no** depth/elevation lever to turn on. `docs/expressive-vocabulary-roadmap.md` named flatness an intentional floor — this change begins paying that bill with the cheapest, gate-safe Tier‑1 lever: **elevation (shadow)**.

The infrastructure already exists and is unused: `shadow` is a first-class `$type` in `tokens-schema.ts`, `transformer.ts` realizes it (string pass-through to CSS `box-shadow`), and `styleguide-generator.ts` has an `elevationSection` renderer. No recipe uses any of it, and the *applied* surface (`demo.html`) never paints elevation at all.

User stance: **no gratuitous flourish; identity-establishing expression is welcome.** So elevation is applied to expressive recipes only, and the flat recipes keep flat as identity.

## What Changes

- Add `primitive.shadow.*` + `semantic.elevation.*` tokens to the **6 expressive recipes** (`expressive`, `warm-creator`, `retro`, `pro-emotive`, `creative-multiscale`, `luxury`), values tuned per recipe personality.
- Apply elevation on the **applied `demo.html`** surface: cards/hero (and optionally the primary button) consume `var(--semantic-elevation-*)` so depth is *felt*, not just cataloged.
- `minimal-tech` and `enterprise` stay **untouched** — flat is their identity, and this preserves the R1 keystone.
- Add golden coverage: expressive recipes expose elevation; `minimal-tech` exposes none; demo paints `box-shadow` from tokens (no hardcoded shadow).
- **Deferred to Tier‑2**: `gradient` (new `$type` + validator branch) and `glass` (needs a contrast-floor mechanism — omitted to protect the determinism gate).
- **Non-breaking**: no change to `sample.tokens.json` intent, the `minimal-tech` base tree, or the R1 keystone. `shadow` is not a text `contrastPair`, so WCAG text gates are unaffected.

## Capabilities

### New Capabilities
- `elevation-vocabulary`: expressive recipes declare elevation (`shadow`) tokens and the applied demo surface renders them, giving brands felt depth while flat recipes remain flat by identity.

## Impact

- **Modified**: `references/recipes/{expressive,warm-creator,retro,pro-emotive,creative-multiscale,luxury}.json` (add shadow/elevation tokens), `src/demo-generator.ts` (consume elevation on cards/hero), `golden/*.test.ts` (elevation coverage).
- **Untouched**: `references/recipes/{minimal-tech,enterprise}.json`, `golden/sample.tokens.json`, `src/tokens-schema.ts` (shadow $type already present), `src/transformer.ts` (shadow already realized), `src/styleguide-generator.ts` (elevationSection already present).
- **Deps**: none.
- **Reuse**: existing `shadow` $type, `transformer` realize path, `elevationSection` renderer, `toCssVars`.
- **Determinism/R1**: elevation touches neither the `minimal-tech` base/builder nor `sample.tokens.json` intent → R1–R10 stay green.
