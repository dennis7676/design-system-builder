## 1. Schema

- [x] 1.1 `src/brand-schema.ts` — `product.locales?: readonly string[]`; `validateBrand` accepts absence/`[]`/`["ko"]`, rejects unknown values
- [x] 1.2 `src/tokens-schema.ts` — `meta.locales?: string[]` (conditional echo, hash-excluded)

## 2. Recipes (additive, outside base)

- [x] 2.1 8 recipe JSONs gain `locales.ko` — serif recipes name `"Noto Serif KR"` for heading/display; all sans/body stacks name `"Pretendard Variable", "Pretendard"`; universal fallback `"Apple SD Gothic Neo"`; mono untouched

## 3. Builder

- [x] 3.1 `src/tokens-builder.ts` — when brand locales includes ko: splice recipe `locales.ko` families into matching `primitive.font.family.*` stacks before the generic keyword; echo `meta.locales`; absent ⇒ code path unchanged
- [x] 3.2 `src/recipe-selection.ts` — `Recipe` type carries optional `locales`

## 4. Generators

- [x] 4.1 `src/demo-generator.ts` — ko: `lang="ko"`, `word-break: keep-all` + `overflow-wrap: anywhere`, drop negative letter-spacing at bold, bold display line-height ≥ 1.12, Korean copy deck (regions unchanged)
- [x] 4.2 `src/styleguide-generator.ts` — ko: `lang="ko"` + keep-all on text

## 5. Goldens (`golden/locale.test.ts`)

- [x] 5.1 G-L1 (anchor) — no-locale builds and demos byte-identical to pre-change across tiers
- [x] 5.2 G-L2 — ko luxury stacks carry Noto Serif KR (heading) + Pretendard (body); generic keyword stays last
- [x] 5.3 G-L3 — ko demo: lang attr, keep-all, no negative h1 letter-spacing at bold, Korean hero copy, checkDemo zero errors (× minimal-tech, luxury × 3 tiers)
- [x] 5.4 G-L4 — validateBrand locale gate (accept ko, reject xx)
- [x] 5.5 R1 — keystone hash unmoved with/without locales

## 6. Verify & close

- [x] 6.1 npm test green (95 + new) · typecheck
- [x] 6.2 E2E: ko brand → build → generate → validate; re-run byte-identical; browser screenshot (serif identity restored?) → user visual verdict
- [ ] 6.3 codex 병행 교차(사후 대조, 논블로킹) · openspec validate · commit + push
