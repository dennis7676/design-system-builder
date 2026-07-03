/**
 * Browser layout smoke for regressions string goldens cannot see.
 * It exists because two shipped defects required manual DOM probing: slide-frame
 * clipping in Korean and a zero-gap playground toolbar/stage regression.
 * Extend GAP_RULES with another container/above/below selector triple when a
 * new adjacency invariant needs permanent browser coverage.
 */
import { createServer, type Server } from "node:http";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { generateDemo } from "../src/demo-generator.js";
import { generateStyleguide } from "../src/styleguide-generator.js";
import type { BrandJson } from "../src/brand-schema.js";
import { loadRecipes, type Recipe } from "../src/recipe-selection.js";
import { buildTokens } from "../src/tokens-builder.js";

const VIEWPORT = { width: 1440, height: 2200 } as const;
const BROWSER_CHANNELS = ["chrome", "msedge", "chromium"] as const;
const LOCALES = ["en", "ko"] as const;
const GAP_RULES = [
  {
    name: "playground-toolbar-to-stage",
    container: ".playground",
    above: ".playground-toolbar",
    below: ".component-stage",
    minGap: 8,
  },
] as const;

type Locale = (typeof LOCALES)[number];
type GapRuleName = (typeof GAP_RULES)[number]["name"];
type PageBuild = { readonly recipe: Recipe; readonly locale: Locale; readonly route: string };
type FrameFailure = { readonly kind: "frame"; readonly frameClass: string; readonly overflowBottom: number; readonly overflowRight: number };
type GapFailure = { readonly kind: "gap"; readonly rule: GapRuleName; readonly gap: number; readonly minGap: number };
type ProbeFailure = FrameFailure | GapFailure;
type ProbeResult = { readonly page: string; readonly failures: readonly ProbeFailure[]; readonly skippedGapRules: readonly GapRuleName[] };
type StaticServer = { readonly server: Server; readonly port: number };

function brandFor(recipe: Recipe, locale: Locale): BrandJson {
  return {
    schemaVersion: "2026-06-30",
    product: { name: "Demo", medium: "web", ...(locale === "ko" ? { locales: ["ko"] } : {}) },
    branding: { tone_vector: recipe.toneAnchor },
  };
}

async function buildPages(root: string, recipes: readonly Recipe[]): Promise<readonly PageBuild[]> {
  const pages: PageBuild[] = [];
  for (const recipe of recipes) {
    for (const locale of LOCALES) {
      const route = `${recipe.key}/${locale}`;
      const pageDir = join(root, recipe.key, locale);
      const doc = buildTokens(brandFor(recipe, locale), recipe);
      await mkdir(pageDir, { recursive: true });
      await Promise.all([
        writeFile(join(pageDir, "styleguide.html"), generateStyleguide(doc), "utf8"),
        writeFile(join(pageDir, "demo.html"), generateDemo(doc), "utf8"),
      ]);
      pages.push({ recipe, locale, route });
    }
  }
  return pages;
}

function contentType(pathname: string): string {
  const types: Readonly<Record<string, string>> = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
  };
  return types[extname(pathname)] ?? "application/octet-stream";
}

function targetPath(root: string, requestUrl: string | undefined): string | null {
  const url = new URL(requestUrl ?? "/", "http://layout-probe.local");
  const pathname = decodeURIComponent(url.pathname);
  const candidate = resolve(root, `.${pathname}`);
  const rel = relative(root, candidate);
  if (rel.startsWith("..") || rel === "" || resolve(rel) === rel) return null;
  return candidate;
}

async function serveStatic(root: string): Promise<StaticServer> {
  const server = createServer((request, response) => {
    const filePath = targetPath(root, request.url);
    if (filePath === null) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    readFile(filePath)
      .then((body) => {
        response.writeHead(200, { "content-type": contentType(filePath) });
        response.end(body);
      })
      .catch((error: unknown) => {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
          response.writeHead(404).end("Not found");
          return;
        }
        response.writeHead(500).end("Server error");
      });
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectListen);
      resolveListen();
    });
  });
  const address = server.address();
  if (address === null || typeof address === "string") {
    server.close();
    throw new Error("layout probe server did not bind to a TCP port");
  }
  return { server, port: address.port };
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error !== undefined) {
        rejectClose(error);
        return;
      }
      resolveClose();
    });
  });
}

function formatPage(page: PageBuild): string {
  return `${page.recipe.key}/${page.locale}`;
}

function urlFor(port: number, page: PageBuild): string {
  return `http://127.0.0.1:${port}/${page.route}/styleguide.html`;
}

async function launchBrowser() {
  const { chromium } = await import("playwright-core");
  const errors: string[] = [];
  for (const channel of BROWSER_CHANNELS) {
    try {
      return await chromium.launch({ channel });
    } catch (error: unknown) {
      errors.push(`${channel}: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
    }
  }
  const message = `SKIP: no system browser (${errors.join("; ")})`;
  console.log(message);
  process.exit(process.env["LAYOUT_PROBE_STRICT"] === "1" ? 2 : 0);
}

async function probePage(browser: Awaited<ReturnType<typeof launchBrowser>>, port: number, pageBuild: PageBuild): Promise<ProbeResult> {
  const page = await browser.newPage({ viewport: VIEWPORT });
  try {
    await page.goto(urlFor(port, pageBuild), { waitUntil: "load" });
    await page.waitForSelector("#applications", { state: "attached" });
    const probe = await page.evaluate((rules) => {
      const frameFailures = Array.from(document.querySelectorAll("#applications .application-frame"))
        .map((frame): FrameFailure | null => {
          const frameStyle = getComputedStyle(frame);
          if (frameStyle.display === "none") return null;
          const frameRect = frame.getBoundingClientRect();
          let maxBottom = 0;
          let maxRight = 0;
          for (const child of Array.from(frame.querySelectorAll("*"))) {
            const childStyle = getComputedStyle(child);
            if (childStyle.display === "none") continue;
            const rects = child.getClientRects();
            if (rects.length === 0) continue;
            const rect = child.getBoundingClientRect();
            maxBottom = Math.max(maxBottom, rect.bottom - frameRect.top);
            maxRight = Math.max(maxRight, rect.right - frameRect.left);
          }
          const overflowBottom = maxBottom - frame.clientHeight;
          const overflowRight = maxRight - frame.clientWidth;
          if (overflowBottom <= 2 && overflowRight <= 2) return null;
          return {
            kind: "frame",
            frameClass: Array.from(frame.classList).join("."),
            overflowBottom,
            overflowRight,
          };
        })
        .filter((failure): failure is FrameFailure => failure !== null);

      const gapFailures: GapFailure[] = [];
      const skippedGapRules: GapRuleName[] = [];
      for (const rule of rules) {
        let matched = false;
        for (const container of Array.from(document.querySelectorAll(rule.container))) {
          const above = container.querySelector(rule.above);
          const below = container.querySelector(rule.below);
          if (above === null || below === null) continue;
          matched = true;
          const gap = below.getBoundingClientRect().top - above.getBoundingClientRect().bottom;
          if (gap < rule.minGap) {
            gapFailures.push({ kind: "gap", rule: rule.name, gap, minGap: rule.minGap });
          }
        }
        if (!matched) skippedGapRules.push(rule.name);
      }
      return { failures: [...frameFailures, ...gapFailures], skippedGapRules };
    }, GAP_RULES);
    return { page: formatPage(pageBuild), failures: probe.failures, skippedGapRules: probe.skippedGapRules };
  } finally {
    await page.close();
  }
}

function printResult(result: ProbeResult): void {
  if (result.failures.length === 0) {
    console.log(`${result.page} PASS`);
    return;
  }
  console.log(`${result.page} FAIL`);
  for (const failure of result.failures) {
    switch (failure.kind) {
      case "frame":
        console.log(`  frame .${failure.frameClass} overflow bottom=${failure.overflowBottom.toFixed(2)}px right=${failure.overflowRight.toFixed(2)}px`);
        break;
      case "gap":
        console.log(`  gap ${failure.rule} measured=${failure.gap.toFixed(2)}px min=${failure.minGap}px`);
        break;
    }
  }
}

async function main(): Promise<void> {
  const here = dirname(fileURLToPath(import.meta.url));
  const repoRoot = resolve(here, "..");
  const tempRoot = await mkdtemp(join(tmpdir(), "layout-probe-"));
  let staticServer: StaticServer | null = null;
  let browser: Awaited<ReturnType<typeof launchBrowser>> | null = null;
  try {
    const recipes = loadRecipes(join(repoRoot, "references/recipes"));
    const pages = await buildPages(tempRoot, recipes);
    staticServer = await serveStatic(tempRoot);
    browser = await launchBrowser();
    const results: ProbeResult[] = [];
    const loggedSkippedGapRules = new Set<GapRuleName>();
    for (const page of pages) {
      const result = await probePage(browser, staticServer.port, page);
      for (const skipped of result.skippedGapRules) {
        if (loggedSkippedGapRules.has(skipped)) continue;
        console.log(`WARN: gap rule ${skipped} matched nothing; skipping`);
        loggedSkippedGapRules.add(skipped);
      }
      printResult(result);
      results.push(result);
    }
    const failures = results.reduce((sum, result) => sum + result.failures.length, 0);
    console.log(`layout-probe: ${results.length} pages, ${failures} failures`);
    process.exitCode = failures === 0 ? 0 : 1;
  } finally {
    if (browser !== null) await browser.close();
    if (staticServer !== null) await closeServer(staticServer.server);
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error(String(error));
  }
  process.exitCode = 1;
});
