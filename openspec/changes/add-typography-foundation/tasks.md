# Tasks — add-typography-foundation

## 0. Baseline preservation (first commit, before any builder change)

- [x] 0.1 Copy current `golden/sample.tokens.json` verbatim to
      `golden/fixtures/pre-typography-sample.tokens.json`

## 1. Phase 1 — scale formalization (R1-untouched)

- [x] 1.1 `src/tokens-builder.ts` — compute `ratio = round((display/body)**0.5, 4)`
      from the recipe base ramp; echo `meta.typeScale = { ratio, anchors }`;
      support optional recipe `typeScale.ratio` override outside `base`
      (precedence: explicit > computed; no recipe sets it yet)
- [x] 1.2 `src/tokens-schema.ts` — `meta.typeScale` type (hash-excluded meta)
- [x] 1.3 G-T1 golden — for all 8 recipes: ramp monotone
      (caption < body < heading ≤ display), `meta.typeScale.ratio` equals the
      computed geometric mean, anchors echo base values
- [x] 1.4 Verify: `npm test` green with ZERO changes to any token document
      byte (R1 keystone untouched); commit Phase 1

## 2. Phase 2 — semantic hierarchy (additive re-baseline)

- [x] 2.1 8 recipe JSONs — add `primitive.font.size.h2/.h3` (geometric
      interpolation per design D2, 3-decimal round) and
      `primitive.font.tracking.{heading,body,caption}` (-0.01 / 0 / 0.04,
      `$type:"number"`); NO existing leaf value modified
- [x] 2.2 8 recipe JSONs — `semantic.typography` roles `display/h1/h2/h3/
      caption` added per design D3 (existing `body`/`heading` nodes kept
      as-is); serif recipes keep their heading family in heading-tier roles
- [x] 2.3 G-T0 superset gate in `golden/typography.test.ts` — every leaf of
      `pre-typography-sample.tokens.json` present with deep-equal value in
      fresh `build(minimal-tech)` output
- [x] 2.4 ⏸ OPERATOR GATE — present G-T0 result + audited diff (added paths
      only); on approval regenerate `golden/sample.tokens.json` (L3)
- [x] 2.5 `src/demo-generator.ts` + `src/styleguide-generator.ts` — consume
      six roles; remove hardcoded font sizing on role elements (design D5);
      styleguide type-scale section
- [x] 2.6 Goldens: G-T2 (six roles × five fields resolve for all 8 recipes),
      G-T3 (1.25 ≤ h1/body ≤ 2.0; monotone caption<body<h3<h2<h1≤display),
      G-T5 (demo: no literal rem/px font-size on role elements; orphan WARN
      count for font.size.* is zero)
- [x] 2.7 Verify: full suite green; ko probe (minimal-tech + luxury) renders
      with roles; commit Phase 2

## 3. Phase 3 — ko measure & body leading (generator-only)

- [x] 3.1 Demo/styleguide ko path — em-based measure caps (body ≈ 35em
      desktop, hero ≈ 15em; design D7); body line-height floor 1.7; token
      documents untouched
- [x] 3.2 G-T4 golden — ko demo carries measure caps + effective body
      line-height ≥ 1.7; non-ko output byte-identical to Phase 2 output
- [x] 3.3 `docs/locale-typography-ko.md` — backlog items 1–2 marked shipped,
      research-report figures folded into §2 table; commit Phase 3

## 4. Phase 4 — Korean font promotions (visual sign-off gated)

- [x] 4.1 Render ko demo screenshots for enterprise (IBM Plex Sans KR),
      creative-multiscale (SUIT), warm-creator (Gowun Dodum) candidates
- [x] 4.2 ⏸ OPERATOR GATE — visual identity-fit sign-off per recipe
- [x] 4.3 Update approved recipes' `locales.ko`, extend G-L2 golden, update
      `docs/locale-typography-ko.md` §1 statuses; commit Phase 4

## 5. Close

- [x] 5.1 Full suite + typecheck green; browser render spot-check (en + ko)
- [x] 5.2 README typography section updated
- [x] 5.3 Post-hoc codex cross-check dispatched (parallel, non-gating)
