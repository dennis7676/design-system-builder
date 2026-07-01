## Why

Tier‑1 elevation (shadow) landed depth on cards; the second Tier‑1 lever is **gradient** — subtle brand-tinted surfaces (hero) that a flat fill cannot express. Unlike shadow, `gradient` is **not** yet a schema `$type`, and a gradient placed behind text must not silently break contrast. This change adds `gradient` as a first-class token type **with a determinism-safe contrast gate**: a gradient used as a text background is validated against its **worst-case colour stop**, so no stop can fall below the WCAG floor. This is the guardrail that lets gradients stay expressive without becoming the "gratuitous" risk (glass, deferred to Tier‑2).

## What Changes

- Add `gradient` to `LeafType` with a structured `$value` (`{ kind, angle?, stops[] }`), realized by `transformer.ts` into a CSS `linear-gradient(...)`/`radial-gradient(...)`.
- Extend `checkContrast`: when a `contrastPair.bg` resolves to a `gradient` leaf, compute the contrast of the foreground against **each stop** and fail on the **worst (minimum)** ratio — a gradient passes only if *every* stop clears the role floor.
- Add `semantic.gradient.hero` (brand-tinted, near-surface stops) to the **6 expressive recipes**, each with a `contrastPair` (`surface.foreground` on `gradient.hero`, role `text`).
- `demo-generator` paints the hero background via `var(--semantic-gradient-hero)` only when the doc declares a gradient; flat recipes (minimal-tech/enterprise) stay fill-only.
- Golden coverage: expressive gradient present + gate-pass; a dark-stop fixture proves the worst-case gate **fails**; flat recipes gradient-free; demo consumes gradient only when present.
- **Non-breaking**: no change to `sample.tokens.json`, `minimal-tech`, or the R1 keystone. Shadow (Tier‑1a) untouched.

## Capabilities

### New Capabilities
- `gradient-vocabulary`: expressive recipes declare brand-tinted `gradient` tokens, validated by a worst-case-stop contrast gate, and the applied demo renders them as hero surfaces.

## Impact

- **Modified**: `src/tokens-schema.ts` (LeafType + `GradientValue` + guard), `src/transformer.ts` (realize gradient), `src/validator.ts` (`checkContrast` worst-case-stop branch), `references/recipes/{6 expressive}.json` (gradient.hero + contrastPair), `src/demo-generator.ts` (hero background), `golden/*.test.ts`.
- **Untouched**: `minimal-tech.json`, `enterprise.json`, `golden/sample.tokens.json`, elevation tokens.
- **Determinism/R1**: gradient touches neither minimal-tech base nor sample intent → R1–R10 + elevation goldens stay green.
