#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { loadTokens } from "./index.js";
import { validateTokens, type Finding } from "./validator.js";
import { validateBrand, type BrandFieldError, type BrandJson } from "./brand-schema.js";
import { RecipeSelectionError, loadRecipes, selectRecipe, type Conflict } from "./recipe-selection.js";
import { buildTokens } from "./tokens-builder.js";
import { canGenerate } from "./gate.js";
import type { TokensDocument } from "./tokens-schema.js";
import { GENERATED_ARTIFACTS } from "./contract.js";

const RECIPES_DIR = "references/recipes";

const buildInputSchema = z.object({
  brand: z.unknown().optional().describe("Inline brand.json object."),
  brandPath: z.unknown().optional().describe("Path to brand.json."),
  confirm: z.unknown().optional().describe("true maps to the CLI --confirm/userConfirmed gate."),
}).passthrough();

const validateInputSchema = z.object({
  tokens: z.unknown().optional().describe("Inline tokens.json object."),
  tokensPath: z.unknown().optional().describe("Path to tokens.json."),
}).passthrough();

interface BuildResult {
  readonly ok: boolean;
  readonly dryRun: boolean;
  readonly tokenHash?: string;
  readonly conflicts?: readonly Conflict[];
  readonly findings?: readonly Finding[];
  readonly tokens?: TokensDocument;
  readonly artifacts?: readonly string[];
  readonly error?: string;
}

interface ValidateResult {
  readonly ok: boolean;
  readonly findings?: readonly Finding[];
  readonly error?: string;
}

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "design-system-builder",
    version: "0.1.0",
  });

  server.registerTool(
    "dsb_build",
    {
      title: "Build Design Tokens",
      description: "Build a tokens.json document from a brand.json object or path using the same core path as the CLI.",
      inputSchema: buildInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => safeToolResult(() => dsbBuild(args)),
  );

  server.registerTool(
    "dsb_validate",
    {
      title: "Validate Design Tokens",
      description: "Validate a tokens.json object or path using the same validator as the CLI.",
      inputSchema: validateInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => safeToolResult(() => dsbValidate(args)),
  );

  return server;
}

function dsbBuild(args: z.infer<typeof buildInputSchema>): BuildResult {
  const brand = loadInlineOrPath<BrandJson>(args, "brand", "brandPath");
  const confirm = booleanArg(args.confirm, "confirm") ?? false;
  const dryRun = !confirm;
  const fieldErrors = validateBrand(brand);
  const recipes = loadRecipes(RECIPES_DIR);

  let selection: ReturnType<typeof selectRecipe>;
  try {
    selection = selectRecipe(brand, recipes);
  } catch (error) {
    if (error instanceof RecipeSelectionError) {
      return {
        ok: false,
        dryRun,
        conflicts: [error.conflict],
        error: `CONFLICT [${error.conflict.code}] ${error.conflict.message}`,
      };
    }
    throw error;
  }

  const gate = canGenerate({ brand, selection, userConfirmed: confirm });
  if (!gate.ok) {
    return {
      ok: false,
      dryRun,
      conflicts: [...selection.conflicts, ...brandErrorsAsConflicts(fieldErrors)],
      error: `export gate BLOCKED: ${gate.reasons.join("; ")}`,
    };
  }

  if (selection.recipe === null) {
    return {
      ok: false,
      dryRun,
      conflicts: selection.conflicts,
      error: "export gate BLOCKED: no recipe selected",
    };
  }

  const doc = buildTokens(brand, selection.recipe);
  const validation = validateTokens(doc);
  const errors = validation.findings.filter((finding) => finding.severity === "error");
  if (errors.length > 0) {
    return {
      ok: false,
      dryRun,
      tokenHash: validation.tokenHash,
      conflicts: selection.conflicts,
      findings: validation.findings,
      error: "built tokens.json failed validation",
    };
  }

  return {
    ok: true,
    dryRun,
    tokenHash: validation.tokenHash,
    conflicts: selection.conflicts,
    findings: validation.findings,
    tokens: doc,
    artifacts: ["tokens.json", ...GENERATED_ARTIFACTS],
  };
}

function dsbValidate(args: z.infer<typeof validateInputSchema>): ValidateResult {
  const tokens = loadInlineOrPath<TokensDocument>(args, "tokens", "tokensPath");
  const result = validateTokens(tokens);
  return {
    ok: result.ok,
    findings: result.findings,
  };
}

function safeToolResult(run: () => BuildResult | ValidateResult): CallToolResult {
  try {
    return jsonText(run());
  } catch (error) {
    return jsonText({ ok: false, error: errorMessage(error) });
  }
}

function jsonText(value: unknown): CallToolResult {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value),
      },
    ],
  };
}

function loadInlineOrPath<T>(
  args: Record<string, unknown>,
  inlineKey: string,
  pathKey: string,
): T {
  const hasInline = Object.prototype.hasOwnProperty.call(args, inlineKey);
  const hasPath = Object.prototype.hasOwnProperty.call(args, pathKey);
  if (hasInline === hasPath) {
    throw new Error(`expected exactly one of ${inlineKey} or ${pathKey}`);
  }

  if (hasPath) {
    const path = args[pathKey];
    if (typeof path !== "string" || path === "") {
      throw new Error(`${pathKey} must be a non-empty string`);
    }
    return (pathKey === "tokensPath"
      ? loadTokens(path)
      : JSON.parse(readFileSync(path, "utf8"))) as T;
  }

  const inline = args[inlineKey];
  if (inline === null || typeof inline !== "object" || Array.isArray(inline)) {
    throw new Error(`${inlineKey} must be an object`);
  }
  return inline as T;
}

function booleanArg(value: unknown, key: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
  return value;
}

function brandErrorsAsConflicts(errors: readonly BrandFieldError[]): Conflict[] {
  return errors.map((error) => ({
    code: "brand-field",
    message: `brand.${error.path}: ${error.message}`,
  }));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function main(): Promise<void> {
  const server = createMcpServer();
  await server.connect(new StdioServerTransport());
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  return entry !== undefined && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(entry));
}

if (isDirectRun()) {
  main().catch((error: unknown) => {
    console.error(errorMessage(error));
    process.exit(1);
  });
}
