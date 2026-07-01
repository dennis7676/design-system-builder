## 1. Generator

- [x] 1.1 `src/demo-generator.ts` — `generateDemo(doc)`: emit self-contained HTML with `<style>` = `toCssVars(doc)` + layout CSS referencing brand values only via `var(--semantic-*/--component-*/--primitive-*)`
- [x] 1.2 Add regions marked `data-demo-region`: nav (brand + links), hero, features (card grid), form (labeled inputs + primary button), footer
- [x] 1.3 Embed `<script id="token-snapshot" type="application/json">{ builtFromTokenHash, generatedAt }</script>`; include reduced-motion block when `hasMotion(doc)`

## 2. Manifest contract

- [x] 2.1 `src/manifest.ts` — add `readonly demoHtml: string` to `Surfaces`
- [x] 2.2 Generalize the snapshot-hash extractor and add `checkDemo(doc, surfaces, findings)`: drift (`manifest-drift {surface:"demo"}`) + region completeness (`surface-incomplete {surface:"demo"}`) for nav/hero/features/form/footer
- [x] 2.3 Wire `checkDemo` into `checkManifest`

## 3. Wiring

- [x] 3.1 `src/index.ts` — export `generateDemo`
- [x] 3.2 `src/cli.ts` — `generate` emits `demo.html` into `--out-dir` alongside styleguide/DESIGN.md

## 4. Golden tests (`golden/demo.test.ts`)

- [x] 4.1 G-D1 — self-contained HTML + token snapshot + balanced sections/tags + all 5 regions present
- [x] 4.2 G-D2 — stale embedded hash → `manifest-drift {surface:"demo"}`
- [x] 4.3 G-D3 — removed region → `surface-incomplete {surface:"demo"}`
- [x] 4.4 G-D4 (differentiation KPI) — luxury vs minimal-tech demos differ in `:root` `--semantic-color-primary-default` and `--semantic-typography-heading-family`
- [x] 4.5 baseline — `checkManifest(SAMPLE, {…demoHtml})` demo errors === `[]`

## 5. Verify & close

- [x] 5.1 `npm test` green (51 + new) · `npm run typecheck` clean
- [x] 5.2 codex 교차검증 (surface-contract parity, anti-hardcode invariant, region adequacy); parse rollout jsonl if stdout polluted; no `timeout` on macOS
- [x] 5.3 `openspec validate add-applied-demo-page` passes
- [ ] 5.4 commit + push · design d9 changelog · handoff · `openspec archive add-applied-demo-page`
