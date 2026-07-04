# add-mcp-spike

## Why

Commercial track item #1 (2026-07-04 Astryx benchmarking interview, user
decision "early spike"): in-house agents should consume DSB natively over
MCP instead of shelling out to the CLI. This spike ships the two
highest-value tools only — `dsb_build` and `dsb_validate` — to prove the
integration shape. The full server (interview/suggest/generate, packaging,
auth) ships with M6.

## What Changes

### MCP server (`src/mcp-server.ts`, new)

- stdio server on `@modelcontextprotocol/sdk` (official TS SDK, already
  installed as a dependency by the operator).
- Reuses the exact same core functions the CLI calls — zero new business
  logic, zero core edits. The server is a thin protocol adapter.
- npm script: `"mcp": "tsx src/mcp-server.ts"`.

### Tools

1. **`dsb_build`** — input: `{ brand: object }` (inline brand.json value) or
   `{ brandPath: string }`, optional `{ confirm?: boolean }` (default
   false → dry-run, mirroring the CLI's export gate; the gate itself is
   NOT bypassed — `confirm: true` maps to the same `userConfirmed` path).
   Output (structured JSON text): `{ ok, tokenHash?, conflicts?, findings?,
   tokens? }` — tokens included only on success to keep payloads bounded.
2. **`dsb_validate`** — input: `{ tokens: object }` or
   `{ tokensPath: string }`. Output: `{ ok, findings }` with severity levels
   exactly as the CLI validator reports them.

Error shape: never throw across the protocol — tool results carry
`{ ok: false, error }` with the same messages the CLI prints.

### Determinism

Same inputs ⇒ same outputs (tokenHash equality). The server adds no
timestamps or randomness of its own; `generatedAt` handling stays exactly
as the core build path defines it.

### Tests

`golden/mcp.test.ts`: spawn the server as a child process, drive a real
JSON-RPC handshake over stdio (initialize → tools/list → tools/call), and
assert: both tools listed with schemas; `dsb_build` on the golden sample
brand returns the known tokenHash; `dsb_validate` on a corrupted document
returns the expected finding; malformed input returns `ok: false` without
killing the server.

## Non-goals

- interview/suggestEdges/generate tools, HTTP/SSE transport, packaging,
  publishing, auth — M6.
- Any change to core build/validate behaviour.

## Impact

- **Added**: `src/mcp-server.ts`, `golden/mcp.test.ts`.
- **Modified**: `package.json` (script + dependency), README (short
  "MCP" subsection: how to register the server in an MCP client).
- **Untouched**: all core modules, recipes, goldens, keystone.
