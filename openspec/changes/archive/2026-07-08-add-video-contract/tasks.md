# tasks - add-video-contract

## 1. Static manifest

- [x] 1.1 Derive current realized video path sets for all 8 recipes from
      `toRealizedVideo(doc).values`.
- [x] 1.2 Add `src/video-contract.ts` with `VIDEO_CONTRACT` and
      `realizedVideoPaths(doc)`.

## 2. Gate and contract

- [x] 2.1 Add validator finding `video-contract-parity` with declared-subset
      semantics and missing-path metadata.
- [x] 2.2 Add the gate catalog entry.
- [x] 2.3 Add derived `contract.json` `video` section and guarantee.

## 3. Goldens

- [x] 3.1 All 8 recipes pass `video-contract-parity`.
- [x] 3.2 Fault injection names a missing declared path.
- [x] 3.3 All 8 recipe token hashes remain unchanged.
- [x] 3.4 Contract video section is deterministic.
- [x] 3.5 Existing contract shape test includes the video section.

## 4. Verification

- [x] 4.1 `npx -y @fission-ai/openspec@latest validate add-video-contract`.
- [x] 4.2 `tsc -p tsconfig.json`.
- [x] 4.3 `npm test`.
