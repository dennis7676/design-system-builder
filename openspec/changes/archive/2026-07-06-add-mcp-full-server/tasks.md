# tasks — add-mcp-full-server

- [x] 1.1 shared `defaultRecipesDir()` package-root resolver; wire into
      mcp-server RECIPES_DIR and cli `--recipes` default
- [x] 1.2 `dsb_generate` tool (tokens|tokensPath, outDir, force?) —
      same artifact bytes as CLI generate, readOnlyHint false,
      non-empty outDir refused without force
- [x] 1.3 `dsb_recipes` tool — catalog from loaded recipe directory
      (key, toneAnchor, skeleton, tier, principles)
- [x] 1.4 `dsb_suggest` tool — selectRecipe dry + suggestEdges +
      suggestMotifs, read-only
- [x] 1.5 `golden/mcp.test.ts`: roundtrips for the 3 new tools,
      generate byte-parity vs CLI, foreign-cwd test
- [x] 1.6 `npx tsc --noEmit` clean + `npm test` all green (report count)
- [x] 1.7 live JSON-RPC smoke: spawn server from $HOME, call
      dsb_recipes and a dsb_build dry-run
