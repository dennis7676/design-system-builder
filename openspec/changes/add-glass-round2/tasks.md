# add-glass-round2 — tasks

## 1. Deferred lift

- [x] 1.1 `src/brand-schema.ts`: drop the glass `edge-deferred` CONFLICT
      (keep unknown-edge enum CONFLICT untouched).
- [x] 1.2 `src/edge-point.ts`: glass `deferred: false` + real rationale
      template; `suggestEdges`/`validateEdgeFitness` treat glass as a normal
      gated edge (fitness predicate unchanged).

## 2. Glass tokens

- [x] 2.1 `src/tokens-builder.ts` `applyEdges()`: `semantic.glass.surface`
      group (fill color from recipe surface palette, opacity default that
      passes the gate ≈ 0.88, blur dimension, border color) + philosophy
      principle + coverage axis `edge.glass` over `semantic.glass.surface.*`.
- [x] 2.2 Register fg-on-glass `contrastPairs` with
      `bg = "semantic.glass.surface.fill"`.

## 3. Contrast-floor admission gate (keystone)

- [x] 3.1 `src/validator.ts` `checkGlassSurface`: opacity floor check
      (`GLASS_BACKING_OPACITY_FLOOR = 0.6`, α ≤ 1) → `glass-opacity-floor`.
- [x] 3.2 Luminance-interval worst-case per glass pair (bg path prefix
      `semantic.glass.`): interval = luminances of fill blended with
      #000/#fff at α; fg luminance inside → `glass-contrast-collapse`;
      outside → nearest-endpoint ratio < floor → `glass-contrast-fail`.
      Findings meta: ratio, required, interval endpoints, fg luminance.
- [x] 3.3 Extract the shared linear blend helper from
      `blendedTextureBackground` (no duplication).

## 4. Render

- [x] 4.1 Transformer/demo: var-only glass panel (backdrop-filter blur var,
      composed background from fill+opacity, border var) on glass-fitting
      recipes only.
- [x] 4.2 Styleguide edge section: glass panel over a busy adversarial
      backdrop.

## 5. Interview surface

- [x] 5.1 `SKILL.md`: unlock glass in the Edge selection step + high-opacity
      trade-off note.

## 6. Goldens + verification

- [x] 6.1 Glass golden (cutting-edge cool brand): build succeeds, tokens
      present, tokenHash stable.
- [x] 6.2 Gate tests: opacity below floor fails; **collapse case** (fg
      luminance inside interval — the case a two-extreme check would pass)
      fails with `glass-contrast-collapse`; nearest-endpoint sub-floor fails;
      shipped defaults pass.
- [x] 6.3 Blur independence: changing only blur does not change the gate
      verdict.
- [x] 6.4 No-glass byte-identical golden: brand without glass builds
      byte-identical (keystone + existing goldens unchanged).
