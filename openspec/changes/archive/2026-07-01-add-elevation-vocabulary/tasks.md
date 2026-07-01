## 1. Verify alias & realize path (pre-flight)

- [x] 1.1 Confirm `transformer`/resolver resolves `{primitive.shadow.*}` aliases through the same path as color (spike a temp recipe or read resolver). If not, inline concrete strings in `semantic.elevation.*` (design R1 fallback).
- [x] 1.2 Confirm `generate` emits an `elevationSection` in styleguide once a recipe carries a `shadow` leaf.

## 2. Recipe elevation tokens (expressive only)

- [x] 2.1 `expressive.json` — add `primitive.shadow.{sm,md,lg}` + `semantic.elevation.{raised,overlay}` (crisp neutral)
- [x] 2.2 `warm-creator.json` — soft warm-tinted
- [x] 2.3 `retro.json` — rust-tinted, firmer
- [x] 2.4 `pro-emotive.json` — clean elevated
- [x] 2.5 `creative-multiscale.json` — boldest spread
- [x] 2.6 `luxury.json` — soft wide low-alpha
- [x] 2.7 Confirm `minimal-tech.json` + `enterprise.json` remain shadow-free (grep === 0)

## 3. Demo consumes elevation

- [x] 3.1 `src/demo-generator.ts` — cards (features) + hero use `box-shadow: var(--semantic-elevation-raised)`; emit nothing when the doc has no elevation token (flat recipes stay flat)
- [x] 3.2 No hardcoded shadow literals (anti-hardcode invariant preserved)

## 4. Golden tests

- [x] 4.1 G-E1 — each expressive recipe builds with a `semantic.elevation.*` leaf present and passes the export gate (0 errors)
- [x] 4.2 G-E2 — `minimal-tech` (and `enterprise`) build carries **no** shadow/elevation leaf (flat identity)
- [x] 4.3 G-E3 — demo for an expressive recipe emits `box-shadow: var(--semantic-elevation-` (token-driven), and demo for `minimal-tech` emits none
- [x] 4.4 R1 assertion — `build(minimal-tech) intent hash === sample` still holds (regression guard)

## 5. Verify & close

- [x] 5.1 `npm test` green (57 + new) · typecheck clean
- [x] 5.2 codex 교차검증 (R1 invariance, anti-hardcode, non-text contrast sanity); parse rollout jsonl if stdout polluted; no `timeout` on macOS
- [x] 5.3 `openspec validate add-elevation-vocabulary` passes
- [x] 5.4 render demos (min/expressive/luxury) via `python3 -m http.server` + playwright-cli screenshot → user visual check
- [ ] 5.5 commit + push · roadmap/design changelog · handoff · `openspec archive add-elevation-vocabulary`
