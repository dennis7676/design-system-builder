# add-webfont-loading

## Why

Named font families (SUIT, NanumSquareRound, IBM Plex Sans KR, Cormorant
Garamond, …) currently render only where the font happens to be installed
locally. Per the 2026-07-03 user decision ("웹폰트 전부 포함") and the
styleguide-as-client-showcase positioning, generated surfaces must be
self-sufficient: a designer/planner opening demo.html or styleguide.html on
any machine sees the intended typography.

## What Changes

### Font source manifest (`src/font-sources.ts`)

A pinned, deterministic mapping from family name → source. Three kinds:

- `google`: css2 URL built as
  `https://fonts.googleapis.com/css2?family={Family+Name}:wght@{weights}&display=swap`
  where weights = sorted union of the document's `fontWeight` leaf values,
  always including 400 and 700 (deduped).
- `css-url`: fixed stylesheet URL (operator-verified 2026-07-03, HTTP 200 and
  declared `font-family` name matches the recipe's family string):
  - `SUIT` → `https://cdn.jsdelivr.net/gh/sun-typeface/SUIT@2/fonts/static/woff2/SUIT.css`
  - `NanumSquareRound` → `https://hangeul.pstatic.net/hangeul_static/css/nanum-square-round.css`
  - `Pretendard` → `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css`
  - `Pretendard Variable` → `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`
- `system`: explicit skip list — generics (`serif`, `sans-serif`, `monospace`,
  `ui-monospace`, `system-ui`, `-apple-system`) and OS fonts with no webfont
  (`Apple SD Gothic Neo`, `Cambria`, `Georgia`).

Google-served families across recipes/locales: Cormorant Garamond, DM Sans,
IBM Plex Mono, IBM Plex Sans, IBM Plex Sans KR, Inter, JetBrains Mono,
Lexend, Merriweather, Noto Serif KR, Nunito, Poppins, Public Sans,
Source Sans 3, Source Serif 4, Space Grotesk, Space Mono.

Every family name appearing in any recipe (base + locales) MUST be covered
by exactly one of the three kinds — a completeness golden enforces this so a
future recipe edit cannot silently ship an unloadable font.

### Surface wiring

- `collectWebfonts(doc)`: unique family names from all `fontFamily` leaves →
  resolved source list (order: document traversal order, deduped). Unknown
  family → include an HTML comment `<!-- webfont: no source for X -->`
  (no silent caps) and continue.
- **demo.html / styleguide.html**: `<link rel="preconnect">` (fonts.gstatic.com
  when any google source present) + one `<link rel="stylesheet">` per source
  in `<head>`.
- **CLI `build`**: writes `fonts.css` next to `tokens.css` containing one
  `@import url(...)` per source — the consumer-facing artifact (tokens.css
  itself stays import-free to avoid double-loading in host sites).

### Explicitly out of scope

- Self-hosted font downloading/subsetting.
- Video adapter loadFont codegen (full-M4; `fontAssets` guidance comment may
  mention the same sources).

## Impact

- **Modified**: `src/demo-generator.ts`, `src/demo-editorial.ts` (head only),
  `src/styleguide-generator.ts`, `src/cli.ts` (+fonts.css), goldens whose
  byte-pins include the head (skeleton demo hashes regenerate).
- **Added**: `src/font-sources.ts`, `golden/webfont.test.ts`.
- **Untouched**: keystone (surface-only change — token documents byte-identical),
  recipes, validator/contrast.
