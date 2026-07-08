# tasks - add-video-font-loader

## 1. Video font codegen

- [x] 1.1 Add deterministic `remotionFontPackage(family)` mapping for all
      known Google font families.
- [x] 1.2 Add `toFontsTs(doc)` codegen that preserves `fontAssets` family
      ordering while classifying families through the existing font-source
      model.
- [x] 1.3 Emit Google `loadFont` imports and `loadVideoFonts()` calls only for
      `google` families.
- [x] 1.4 Emit `cdnFontStylesheets` metadata and usage guidance for `css-url`
      families.
- [x] 1.5 Exclude `system` families from loading.

## 2. CLI artifact

- [x] 2.1 Write `fonts.video.ts` beside `tokens.ts` from `generate` and shared
      artifact writing.
- [x] 2.2 Keep the existing `tokens.ts` `fontAssets` export unchanged.

## 3. Goldens and verification

- [x] 3.1 Add video-font golden coverage for Google imports, CSS-url CDN
      metadata, system exclusion, mapping, deterministic bytes, and sidecar
      writing.
- [x] 3.2 Keep the M4-a token-hash seal and G-V4 `fontAssets` contract green.
- [x] 3.3 `openspec validate add-video-font-loader`.
- [x] 3.4 `openspec archive add-video-font-loader`.
- [x] 3.5 `tsc -p tsconfig.json`.
- [x] 3.6 `npm test`.
