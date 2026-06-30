# design-system-builder

Interview-driven design system generator. One **intent token SSOT** → multi-target adapters.

> **Product vision** (PRD §2): tokens → web *and* video, straight through.
> **M2/M3 implementation scope = web single surface.** Video (Remotion) adapter is M4 (Appendix A of the design spec). This README describes the M2 web scope.

## What

`interview → brand.json → tokens.json → CSS vars → styleguide.html`

- **tokens.json** is the single source of truth and is *intent-only* (no realized/media values). Realized values (CSS `rem`, `oklch`, `ms`) are derived by adapters and are **not** the SSOT.
- A deterministic **validator** gates export: alias graph, `$class` coverage, type/unit, WCAG contrast (`contrastPairs` registry: text 4.5 / large-text 3 / non-text 3), foreground pairing, conditional motion-reduce, and 3-surface drift.

## Concepts

- **intent → realized**: `space.comfortable` (intent) → `web: 1rem` (realized, adapter-derived).
- **`$class`**: every leaf token is `portable` / `adapter-derived` / `target-only:<target>`.
- **contrastPairs**: explicit registry of fg/bg pairs (role · state · minRatio) the WCAG gate checks.
- **drift contract**: `tokenHash` = hash of the intent subtree (excludes `meta`). Each surface embeds `builtFromTokenHash`; `validate --check-manifest` recomputes and compares.

## Quickstart (M3)

```sh
npx design-system-builder validate tokens.json
```

## Status

M3 pilot — web single surface. See design spec for the full roadmap.

## License

MIT — see [LICENSE](./LICENSE). Bundled reference recipes carry their own NOTICE.
