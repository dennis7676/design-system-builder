# add-usage-contract (M-C C4: B1 + B5, + demo derived-contrast hardening)

## Why

Commercial track item 4 (roadmap "AI-consumable contract (B1) + Guarantees
(B5)"): every build ships a machine-readable usage contract so an AI (or
tool) consuming the output knows the do/don't rules, the public token API,
the component registry snapshot, and which gates proved what — without
reading this repo. The README guarantees section is reworked so every claim
carries a proof pointer (gate code / golden file / command), replacing prose
that has already gone stale (it still says "golden 108" — the suite is 365).

A guarantee is only honest if the gates have no known blind spot. The demo
generators derive text colors via `color-mix(in oklch, ${fg} N%, ${surface})`
(N = 58–76%) across editorial/briefing/journal/etc. — these blended
foregrounds are never registered as contrastPairs, so "every text/background
pair is gated" is currently false for demo surfaces. This change closes that
hole in the same stroke (roadmap M5 a11y item, pulled forward per handoff).

## Keystone judgments

1. **The contract derives from the code the gates read — no hand-written
   twin.** `contract.json` content is assembled from `COMPONENT_P1_REGISTRY`
   / `COMPONENT_P1_ROLLOUT`, the enums in `tokens-schema.ts` (LeafType,
   TokenClass, DimensionUnit, ContrastRole/State, Expression, Skeleton,
   motion presets), `MIN_RATIO`, and a new `GATE_CATALOG` in `src/contract.ts`.
   A parity test asserts every gate code the validator can emit appears in
   the catalog (and vice versa), so the catalog cannot silently drift from
   the validator. Prose rules (do/don't) are the only authored strings, and
   they live in one place (`contract.ts`).
2. **contract.json is a surface, not a sidecar.** It embeds
   `builtFromTokenHash`, is emitted deterministically (stable key order,
   `JSON.stringify(..., 2)` of a literal-ordered object), participates in
   the manifest drift check like the other surfaces, and gets a golden.
3. **Demo derived colors are gated with the same math the tokens are.**
   A build-time check recomputes each `color-mix(in oklch, fg N%, surface)`
   the demo generators emit (oklch interpolation via the existing color.ts
   pipeline) and enforces the WCAG floor for the role at the usage site
   (body/lead = text 4.5, ≥.78rem utility captions = text 4.5 — none of
   these usages qualify as large-text). Violations are fixed by raising the
   mix percentage in the generator (deterministic; goldens re-baseline
   loudly where bytes change). The mix helper becomes the single authoring
   path — demo generators SHALL NOT hand-write color-mix strings.
4. **README guarantee = claim + proof pointer.** Each bullet in
   "무엇이 보장되는가" ends with where the proof lives (gate code symbol,
   golden test file, or the command that re-verifies). The stale golden
   count is replaced with the actual count at landing time plus the command
   (`npm test`) that prints it.

## What Changes

### contract emission (B1)

- `src/contract.ts` (new): `GATE_CATALOG` (code → one-line purpose, for
  gate.ts export gates + validator token gates + manifest checks) and
  `buildContract(doc)` returning the contract object:
  `contractVersion`, `builtFromTokenHash`, `artifacts`, `consume.do` /
  `consume.dont` (token reference rules: consume `--semantic-*` /
  `--component-*` only; primitives internal; no physical literals; no
  fg/bg combos outside contractPairs; generated files read-only),
  `tokens` (public/internal prefixes, classes, units, leafTypes),
  `components` (rollout recipes, states, registry snapshot),
  `gates` (from GATE_CATALOG), `accessibility` (MIN_RATIO, disabled
  exemption, gradient worst-case-stop rule), `enums` (recipes, expression,
  skeleton, motion presets), `guarantees` (claim + proof pointer).
- `src/cli.ts` `generate`: emit `contract.json` alongside the surfaces.
- `src/manifest.ts`: drift check extends to `contract.json`
  (hash match + parse).
- `src/mcp-server.ts`: `dsb_build` result mentions contract.json in the
  artifact list if it enumerates artifacts (no new tool).

### demo derived-contrast gate (a11y hardening)

- `src/render-utils.ts` (or demo shared module): `mixedText(fg, surface,
  pct, role)` — computes the oklch interpolation, asserts contrast ≥
  MIN_RATIO[role] against `surface`, returns the color-mix CSS string.
  Failure throws with the usage site, mix pct, computed ratio, and floor.
- Demo generators (`demo-editorial/briefing/journal/...`): replace every
  hand-written `color-mix(in oklch, ${fg} N%, ${surface})` with the helper.
  Where current percentages fail on any of the 8 recipes' realized values,
  raise pct to the minimum passing value in 2% steps (deterministic).
- Test: sweep all 8 recipes × all demo skeletons — every emitted color-mix
  passes; a negative case proves the helper throws.

### README Guarantees rework (B5)

- "무엇이 보장되는가" rewritten: 재현성/접근성(이제 demo 파생색 포함)/일관성/
  회귀 안전 + 계약(contract.json) — each with proof pointer. Golden count
  updated to the post-change actual. "산출물 4종" table gains contract.json
  (and the section renamed accordingly).

### Goldens

- `golden/contract.test.ts` (new): contract.json byte-golden for the
  keystone brand, GATE_CATALOG ↔ validator parity, hash embedding,
  manifest drift negative case.
- Demo goldens re-baseline only where mix percentages actually changed —
  each re-baseline named in the commit message.

## Non-goals

- C3-P2 composites (nav/table/modal/form rows) — separate session.
- New MCP tools; contract localization; JSON Schema publication for
  contract.json (contractVersion:1 reserves room).
- Styleguide-side color-mix audit beyond demo generators (styleguide text
  uses registered pairs; if a stray mix is found, note it, don't expand
  scope silently — flag in the report).

## Impact

- **Added**: `src/contract.ts`, `golden/contract.test.ts`.
- **Modified**: `src/cli.ts`, `src/manifest.ts`, `src/render-utils.ts`,
  `src/demo-*.ts` (mix helper adoption), `README.md`, possibly demo goldens
  (loud re-baseline), `src/mcp-server.ts` (artifact list only).
- **Invariant**: tokens.json bytes unchanged (contract is generate-stage);
  recipes' tokenHash unchanged; surfaces other than demo.html byte-identical
  unless a mix pct changed.
