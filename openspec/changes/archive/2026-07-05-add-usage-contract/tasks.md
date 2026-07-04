# tasks — add-usage-contract

## 1. contract emission (B1)

- [x] 1.1 `src/contract.ts`: `GATE_CATALOG` (gate.ts export gates +
      validator token gates + manifest checks; code → one-line purpose) +
      `buildContract(doc)` assembling from COMPONENT_P1_REGISTRY /
      COMPONENT_P1_ROLLOUT / tokens-schema enums / MIN_RATIO + authored
      do/don't strings
- [x] 1.2 `src/cli.ts` generate: emit `contract.json` (stable ordering,
      2-space indent, trailing newline consistent with other surfaces)
- [x] 1.3 `src/manifest.ts`: extend drift check to contract.json
      (exists, parses, hash matches)
- [x] 1.4 `src/mcp-server.ts`: include contract.json wherever artifacts are
      enumerated (no new tool)
- [x] 1.5 `golden/contract.test.ts`: byte-golden (keystone brand),
      GATE_CATALOG ↔ validator parity, hash embedding, manifest negative

## 2. demo derived-contrast gate (a11y)

- [x] 2.1 mix helper (render-utils or shared demo module): oklch
      interpolation via color.ts, floor check vs MIN_RATIO[role], throw
      with site/pct/ratio/floor
- [x] 2.2 adopt helper in ALL demo generators emitting
      `color-mix(in oklch, ${fg} N%, ${surface})` foregrounds
      (editorial, briefing, journal, and any others found by grep) —
      zero hand-written mix foregrounds remain
- [x] 2.3 sweep 8 recipes × all skeletons; raise failing percentages to
      minimum passing in 2% steps; re-baseline affected demo goldens,
      list each in the report
- [x] 2.4 tests: sweep-clean positive + helper-throws negative

## 3. README (B5)

- [x] 3.1 "무엇이 나오는가" table: add contract.json row (산출물 4종→5종
      wording)
- [x] 3.2 "무엇이 보장되는가" rewrite: each claim + proof pointer
      (gate code symbol / golden file / command); actual golden count at
      landing; add contract + demo-derived-color coverage claims

## 4. verification

- [x] 4.1 `npx tsc --noEmit` clean
- [x] 4.2 `npm test` all green (report final count)
- [x] 4.3 real build: `build` + `generate` a sample brand, confirm
      contract.json present, hash matches, `validate --check-manifest`
      passes; corrupt contract hash → check fails
