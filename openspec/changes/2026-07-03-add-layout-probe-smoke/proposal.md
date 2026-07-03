# add-layout-probe-smoke — 브라우저 레이아웃 스모크 상설화

## Why

String goldens run in node and cannot see layout. Two defect classes shipped
this week were only caught by an ad-hoc browser DOM probe during manual QA:
slide-frame clipping (KO) and playground toolbar/stage zero-gap (`89b18c0`).
Permanentize that probe as a standing smoke script so this class of
regression is machine-detected (roadmap "layout-probe smoke", 2026-07-03).

## Scope

One script + one npm script + one devDependency. No changes to generators,
tokens, goldens, or `npm test` behavior.

## Deliverables

### `scripts/layout-probe.ts` (run via `npm run probe:layout` → `tsx`)

1. **Build matrix in-process** (no CLI shelling): for EVERY recipe in
   `references/recipes/` × locales `[en, ko]` (ko via
   `product.locales: ["ko"]`), construct a minimal BrandJson exactly like
   `golden/applications.test.ts` does (`recipe.toneAnchor`,
   `schemaVersion: "2026-06-30"`), `buildTokens`, then generate
   `styleguide.html` + `demo.html` (demo needed for the website iframe) into
   a per-page temp dir under the OS temp directory (clean up on exit).
2. **Serve** the temp dir with an in-process `node:http` static server on an
   ephemeral port (`file://` is not equivalent — keep http).
3. **Probe** each page with playwright-core:
   - Launch via system browser channels, first that works of
     `["chrome", "msedge", "chromium"]` (playwright-core devDependency —
     no browser download). If none launches: print a clear
     `SKIP: no system browser` message and `process.exit(0)`, unless
     `LAYOUT_PROBE_STRICT=1` → exit 2. (Graceful-fallback house rule.)
   - Viewport 1440×2200, `page.goto(<page>/styleguide.html)`, wait for
     `#applications` present.
   - **Assertion A — frame containment**: for every
     `#applications .application-frame`, computed over all descendants:
     `max(rect.bottom) - frame.clientHeight <= 2` and
     `max(rect.right) - frame.clientWidth <= 2` (rects relative to frame;
     ignore elements with `display:none`).
   - **Assertion B — adjacency gaps**: data-driven `GAP_RULES` table,
     initially:
     `{ container: ".playground", above: ".playground-toolbar", below: ".component-stage", minGap: 8 }`.
     Assert `below.rect.top - above.rect.bottom >= minGap`. Table must be
     trivially extensible (array of rules; a rule whose selectors match
     nothing on a page is skipped, but log it once).
4. **Report**: one line per page `recipe/locale PASS` or detailed FAIL rows
   (frame class, overflow px / measured gap). Non-zero exit (1) if any page
   fails. Summary line `layout-probe: N pages, M failures`.

### Wiring

- `package.json`: `"probe:layout": "tsx scripts/layout-probe.ts"`, add
  `playwright-core` to devDependencies (pin ^, no `@playwright/test`).
- Do NOT add it to `npm test` (string goldens stay browser-free).
- Header comment in the script: what it catches, why it exists (2 shipped
  defects), how to extend GAP_RULES.

## Invariants

- Deterministic inputs: brand.json built from recipe toneAnchor only; no
  Date/random in assertions.
- No repo-tracked temp output; temp dirs under `os.tmpdir()`, removed after.
- TypeScript strict-clean (`npx tsc --noEmit` passes); plain TS, tsx-runnable.
- Suite untouched: `npm test` remains 283 green.

## Acceptance (operator will verify)

1. `npm run probe:layout` → 16 pages (8 recipes × en/ko), all PASS, exit 0.
2. Regression re-injection: removing `margin-top` from `.component-stage`
   in the styleguide CSS makes the probe FAIL on assertion B (operator will
   test this manually; do not commit such a change).
3. `npm test` 283 green; `npx tsc --noEmit` clean.
