# add-motif-enum — tasks

## 1. Schema + enum

- [x] 1.1 `src/brand-schema.ts`: `MOTIF_NAMES = ["glyph", "geometric",
      "rule-lines", "none"]` + `motif?: MotifName` (single value) +
      validation (unknown → CONFLICT `motif-unknown` naming the enum;
      array/non-string → shape error). Follow the edges message style.

## 2. Concept-fit engine

- [x] 2.1 `src/motif.ts` (new): `MOTIF_MENU` (fitness predicates +
      rationale templates), `suggestMotifs(brand, recipe)`,
      `validateMotifFitness(brand, recipe)`. Pure/deterministic — no
      Date/random, stable ordering. Mirror `src/edge-point.ts` shapes.
- [x] 2.2 Fitness rules v1 exactly as proposal.md (glyph/none universal;
      geometric: minimal-tech|expressive|creative-multiscale ∪
      classic_cutting_edge>=5 ∪ static_dynamic>=5; rule-lines:
      luxury|enterprise|retro ∪ (classic_cutting_edge<=3 ∧
      serious_playful<=4)).

## 3. Tokens + gate

- [x] 3.1 `src/tokens-builder.ts`: when `motif` present, emit
      `semantic.motif` group (kind `$type:"motif-kind"`, ink alias of the
      hero-panel primary, scale = legacy glyph clamp basis). Record in
      meta.philosophy. Add `motif-kind` to `VIDEO_SKIPPED_TYPES`.
- [x] 3.2 `src/validator.ts` + `src/gate.ts`: `motif-ink-floor` gate —
      non-text 3:1 (ink vs hero-panel background), `none` exempt;
      GATE_CATALOG registration; `motif-fit-rejected` CONFLICT for unfit
      hand-added motifs. contract.json/GATE parity tests must stay green
      (regenerate contract via the existing derivation, never by hand).

## 4. Demo consumption

- [x] 4.1 Pinned templates in `src/motif.ts`: geometric three-primitive
      SVG constant (versioned) + rule-lines CSS recipe. Var-only ink/scale.
- [x] 4.2 Glyph slots ×5 (`demo-generator` bold hero, `demo-story`,
      `demo-collage`, `demo-mosaic`, `demo-spec-sheet`): branch on motif
      kind only when brand.json carries `motif`; absent = legacy path
      untouched (do not refactor the legacy glyph markup).

## 5. Interview surface

- [x] 5.1 `SKILL.md`: motif question inside the edge-selection step —
      fitting motifs + rationale, pick one or skip (skip ⇒ absent ⇒
      legacy), selection → `motif: "<value>"` → re-dry-run.

## 6. Goldens + verification

- [x] 6.1 `golden/motif.test.ts`: enum rejection (unknown + array form),
      suggestion determinism (double-run deep equal), geometric exclusion
      for classic-warm luxury, per-kind token emission, absent ⇒ no group,
      ink-floor failure injection, none exemption, unfit-motif CONFLICT,
      demo var-only + geometric markup assertions.
- [x] 6.2 No-motif byte-identity: keystone + full existing suite pass
      **unmodified** (do not regenerate keystone; if it changes, the
      implementation is wrong).
- [x] 6.3 `npm test` green (423 existing + new), `npx tsc --noEmit` clean.
