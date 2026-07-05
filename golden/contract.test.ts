import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_P1_REGISTRY,
  COMPONENT_P2_COMPOSITES,
  COMPONENT_P2_ROLLOUT,
  buildContractJson,
  checkManifest,
  computeTokenHash,
  generateDemo,
  generateDesignMd,
  generateStyleguide,
  GATE_CATALOG,
} from "../src/index.js";
import { EXPORT_GATE_CODES } from "../src/gate.js";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const SAMPLE = JSON.parse(readFileSync(join(here, "sample.tokens.json"), "utf8")) as TokensDocument;
const CONTRACT_SHA256 = "f9effee80fbcc16ee319a40ee49bcd9c6690f6715df1f47db1990506a91e74f5";

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex");

function surfacesFor(doc: TokensDocument) {
  return {
    styleguideHtml: generateStyleguide(doc),
    designMd: generateDesignMd(doc),
    demoHtml: generateDemo(doc),
    contractJson: buildContractJson(doc),
  };
}

describe("usage contract", () => {
  it("pins the keystone contract.json bytes", () => {
    expect(sha256(buildContractJson(SAMPLE))).toBe(CONTRACT_SHA256);
  });

  it("emits deterministic bytes and embeds the token hash", () => {
    const first = buildContractJson(SAMPLE);
    const second = buildContractJson(structuredClone(SAMPLE));
    expect(second).toBe(first);
    expect(JSON.parse(first)).toEqual(
      expect.objectContaining({ builtFromTokenHash: computeTokenHash(SAMPLE) }),
    );
  });

  it("keeps the gate catalog in parity with validator, manifest, and export gates", () => {
    const actual = new Set([
      ...sourceCodes("src/validator.ts"),
      ...sourceCodes("src/manifest.ts"),
      ...EXPORT_GATE_CODES,
    ]);
    expect(Object.keys(GATE_CATALOG).sort()).toEqual([...actual].sort());
  });

  it("derives the component registry snapshot from the component registries", () => {
    const contract = JSON.parse(buildContractJson(SAMPLE)) as {
      readonly components: {
        readonly registry: ReadonlyArray<{ readonly name: string }>;
        readonly p2RolloutRecipes: readonly string[];
        readonly composites: ReadonlyArray<{ readonly name: string }>;
      };
    };
    expect(contract.components.registry.map((entry) => entry.name)).toEqual(
      COMPONENT_P1_REGISTRY.map((entry) => entry.name),
    );
    expect(contract.components.p2RolloutRecipes).toEqual([...COMPONENT_P2_ROLLOUT]);
    expect(contract.components.composites.map((entry) => entry.name)).toEqual(
      COMPONENT_P2_COMPOSITES.map((entry) => entry.name),
    );
  });

  it("manifest drift catches a stale contract hash", () => {
    const built = surfacesFor(SAMPLE);
    const stale = {
      ...built,
      contractJson: built.contractJson.replace(computeTokenHash(SAMPLE), "sha256:stale"),
    };
    expect(checkManifest(SAMPLE, stale)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "manifest-drift",
          meta: expect.objectContaining({ surface: "contract.json" }),
        }),
      ]),
    );
  });
});

function sourceCodes(path: string): readonly string[] {
  const source = readFileSync(join(root, path), "utf8");
  return [...source.matchAll(/\bcode:\s*"([^"]+)"/g)].map((match) => match[1]!);
}
