# Tasks — add-layout-probe-smoke

- [ ] 1. Read `golden/applications.test.ts` (brand/build pattern),
  `src/styleguide-generator.ts` + `src/demo-generator.ts` exports,
  `src/recipe-selection.ts` (loadRecipes), package.json scripts.
- [ ] 2. Add `playwright-core` devDependency (npm install).
- [ ] 3. Implement `scripts/layout-probe.ts` per proposal (build matrix,
  http server, channel-fallback launch, assertions A/B, report, exit codes).
- [ ] 4. Add npm script `probe:layout`.
- [ ] 5. Run `npm run probe:layout` — expect 16 pages PASS exit 0.
- [ ] 6. Run `npm test` (283 green) and `npx tsc --noEmit` (clean).
- [ ] 7. Report: files changed, probe output summary, any deviations.
