# add-mcp-full-server (C6/M6 — MCP main implementation)

## Why

Commercial track item 6 (user-approved 2026-07-06): the MCP spike proved
hash parity over dsb_build/dsb_validate; M6 publish needs the full
server so external agents can drive the whole pipeline (discover →
suggest → build → generate → validate) without the CLI. Publishing also
exposes a latent packaging bug: `RECIPES_DIR = "references/recipes"` is
cwd-relative, so an npm-installed server/CLI breaks outside the repo
root.

## Keystone judgments

1. **Package-root-relative recipes.** A single `defaultRecipesDir()`
   helper resolves `references/recipes` from the package root (via
   `import.meta.url`), used by both the MCP server and the CLI default
   (`--recipes` flag still overrides). `references/` already ships in
   package.json `files`.
2. **Tools mirror the CLI, no new core paths.** dsb_generate wraps the
   same generate path the CLI uses (artifact set = GENERATED_ARTIFACTS);
   dsb_suggest wraps selectRecipe + suggestEdges + suggestMotifs
   read-only (no build); dsb_recipes snapshots the loaded recipe
   directory. Core src/ modules stay untouched except the recipes-dir
   helper.
3. **Write tool is explicit.** dsb_generate is the only writing tool —
   `readOnlyHint: false`, requires `outDir`, refuses to overwrite an
   existing non-empty outDir unless `force: true` (loud, not silent).

## What Changes

- `src/mcp-server.ts`: three new tools —
  - `dsb_generate` `{tokens|tokensPath, outDir, force?}` → writes the
    GENERATED_ARTIFACTS set + tokens.json to outDir (same bytes as CLI
    generate), returns artifact paths + tokenHash.
  - `dsb_recipes` `{}` → recipe catalog: key, toneAnchor, skeleton,
    expression tier, philosophy principles (from the loaded recipe
    directory, not hand-copied).
  - `dsb_suggest` `{brand|brandPath}` → read-only concept-fit preview:
    selected recipe + conflicts (dry), suggestEdges, suggestMotifs.
- `src/mcp-server.ts` + `src/cli.ts`: recipes dir defaults to the
  package-root-resolved path (new shared helper, e.g. in index or a
  small module).
- `golden/mcp.test.ts` (extend): JSON-RPC roundtrips for the three new
  tools — dsb_generate byte-parity with CLI generate on the examples
  brand, dsb_recipes lists all 8 recipes, dsb_suggest returns the same
  selection as dsb_build dry-run; cwd-independence test (spawn server
  from a different cwd).

## Non-goals

- npm publish mechanics (separate packaging pass), playground hosting,
  interview flow over MCP, HTTP transport, auth.

## Impact

- **Modified**: `src/mcp-server.ts`, `src/cli.ts` (default only),
  `golden/mcp.test.ts`, possibly `src/index.ts` barrel.
- **Invariant**: build/generate/validate byte behavior unchanged; all
  existing goldens pass untouched (no token/contract bytes move).
