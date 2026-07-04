# add-mcp-spike — tasks

- [x] 1. `src/mcp-server.ts`: stdio server via @modelcontextprotocol/sdk —
      register dsb_build / dsb_validate with zod (or JSON-schema) input
      schemas; thin adapter over the same core functions cli.ts uses
      (import from src modules, do NOT re-implement or edit core).
- [x] 2. dsb_build: brand | brandPath input, confirm?: boolean (default
      false = dry-run, maps to the existing userConfirmed path without
      weakening it). Result JSON: { ok, dryRun, tokenHash?, conflicts?,
      findings?, tokens? (success only) }.
- [x] 3. dsb_validate: tokens | tokensPath input. Result: { ok, findings }
      with validator severities/messages verbatim.
- [x] 4. Error containment: all tool handlers catch and return
      { ok: false, error } — the process must survive malformed input.
- [x] 5. package.json: "mcp" script. README: short MCP subsection with a
      client registration example (command: npx tsx src/mcp-server.ts).
- [x] 6. `golden/mcp.test.ts`: child-process spawn + real JSON-RPC over
      stdio — initialize, tools/list (exactly 2 tools), dsb_build golden
      hash equality vs CLI path, dsb_validate injected-violation finding,
      malformed-input survival (subsequent call succeeds).
- [x] 7. `npm test` all green (299 existing untouched + new), `npx tsc
      --noEmit` clean. No core module diffs.
