# add-video-gradient-shadow

## Why

M4-a sealed the video contract as a static superset gate while leaving
`shadow` and `gradient` paths deliberately skipped. Those leaves are now real
video-eligible targets for expressive recipes, especially
creative-multiscale's elevation and hero-surface tokens.

The video adapter is derived output, so this expansion must not mutate the
intent token document or move any recipe token hash. It must also stay additive:
documents with no `shadow` or `gradient` leaves keep byte-identical `tokens.ts`
output.

## What Changes

- Remove `shadow` and `gradient` from `VIDEO_SKIPPED_TYPES`; keep only
  `string` and `motif-kind` skipped.
- Realize gradients as structured Remotion-consumable objects:
  `{ kind, angle, stops: [{ color, position }] }`, with stop colors converted
  through the video hex path.
- Realize shadows as arrays of structured layers:
  `{ offsetX, offsetY, blur, spread, color, inset }`.
- Extend `tokens.ts` emission to serialize nested object/array values as
  TypeScript literals.
- Re-derive `VIDEO_CONTRACT` so declared paths include the newly realized
  gradient and shadow leaves.
- Add goldens for structured realization, recipe token-hash seal, and
  no-gradient/no-shadow additive stability.

## Non-goals

- No recipe JSON changes.
- No token document mutation.
- No CSS strings for video gradient or shadow output.
- No web adapter behavior change.
