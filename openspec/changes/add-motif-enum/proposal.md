# add-motif-enum

## Why

Uniqueness roadmap lever #3: extend the bold display glyph into a small
finite enum of brand motifs (`glyph | geometric | rule-lines | none`)
rendered from tokens — an instant signature element per brand. The
edge-point round shipped the exact infrastructure this needs (finite enum +
deterministic concept-fit menu + admission gate + interview exposure);
this change rides it rather than inventing a parallel mechanism.

## What Changes

### Motif enum + schema (`src/brand-schema.ts`)

- `brand.json` gains optional top-level `motif?: string` — a **single**
  value (a brand has one signature motif), not an array.
- Motif enum v1 (versioned, finite): `["glyph", "geometric", "rule-lines",
  "none"]`. Free-form values are impossible by construction.
- `validateBrand()`: unknown motif → CONFLICT naming the enum (mirror the
  `edge-unknown` message style with code `motif-unknown`).
- **Absent ⇒ legacy.** A brand.json without `motif` builds byte-identical
  to today: the existing first-letter glyph markup stays on the untouched
  code path and **no motif tokens are emitted**. Explicit `motif` (any
  value, including `"glyph"`) switches the glyph slot to token-driven
  rendering.

### Concept-fit suggestion (`src/motif.ts`, new)

Mirrors `src/edge-point.ts` exactly (same shapes, same determinism
guarantees): `MOTIF_MENU` (one centralized versioned table), fitness
predicate keyed on recipe key + tone vector + expression tier, one-line
rationale template, `suggestMotifs(brand, recipe)` →
`[{ motif, rationale }]`, and `validateMotifFitness(brand, recipe)` →
build-blocking CONFLICT (`motif-fit-rejected`) for a hand-edited unfit
motif. No `deferred` mechanism — all four motifs ship in this round.

Fitness rules v1 (deterministic, recipe-set ∪ tone-predicate, mirroring
texture-grain's structure):

- `glyph` — universal: always fits (it is today's signature element).
- `geometric` — fits recipes {`minimal-tech`, `expressive`,
  `creative-multiscale`} or a cutting-edge/dynamic tone
  (`classic_cutting_edge >= 5` or `static_dynamic >= 5`).
- `rule-lines` — fits recipes {`luxury`, `enterprise`, `retro`} or a
  classic, composed tone (`classic_cutting_edge <= 3` and
  `serious_playful <= 4`).
- `none` — universal: opting out of a signature element is always safe.

### Motif tokens (`src/tokens-builder.ts`)

When `motif` is present, emit a `semantic.motif` group:

- `semantic.motif.kind` — string leaf, new `$type: "motif-kind"` (add to
  `VIDEO_SKIPPED_TYPES`; the video adapter has no motif consumer yet).
- `semantic.motif.ink` — color leaf, aliased to the same primary the glyph
  uses today on the hero panel (no new color derivation in v1).
- `semantic.motif.scale` — dimension leaf driving the motif's clamp basis
  (derived from the display size exactly as the current glyph font clamp,
  so `motif: "glyph"` renders at today's size).

Record the motif decision in `meta.philosophy`.

### Admission gate (`src/validator.ts` + `src/gate.ts`)

- New gate `motif-ink-floor`: when a `semantic.motif` group exists and
  `kind != "none"`, the (motif ink, hero-panel background) pair SHALL meet
  the **non-text 3:1 floor** (WCAG 1.4.11 — the motif is decorative markup
  but a signature element that must stay visible). Violation fails the
  build. Register in `GATE_CATALOG` (contract parity tests will force the
  catalog and contract.json to agree).
- Enum + fitness CONFLICTs (`motif-unknown`, `motif-fit-rejected`) are
  machine conditions of the existing export gate, same as edges.

### Demo consumption (glyph slots, var-only)

The five existing glyph slots — `demo-generator.ts` (bold hero),
`demo-story.ts`, `demo-collage.ts`, `demo-mosaic.ts`,
`demo-spec-sheet.ts` — branch on the motif kind **only when brand.json
carries `motif`**:

- `glyph` — today's first-letter letterform, colors/sizes consumed from
  `--semantic-motif-*` vars instead of interpolated literals.
- `geometric` — deterministic inline SVG: a fixed composition of three
  primitives (circle, rectangle, diagonal stroke) sized by
  `--semantic-motif-scale`, drawn in `var(--semantic-motif-ink)`. One
  pinned template constant in `src/motif.ts` (versioned like
  `TEXTURE_GRAIN_OVERLAY`) — no per-brand shape drift in v1.
- `rule-lines` — a stack of hairline rules (pure CSS
  `repeating-linear-gradient` in motif ink) filling the panel.
- `none` — the panel renders empty (plain surface, `aria-hidden` kept).

Motif markup stays `aria-hidden="true"` everywhere; no region contract
changes; no new layout — the motif rides the existing glyph slot, so
expression-tier amplitude rules are untouched.

### Interview surface (`SKILL.md`)

Extend the existing edge-selection step (right before Confirm) with a motif
question: show only fitting motifs, each with its rationale; the user picks
exactly one or skips (skip ⇒ field absent ⇒ legacy glyph). Selection →
`motif: "<value>"` → re-dry-run.

## Non-goals

- Per-brand generative shapes (the geometric composition is one pinned
  constant in v1).
- Motif motion/animation; video-adapter motif consumption.
- New color derivation for motif ink (aliases the existing panel primary).
- Renaming/altering the legacy no-motif glyph path.

## Impact

- **Added**: `src/motif.ts`, `golden/motif.test.ts`.
- **Modified**: `src/brand-schema.ts`, `src/tokens-builder.ts`,
  `src/validator.ts`, `src/gate.ts` (GATE_CATALOG), `src/contract.ts`
  (only if surface extraction needs the new group listed),
  `src/transformer.ts` (`motif-kind` $type pass-through),
  demo generators ×5, `SKILL.md`, `docs/uniqueness-roadmap.md` (item 3
  status on archive).
- **Invariant**: brand.json without `motif` builds **byte-identical** to
  today — keystone and all existing goldens pass unmodified; a golden
  proves it.
