# Remotion example — generated tokens → video

Proves the full design-system-builder video chain end-to-end: a real
[Remotion](https://www.remotion.dev) composition imports the generated
`tokens.ts` + `fonts.video.ts` and renders a frame.

```
brand.json ──build──▶ tokens.json ──generate──▶ tokens.ts + fonts.video.ts ──▶ Remotion composition ──▶ PNG frame
```

The brand here (`Prism`) selects the `creative-multiscale` recipe, whose token
output is the frozen **seal golden** (`sha256:c8ff00bc…`). It exercises the M4
surface: structured gradients + shadows (M4-b) and `@remotion/google-fonts`
`loadFont` codegen (M4-c) — both families (Lexend, IBM Plex Mono) are Google
fonts, so no CDN stylesheet injection is needed.

## Isolation

`@remotion/*`, `react`, and `typescript` are dependencies of **this directory
only** — never add them to the repo-root `package.json`. This example is outside
the root `tsconfig` (`src/**/*`) and `vitest` (`tests/**`, `golden/**`) globs, so
it does not affect the root build or the 504-test suite.

## Run

```bash
cd examples/remotion
npm install
npm run typecheck   # strict tsc: composition ⟷ tokens.ts types agree
npm run e2e         # tokenHash parity + renderStill one frame (downloads Chrome Headless Shell on first run)
```

`npm run e2e` writes `out.png` (gitignored) and fails if the committed
`tokens.ts` header hash drifts from the seal, or if the render errors.

## Regenerating

The committed `tokens.json`, `src/tokens.ts`, and `src/fonts.video.ts` are build
outputs. To refresh them after a token-pipeline change, from the repo root:

```bash
npx tsx src/cli.ts build examples/remotion/brand.json --confirm --out examples/remotion/tokens.json
npx tsx src/cli.ts generate examples/remotion/tokens.json --out-dir /tmp/remotion-gen
cp /tmp/remotion-gen/tokens.ts /tmp/remotion-gen/fonts.video.ts examples/remotion/src/
```

If the regenerated `tokens.ts` header no longer matches the seal in `e2e.mjs`,
that is a real token-pipeline change — update the expected hash deliberately.
