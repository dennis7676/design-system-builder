# add-styleguide-applications — 용처별 산출물 샘플 섹션 (M3.5 R-B)

## Why

styleguide.html is confirmed as a **customer exhibit** (designers, content
creators, planners consuming the system). Claude Design benchmarking
(`docs/claude-design-benchmarking.md`, R-A) verdict #1/#2: the exhibit must
*prove* the "one system, every medium" promise with same-token samples per
medium, side by side — the DSB answer to Claude Design's medium tabs.

## Scope

One new styleguide section `applications` with 5 sample blocks, all rendered
from the same realized tokens the rest of the page consumes. Static only:
no motion (M4 scope), no interactive tweak panel (M5/M6 scope).

## Shared rules (project invariants)

- Brand values ONLY via `var(--…)` custom properties; layout chrome literals
  (frame borders, aspect-ratio values, grid gaps of the exhibit shell) are
  allowed exactly like existing styleguide chrome.
- No new copy strings for sample content: reuse the copy deck subsets the
  demo modules consume from `src/surface-data.ts` (EN + existing ko deck via
  the same locale mechanism demos use).
- Deterministic: same tokens.json → byte-identical styleguide. No Date/random.
- Hash-neutral: token trees untouched; `tokenHash`/drift mechanism unchanged.
- Suite fully green; new goldens live in `golden/applications.test.ts` ONLY —
  do not touch other golden files.
- ko rendering honors the established ko typography rules (keep-all,
  overflow-wrap anywhere, line-height floor 1.7, heading letter-spacing
  normal) — reuse whatever shared helpers demos use; do not re-implement.

## Section spec

`section id="applications"`, title "Applications", inserted after the
`components` section and before `relationships`. Lead copy (EN, one short
paragraph): every sample below consumes the very tokens documented on this
page — same CSS custom properties, no per-medium overrides — and the drift
goldens verify that mechanically.

Each sample block sits in a fixed-aspect frame (`aspect-ratio` CSS, hairline
border, subtle chrome label above in mono uppercase small: medium name +
ratio). Frames scale responsively (max-width grid; carousel frames in a
3-across row that wraps).

### Block 1 — `app-website` (embedded demo)

- `<iframe src="demo.html" loading="lazy" title="Website demo">` inside a
  16:9 frame, scaled down via `transform: scale(…)` wrapper technique so the
  full desktop layout is visible (render width 1280 → scaled to frame).
- Graceful when demo.html is absent (iframe simply blank; no JS probing).

### Block 2 — `app-slide` ×2 (16:9 deck)

- Slide A (title): eyebrow (mono small) + display-scale headline
  (`max-width` ≥ 20ch equivalent within frame, `text-wrap: balance`) +
  brand wordmark bottom-left, accent rule element.
- Slide B (content): h2-scale heading + 3 bullet rows reusing the three
  feature card titles + one-line bodies from the copy deck; footer strip
  with wordmark + slide number `02` in mono.

### Block 3 — `app-carousel` ×3 (4:5 social sequence)

- Frame 1 hook: oversized display type on primary/surface interplay,
  eyebrow + swipe cue `→`.
- Frame 2 body: h3 + short body from deck, numbered `2/3` mono marker.
- Frame 3 CTA: headline fragment + primary-button-styled CTA chip
  (non-interactive `<span>` styled from component button tokens) + `3/3`.

### Block 4 — `app-video-land` (16:9 title card + lower third)

- Title card: centered or skeleton-aligned display headline over surface,
  brand mark corner, safe-margin guides NOT drawn (clean exhibit).
- Lower third: separate 16:9 frame showing a neutral video placeholder
  background (semantic surface-muted) with the lower-third bar anchored
  bottom-left: name line (h3 scale) + role line (mono small) on a
  primary-edged bar consuming component/accent tokens.

### Block 5 — `app-video-port` (9:16 shorts/reels cover)

- Vertical frame: top eyebrow, center stacked display headline (2 lines max,
  balance), bottom CTA chip + wordmark. Type scales adapted via clamp within
  the frame; brand values still var-only.

## Skeleton orthogonality (constrained)

Samples consume `meta.skeleton` as a *placement vocabulary only*, via one
small internal map `skeletonHint(skeleton)` → `{ align: "left"|"center",
ornament: "hairline"|"card"|"index" }` used by blocks 2/4/5 (headline
alignment + accent ornament choice). Full 8-grammar layouts are explicitly
out of scope — the map keeps the samples recognizably in-family without
duplicating demo grammars.

## Goldens (`golden/applications.test.ts`)

1. Section present with id `applications`, positioned between `components`
   and `relationships`.
2. All 5 structural markers present: `app-website`, `app-slide`,
   `app-carousel`, `app-video-land`, `app-video-port`; slide frames ×2,
   carousel frames ×3.
3. Aspect ratios: `16 / 9` frames (website, slides, video-land), `4 / 5`
   (carousel ×3), `9 / 16` (video-port).
4. Anti-hardcode scan over the applications section markup: no hex/oklch
   literals, no `px` font sizes outside the chrome allowlist pattern already
   used by existing styleguide scans; sample text/colors reference `var(--`.
5. Copy reuse: sample bodies appear in the surface copy deck (no novel
   brand copy).
6. ko build: with `locales: ["ko"]`, sample copy comes from the ko deck and
   ko typography rules hold (spot-check `keep-all` on a sample body).
7. Determinism: two consecutive builds byte-identical (reuse existing
   pattern if such a golden helper exists).
8. skeletonHint: at least two recipes with different skeletons produce
   different alignment/ornament markup in block 2 (orthogonality is real,
   not dead code).

## Impact

- **Modified**: `src/styleguide-generator.ts` (new section + frame CSS in the
  existing embedded stylesheet; imports from `surface-data.ts`).
- **Added**: `golden/applications.test.ts`; (optional) small
  `skeletonHint` helper co-located in styleguide-generator — no new module
  unless size demands it.
- **Untouched**: token schemas, recipes, demo modules, adapters, existing
  goldens, tokenHash plumbing.
