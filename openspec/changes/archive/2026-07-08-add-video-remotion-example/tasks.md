# tasks - add-video-remotion-example

## 1. Example scaffold

- [x] 1.1 Add `examples/remotion/brand.json` selecting `creative-multiscale`.
- [x] 1.2 Commit generated `tokens.json`, `src/tokens.ts`, `src/fonts.video.ts`.
- [x] 1.3 Add `src/Composition.tsx` consuming color, space, radius, duration
      (via embedded `toFrames`), structured gradient, structured shadow, and
      `loadVideoFonts()` families.
- [x] 1.4 Add `src/Root.tsx` + `src/index.ts` registering the composition.
- [x] 1.5 Add example-local `package.json` (@remotion/*, react, typescript) and
      `tsconfig.json`; keep the repo-root package.json untouched.

## 2. End-to-end check

- [x] 2.1 Add `e2e.mjs`: assert `tokens.ts` header tokenHash equals the
      `creative-multiscale` seal.
- [x] 2.2 `e2e.mjs`: bundle + `renderStill` one frame, assert a non-empty PNG.
- [x] 2.3 Add README documenting isolation, run, and regeneration.

## 3. Verification

- [x] 3.1 Example `npm run typecheck` (strict tsc) passes.
- [x] 3.2 Example `npm run e2e` passes (parity + render, 1280x720 PNG).
- [x] 3.3 Root `tsc -p tsconfig.json --noEmit` still clean.
- [x] 3.4 Root `npm test` still 504 passed; `src/` diff empty.
