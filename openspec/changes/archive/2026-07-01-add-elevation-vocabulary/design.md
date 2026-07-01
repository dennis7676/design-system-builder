## Context

"Flatness" is a vocabulary gap, not a selection bug: 8/8 recipes carry 0 depth tokens and the interview has no depth lever. Tier‑1 opens the cheapest gate-safe lever first — **elevation (shadow)** — because the pipeline already supports it end‑to‑end (schema `$type: shadow`, `transformer` realize, styleguide `elevationSection`); only *values* and *demo consumption* are missing.

## Goals / Non-Goals

- **Goal**: expressive recipes gain felt depth on the applied surface; flat recipes stay flat by identity.
- **Non-Goal (Tier‑2)**: `gradient` (new $type + validator worst-case-stop branch) and `glass` (requires a contrast-floor / min-opacity mechanism before it can pass the determinism gate). Both deferred — glass is the "gratuitous" risk the user ruled out for now.

## Decisions

### D1 — Elevation on expressive recipes only; minimal-tech & enterprise untouched
`minimal-tech` and `enterprise` express identity through flatness. Leaving their intent trees untouched (a) honors that identity and (b) preserves the R1 keystone (`build(minimal-tech) intent hash === sample`). Verified: R1 golden pins only the minimal-tech hash; adding shadow elsewhere cannot move it.

### D2 — Token shape: `primitive.shadow.{sm,md,lg}` → `semantic.elevation.{raised,overlay}`
Mirror the existing color/space aliasing: concrete `box-shadow` strings live in `primitive.shadow.*` (`$type: shadow`, `$class: portable`); semantic aliases (`{primitive.shadow.md}` etc.) give components/demo a stable role handle. `transformer` already string-passes shadow; alias resolution reuses the same path color already uses.

### D3 — Values tuned per recipe personality (restraint, not flourish)
Shadows are subtle and identity-flavored, never dramatic:
- `expressive` — crisp geometric: neutral, medium spread
- `warm-creator` — soft warm-tinted, low-contrast
- `retro` — rust-tinted, slightly firmer
- `pro-emotive` — clean elevated card feel
- `creative-multiscale` — boldest spread
- `luxury` — soft, wide, low-alpha (premium hush)

All use `oklch(L C H / a)` shadow colors (consistent with the codebase's oklch intent color space). Non-text, so no WCAG text-pair impact; elevation contrast stays well within the non-text 3:1 guidance by construction (low alpha over light surfaces).

### D4 — Demo consumes elevation (the felt-depth locus)
`styleguide.html` already renders an elevation *catalog*; the *applied* `demo.html` did not paint any shadow. Cards (features) and hero get `box-shadow: var(--semantic-elevation-raised)`; no hardcoded shadow literals (same anti-hardcode discipline as P3). When a recipe has no elevation (minimal-tech), the demo simply emits no shadow → stays flat.

## Risks / Trade-offs

- **R1 regression** → mitigated by D1 (minimal-tech/sample untouched); asserted by an explicit golden.
- **Alias resolution for shadow** → unverified until build; if `transformer`/resolver does not resolve `{primitive.shadow.*}` aliases, fall back to inlining concrete strings in `semantic.elevation.*`. Checked at task 1.
- **Over-shadowing (looks gratuitous)** → low-alpha restraint per D3; user reviews rendered demo before Tier‑2.

## Migration / Rollout

Additive only. No migration. `generate` re-emits demo/styleguide with elevation for expressive recipes automatically.
