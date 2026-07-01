## Why

A token *catalog* (styleguide) proves the tokens exist; it does not prove two brands *feel* different in use. B1 (recipe 4→8) diverged the recipe library; P3 makes that divergence visceral with a realistic product page styled entirely by one brand's tokens — what reference systems (Stripe/Notion/Linear) show that a catalog cannot. Timed now because it only pays off once recipes diverge (B1 delivered that).

## What Changes

- Add a **new surface** `demo.html`: a realistic applied page (nav, hero, features/cards, form, footer) styled **only** through `toCssVars(doc)` + `var(--semantic-*/--component-*)` — never hardcoded token values.
- Extend the surface contract: `demo.html` embeds its own `builtFromTokenHash` (drift) and gains a completeness contract in `manifest.ts` (same discipline as `styleguide.html`).
- `generate` CLI emits `demo.html` alongside `styleguide.html` / `DESIGN.md`.
- Add golden coverage, including a differentiation KPI test (luxury vs minimal-tech demos differ in `:root` brand vars).
- **Non-breaking**: no change to `tokens.json`, recipe base trees, `minimal-tech`/`sample.tokens.json`, or the R1 keystone.

## Capabilities

### New Capabilities
- `applied-demo-surface`: generation and manifest-validation of a token-driven applied demo page as a first-class output surface (drift + region completeness), styled exclusively via CSS custom properties.

### Modified Capabilities
<!-- none: openspec/specs/ is empty (first change); surface contract is introduced here, not modified -->

## Impact

- **New**: `src/demo-generator.ts`, `golden/demo.test.ts`.
- **Modified**: `src/manifest.ts` (`Surfaces` + `checkDemo`), `src/index.ts` (export `generateDemo`), `src/cli.ts` (`generate` emits demo).
- **Deps**: none (native template literals; no template engine).
- **Reuse**: `toCssVars`, `computeTokenHash`, `htmlEscape`, section/snapshot patterns, manifest drift/completeness scaffolding.
- **Determinism/R1**: demo touches neither minimal-tech base/builder nor `sample.tokens.json` intent → R1–R10 stay green.
