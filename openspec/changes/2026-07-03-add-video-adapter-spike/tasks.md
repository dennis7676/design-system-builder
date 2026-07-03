# Tasks — add-video-adapter-spike

## 1. Goldens first (TDD RED)

- [x] 1.1 `golden/video.test.ts` — G-V0 keystone: after the schema type edit,
      `computeTokenHash(build(minimal-tech)) === computeTokenHash(SAMPLE)`
      (proves the optional `video` contract key is hash-neutral)
- [x] 1.2 G-V1 color: every color path realizes to `#rrggbb`; independent-path
      cross-check — relative luminance of the emitted hex matches the oklch
      source within 0.01 (round-trip through `parseColor`, not the emitter)
- [x] 1.3 G-V2 numerics: `primitive.space.xs` (abstract 0.5, base 16) → 8;
      durations are plain ms numbers; fontWeight/number pass through
- [x] 1.4 G-V3 filtering + skip accounting (synthetic case): inject
      `target-only:web`, `target-only:video`, and a gradient leaf into a
      cloned sample — web-only excluded, video-only included, gradient path
      listed in `skipped` and echoed in the generated header
- [x] 1.5 G-V4 emitted text: `export const tokens`, `export const fontAssets`,
      `export function toFrames` present; no `[object Object]`; embedded
      `toFrames` text is byte-identical to the module implementation's source
- [x] 1.6 G-V5 toFrames semantics (module fn): 1000ms@30fps=30;
      100ms@30fps round=3; floor=3; ceil=3; 50ms@30fps round=2/floor=1/ceil=2
- [x] 1.7 G-V6 parity: video-exportable path set == web path set minus
      skipped types minus `target-only:web` (no silent drops)

## 2. Implementation (GREEN)

- [x] 2.1 `src/tokens-schema.ts` — optional `video` key on `TransformContract`
- [x] 2.2 `src/color.ts` — `linearToHex(rgb)` (gamma encode + clamp) and
      `toHexColor(s)` (oklch/hex string → `#rrggbb`, throws on unparseable)
- [x] 2.3 `src/transformer.ts` — `toRealizedVideo(doc)` returning
      `{ values: Map<string, string | number | readonly string[]>, skipped: string[] }`
- [x] 2.4 `src/adapters/video-adapter.ts` — `toTokensTs(doc)` (header with
      tokenHash + skip accounting, nested `as const` tree, `fontAssets`,
      embedded `toFrames` from single source) + exported `toFrames`
- [x] 2.5 `src/index.ts` re-export; `src/cli.ts` build writes `tokens.ts`

## 3. Verification

- [x] 3.1 `npm test` (204 + G-V all green) + `npm run typecheck`
- [x] 3.2 Synthetic end-to-end: generate `tokens.ts` for one recipe via CLI,
      compile it standalone with `tsc --strict --noEmit` (guards against
      always-pass string assertions), import via tsx and spot-check values
- [ ] 3.3 Commit (operator pattern), archive change → specs on approval
