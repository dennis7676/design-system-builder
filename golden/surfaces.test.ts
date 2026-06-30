import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkManifest,
  computeTokenHash,
  generateDesignMd,
  generateStyleguide,
  toCssVars,
} from "../src/index.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const SAMPLE = JSON.parse(
  readFileSync(join(here, "sample.tokens.json"), "utf8"),
) as TokensDocument;

const clone = (): TokensDocument => structuredClone(SAMPLE);
const surfacesFor = (doc: TokensDocument) => ({
  styleguideHtml: generateStyleguide(doc),
  designMd: generateDesignMd(doc),
});
const errors = (doc: TokensDocument, surfaces = surfacesFor(doc)) =>
  checkManifest(doc, surfaces).filter((f) => f.severity === "error");

describe("P3 — CSS adapter", () => {
  it("G7 emits deterministic :root variables for semantic tokens", () => {
    const css = toCssVars(SAMPLE);

    expect(css.startsWith(":root {\n")).toBe(true);
    expect(css).toContain("--semantic-color-primary-default: oklch(0.48 0.13 255);");
    expect(css).toContain("--semantic-space-inset: 1.5rem;");
  });
});

describe("P4 — surface generators and manifest", () => {
  it("G8 emits minimally valid self-contained HTML with token snapshot", () => {
    const html = generateStyleguide(SAMPLE);

    expect(html.toLowerCase().startsWith("<!doctype html>")).toBe(true);
    expect(html).toMatch(/<html\b[\s\S]*<\/html>/i);
    expect(html).toContain('<script id="token-snapshot" type="application/json">');
    expect((html.match(/<section\b/g) ?? []).length).toBe(
      (html.match(/<\/section>/g) ?? []).length,
    );
  });

  it("G10 reports styleguide manifest drift", () => {
    const built = surfacesFor(SAMPLE);
    const stale = {
      ...built,
      styleguideHtml: built.styleguideHtml.replace(computeTokenHash(SAMPLE), "sha256:stale"),
    };

    expect(errors(SAMPLE, stale)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "manifest-drift",
          meta: expect.objectContaining({ surface: "styleguide" }),
        }),
      ]),
    );
  });

  it("G18 reports DESIGN.md manifest drift", () => {
    const built = surfacesFor(SAMPLE);
    const stale = {
      ...built,
      designMd: built.designMd.replace(computeTokenHash(SAMPLE), "sha256:stale"),
    };

    expect(errors(SAMPLE, stale)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "manifest-drift",
          meta: expect.objectContaining({ surface: "DESIGN.md" }),
        }),
      ]),
    );
  });

  it("baseline generated surfaces satisfy all manifest gates", () => {
    expect(errors(SAMPLE)).toEqual([]);
  });

  it("G20 reports a missing required surface element", () => {
    const built = surfacesFor(SAMPLE);
    const incomplete = {
      ...built,
      styleguideHtml: built.styleguideHtml.replace(
        /<section id="colors"[\s\S]*?<\/section>/,
        "",
      ),
    };

    expect(errors(SAMPLE, incomplete)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "surface-incomplete",
          meta: expect.objectContaining({ surface: "styleguide", element: "colors" }),
        }),
      ]),
    );
  });

  it("G21 requires every contrastPair result row but allows recorded failures", () => {
    const doc = clone();
    const built = surfacesFor(doc);
    const missingRow = {
      ...built,
      designMd: built.designMd.replace(
        /\| semantic\.color\.primary\.foreground \| semantic\.color\.primary\.hover \| text \| hover \| [^|]+ \| [^|]+ \| (PASS|FAIL) \|\n/,
        "",
      ),
    };

    expect(errors(doc, missingRow)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "a11y-record",
          meta: expect.objectContaining({ surface: "DESIGN.md" }),
        }),
      ]),
    );

    (doc.primitive.color.neutral as Record<string, { $value: string }>)["50"] = {
      ...doc.primitive.color.neutral["50"],
      $value: "oklch(0.55 0 0)",
    };
    expect(errors(doc)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "a11y-record" })]),
    );
  });

  it("G23 requires motion-reduce records when motion tokens exist", () => {
    const built = surfacesFor(SAMPLE);
    const missingReduce = {
      ...built,
      styleguideHtml: built.styleguideHtml.replace(
        /@media \(prefers-reduced-motion: reduce\) \{[\s\S]*?\n    \}/,
        "",
      ),
    };

    expect(errors(SAMPLE, missingReduce)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "motion-reduce-missing" }),
      ]),
    );
    expect(errors(SAMPLE)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "motion-reduce-missing" })]),
    );
  });
});
