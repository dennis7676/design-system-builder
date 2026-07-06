#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { loadTokens } from "./index.js";
import { validateTokens, type Finding } from "./validator.js";
import { EXPRESSION_TIERS, validateBrand, type BrandFieldError, type BrandJson, type ExpressionTier } from "./brand-schema.js";
import { RecipeSelectionError, loadRecipes, selectRecipe, type Conflict, type Recipe } from "./recipe-selection.js";
import { buildTokens } from "./tokens-builder.js";
import { canGenerate } from "./gate.js";
import type { TokensDocument } from "./tokens-schema.js";
import { GENERATED_ARTIFACTS } from "./contract.js";
import { suggestEdges, type EdgeSuggestion } from "./edge-point.js";
import { suggestMotifs, type MotifSuggestion } from "./motif.js";
import { buildGeneratedArtifacts, writeGeneratedArtifacts } from "./cli.js";
import { defaultRecipesDir } from "./package-paths.js";

const RECIPES_DIR = defaultRecipesDir();

const buildInputSchema = z.object({
  brand: z.unknown().optional().describe("Inline brand.json object."),
  brandPath: z.unknown().optional().describe("Path to brand.json."),
  confirm: z.unknown().optional().describe("true maps to the CLI --confirm/userConfirmed gate."),
}).passthrough();

const validateInputSchema = z.object({
  tokens: z.unknown().optional().describe("Inline tokens.json object."),
  tokensPath: z.unknown().optional().describe("Path to tokens.json."),
}).passthrough();

const generateInputSchema = z.object({
  tokens: z.unknown().optional().describe("Inline tokens.json object."),
  tokensPath: z.unknown().optional().describe("Path to tokens.json."),
  outDir: z.unknown().describe("Directory where generated artifacts should be written."),
  force: z.unknown().optional().describe("Allow writing into an existing non-empty outDir."),
}).passthrough();

const recipesInputSchema = z.object({}).passthrough();

const suggestInputSchema = z.object({
  brand: z.unknown().optional().describe("Inline brand.json object."),
  brandPath: z.unknown().optional().describe("Path to brand.json."),
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

interface GenerateResult {
  readonly ok: boolean;
  readonly tokenHash?: string;
  readonly artifacts?: readonly string[];
  readonly error?: string;
}

interface RecipeCatalogEntry {
  readonly key: string;
  readonly toneAnchor: Recipe["toneAnchor"];
  readonly skeleton: Recipe["skeleton"] | null;
  readonly tier: "balanced";
  readonly expressionTiers: readonly ExpressionTier[];
  readonly principles: readonly string[];
}

interface RecipesResult {
  readonly ok: boolean;
  readonly recipes?: readonly RecipeCatalogEntry[];
  readonly error?: string;
}

interface SuggestResult {
  readonly ok: boolean;
  readonly dryRun: true;
  readonly recipeKey?: string | null;
  readonly recipe?: RecipeCatalogEntry | null;
  readonly candidates?: readonly string[];
  readonly distances?: ReadonlyArray<{ key: string; distance: number }>;
  readonly conflicts?: readonly Conflict[];
  readonly edges?: readonly EdgeSuggestion[];
  readonly motifs?: readonly MotifSuggestion[];
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
    "dsb_recipes",
    {
      title: "List Design Recipes",
      description: "Return the loaded design recipe catalog.",
      inputSchema: recipesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => safeToolResult(() => dsbRecipes(args)),
  );

  server.registerTool(
    "dsb_suggest",
    {
      title: "Suggest Design Direction",
      description: "Preview recipe selection, conflicts, edge suggestions, and motif suggestions without writing files.",
      inputSchema: suggestInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (args) => safeToolResult(() => dsbSuggest(args)),
  );

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
    "dsb_generate",
    {
      title: "Generate Design Artifacts",
      description: "Write generated artifacts from tokens.json using the same generation path as the CLI.",
      inputSchema: generateInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async (args) => safeToolResult(() => dsbGenerate(args)),
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

function dsbRecipes(_args: z.infer<typeof recipesInputSchema>): RecipesResult {
  return {
    ok: true,
    recipes: loadRecipes(RECIPES_DIR).map(recipeCatalogEntry),
  };
}

function dsbSuggest(args: z.infer<typeof suggestInputSchema>): SuggestResult {
  const brand = loadInlineOrPath<BrandJson>(args, "brand", "brandPath");
  const fieldErrors = validateBrand(brand);
  const recipes = loadRecipes(RECIPES_DIR);

  let selection: ReturnType<typeof selectRecipe>;
  try {
    selection = selectRecipe(brand, recipes);
  } catch (error) {
    if (error instanceof RecipeSelectionError) {
      return {
        ok: false,
        dryRun: true,
        recipeKey: null,
        recipe: null,
        conflicts: [error.conflict, ...brandErrorsAsConflicts(fieldErrors)],
        edges: [],
        motifs: [],
        error: `CONFLICT [${error.conflict.code}] ${error.conflict.message}`,
      };
    }
    throw error;
  }

  const conflicts = [...selection.conflicts, ...brandErrorsAsConflicts(fieldErrors)];
  if (selection.recipe === null) {
    return {
      ok: false,
      dryRun: true,
      recipeKey: null,
      recipe: null,
      candidates: selection.candidates,
      distances: selection.distances,
      conflicts,
      edges: [],
      motifs: [],
      error: "no recipe selected",
    };
  }

  return {
    ok: conflicts.length === 0,
    dryRun: true,
    recipeKey: selection.recipeKey,
    recipe: recipeCatalogEntry(selection.recipe),
    candidates: selection.candidates,
    distances: selection.distances,
    conflicts,
    edges: suggestEdges(brand, selection.recipe),
    motifs: suggestMotifs(brand, selection.recipe),
  };
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

function dsbGenerate(args: z.infer<typeof generateInputSchema>): GenerateResult {
  const outDir = stringArg(args.outDir, "outDir");
  const force = booleanArg(args.force, "force") ?? false;
  assertWritableOutDir(outDir, force);

  const { doc, sourceText } = loadTokensForGenerate(args);
  writeGeneratedArtifacts(outDir, buildGeneratedArtifacts(doc));
  writeFileSync(join(outDir, "tokens.json"), sourceText);
  const validation = validateTokens(doc);
  return {
    ok: true,
    tokenHash: validation.tokenHash,
    artifacts: ["tokens.json", ...GENERATED_ARTIFACTS].map((artifact) => join(outDir, artifact)),
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

type ToolResult = BuildResult | GenerateResult | RecipesResult | SuggestResult | ValidateResult;

function safeToolResult(run: () => ToolResult): CallToolResult {
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

function loadTokensForGenerate(args: Record<string, unknown>): { readonly doc: TokensDocument; readonly sourceText: string } {
  const hasInline = Object.prototype.hasOwnProperty.call(args, "tokens");
  const hasPath = Object.prototype.hasOwnProperty.call(args, "tokensPath");
  if (hasInline === hasPath) {
    throw new Error("expected exactly one of tokens or tokensPath");
  }

  if (hasPath) {
    const path = args.tokensPath;
    if (typeof path !== "string" || path === "") {
      throw new Error("tokensPath must be a non-empty string");
    }
    const sourceText = readFileSync(path, "utf8");
    return {
      doc: JSON.parse(sourceText) as TokensDocument,
      sourceText,
    };
  }

  const inline = args.tokens;
  if (inline === null || typeof inline !== "object" || Array.isArray(inline)) {
    throw new Error("tokens must be an object");
  }
  return {
    doc: inline as TokensDocument,
    sourceText: `${JSON.stringify(inline, null, 2)}\n`,
  };
}

function stringArg(value: unknown, key: string): string {
  if (typeof value !== "string" || value === "") {
    throw new Error(`${key} must be a non-empty string`);
  }
  return value;
}

function booleanArg(value: unknown, key: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
  return value;
}

function assertWritableOutDir(outDir: string, force: boolean): void {
  if (!existsSync(outDir)) return;

  const stat = statSync(outDir);
  if (!stat.isDirectory()) {
    throw new Error(`outDir exists and is not a directory: ${outDir}`);
  }
  if (!force && readdirSync(outDir).length > 0) {
    throw new Error(`outDir is non-empty; pass force:true to overwrite generated artifacts: ${outDir}`);
  }
}

function recipeCatalogEntry(recipe: Recipe): RecipeCatalogEntry {
  return {
    key: recipe.key,
    toneAnchor: recipe.toneAnchor,
    skeleton: recipe.skeleton ?? null,
    tier: "balanced",
    expressionTiers: [...EXPRESSION_TIERS],
    principles: recipePrinciples(recipe),
  };
}

function recipePrinciples(recipe: Recipe): readonly string[] {
  const philosophy = recipe.philosophy;
  if (!isRecord(philosophy)) return [];
  const principles = philosophy.principles;
  return Array.isArray(principles)
    ? principles.filter((principle): principle is string => typeof principle === "string")
    : [];
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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
