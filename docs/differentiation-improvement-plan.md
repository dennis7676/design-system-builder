# Differentiation improvement plan

> **Status: SHIPPED (2026-07-10 verified).** P1–P3 are all implemented:
> P1 pro-emotive authored (batch A rollout), P2 recipes pushed apart (all 8
> recipes now full-authored with distinct skeletons + hue families), P3 applied
> demo page shipped as surface #3 (`feat(demo): P3`). The diagnosis below is
> **historical** — it describes the pre-fix state. No recipe is a stub anymore
> (`references/recipes/*.json` are all ~63–65 KB full trees), so the "force-fit
> onto clean-tech" failure mode no longer occurs. A brand's warm/rich tone now
> selects warm-creator / pro-emotive rather than being crammed into minimal-tech.
>
> Original header (kept for provenance): PLAN (not yet implemented). Built after
> the "two outputs look alike" feedback. Diagnosis pressure-tested with advisor.

## Diagnosis — root cause is the recipe LIBRARY, not a philosophy→token mapping

There is **no tone→token computation** in the architecture. `selectRecipe`
picks ONE static, hand-authored recipe template by tone distance; `buildTokens`
clones it + applies ≤3 bounded overrides. `tone_vector` chooses *which*
template, never computes token *values*. Consequences:

- Two brands differ only as much as their chosen **templates** differ.
- Atlas (enterprise) and Crystal Ball (minimal-tech) look alike because **both
  built templates were authored in the same aesthetic region** — enterprise was
  literally derived from minimal-tech (both blue, grotesque sans, no elevation).
- **Smoking gun:** Crystal Ball's brand wanted warm / feminine / expressive
  (≈ pro-emotive), but pro-emotive is a **stub**, so it was force-fit onto the
  nearest built template (minimal-tech, clean-tech) → it comes out looking like
  Atlas. A brand whose natural family isn't built gets crammed into clean-tech.

Evidence: recipe tone-anchor distance = 4.00, yet token deltas are tiny
(primary hue 20° apart and both blue; both grotesque sans; no serif/display;
no elevation in either).

**Not the cause:** flat vocabulary ceiling. Flat ≠ samey (Notion / Stripe /
Linear / Gumroad are all flat and unmistakably different). The binding
constraint is *few, clustered recipes*. Effects (gradient/glass/pattern) stay in
the separate `expressive-vocabulary-roadmap.md`; do not pull them into the
differentiation fix.

**Guardrail:** the fix is *more divergent recipe DATA*; recipes stay static
templates. Do **not** build a tone→token interpolation layer — the PRD killed
interpolation (`보간 폐기`) as non-deterministic / incoherent.

## Gap vs reference design systems

| Dimension | Reference (Stripe/Notion/Carbon/Linear) | Ours now | Gap |
|-----------|------------------------------------------|----------|-----|
| In-context / applied examples | full demo pages/apps | token catalog + 1 button playground | **HIGH** |
| Distinct personality per system | serif vs grotesque, coral vs blue, sharp vs pill | 2 built recipes, all clean-blue-sans | **HIGH** |
| Built recipe coverage | n/a | ~~2 of 4 (expressive / pro-emotive are stubs)~~ → **8 of 8 authored (RESOLVED 2026-07-10)** | ~~HIGH~~ done |
| Depth / elevation | shadow systems | none in built recipes | MED |
| Usage guidance (do/don't) | explicit | usage hints only | MED |
| Icon / illustration | yes | none | LOW (defer) |

## Prioritized increments (minimal-first; each independently shippable)

### P1 — Build pro-emotive + re-point Crystal Ball  *(surgical, smallest real fix)*
Author pro-emotive as a genuinely warm/expressive family (warm palette, softer
shapes, more generous scale, optional serif/display accent) and let Crystal Ball
select it. Atlas (enterprise) vs CB (pro-emotive) then read as **different
families**. Warm palette lives in the recipe base — no accent-override needed.
**Nothing pinned breaks** (R1 pins minimal-tech, which is untouched). Validator
gates the palette (oracle for WCAG).

### P2 — Push the built recipes apart on orthogonal levers
Differentiate recipes beyond a 20° hue nudge: font **personality**
(serif / grotesque / geometric / humanist), **saturation + temperature** (not
just hue), **radius extremes** (0 sharp ↔ pill), **type-scale contrast ratio**,
**elevation presence/absence**, border weight. Validator-gated.
⚠️ Re-authoring **minimal-tech** changes its intent hash → the **R1 keystone
fixture breaks by design**; update `sample.tokens.json` + R1 fixture
**consciously, together** in the same change.

### P3 — Applied demo page  *(user's (b); high-value amplifier, not the root fix)*
Generate a realistic applied page per brand (hero / nav / cards / form / footer)
styled entirely by the brand's tokens — what reference sites do that a token
catalog can't. Makes differences visceral.
- It is a **new surface** → it gets its own `builtFromTokenHash` + a
  completeness contract in `manifest.ts` (same discipline as styleguide).
- **Sequence after/alongside P1–P2**: without divergent recipes, two applied
  pages still look alike, so this amplifies difference only once the recipes
  diverge.

### P4 — Tier-1 vocabulary (gradient / shadow)
Stays in `expressive-vocabulary-roadmap.md`. **Not** part of this differentiation
fix; later.

## Sizing decision (drives the next step)
- **Surgical:** P1 only — build the warm recipe Crystal Ball actually wanted.
- **Fuller:** P1 + P2 + P3 — divergent recipe system + applied demo surface.

Recipe authoring is cross-checked with codex at implementation time (per the
hybrid build pattern); this document is the plan, not the implementation.
