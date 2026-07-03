# Tasks — add-recipe-skeleton-spike

## 1. Axis

- [x] 1.1 Recipe type/loader: optional `skeleton?: "standard" | "editorial"`;
      luxury.json declares `"skeleton": "editorial"` (root field, base tree
      untouched)
- [x] 1.2 Builder: `meta.skeleton` echo (absent ⇒ omitted, mirroring
      expression/locales); hash-neutral by construction

## 2. Editorial grammar

- [x] 2.1 demo-generator: editorial variants for all 5 regions per the
      proposal table (same `data-demo-region` names)
- [x] 2.2 Editorial CSS (masthead, full-height hero, numbered spread rows,
      invitation form, colophon) — brand values via `var(--…)` only
- [x] 2.3 Tier interaction: editorial hero ignores `heroBold` fork; tierCss
      scaling untouched

## 3. Goldens (G-K)

- [x] 3.1 Byte-identity anchor: all 7 non-luxury recipes' demo output
      byte-identical to pre-change generator
- [x] 3.2 Luxury: 5-region completeness + structural markers (masthead
      present, `.card-grid` absent, single ghost CTA, colophon)
- [x] 3.3 Anti-hardcode on editorial CSS (no brand value literals)
- [x] 3.4 `meta.skeleton` echo + R1 keystone hash unchanged (suite fully
      green — no intentional red in this change)
- [x] 3.5 KO locale renders through editorial (copy deck reuse)

## 4. Wrap

- [x] 4.1 Full suite green + typecheck clean
- [x] 4.2 (operator) browser render QA screenshots → user 육안 판정 →
      commit + archive → diffusion decision
