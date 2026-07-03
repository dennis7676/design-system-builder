# add-interview-affordances — 인터뷰 UX 3종 (벤치마킹 판정 ④⑤⑥ 이행)

## Why

Claude Design benchmarking verdicts (docs/claude-design-benchmarking.md):
- ④ "list styles first → pick" beats silent auto-selection → surface top-3
  recipe candidates instead of silently taking the nearest.
- ⑥ "3+ reference images or the result goes generic" → mood-image intake as
  an interview Phase 0 prior (skill layer only).
- ⑤ handoff-to-code narrative → document that DSB artifacts are themselves
  handoff objects for other tools.

## Invariants (hard)

- **Reproducibility**: same `brand.json` → byte-identical outputs, always.
  Any human recipe choice is therefore recorded IN brand.json
  (`branding.recipe_override`), never as an unpersisted CLI flag.
- **Golden surface freeze**: generated artifact CONTENT (DESIGN.md,
  styleguide.html, demo.html, tokens.css) is unchanged by this change.
  Existing 283 tests stay green untouched; new tests live in NEW files only.
- **Images never enter brand.json** — they are an interview-time prior the
  skill (LLM) interprets; the deterministic core never sees them.

## Part B — recipe candidates + override (code)

### B1. Candidate listing (always-on, deterministic)

`cli build` already logs `recipe: X  candidates: [...]` + distances. Upgrade
to a stable top-3 table printed to stderr before the confirm step:

```
recipe candidates (tone distance, hard constraints):
  1. luxury           d=0.71  OK      ← selected
  2. enterprise       d=1.02  OK
  3. minimal-tech     d=1.55  filtered: dense-data
```

- Top-3 AFTER hard-constraint filtering, plus (if any were filtered) the
  nearest filtered one shown with its `filtered: <constraint>` reason.
- Deterministic ordering: distance asc, tie-break by recipe key asc.
- Exact format is codex's choice but MUST be stable (goldenable) and the
  selected row marked.

### B2. `branding.recipe_override` (schema + builder)

- `brand-schema.ts`: optional `branding.recipe_override?: string`.
- Selection: when present, the override recipe is used INSTEAD of nearest —
  but it MUST pass the same hard-constraint filter; otherwise fail the build
  with a clear error listing which constraint rejected it (no silent
  fallback).
- `tokens.json` output must be byte-identical to what nearest-selection
  would produce for that same recipe (override changes selection only).
- Candidate table still prints, marking the overridden row
  `← selected (override)`.

### B3. Tests — new file `golden/recipe-candidates.test.ts` ONLY

1. Candidate listing snapshot for one fixture brand (stable string).
2. Override honored: build with `recipe_override` = 2nd candidate →
   `meta.recipe` equals override; tokens equal a direct build with that
   recipe.
3. Override rejected by hard constraint → throws with constraint name.
4. Unknown override key → throws listing valid keys.
5. Determinism: same brand.json with override twice → identical bytes.

## Part A — SKILL.md interview affordances (doc)

1. **Phase 0 extension — mood-image intake**: ask for 3+ reference images
   (Pinterest captures, logo, existing brand material) as an OPTIONAL step;
   the skill reads them into (a) a 5-axis tone prior (each axis with a
   1-line visual justification) and (b) a recipe prior. Priors narrow
   Phase 1 questions (consistent with the existing "earlier answers narrow
   later questions" design); user answers always win over priors; images
   are never persisted into brand.json. If no images: note the generic-risk
   explicitly and continue.
2. **Candidate-choice step** (after Phase 4, before Assemble): run build,
   show the B1 candidate table, let the user pick; if they pick a
   non-nearest recipe, set `branding.recipe_override` in brand.json and
   rebuild. Include a "comparison builds" paragraph: same brand.json,
   temporary override per candidate → N cheap side-by-side builds.
3. Keep SKILL.md total length lean (target ≤ +45 lines).

## Part C — handoff narrative (doc)

- README: short "Handoff" subsection — `tokens.css` + `DESIGN.md` are
  designed as handoff objects for other tools (paste into Claude Design as
  a custom design system, feed DESIGN.md to any LLM/human as the system
  spec, import tokens.css anywhere CSS custom properties work).
- SKILL.md: one cross-reference line in the closing/scope section.
- Do NOT modify design-md-generator output.

## Impact

- **Modified**: `src/brand-schema.ts`, `src/recipe-selection.ts` and/or
  `src/tokens-builder.ts` (selection plumbing), `src/cli.ts` (table print),
  `SKILL.md`, `README.md`.
- **Added**: `golden/recipe-candidates.test.ts`.
- **Untouched**: all generators' output bytes, existing golden files,
  token schemas ($-fields), keystone.
