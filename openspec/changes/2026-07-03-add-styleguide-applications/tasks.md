# Tasks — add-styleguide-applications

- [ ] 1. Read `src/styleguide-generator.ts`, `src/surface-data.ts`, one demo
  module (e.g. `src/demo-editorial.ts`) and an existing golden
  (`golden/skeleton-a.test.ts` in archive reference or current goldens) to
  match conventions.
- [ ] 2. Implement `applications` section per proposal (5 blocks, frames,
  skeletonHint map, copy-deck reuse, ko path).
- [ ] 3. Add frame/exhibit CSS to the styleguide embedded stylesheet
  (chrome literals OK; brand values var-only).
- [ ] 4. Write `golden/applications.test.ts` covering the 8 golden points.
- [ ] 5. `npm test` — full suite green (276 existing + new).
- [ ] 6. Self-review: anti-hardcode grep over the new markup, determinism
  double-build check.
