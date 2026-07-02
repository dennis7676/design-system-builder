## 1. Schema + builder (main session — architecture core)

- [x] 1.1 `src/brand-schema.ts` — add `EXPRESSION_TIERS = ["safe","balanced","bold"]`, `expression?: ExpressionTier` on `BrandJson`; `validateBrand` rejects out-of-enum
- [x] 1.2 `src/tokens-schema.ts` — `meta.expression?: ExpressionTier` (optional)
- [x] 1.3 `src/tokens-builder.ts` — echo `brand.expression` into `meta.expression` only when present (absent brand field ⇒ absent meta field ⇒ existing artifacts byte-stable)

## 2. Demo generator tier layouts (codex-발주 후보 — mechanical, spec above)

- [x] 2.1 `src/demo-generator.ts` — resolve `tier = doc.meta.expression ?? "balanced"`; `balanced` path emits **exactly today's markup+CSS** (regression anchor)
- [x] 2.2 `safe` branch — symmetric `repeat(3,1fr)` grid, moderate display clamp, narrower measure (design.md table)
- [x] 2.3 `bold` branch — split hero (copy ↔ brand panel w/ glyph), bounded display clamp `clamp(3rem,7vw,4.75rem)`, asymmetric `2fr 1fr` grid + `grid-row: span 2` spotlight, density ×1.1/×1.25
- [x] 2.4 All tiers: five `data-demo-region` markers, `token-snapshot` script, brand values only via `var(--…)`/`color-mix` on vars; bold-on-flat uses color-mix solids (no invented shadow/gradient)

## 3. Golden tests (`golden/expression.test.ts`) (main session)

- [x] 3.1 G-X1 (regression) — `generateDemo` without `meta.expression` === with `"balanced"` === current stored expectation (string equality on one recipe)
- [x] 3.2 G-X2 (differentiation KPI) — for one expressive recipe, safe/balanced/bold demos pairwise differ in layout markers (hero grid columns / spotlight span present only at bold)
- [x] 3.3 G-X3 — region + snapshot completeness (`checkDemo`) passes at every tier × {minimal-tech, expressive}
- [x] 3.4 G-X4 (anti-hardcode) — bold demo has zero literal colours outside `:root` (G-D5 device reused)
- [x] 3.5 G-X5 — `validateBrand` rejects `expression: "wild"`; accepts absence + all three values
- [x] 3.6 R1 — `build(minimal-tech)` intent hash === sample (keystone, with and without expression set)

## 4. Verify & close (main session — 검증 위임 금지)

- [x] 4.1 `npm test` green (81 + new) · typecheck clean
- [x] 4.2 E2E: brand.json(expression:bold) → build → generate → validate --check-manifest PASS; re-run byte-identical
- [ ] 4.3 Render safe/balanced/bold × 2 recipes → screenshots → user visual verdict
- [ ] 4.4 codex 교차검증 (independent rebuild + computed-style probe; `--sandbox danger-full-access`)
- [ ] 4.5 `openspec validate add-expression-tier` · commit + push · archive
