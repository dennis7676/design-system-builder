# Design — locale typography (ko pilot)

## Decision 1 — builder transform, not recipe-base mutation

Korean families are spliced into font stacks by `buildTokens` only when
`brand.product.locales` includes `"ko"`. The mapping data lives in each recipe
JSON under a **top-level `locales` key, outside `base`** — so recipe base trees
and every existing hash (R1 keystone first) are untouched, and a localized
build differing in hash is *correct* (different input ⇒ different system),
exactly like the radius/speed overrides.

## Decision 2 — personality-aligned family mapping (named, never fetched)

| Recipe class | Korean families (prepended before generic fallback) |
|---|---|
| serif (luxury, retro, pro-emotive — heading/display) | `"Noto Serif KR"` |
| sans / geometric / humanist (all others + all body stacks) | `"Pretendard Variable", "Pretendard"` |
| universal final fallback | `"Apple SD Gothic Neo"` (macOS) — generic keyword stays last |
| mono (eyebrow labels) | no Korean insert — short labels; system fallback acceptable |

**Zero-external-dependency invariant holds**: families are *named* in stacks;
nothing is fetched. If the user's machine has Pretendard/Noto Serif KR the
identity carries; otherwise the system falls back gracefully. An opt-in
webfont `<link>` (brand field) is future work — it trades the invariant for
fidelity and needs its own decision.

## Decision 3 — layout rules live in generators, not tokens

`keep-all`, `overflow-wrap`, letter-spacing neutralization, and the bold
line-height floor are **script-conditional rendering concerns**, not brand
intent — so they are emitted by demo/styleguide generators when
`meta.locales` includes `ko`, keeping tokens.json clean of locale plumbing.
Bold display line-height floor: `.98 → 1.12` (Hangul fills the em box; probe
showed crowding). Latin builds keep `.98` verbatim.

## Decision 4 — Korean copy deck for the demo

The demo's purpose is *visual verification of the applied system*; verifying
Korean with English copy is impossible. When ko is active the demo renders a
fixed Korean copy deck (same markup, same `data-demo-region` contract). The
deck is a constant in the generator — deterministic, golden-able.

## Out of scope (probe findings deferred)

- `ch`-unit measures under Hangul (different effective line length) — visual
  verdict item, revisit after user review.
- Opt-in webfont loading; per-recipe distinct Korean families beyond the
  serif/sans split; other locales (ja/zh need different line-break rules).
