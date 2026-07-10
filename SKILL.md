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

Repo: `~/design-system-builder`. **Run all commands below from the repo root**
(they use relative `dist/cli.js` and `references/recipes`). Build first if
`dist/` is stale: `npm run build`. `build` stamps a fixed `generatedAt`
sentinel, so the same `brand.json` yields a **byte-identical** `tokens.json`,
not merely the same intent hash.

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
- **Locale — Korean is the default.** Set `product.locales: ["ko"]` unless the
  product is explicitly English-only or the user asks in English for an English
  build (then omit `locales` for the Latin-only path). `ko` activates Korean
  font pairing (Pretendard/SUIT) and Korean specimen/demo copy; without it the
  surfaces render Latin-only fonts and English copy, which is wrong for Korean
  services. When in doubt, ask — but default to `["ko"]`.
- Optional mood-image intake: ask for 3+ references (Pinterest captures, logo,
  current brand material). Read them into a 5-axis tone prior, each axis with a
  one-line visual reason, plus a recipe prior. Use priors only to narrow later
  questions; user answers win, and images never enter `brand.json`. If no
  images are provided, state the generic-risk and continue.

### Phase 1 — Brand personality (→ tone_vector + archetype)
1. "If the brand were a person, what's their job?" → Jung archetype (free text → `branding.archetype`, a **prior only**, never the decider).
2. **Semantic Differential — the 5 axes that become `tone_vector` (1–7).** Run as `AskUserQuestion`, one anchored scale per axis. `AskUserQuestion` caps at **4 questions per call**, so split the 5 axes across **two calls** (e.g. 3 + 2) — do not silently drop the 5th. Offer 4 anchored options per axis mapping to `{1, 3, 5, 7}`; the auto-added "Other" lets the user say midpoint (4) or an off-anchor value (2/6) in words, which you then place. This makes the common case a direct user choice and keeps your interpretation to the off-anchor margins. (Reproducibility is ultimately guaranteed by the confirmation seal below, not by the instrument's granularity.)
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
feel, density, **corner radius feel** (tight ↔ rounded), **brand colour**.
- Radius feel → at most one `overrides["visual.radius"]` = `tighter` | `looser`
  (omit if the recipe default fits — overrides are exceptions, not defaults).
- **Brand colour** → "제품을 대표하는 색이 있나요?" If the user names one,
  map it to an integer hue and emit `overrides["visual.accent"]` = `0–359`
  (e.g. rose ≈ 350, coral ≈ 25, gold ≈ 85, green ≈ 145, teal ≈ 195,
  blue ≈ 255, violet ≈ 300). The whole chromatic palette rotates coherently;
  WCAG floors are re-proven with bounded nearest-fix (build fails hard if a
  hue is unrepairable — offer a neighbouring hue). Warm/cool leanings without
  a named colour also land here (cold_warm override is subsumed by this).
- **Expression amplitude** → "레이아웃 표현 강도는?" quiet/standard/statement →
  `expression` = `safe` | `balanced`(default, omit) | `bold`.
- Accessibility need → `accessibility.minContrast` = `AA` (default) | `AAA`.
- **Industry seed (optional)** → if the product type is known, consult
  `references/industry/` (colors/products/typography/styles lookups, ~160 industries)
  to *propose* a starting accent hue, style direction, or font feel. These only seed
  the conversation — the build gate re-proves WCAG floors and can override any seeded
  hex, so never hand-bind a CSV value past `brand.json` confirmation.

### Phase 3 — Motion (→ override)
Snappy ↔ smooth, reduce-motion respect.
- Speed feel → at most one `overrides["motion.speed"]` = `snappier` | `calmer`.
- Motion feel → ask "동작 느낌은 어떤 쪽이 맞나요?" with recipe default 유지
  (default, omit), subtle, standard, expressive, dramatic. Emit
  `overrides["motion.easing"]` only when the user chooses one of the four
  presets; the default keeps the recipe's own easing personality.

### Phase 4 — Constraints (→ hard constraints)
Existing brand guidelines / locked hex? Consistency targets?
- Required capability tags (e.g. `dense-data`) → `constraints[]`. These **hard-filter** recipe candidates, so only add a tag a recipe actually advertises (`references/recipes/*.json` → `hardConstraintRules.tags`); an unsatisfiable tag is a deliberate "no recipe fits → ask more" signal, not a bug.

---

## Assemble brand.json

Build this object from the answers (see `src/brand-schema.ts` for the type):

```json
{
  "schemaVersion": "2026-06-30",
  "product": { "name": "<name>", "medium": "web", "locales": ["ko"] },
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
empty. Emit `visual.radius` / `motion.speed` / `visual.accent` (integer hue
0–359) / `motion.easing` (`subtle` | `standard` | `expressive` | `dramatic`).
Add `branding.recipe_override` only after the candidate-choice step; otherwise
omit it. Add top-level `expression` only for safe/bold (balanced = default).
Add top-level `edges` only after the Edge selection step below. If the user
chooses no edge, write `edges: []` explicitly before the final dry-run so the
choice is sealed in `brand.json`. Add top-level `motif` only after the motif
choice in that same step. If the user skips motif, omit `motif` entirely so the
legacy glyph path stays active.

### Edge selection — before Confirm

Run this step after recipe candidates are known and immediately before final
confirmation. Use `suggestEdges(brand, selectedRecipe)` from the deterministic
engine; do not invent edge names or free-form effects.

Show each fitting edge with its one-line rationale and whether it is selectable:

- `texture-grain` — selectable only when the concept-fit predicate accepts the
  selected recipe, tone vector, and expression tier.
- `glass` — selectable when the concept-fit predicate accepts cool,
  cutting-edge concepts. Say that the contrast gate keeps backing opacity high
  so text stays readable over unknown backdrops.

Ask the user to choose zero or more selectable edges. Write the result to
`brand.json` as `edges: []`, `edges: ["texture-grain"]`, `edges: ["glass"]`,
or both selected edges, then rerun the dry-run gate before asking for final
confirmation. If the dry-run returns an edge conflict, resolve it with the user
instead of forcing the build.

Before final confirmation, ask the motif question in this same step. Use
`suggestMotifs(brand, selectedRecipe)` from the deterministic engine; do not
invent motif names or free-form marks.

Show only fitting motifs, each with its one-line rationale:

- `glyph` — the current first-letter signature element.
- `geometric` — selectable only when the selected recipe or tone vector fits a
  constructed mark.
- `rule-lines` — selectable only when the selected recipe or tone vector fits a
  composed editorial rule motif.
- `none` — selectable because opting out of a signature element is always safe.

Ask the user to pick exactly one motif or skip. If they pick one, write
`motif: "glyph"`, `motif: "geometric"`, `motif: "rule-lines"`, or
`motif: "none"` to `brand.json`; if they skip, leave `motif` absent. Rerun the
dry-run gate before asking for final confirmation. If the dry-run returns a
motif conflict, resolve it with the user instead of forcing the build.

---

## Confirm → build → generate

1. **Show the assembled `brand.json` to the user and get explicit confirmation.**
   This confirmation is the gate's `userConfirmed` condition and the
   reproducibility seal — do not skip it. Write it to e.g. `brand.json`.
2. **Dry-run the gate** (no `--confirm`) to surface recipe candidates + conflicts:
   ```
   node dist/cli.js build brand.json --recipes references/recipes
   ```
   Read back the candidate table. Show the top choices and let the user pick; if
   they pick a non-nearest recipe, set `branding.recipe_override` in
   `brand.json` and rerun. For comparison builds, use the same `brand.json` with
   a temporary override per candidate into temp dirs so side-by-side surfaces are
   cheap and reproducible.
3. **Handle conflicts (HITL)** — do not force past them:
   | Conflict | Meaning | Action |
   |----------|---------|--------|
   | `no-recipe-satisfies-hard-constraints` | constraints/medium exclude all recipes | relax a `constraints[]` tag or change medium; re-ask Phase 4 |
   | `recipe-override-rejected` | chosen recipe fails hard constraints | pick a shown OK recipe or relax the named constraint |
   | `recipe-override-unknown` | chosen recipe key is not known | use one of the valid keys printed by the CLI |
   | `recipe-deferred` | selected recipe has no base token tree (defensive — all 8 recipes are currently authored, so this should not fire) | if it ever fires, author the recipe's base or pick a different tone |
   | `too-many-overrides` | > 3 override axes | drop the least-important override |
   | `motif-fit-rejected` | chosen motif does not fit the selected recipe/tone | pick one of the suggested motifs or skip motif |
   | `BRAND [overrides.<axis>] unknown override axis` line | used an unsupported axis | remove it. `tone_vector.cold_warm` → use `visual.accent` hue instead |
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
- Treat handoff docs as secondary: `DESIGN.md` and `tokens.css` are first-class
  handoff objects for Claude Design, other LLMs, humans, and CSS consumers.
