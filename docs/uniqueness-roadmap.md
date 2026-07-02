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
| 1 | **B3 colour-override 삼분해** — `visual.accent` hue request → automated contrast re-derivation (fix L, steer H/C, re-run pair floors) | The user's *actual* colour lands in the system (Crystal Ball "warm feminine" gap). Unlocks the deferred `visual.accent` / `cold_warm` overrides | Medium — needs an L-preserving hue-shift derivation + full pair re-validation; the gate stays the oracle |
| 2 | **Per-recipe skeletons** — each recipe gets a layout archetype of its own (luxury = editorial whitespace, enterprise = data density, retro = poster rhythm), orthogonal to tiers | Kills the residual "same skeleton, different clothes" reading; combination space gains a structural axis | High authoring cost — 8 skeletons × goldens; ship one recipe at a time |
| 3 | **Motif tokens** — extend the bold glyph into a small enum of brand motifs (`glyph | geometric | rule-lines | none`) rendered from tokens | Instant signature element per brand | Medium — new `$type` or component token + demo consumption |
| 4 | **Edge-point HITL step** (see below) | Lets a user opt into high-personality effects (glass, heavy texture) *before* final confirmation | Medium — glass needs the Tier-2 contrast-floor mechanism first |
| 5 | **Interview exposure** — add expression/edge questions to the SKILL front door (today: zero amplitude questions) | The dials built in code become choosable in the actual flow | Low — docs-only |

## Edge-point decision structure (proposed, awaiting user confirmation)

Question raised: should highly distinctive elements (glassmorphism etc.) be a
user decision step, or the agent's judgment call?

**Proposal: HITL step + curated menu + per-edge gate.**

- **Selection = user.** A dedicated interview step before final confirmation:
  "엣지포인트를 넣을까요?" — mirrors the export gate's existing 5th condition
  (`userConfirmed`); taste has no machine answer.
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
