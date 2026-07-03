# Uniqueness roadmap — beyond expression tiers

> Status: **proposed** (2026-07-02, user feedback round). Items ship only after
> user sign-off, each as its own OpenSpec change. Context: after the
> `add-expression-tier` change, variations carry real identity (user-confirmed);
> this roadmap names the next levers, ordered by impact-per-risk.

## The governing trade

Uniqueness never comes from improvisation. Every lever below expands a
**finite, versioned combination space** (recipes × tiers × overrides × edges);
none lets the generator invent values outside `brand.json` — that would break
the byte-reproducibility seal that defines this tool.

## Levers (priority order)

| # | Lever | What it unlocks | Risk / prerequisite |
|---|-------|-----------------|---------------------|
| 1 | ~~**B3 colour-override**~~ — **SHIPPED 2026-07-02** (`unlock-accent-override`): integer hue 0–359 → coherent chromatic rotation (L fixed, C gamut-clamped) → pair floors re-proven with bounded nearest-fix (±0.06 L). `cold_warm` subsumed. 2880-cell hue probe: zero unrepairable | done |
| 2 | **Per-recipe skeletons** — each recipe gets a layout archetype of its own (luxury = editorial whitespace, enterprise = data density, retro = poster rhythm), orthogonal to tiers. **User green-lit exploration (2026-07-02: "조금 더 베리에이션·아이덴티티 구분 여지 판단 OK")** | Kills the residual "same skeleton, different clothes" reading; combination space gains a structural axis | High authoring cost — 8 skeletons × goldens; ship one recipe at a time |
| 3 | **Motif tokens** — extend the bold glyph into a small enum of brand motifs (`glyph | geometric | rule-lines | none`) rendered from tokens | Instant signature element per brand | Medium — new `$type` or component token + demo consumption |
| 4 | **Edge-point HITL step** (see below) | Lets a user opt into high-personality effects (glass, heavy texture) *before* final confirmation | Medium — glass needs the Tier-2 contrast-floor mechanism first |
| 5 | **Interview exposure** — add expression/edge questions to the SKILL front door (today: zero amplitude questions) | The dials built in code become choosable in the actual flow | Low — docs-only |

## Edge-point decision structure (**confirmed 2026-07-02** — concept-fit proposal variant)

User verdict: HITL + curated menu + per-edge gate, **enhanced with concept-fit
suggestion** — the system proposes only edges that do not break the brand's
overall concept.

- **Suggestion = concept-fit filter (deterministic).** Each edge in the menu
  carries static fitness rules against the tone vector / recipe class (e.g.
  glass fits cutting-edge ≥ 5 cool recipes; heavy texture fits retro/warm;
  neither is offered to minimal-tech at safe). The interview step shows only
  fitting edges, each with a one-line "why this fits your concept" rationale.
  Static rules keyed on brand.json fields ⇒ reproducible proposals, no
  session-to-session drift.
- **Selection = user.** The step sits right before final confirmation —
  mirrors the export gate's `userConfirmed`; taste has no machine answer.
- **Safety = machine.** Each edge ships with its own admission gate
  (glass → contrast-floor: mandatory minimum opacity / backing fill bounding
  the effective background). An edge the gate rejects cannot build, no matter
  who asked.
- **Menu = finite.** `brand.json` gains `edges: []` over a versioned enum.
  Free-form edge requests are out — same reasoning that rejected improvised
  layout generation.

Rejected alternatives: agent-autonomous inclusion (user loses control of
"beyond-expected" moments); free-text edge requests (proposal drift across
sessions breaks reproducibility of the *process*, even if each build is
deterministic).

## Verified foundation (what this builds on)

- `add-expression-tier` (2026-07-02): safe/balanced/bold layout dial;
  balanced == pre-tier output byte-identical; 95/95 goldens.
- Essence E2E (2026-07-02): concept-fit, system-completeness,
  cross-surface/cross-tier consistency (static `:root` equality + rendered
  computed-style equality via browser probe), reproducibility — all PASS;
  cross-checked by an independent codex pipeline.

## Applications track (2026-07-03, vault PRD v2.5 M3.5)

- **R-A** ✅ (2026-07-03): Claude Design benchmarking done — see
  `docs/claude-design-benchmarking.md`. Verdicts: tab structure → R-B section
  skeleton; DS save→reuse → narrative copy only (already satisfied by
  tokens.json); Tweaks → M5/M6 override-preview candidate; style-list→multi-
  variant → SKILL.md top-3 recipe candidates; handoff-to-code → docs note;
  3+ reference-image intake → interview Phase 0 (skill layer, core untouched);
  animation component sourcing → M4 gate (normalize into motion tokens).
- **R-B** ✅ (2026-07-03): styleguide "Applications" section shipped
  (`1e0d31a`, archived `add-styleguide-applications`) — website embed, 16:9
  slides ×2, 4:5 carousel ×3, 16:9 title card + lower third, 9:16 shorts
  cover. Frame-relative type via container queries (cqw + @container
  fallbacks), skeletonHint placement map, copy-deck reuse, var-only;
  283 goldens green; EN+KO render QA with DOM overflow probe (all frames
  contained).
- Ordering: R-A feeds R-B design; R-B implementation follows the codex-dispatch pattern with the usual gates (var-only, anti-hardcode, drift goldens, render QA). Orthogonal to the 8 skeleton grammars.
