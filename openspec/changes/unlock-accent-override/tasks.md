# Tasks — unlock-accent-override

## 1. Colour machinery

- [x] 1.1 `src/color.ts` — oklch string parse to {L,C,H} + byte-stable format
      (3-decimal L/C, 1-decimal H); sRGB gamut test + binary-search max-C
      clamp (24 iterations, deterministic)
- [x] 1.2 Unit-level coverage inside golden/accent.test.ts is acceptable; no
      separate test file needed (minimal-code)

## 2. Schema & gate

- [x] 2.1 `src/brand-schema.ts` — `visual.accent?: number` (integer 0–359);
      validateBrand range/int errors; OVERRIDE_RANGES type extended for a
      numeric-range axis
- [x] 2.2 `src/recipe-selection.ts` — remove `visual.accent` AND
      `tone_vector.cold_warm` from DEFERRED_OVERRIDES (cold_warm subsumed —
      unknown-axis error must hint `visual.accent`); keep `motion.easing`
- [x] 2.3 `src/tokens-schema.ts` — `meta.colorOverride?` type
      (requestedHue, delta, corrections[])

## 3. Builder

- [x] 3.1 `src/tokens-builder.ts` — accent step in applyOverrides (after
      radius/speed): anchor hue from semantic.color.primary.default
      resolution, delta rotation over chromatic leaves (C ≥ 0.03), L fixed,
      C gamut-clamped (design D1/D2)
- [x] 3.2 Contrast repair loop per design D3 (0.005 L steps, |ΔL| ≤ 0.06,
      re-clamp C each step, re-check earlier pairs once, hard error
      `accent-contrast-unrepairable` beyond bound)
- [x] 3.3 `meta.colorOverride` echo (absent when override absent)

## 4. Goldens (`golden/accent.test.ts`)

- [x] 4.1 G-C1 anchor — no-override byte-identical + R1 keystone unmoved
- [x] 4.2 G-C2 worst-case sweep — {60,110,200,275,350} × 8 recipes: gate
      PASS, text pairs ≥ 4.5 post-repair (pin any legitimately unrepairable
      combination explicitly if one exists)
- [x] 4.3 G-C3 hue-relationship preservation (retro multi-hue)
- [x] 4.4 G-C4 gamut validity · G-C5 determinism (double build byte-equal)
- [x] 4.5 G-C6 brand gate (range/int/cold_warm hint/motion.easing deferred)

## 5. Verify & close

- [x] 5.1 Full suite green (140 + new) · typecheck · no change to any
      no-override token document byte
- [x] 5.2 Crystal Ball scenario re-run: pro-emotive brand + accent hue ≈ 350
      (warm rose) builds and demo renders with the requested hue family
- [x] 5.3 README + docs/uniqueness-roadmap.md lever #1 status update
- [ ] 5.4 Post-hoc codex cross-check (parallel, non-gating)
