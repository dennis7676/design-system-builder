# add-video-contract

## Why

M4-a establishes the video-realizable token surface as an explicit contract
before later M4 work expands realization. The current spike can realize a large
set of token paths, but there is no static per-recipe declaration proving that
the adapter continues to cover the paths consumers depend on.

The contract must not mutate tokens.json. Existing recipe token hashes are the
byte-reproducibility seal, so this change records the current realized video
path sets in code and gates only missing declared paths.

## What Changes

- Add `src/video-contract.ts` with the per-recipe `VIDEO_CONTRACT` manifest
  generated once from current `toRealizedVideo(doc).values` keys.
- Add validator finding `video-contract-parity`: for recipes in the manifest,
  declared video paths must be present in the realized video set. Extra realized
  paths are allowed for later M4-b growth.
- Add a derived `video` section to `contract.json`:
  declared realizable paths, skipped video leaf types, and the gate code.
- Add a usage-contract guarantee pointing to the manifest and golden tests.
- Add goldens for recipe parity, fault injection, token-hash seal, and
  deterministic contract video bytes.

## Non-goals

- No token document mutation.
- No recipe JSON changes.
- No CSS or web surface changes.
- No exact-parity gate; realized video paths may grow after this phase.
