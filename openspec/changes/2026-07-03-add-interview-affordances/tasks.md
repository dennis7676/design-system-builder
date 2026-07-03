# Tasks — add-interview-affordances

- [ ] 1. Read `src/recipe-selection.ts`, `src/brand-schema.ts`,
  `src/tokens-builder.ts`, `src/cli.ts` (build path), `SKILL.md`,
  `README.md`, one golden for conventions.
- [ ] 2. B2: schema field + override selection with hard-constraint
  validation and clear errors.
- [ ] 3. B1: stable top-3 candidate table in `cli build` (stderr), selected
  row marked, filtered-nearest row when applicable.
- [ ] 4. B3: `golden/recipe-candidates.test.ts` (5 cases per proposal).
- [ ] 5. A: SKILL.md Phase 0 mood-image intake + candidate-choice step +
  comparison-builds paragraph (≤ +45 lines total).
- [ ] 6. C: README "Handoff" subsection + SKILL.md cross-reference line.
- [ ] 7. Verify: `npm test` fully green (283 existing + new file);
  `npx tsc --noEmit` clean; confirm zero diffs in generated artifact bytes
  for an existing fixture (e.g. regenerate examples/atlas outputs to a temp
  dir and diff against committed ones).
- [ ] 8. Report: files changed, new test count, artifact-byte diff result,
  deviations.
