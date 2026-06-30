# Expressive vocabulary roadmap

The pilot token model expresses a **flat, solid-fill** design language
(color · type · space · radius · motion). That is a deliberate floor, not a
ceiling. Richer effects are **not excluded** — they are deferred behind the one
constraint that defines this tool: the **deterministic WCAG export gate**.

## Principle

The schema is already open: a new effect is an additive `$type` (one union
case + one validator branch + one adapter branch). "Not excluding" an effect
therefore means *the additive architecture already supports it* + this roadmap
names it — **not** building registries/envelopes for effects we haven't
designed. Implement an effect `$type` only when a recipe needs it (codex SPEC
at that point, per the hybrid build pattern).

## Tiers (graded by determinism impact)

| Effect | WCAG / determinism interaction | Tier |
|--------|--------------------------------|------|
| **Gradient** (`$type: "gradient"` — stops + geometry) | text contrast checked against the **worst-case stop** under the text region → deterministic gate intact | **Tier 1** |
| **Shadow / Elevation** (`$type: "shadow"`) | decorative; carries no text contrast (non-text 3:1 at most) | **Tier 1** |
| **Pattern** (`$type: "pattern"` — dots/grid/noise) | decorative background; text contrast checked against the **base fill** behind it | **Tier 1** |
| **Glassmorphism** (backdrop-blur + translucent fill) | text contrast depends on **arbitrary content behind** the surface — unknowable at token time → **breaks the deterministic gate** | **Tier 2** — gated on a contrast-floor mechanism (mandatory min-opacity / backing fill bounding the effective background) |
| **Motion-rich interaction tokens** (transform presets, scroll/entrance) | open-ended scope; `prefers-reduced-motion` already handled | **Tier 2** — bounded DSL needed first |

> "Interactive styleguide" (live component playground) is a **surface/generator**
> concern, not a token concern — it belongs to styleguide enrichment, not here.

## Sequencing

- **Now (flat world):** distinct palettes per recipe + richer styleguide. Ships
  a genuinely differentiated, polished product without touching the schema.
- **Tier 1 (next vocabulary pass):** add `gradient` + `shadow` token types and
  an expressive recipe family that uses them — the first visually distinct
  (non-flat) family, with the gate still fully deterministic.
- **Tier 2 (deferred-not-excluded):** glass (needs contrast-floor mechanism),
  patterns at scale, motion-token DSL. Each ships *with* its determinism story
  or not at all.
