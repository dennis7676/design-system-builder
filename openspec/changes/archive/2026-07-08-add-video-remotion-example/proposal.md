# add-video-remotion-example

## Why

M4-a/b/c made the video adapter emit a self-contained `tokens.ts` (colors,
space, duration, structured gradient/shadow) plus a `fonts.video.ts` loader that
codegens `@remotion/google-fonts` imports. Those outputs were verified in
isolation by goldens, but nothing proved the *whole* chain — brand → tokens →
video adapter → an actual Remotion composition that imports the generated files
and renders a frame. Without an end-to-end consumer, a regression in the emitted
shape (an import path, a type, a value) could pass every golden yet still be
unusable by a real Remotion project.

## What Changes

- Add `examples/remotion/`: a runnable Remotion example whose composition
  imports the generated `tokens.ts` + `fonts.video.ts` and renders a still.
  - `brand.json` selects the `creative-multiscale` recipe (the sealed golden),
    so the example exercises structured gradient + shadow (M4-b) and Google-font
    `loadFont` codegen (M4-c); both families are Google fonts, so no CDN
    stylesheet path is needed.
  - `tokens.json`, `src/tokens.ts`, `src/fonts.video.ts` are committed build
    outputs (regeneration procedure documented in the example README).
  - `e2e.mjs` asserts tokenHash parity against the sealed hash and renders one
    still frame via `@remotion/bundler` + `@remotion/renderer`.
- `@remotion/*`, `react`, and `typescript` are dependencies of the example
  directory only; the repo-root `package.json` is untouched.

## Non-goals

- No change to any `src/` token-producing code (seal must hold: the example's
  `tokens.ts` header carries `sha256:c8ff00bc…`).
- No CSS-url / non-Latin font rendering (delayRender + cdnFontStylesheets) — that
  is a follow-up; this example is Google-fonts-only.
- The example is not wired into the root `tsc`/`vitest` run; it is isolated and
  exercised by its own `typecheck` + `e2e` scripts.
