# tasks - add-video-gradient-shadow

## 1. Video realization

- [x] 1.1 Remove `shadow` and `gradient` from `VIDEO_SKIPPED_TYPES`.
- [x] 1.2 Realize gradient intent into structured `{ kind, angle, stops }`
      video values with `#rrggbb` stop colors and normalized positions.
- [x] 1.3 Realize CSS shadow strings into structured shadow layer arrays with
      numeric px offsets/blur/spread, hex colors, and `inset`.
- [x] 1.4 Serialize nested video object/array values in `tokens.ts`.

## 2. Contract and goldens

- [x] 2.1 Re-derive `VIDEO_CONTRACT` from the expanded realized path set.
- [x] 2.2 Update G-V3 so gradient/shadow land in `values`; skipped paths are
      only `string`/`motif-kind`.
- [x] 2.3 Add real-recipe assertions for creative-multiscale gradient and
      shadow output.
- [x] 2.4 Add the no-gradient/no-shadow additive stability golden.
- [x] 2.5 Keep the all-recipe token-hash seal unchanged.

## 3. Verification

- [x] 3.1 `openspec validate add-video-gradient-shadow`.
- [x] 3.2 `openspec archive add-video-gradient-shadow`.
- [x] 3.3 `tsc -p tsconfig.json`.
- [x] 3.4 `npm test`.
