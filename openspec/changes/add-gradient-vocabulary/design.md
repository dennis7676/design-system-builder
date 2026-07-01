## Context

Second Tier‑1 lever after elevation. `gradient` needs a real schema type (shadow reused an existing one). The design-critical difference: a gradient behind text is a *multi-colour* background, so the single-colour contrast check is unsound for it. The determinism gate must see every stop.

## Goals / Non-Goals

- **Goal**: brand-tinted hero gradients on expressive recipes, gated so no stop breaks text contrast.
- **Non-Goal**: `glass` (Tier‑2 — transparency over arbitrary content defeats a static contrast floor). Radial/conic beyond `linear`/`radial` kinds. Gradient overrides in the interview (Round B).

## Decisions

### D1 — Structured `$value`, not a raw CSS string
`GradientValue = { kind: "linear"|"radial"; angle?: string; stops: string[] }` with `stops` as concrete oklch colour strings. Structured so the validator can read stops for the worst-case gate; a raw `"linear-gradient(...)"` string would force CSS re-parsing. Consistent with the intent-only schema (transformer owns the CSS syntax).

### D2 — Worst-case-stop contrast gate
In `checkContrast`, when `pair.bg` resolves to a `gradient` leaf: ratio(fg, stop) for every stop, fail on `min(ratios)`. A gradient passes iff **all** stops clear the role floor (text 4.5). This is stricter than any single-fill check and is the safety property that keeps gradients from silently regressing legibility. `fg` remains a solid colour (text is never a gradient).

### D3 — Near-surface, brand-tinted stops (restraint)
Hero stops run from `surface`-white to a low-chroma brand tint (e.g. `oklch(0.98 0 0)` → `oklch(0.95 0.04 300)`), so the worst stop is still a light surface and dark `surface.foreground` text clears 4.5 by a wide margin. Subtle by construction = user's "no gratuitous flourish" stance; the gate enforces it rather than trusting the author.

### D4 — Demo hero opt-in
`.hero { background: var(--semantic-gradient-hero); }` emitted only when `hasGradient(doc)`; flat recipes render a plain surface. Same opt-in discipline as elevation (`hasElevation`).

## Risks / Trade-offs

- **Unsound single-colour check reused for gradient** → mitigated by D2 (explicit branch); proven by a dark-stop golden that MUST fail.
- **Stops duplicate palette colours** (not aliased) → accepted for simplicity, as shadow strings already are; Round B may alias.
- **R1** → gradient added to expressive recipes only; minimal-tech/sample untouched; asserted by golden.

## Migration / Rollout

Additive. `generate` re-emits hero with a gradient for expressive recipes; existing outputs unaffected.
