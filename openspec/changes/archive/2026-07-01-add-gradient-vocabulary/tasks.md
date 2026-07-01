## 1. Schema

- [x] 1.1 `src/tokens-schema.ts` — add `"gradient"` to `LeafType`; add `GradientValue = { kind: "linear"|"radial"; angle?: string; stops: string[] }`; widen `LeafToken.$value`; add `isGradientValue` guard

## 2. Transformer

- [x] 2.1 `src/transformer.ts` — `case "gradient"`: realize to `linear-gradient(<angle>, <stops…>)` / `radial-gradient(<stops…>)`

## 3. Validator — worst-case-stop contrast gate

- [x] 3.1 `src/validator.ts` — in `checkContrast`, when `pair.bg` resolves to a `gradient` leaf, compute ratio(fg, stop) for every stop and fail on the minimum (worst); unparseable stop → `contrast-unparseable`
- [x] 3.2 Keep single-colour path unchanged for non-gradient bg

## 4. Recipe gradient tokens (expressive only)

- [x] 4.1 Add `semantic.gradient.hero` (near-surface brand-tinted stops) to expressive, warm-creator, retro, pro-emotive, creative-multiscale, luxury
- [x] 4.2 Add a `contrastPair` `{ fg: semantic.color.surface.foreground, bg: semantic.gradient.hero, role: text }` to each
- [x] 4.3 Confirm minimal-tech + enterprise remain gradient-free

## 5. Demo consumes gradient

- [x] 5.1 `src/demo-generator.ts` — hero `background: var(--semantic-gradient-hero)` only when `hasGradient(doc)`; no hardcoded gradient literal

## 6. Golden tests (`golden/gradient.test.ts`)

- [x] 6.1 G-G1 — each expressive recipe builds with `semantic.gradient.hero` and passes the export gate (worst-case contrast incl.)
- [x] 6.2 G-G2 — minimal-tech + enterprise carry no gradient leaf
- [x] 6.3 G-G3 — expressive demo hero uses `var(--semantic-gradient-hero)`; minimal-tech demo does not
- [x] 6.4 G-G4 (gate proof) — a gradient with a dark stop yields `contrast-fail` (worst-case gate actually bites)
- [x] 6.5 R1 — build(minimal-tech) intent hash === sample still holds

## 7. Verify & close

- [x] 7.1 `npm test` green (68 + new) · typecheck clean
- [x] 7.2 codex 교차검증 (worst-case gate soundness, R1 invariance, anti-hardcode); no `timeout` on macOS
- [x] 7.3 `openspec validate add-gradient-vocabulary` passes
- [x] 7.4 render expressive/minimal demos → user visual check
- [ ] 7.5 commit + push · handoff · `openspec archive add-gradient-vocabulary`
