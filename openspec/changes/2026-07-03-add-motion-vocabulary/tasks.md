# Tasks — add-motion-vocabulary

## 1. Token shape + recipes

- [x] 1.1 Validator: cubicBezier `$value` = 4 finite numbers, x1/x2 ∈ [0,1]
- [x] 1.2 8 recipes: `primitive.motion.easing.{standard,enter,exit}` per the
      normative table in proposal.md (values verbatim)
- [x] 1.3 8 recipes: `semantic.motion.easing.*` aliases (`adapter-derived`)

## 2. Surfaces

- [x] 2.1 Web realizer: cubicBezier array → `cubic-bezier(x1, y1, x2, y2)`
      (replace string passthrough; assert array shape)
- [x] 2.2 Video: remove `cubicBezier` from `VIDEO_SKIPPED_TYPES`; emit
      readonly number tuples (`as const`); update G-V skip assertions
- [x] 2.3 demo.html: interactive elements consume
      `var(--semantic-motion-easing-standard)`; no curve literals
      (anti-hardcode golden)
- [x] 2.4 styleguide: motion section row (3 roles + raw values, static)

## 3. Override unlock

- [x] 3.1 Remove `motion.easing` from `DEFERRED_OVERRIDES`; add enum axis
      `["subtle","standard","expressive","dramatic"]`
- [x] 3.2 Override application: wholesale triple replacement + `meta`
      provenance (accent precedent)
- [x] 3.3 SKILL.md Phase 2 interview question (4지선다, default = recipe 고유)

## 4. Goldens + gate

- [x] 4.1 `golden/motion.test.ts`: per-recipe normative values, alias
      resolution, web/video realization, override replacement + provenance,
      validator x-clamp rejection
- [x] 4.2 Superset gate test: every current-keystone leaf deep-equal present
      in new build (additions only)
- [x] 4.3 Full suite green EXCEPT the intentional R1 keystone mismatch;
      typecheck clean
- [ ] 4.4 (operator, L3) user approval → keystone regeneration → suite fully
      green → commit + archive
