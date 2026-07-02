## Why

A Korean-text probe across all 8 recipes (2026-07-02) proved the system is
unverified — and broken — for Korean: **no recipe font stack covers Hangul**.
Serif recipes (luxury, retro, pro-emotive) fall back to a low-quality system
Myeongjo that destroys their identity; sans recipes fall back to the default
Gothic, erasing their font-class distinction entirely. All recipes break words
mid-syllable (`word-break: normal`), and the bold tier's Latin-tuned negative
letter-spacing pollutes Hangul. A design system that claims cross-surface
consistency must carry that consistency into the user's actual language.

## What Changes

- `brand.json` gains optional `product.locales?: string[]` (pilot: `"ko"` is
  the only recognized value; unknown values are rejected by `validateBrand`).
- Each recipe gains a **`locales.ko` block outside `base`** naming
  personality-aligned Korean families per font class (serif recipes → `"Noto
  Serif KR"`; sans recipes → `"Pretendard Variable", "Pretendard"`; final
  fallback `"Apple SD Gothic Neo"`). Because it lives outside `base`, builds
  without locales are **byte-identical to today** — the R1 keystone and all
  recipe hashes are untouched.
- `tokens-builder`: when `locales` includes `ko`, splice the recipe's Korean
  families into each `font.family.*` stack **before the generic fallback**
  (deterministic transform, same bounded-override pattern as radius/speed).
  Echo `meta.locales` (conditional, hash-excluded).
- Generators (demo + styleguide): when `meta.locales` includes `ko`, emit
  `lang="ko"` on `<html>`, `word-break: keep-all` + `overflow-wrap: anywhere`
  on text containers, neutralize negative `letter-spacing`, and raise the bold
  display line-height floor (0.98 → 1.12) — Hangul glyphs fill the em box.
  The demo renders its copy from a Korean copy deck (same regions/markup).
- **No webfont loading**: families are named, not fetched — the zero-external-
  dependency invariant holds. An opt-in webfont link is future work.
- Goldens: no-locale ⇒ byte-identical (regression anchor); ko ⇒ Korean families
  present in every font stack, `lang="ko"` + `keep-all` present, R1 keystone
  unmoved, gate/manifest PASS at every expression tier.

## Capabilities

### New Capabilities
- `locale-typography`: brands can declare `locales: ["ko"]` and receive a
  design system whose font stacks, line breaking, and typographic metrics are
  Korean-correct while preserving each recipe's personality — deterministically,
  with no change to non-localized builds.

## Impact

- **Modified**: `src/brand-schema.ts`, `src/tokens-schema.ts` (meta),
  `src/tokens-builder.ts`, `src/recipe-selection.ts` (Recipe type),
  `references/recipes/*.json` (8 files, additive `locales` block),
  `src/demo-generator.ts`, `src/styleguide-generator.ts`, new
  `golden/locale.test.ts`.
- **Untouched**: recipe `base` trees, `sample.tokens.json`, validator contrast
  gates, transformer.
- **Determinism/R1**: locale absent ⇒ builder path unchanged ⇒ all existing
  goldens (95) stay green byte-for-byte.
