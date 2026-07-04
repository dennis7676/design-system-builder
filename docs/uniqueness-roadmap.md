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
| 2 | ~~**Per-recipe skeletons**~~ — **SHIPPED 2026-07-03** (`add-recipe-skeleton-spike` + `skeleton-batch-a/b/c`): 8 recipes each carry their own layout grammar, hash-neutral | Kills the residual "same skeleton, different clothes" reading; combination space gains a structural axis | High authoring cost — 8 skeletons × goldens; ship one recipe at a time |
| 3 | **Motif tokens** — extend the bold glyph into a small enum of brand motifs (`glyph | geometric | rule-lines | none`) rendered from tokens | Instant signature element per brand | Medium — new `$type` or component token + demo consumption |
| 4 | **Edge-point HITL step** — **Round 1 SHIPPED 2026-07-04** (`add-edge-points`): finite edges enum + deterministic `suggestEdges()` concept-fit + texture-grain end-to-end (opacity cap 0.06, worst-case blended-background pair-floor gate) + SKILL edge-selection step; no-edge builds byte-identical (golden-proven). ~~glass stays DEFERRED~~ **Round 2 SHIPPED 2026-07-04** (`add-glass-round2`, luminance-interval gate) | done | done |
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
- **layout-probe smoke** ✅ (2026-07-03, `62e990e`): `npm run probe:layout` —
  8 recipes × en/ko rendered in a system browser (playwright-core channels,
  graceful SKIP), asserting application-frame containment (≤2px) and
  GAP_RULES adjacency (extensible table). First run caught 7 latent
  title-slide overflows on large-display recipes → fixed with
  container-type:size + cqh type budget + line-height caps. Fault
  re-injection verified detection (16/16 FAIL on removed stage margin).
  Kept separate from `npm test` by design.
- **Interview affordances** ✅ (2026-07-03, `06543d1`): benchmarking verdicts
  ④⑤⑥ landed — cli candidate table + `branding.recipe_override`
  (reproducibility-preserving human choice, loud CONFLICTs), SKILL.md
  mood-image priors + candidate-choice/comparison-builds steps, README
  Handoff subsection. 288 tests; artifact bytes frozen.

## Commercial track (2026-07-04, Astryx benchmarking interview)

Positioning (user-confirmed): between **public OSS portfolio** and
**client-deliverable tooling** — external consumers exist, so consumability
(docs, DX, showcase quality) ranks with expressiveness. Benchmark: Meta
Astryx (150+ components, 7 themes, AI-readable docs, embedded MCP server).
DSB is a different layer — a deterministic *system generator*, not a
component box — but Astryx sets the commercial bar its outputs must meet.

Adopted points and order:

1. ~~**MCP spike (B2, early)**~~ — **SHIPPED 2026-07-04** (`add-mcp-spike`): dsb_build/dsb_validate stdio, hash parity with CLI proven over a live JSON-RPC roundtrip; full server ships with M6. Was: minimal `build`/`validate` tools exposed over
   MCP so in-house agents consume DSB natively; full server ships with M6.
2. ~~**Glass Round 2**~~ — **SHIPPED 2026-07-04** (`add-glass-round2`):
   luminance-interval contrast-floor gate (interior collapse caught — the
   case a two-extreme check passes; blur-independent by construction;
   backing opacity floor 0.6, default 0.88). Last DEFERRED edge lifted.
3. **Component expansion (B3, own components)** — **P1 SHIPPED 2026-07-04**
   (`add-component-foundation` + `component-batch-a/b/c`): 10-primitive
   registry, component-parity gate, generic state contrastPairs (disabled
   exempt, focus 3:1), specimen gallery; all 8 recipes rolled out with
   full catalog parity (365 tests). Next: P2 composites → P3 patterns.
   The shadcn/Tailwind adapter (old M2.5) stays **demoted** below this.
4. **AI-consumable contract (B1) + Guarantees (B5)** — **SHIPPED 2026-07-05**
   (`add-usage-contract`): contract.json emitted with every build (consume
   do/dont, public token API, registry snapshot, GATE_CATALOG with
   validator-parity test, guarantees with proof pointers), hash-embedded
   and manifest-drift-checked; README guarantees rewritten with per-claim
   proofs (372 tests). Bonus: demo color-mix foregrounds now build-time
   contrast-gated via mixedText (M5 a11y hole closed).
5. **Motif enum** — rides the edge infra; after the component layer starts.
6. **Playground hosting (B4) + M6 publish** — L5, user HITL.

M4 video extension and M5 hardening keep their places after the above;
hygiene items ride along in any session.
