# examples

End-to-end demos of the full pipeline. Only `brand.json` (the confirmed input)
is tracked — `tokens.json` and the web surfaces are **derived** and gitignored,
matching the project's "intent SSOT, derived artifacts regenerated" ethos.

| Example | Tone → recipe | Notes |
|---------|---------------|-------|
| `atlas/` | data-dense / serious / classic → **enterprise** | `constraints:["dense-data"]` hard-filters to enterprise |
| `crystal-ball/` | minimal / modern / cutting-edge → **minimal-tech** | warm/feminine accent is a deferred `visual.accent` override (M3) |

## Regenerate (run from repo root)

```sh
npm run build
node dist/cli.js build examples/atlas/brand.json --out examples/atlas/tokens.json --confirm
node dist/cli.js generate examples/atlas/tokens.json --out-dir examples/atlas
node dist/cli.js validate examples/atlas/tokens.json --check-manifest   # → export gate PASS
open examples/atlas/styleguide.html
```

Same `brand.json` → byte-identical `tokens.json` (fixed `generatedAt` sentinel).
