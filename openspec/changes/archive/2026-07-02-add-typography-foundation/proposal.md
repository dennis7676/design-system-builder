# add-typography-foundation

## Why

Typography is the system's weakest formalized axis. Each recipe carries a
loose 4-step size ramp (caption/body/heading/display) with no declared scale
relationship, only two semantic roles (body, heading), and no tracking tokens.
The consequences are measurable today: `font.size.caption` and
`font.size.display` are orphan-token WARNs (declared, never consumed), and the
demo fills the hierarchy gap with hardcoded sizes (`.hero h1
clamp(2.4rem,6vw,4rem)`, `.card h3 1.2rem`, `.fine .85rem`) — a standing
violation of the anti-hardcode discipline that G-D goldens enforce for color.

Two Korean typography research reports (2026-07-02, KRDS / W3C klreq / Toss
TDS / LINE LDSG sources) supply the missing normative targets: heading-to-body
ratio 1.25–1.5 as the "hierarchy legibility safe band" (KRDS), role-
differentiated line-height (headings 1.1–1.3, body 1.5–1.8), role-
differentiated tracking (small sizes need positive compensation), Korean body
measure of 25–35 chars (mobile) / 35–45 (desktop) vs Latin 50–75, and a
Korean body line-height floor of 1.6–1.8 (line gap must exceed word gap).

Measured constraint: 5 of 8 recipe ramps are NOT ratio-consistent (e.g.
luxury 2.0/1.5, enterprise 1.375/1.455), so a strict `ratio^step` derivation
cannot reproduce current values. Per the approved R1 guardrail (option A:
value-preserving), existing steps stay as anchors; the scale ratio is a
COMPUTED property, and only NEW steps derive from it.

## What Changes

- **Phase 1 — scale formalization (R1-untouched).** `buildTokens` computes
  each recipe's characteristic type-scale ratio as the geometric mean
  `(display/body)^(1/2)` from the base ramp and echoes it as
  `meta.typeScale = { ratio, anchors }` (meta ⇒ hash-excluded). No base value
  changes; no new intent nodes. A golden gate (G-T1) locks ramp monotonicity
  (caption < body < heading ≤ display) and the meta echo.
- **Phase 2 — semantic hierarchy (additive re-baseline).** `semantic.
  typography` grows from 2 roles to 6: `display / h1 / h2 / h3 / body /
  caption`, each a bundle of `family · size · weight · lineHeight · tracking`.
  `h1` aliases the existing heading anchor, `display`/`body`/`caption` alias
  their anchors; `h2`/`h3` are NEW primitive sizes derived by geometric
  interpolation between body and heading (`h3 = body·ρ^(1/3)`,
  `h2 = body·ρ^(2/3)`, ρ = heading/body, rounded to 3 decimals). New
  `primitive.font.tracking` group (`heading / body / caption`, `$type:
  "number"`, em units by convention). Demo + styleguide consume the roles
  (hardcoded sizes replaced by semantic vars). This resolves both orphan
  WARNs. Existing primitive leaf VALUES are untouched — the change is purely
  additive, proven by a superset gate (G-T0) against a preserved pre-change
  fixture — but the R1 keystone document gains nodes, so
  `golden/sample.tokens.json` is regenerated once, after the G-T0 gate passes
  and the operator approves the audited diff.
- **Phase 3 — Korean measure & body leading (generator-only).** In the ko
  path (backlog items 1–2 of `docs/locale-typography-ko.md`): body-copy
  max-width switches from Latin `ch` values to full-width-character-based
  `em` budgets (body 25–35 chars mobile / 35–45 desktop, headline 8–15
  chars), and body line-height gets a 1.7 floor. Token documents are not
  touched.
- **Phase 4 — Korean font promotions (visual sign-off gated).** Pending
  operator visual approval per rendered screenshots: enterprise → IBM Plex
  Sans KR, creative-multiscale → SUIT, warm-creator → Gowun Dodum in each
  recipe's `locales.ko` block, with G-L2-family golden coverage.

## Capabilities

### New Capabilities
- `typography-foundation`: every recipe exposes a formalized type scale
  (computed ratio + anchored ramp) and a six-role semantic typography
  hierarchy with role-differentiated size, weight, line-height and tracking,
  consumed by all generated surfaces without hardcoded font sizing, and
  gated for hierarchy legibility (h1/body within 1.25–2.0, monotone ramp).

### Modified Capabilities
- `locale-typography`: ko surfaces additionally get character-count-based
  measure and a 1.7 body line-height floor; recipe `locales.ko` maps promote
  identity-matched Korean families for enterprise, creative-multiscale and
  warm-creator.

## Impact

- **Modified**: `src/tokens-builder.ts`, `src/tokens-schema.ts` (meta echo +
  tracking group), `references/recipes/*.json` (8 files: additive h2/h3 +
  tracking primitives, semantic role wiring), `src/demo-generator.ts`,
  `src/styleguide-generator.ts`, `golden/sample.tokens.json` (regenerated
  once, additive-only, gated + operator-approved), new `golden/
  typography.test.ts`, `docs/locale-typography-ko.md` (backlog → shipped).
- **Untouched**: existing primitive leaf values, color/contrast gates,
  transformer, elevation/gradient/expression/locale behavior.
- **Determinism/R1**: Phase 1 and 3 leave every token document byte-identical.
  Phase 2 changes the keystone hash by node addition only; G-T0 proves the
  old document is a value-identical subset of the new one before the golden
  is re-baselined.
