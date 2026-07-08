/**
 * End-to-end check for the design-system-builder -> Remotion chain.
 *
 *   1. tokenHash parity: the committed src/tokens.ts header must carry the seal
 *      hash of the `creative-multiscale` recipe. If the token pipeline ever
 *      drifts, regenerating this example changes the header and this fails.
 *   2. render: bundle the composition and render one still frame. This exercises
 *      the whole import chain (tokens.ts + fonts.video.ts) through Remotion's
 *      webpack + a headless browser, and asserts a non-empty PNG is produced.
 *
 * Run: npm run e2e   (downloads Chrome Headless Shell on first run)
 */
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { readFileSync, statSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

// Seal of the `creative-multiscale` recipe (see golden/composite-b.test.ts).
const EXPECTED_TOKEN_HASH =
  "sha256:c8ff00bc84368173612274f130042a4f15e0c9a65fe9869ae18d6070c26275fc";

function assertTokenHashParity() {
  const tokensTs = readFileSync(path.join(here, "src/tokens.ts"), "utf8");
  const match = tokensTs.match(/tokenHash:\s*(sha256:[0-9a-f]{64})/);
  if (!match) throw new Error("tokenHash header not found in src/tokens.ts");
  const actual = match[1];
  if (actual !== EXPECTED_TOKEN_HASH) {
    throw new Error(
      `tokenHash parity FAILED\n  expected: ${EXPECTED_TOKEN_HASH}\n  actual:   ${actual}\n` +
        "Regenerate: build brand.json -> generate tokens.json -> copy tokens.ts/fonts.video.ts.",
    );
  }
  console.log(`[1/2] tokenHash parity OK: ${actual}`);
}

async function renderOneFrame() {
  const output = path.join(here, "out.png");
  rmSync(output, { force: true });
  const serveUrl = await bundle({ entryPoint: path.join(here, "src/index.ts") });
  const composition = await selectComposition({ serveUrl, id: "BrandCard" });
  await renderStill({ composition, serveUrl, output, frame: 30 });
  const { size } = statSync(output);
  if (size <= 0) throw new Error("renderStill produced an empty file");
  console.log(`[2/2] renderStill OK: out.png (${size} bytes, ${composition.width}x${composition.height})`);
}

assertTokenHashParity();
await renderOneFrame();
console.log("E2E PASSED");
