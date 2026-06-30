---
name: design-system-builder
description: >-
  Interview a user about a product's brand and emotion, assemble a confirmed
  brand.json, then run the deterministic CLI to produce an intent-token SSOT
  (tokens.json) plus web surfaces (CSS vars, styleguide.html, DESIGN.md). Use
  when someone wants to set up or generate a design system, design tokens, a
  brand token palette/typography/spacing/motion system, or a styleguide for a
  web product. The interview is conversational; everything after the confirmed
  brand.json is deterministic and golden-tested.
---

# design-system-builder

Conversational front door to a deterministic token compiler. **The interview
(elicitation) is the only non-deterministic step — and it is sealed by human
confirmation of `brand.json`.** Once `brand.json` is confirmed, the pipeline
(`build → validate → generate`) is 100% reproducible: same `brand.json` → same
tokens → same surfaces (hash-verified).

```
interview (this skill, LLM)  →  brand.json (CONFIRMED — reproducibility boundary)
  →  build (CLI, deterministic): recipe selection + tokens.json + gate
  →  generate (CLI): tokens.css + styleguide.html + DESIGN.md  (3-surface hash-consistent)
```

Repo: `~/design-system-builder`. Build first if `dist/` is stale: `npm run build`.

---

## When to use / entry matrix

| Entry | Interview scope |
|-------|-----------------|
| **Standalone** (user comes straight here) | Full 5-Phase interview below. |
| **Chained from `product-design-system`** (JTBD already done upstream) | Brand/emotion Phases only (1–3); reuse upstream medium/audience for Phase 0, skip JTBD. |

Handoff contract: this skill consumes a product brief if present (`medium`,
`audience`, existing guidelines) and **always emits a confirmed `brand.json`**
as the boundary artifact. It owns token implementation + lint + web surfaces;
it does **not** own product strategy (that is `product-design-system`).

---

## Interview — 5 Phases (earlier answers narrow later questions)

Principle: **ask emotion before color.** Keep it a conversation, but pin the
mappings that decide tokens (below) to explicit user choices, not your own
inference — that is what keeps `brand.json` reproducible.

### Phase 0 — Warm-up (→ hard constraints)
Ask, conversationally: **medium?** (web / app / video — pilot supports `web`),
**target audience & expertise?**, **one-word first impression?**
- `medium` → `product.medium`. Expertise/audience → `audience[]` and density prior.

### Phase 1 — Brand personality (→ tone_vector + archetype)
1. "If the brand were a person, what's their job?" → Jung archetype (free text → `branding.archetype`, a **prior only**, never the decider).
2. **Semantic Differential — the 5 axes that become `tone_vector` (1–7).** Run these as `AskUserQuestion` (up to 4 questions per call), one anchored scale per axis, so the **user picks the integer**, not you. Use the rubric below for option labels. Midpoint (4) = the auto-added "Other → 균형/중간".
3. "3 words this brand would NEVER use" → exclusion signals.
4. "2–3 similar brands/products" → `branding.references[]` (reverse-inference, **override guide only**).

#### tone_vector rubric (axis · value 1 ↔ 7 anchors)
| Axis (`brand.json` key) | 1 (low) | 4 (mid) | 7 (high) |
|-------------------------|---------|---------|----------|
| `static_dynamic` (정적↔역동) | calm, steady, still | balanced | energetic, moving, kinetic |
| `cold_warm` (차갑↔따뜻) | cool, clinical, blue-leaning | neutral | warm, inviting, earthy |
| `serious_playful` (진지↔유쾌) | formal, sober | balanced | playful, expressive, fun |
| `classic_cutting_edge` (클래식↔전위) | timeless, traditional | settled | experimental, avant-garde |
| `minimal_rich` (미니멀↔풍부) | sparse, restrained | moderate | layered, ornate, maximal |

> Map answers to **integers 1–7 only**. `validateBrand` rejects out-of-range. A
> human will confirm these before any token is built, so the user's chosen
> numbers — not your interpretation — are the SSOT.

### Phase 2 — Visual (→ constraints + overrides)
Light/dark (dark = non-normative M3), accent leaning, excluded colors, font
feel, density, **corner radius feel** (tight ↔ rounded).
- Radius feel → at most one `overrides["visual.radius"]` = `tighter` | `looser`
  (omit if the recipe default fits — overrides are exceptions, not defaults).
- Accessibility need → `accessibility.minContrast` = `AA` (default) | `AAA`.

### Phase 3 — Motion (→ override)
Snappy ↔ smooth, reduce-motion respect.
- Speed feel → at most one `overrides["motion.speed"]` = `snappier` | `calmer`.
- **Deferred in this pilot** (do not emit; tell the user they are coming):
  `overrides["motion.easing"]`, `overrides["visual.accent"]`,
  `overrides["tone_vector.cold_warm"]` — hue/easing changes need contrast
  re-derivation or a token type that does not exist yet.

### Phase 4 — Constraints (→ hard constraints)
Existing brand guidelines / locked hex? Consistency targets?
- Required capability tags (e.g. `dense-data`) → `constraints[]`. These **hard-filter** recipe candidates, so only add a tag a recipe actually advertises (`references/recipes/*.json` → `hardConstraintRules.tags`); an unsatisfiable tag is a deliberate "no recipe fits → ask more" signal, not a bug.

---

## Assemble brand.json

Build this object from the answers (see `src/brand-schema.ts` for the type):

```json
{
  "schemaVersion": "2026-06-30",
  "product": { "name": "<name>", "medium": "web" },
  "audience": ["<who>"],
  "accessibility": { "minContrast": "AA" },
  "constraints": [],
  "branding": {
    "tone_vector": { "static_dynamic": 3, "cold_warm": 4, "serious_playful": 2, "classic_cutting_edge": 3, "minimal_rich": 4 },
    "archetype": "<jung archetype>",
    "references": ["<brand-a>", "<brand-b>"]
  },
  "overrides": {}
}
```

Rules: tone_vector all 5 axes, integers 1–7. `overrides` ≤ 3 axes, omit when
empty. Only emit `visual.radius` / `motion.speed` (others deferred).

---

## Confirm → build → generate

1. **Show the assembled `brand.json` to the user and get explicit confirmation.**
   This confirmation is the gate's `userConfirmed` condition and the
   reproducibility seal — do not skip it. Write it to e.g. `brand.json`.
2. **Dry-run the gate** (no `--confirm`) to surface recipe choice + conflicts:
   ```
   node dist/cli.js build brand.json --recipes references/recipes
   ```
   Read back: selected recipe, `tone_distance` per candidate, any `CONFLICT`.
3. **Handle conflicts (HITL)** — do not force past them:
   | Conflict | Meaning | Action |
   |----------|---------|--------|
   | `no-recipe-satisfies-hard-constraints` | constraints/medium exclude all recipes | relax a `constraints[]` tag or change medium; re-ask Phase 4 |
   | `recipe-deferred` | nearest recipe is a stub (expressive / pro-emotive) | pick a different tone or tell the user that recipe's tokens aren't authored yet |
   | `too-many-overrides` | > 3 override axes | drop the least-important override |
   | `override-deferred` | used a deferred axis | remove it (see Phase 3) |
4. **Build with confirmation** → writes the intent-token SSOT:
   ```
   node dist/cli.js build brand.json --out out/tokens.json --confirm
   ```
5. **Generate web surfaces** from `tokens.json`:
   ```
   node dist/cli.js generate out/tokens.json --out-dir out
   node dist/cli.js validate out/tokens.json --check-manifest   # expect "export gate PASS"
   ```
   Outputs: `out/tokens.css`, `out/styleguide.html` (self-contained, opens via
   `file://`), `out/DESIGN.md`. `orphan-token` **warnings** are fine; only
   `error`-severity findings block.

Report to the user: recipe chosen + why (nearest tone anchor), tokenHash, and
the three surface paths.

---

## Does NOT do (scope)

- Pick recipe by archetype/references — those are priors; tone + hard
  constraints decide (recipe selection lives in the CLI, not here).
- Hand-tune realized values (rem/ms/hex) — adapters derive them; `tokens.json`
  stays intent-only.
- Dark mode (M3), video/Remotion (M4), Tailwind/shadcn export (M2.5).
- Bypass the confirmation gate or push past a conflict.
