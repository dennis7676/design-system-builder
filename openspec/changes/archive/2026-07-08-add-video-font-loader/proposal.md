# add-video-font-loader

## Why

M4 video output currently exposes `fontAssets` in `tokens.ts` but leaves
Remotion font loading as a manual consumer step. That creates an avoidable
gap between generated video tokens and render-ready Remotion compositions.

The font source model already distinguishes Google Fonts, CSS CDN stylesheets,
and system-resident families. M4-c uses that model to generate an additive
video font-loader sidecar without changing token intent or the existing
`tokens.ts` `fontAssets` export.

## What Changes

- Generate `fonts.video.ts` alongside `tokens.ts` from the CLI artifact path.
- Emit `@remotion/google-fonts/<Package>` imports and a `loadVideoFonts()`
  function only for families classified as Google fonts.
- Emit `cdnFontStylesheets` metadata for CSS-url families such as SUIT,
  Pretendard, Pretendard Variable, and NanumSquareRound.
- Exclude system-resident families from generated loaders.
- Add deterministic package-name mapping via `remotionFontPackage(family)`,
  using the Remotion convention of removing spaces.
- Keep `tokens.ts` and its `fontAssets` export additive-stable.

## Non-goals

- No `@remotion/google-fonts` dependency in design-system-builder.
- No generated Google import for CSS-url or system families.
- No token document or recipe intent mutation.
