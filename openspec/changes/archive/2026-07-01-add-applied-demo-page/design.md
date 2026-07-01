## Context

The builder emits two surfaces today — `styleguide.html` (token catalog) and `DESIGN.md` — both validated by `checkManifest` (drift via embedded `builtFromTokenHash`, completeness, a11y records, motion-reduce). `styleguide-generator.ts` styles everything through `toCssVars(doc)` + `var(--…)` in `baseCss`. B1 diverged the recipe library (4→8). The gap (`differentiation-improvement-plan.md`) is *applied* realism: a catalog can't show two brands feeling different in product context.

## Goals / Non-Goals

**Goals:**
- A third surface `demo.html` — a realistic applied page — styled exclusively by one brand's tokens, validated with the same drift+completeness discipline as the styleguide.
- Make recipe divergence visceral and mechanically provable (KPI test on `:root` vars).

**Non-Goals:**
- Per-recipe layout variants (tokens differentiate; layout is shared).
- A generic multi-surface plugin framework / surface registry.
- A template-engine dependency.
- Duplicating the styleguide's 8-element completeness contract (demo's contract is narrower: regions + drift).

## Decisions

- **Reuse `toCssVars` + `var(--…)` verbatim (not a new styling path).** Rationale: it is the drift-safe mechanism already proven in `baseCss`; the anti-hardcode guarantee comes for free (values live only in `:root`). Alternative — inline realized values per element — rejected: unmaintainable and undetectable by the drift gate.
- **Same snapshot-embed as styleguide** (`<script id="token-snapshot">`). Rationale: lets `checkDemo` reuse a generalized hash extractor. Alternative — a bespoke demo hash format — rejected (needless divergence).
- **Completeness = region presence + drift only.** Rationale: the demo's job is applied realism, not spec coverage; the 8-element styleguide check is the wrong contract here. Alternative — mirror all 8 elements — rejected as over-engineering (minimal-code gate #7).
- **Anti-hardcode enforced by construction + KPI test, not a "no literals" grep.** Rationale: layout chrome legitimately uses px/rem; a literal-scan would false-positive. G-D4 (divergent `:root` vars across recipes) is the real guarantee.
- **a11y contract not duplicated.** Rationale: the demo consumes the same token contrastPairs the styleguide already records; no new a11y records needed.

## Risks / Trade-offs

- [Fixture coupling — surface tests build `surfacesFor(SAMPLE)`; adding `demoHtml` runs demo checks on SAMPLE] → author the demo to pass the baseline; assert `checkManifest(SAMPLE)` demo errors == [].
- [Anti-hardcode is by construction, not statically enforced] → G-D4 KPI test + code review; the generator only ever writes `var(--…)` for brand properties.
- [Scope creep into per-recipe layouts / surface framework] → explicit Non-Goals + minimal-code gate #7.
- [R1 keystone] → demo touches neither minimal-tech base/builder nor `sample.tokens.json` → R1–R10 unaffected.

## Migration Plan

Additive only. New files + additive edits to `manifest.ts`/`index.ts`/`cli.ts`. Rollback = remove `demo-generator.ts` + `checkDemo` + the `demoHtml` field + demo tests; no data or token migration. `generate` gains an output file; consumers ignoring `demo.html` are unaffected.

## Open Questions

- Region set final? Proposed nav/hero/features/form/footer covers the reference-site pattern; expandable later without contract change.
- Should `validate --check-manifest` require the demo surface, or treat it as optional-if-present? Default: required once emitted by `generate` (parity with styleguide).
- **Applied-a11y coverage (codex Q1, follow-up — out of P3 scope):** the demo uses primary-on-surface and `color-mix` derived text/bg pairings that are NOT among the recipe's recorded `contrastPairs`, so the WCAG gate never verifies them. Closing this means either recording the applied pairings as contrastPairs (re-derives WCAG across all 8 recipes) or a demo-specific applied-contrast check. Deferred to a follow-up (M5 a11y hardening). Q2 (anti-hardcode) was closed in-scope via G-D5.
