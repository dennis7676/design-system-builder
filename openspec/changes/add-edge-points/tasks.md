# add-edge-points — tasks

## 1. Schema + enum

- [x] 1.1 `src/brand-schema.ts`: `edges?: readonly string[]` + EDGE enum
      validation (unknown → CONFLICT with enum list; glass → DEFERRED
      CONFLICT). Follow the DEFERRED_OVERRIDES message style.

## 2. Concept-fit engine

- [x] 2.1 `src/edge-point.ts` (new): `EDGE_MENU` (fitness predicates +
      rationale templates + deferred flag), `suggestEdges(brand, recipe)`.
      Pure/deterministic — no Date/random, stable ordering.
- [x] 2.2 Fitness rules v1 exactly as proposal.md (texture-grain:
      retro/warm-creator/luxury or warm+organic tone, excluded for
      minimal-tech@safe; glass: cutting-edge ≥ 5 cool recipes, deferred).

## 3. texture-grain end to end

- [x] 3.1 `src/tokens-builder.ts`: `applyEdges()` → `semantic.texture.overlay`
      (pinned feTurbulence data-URI constant from edge-point.ts, blend mode,
      opacity ≤ 0.06). Record in meta.philosophy.
- [x] 3.2 `src/validator.ts`: worst-case blended-background pair-floor
      re-proof (mirror the gradient worst-case-stop gate structure) +
      opacity cap check + fitness CONFLICT for unfit hand-added edges.
- [x] 3.3 `src/transformer.ts` + demo/styleguide generators: overlay
      consumption on hero/surface panels, var-only. Skip in video adapter
      (add to VIDEO_SKIPPED_TYPES if a new $type is introduced).

## 4. Interview surface

- [x] 4.1 `SKILL.md`: "Edge selection" step before Confirm — fitting edges
      + rationale, deferred shown locked, selection → `edges: []` →
      re-dry-run.

## 5. Goldens + verification

- [x] 5.1 `golden/edge-point.test.ts`: enum rejection, deferred glass,
      suggestion determinism (double-run deep equal), minimal-tech@safe
      exclusion, opacity-cap failure injection, worst-case blend failure
      injection, unfit-edge CONFLICT.
- [x] 5.2 No-edge byte-identity: keystone + full existing suite pass
      **unmodified** (do not regenerate keystone; if it changes, the
      implementation is wrong).
- [x] 5.3 `npm test` green (288 existing + new), `npx tsc --noEmit` clean.
