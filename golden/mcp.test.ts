import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { TokensDocument } from "../src/tokens-schema.js";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const requestTimeoutMs = 30_000;

interface JsonRpcResponse {
  readonly jsonrpc: "2.0";
  readonly id: number;
  readonly result?: unknown;
  readonly error?: { readonly code: number; readonly message: string; readonly data?: unknown };
}

interface ToolCallResponse {
  readonly content: readonly [{ readonly type: "text"; readonly text: string }];
  readonly isError?: boolean;
}

interface ToolListResponse {
  readonly tools: readonly {
    readonly name: string;
    readonly inputSchema?: unknown;
  }[];
}

class StdioRpcClient {
  private nextId = 1;
  private stdout = "";
  private stderr = "";
  private readonly pending = new Map<number, {
    readonly resolve: (value: JsonRpcResponse) => void;
    readonly reject: (error: Error) => void;
    readonly timeout: NodeJS.Timeout;
  }>();

  constructor(readonly child: ChildProcessWithoutNullStreams) {
    child.stdout.on("data", (chunk: Buffer) => this.onStdout(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      this.stderr += chunk.toString("utf8");
    });
    child.on("exit", (code, signal) => {
      const error = new Error(`MCP server exited code=${String(code)} signal=${String(signal)} stderr=${this.stderr}`);
      for (const [id, pending] of this.pending) {
        clearTimeout(pending.timeout);
        pending.reject(error);
        this.pending.delete(id);
      }
    });
  }

  async request(method: string, params?: unknown): Promise<JsonRpcResponse> {
    const id = this.nextId++;
    const response = new Promise<JsonRpcResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`timeout waiting for ${method}; stderr=${this.stderr}`));
      }, requestTimeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
    });
    this.write({ jsonrpc: "2.0", id, method, ...(params === undefined ? {} : { params }) });
    return response;
  }

  notify(method: string, params?: unknown): void {
    this.write({ jsonrpc: "2.0", method, ...(params === undefined ? {} : { params }) });
  }

  close(): void {
    if (this.child.exitCode === null) this.child.kill();
  }

  private write(message: unknown): void {
    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private onStdout(chunk: Buffer): void {
    this.stdout += chunk.toString("utf8");
    for (;;) {
      const newline = this.stdout.indexOf("\n");
      if (newline === -1) return;
      const line = this.stdout.slice(0, newline).replace(/\r$/, "");
      this.stdout = this.stdout.slice(newline + 1);
      if (line === "") continue;
      const message = JSON.parse(line) as JsonRpcResponse;
      if (typeof message.id !== "number") continue;
      const pending = this.pending.get(message.id);
      if (pending === undefined) continue;
      clearTimeout(pending.timeout);
      this.pending.delete(message.id);
      pending.resolve(message);
    }
  }
}

describe("MCP stdio server", () => {
  let client: StdioRpcClient;

  beforeAll(async () => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/mcp-server.ts"], {
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
    client = new StdioRpcClient(child);
    const initialized = await client.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "vitest", version: "0.0.0" },
    });
    expect(initialized.error).toBeUndefined();
    client.notify("notifications/initialized");
  }, requestTimeoutMs);

  afterAll(() => {
    client.close();
  });

  it("lists exactly dsb_build and dsb_validate with input schemas", async () => {
    const response = await client.request("tools/list");
    expect(response.error).toBeUndefined();
    const result = response.result as ToolListResponse;
    expect(result.tools.map((tool) => tool.name).sort()).toEqual(["dsb_build", "dsb_validate"]);
    for (const tool of result.tools) expect(tool.inputSchema).toBeDefined();
  }, requestTimeoutMs);

  it("builds the golden brand with the same tokenHash as the CLI path", async () => {
    const cli = await runCli(["src/cli.ts", "build", "golden/sample.brand.json", "--confirm"]);
    expect(cli.code, cli.stderr).toBe(0);
    const expectedHash = cli.stderr.match(/tokenHash: (sha256:[a-f0-9]+)/)?.[1];
    expect(expectedHash).toBeDefined();

    const response = await callTool("dsb_build", { brandPath: "golden/sample.brand.json", confirm: true });
    const result = jsonToolResult<{ ok: boolean; dryRun: boolean; tokenHash?: string; tokens?: unknown }>(response);
    expect(result.ok).toBe(true);
    expect(result.dryRun).toBe(false);
    expect(result.tokenHash).toBe(expectedHash);
    expect(result.tokens).toBeDefined();
  }, requestTimeoutMs);

  it("defaults dsb_build to a dry-run through the unconfirmed export gate", async () => {
    const response = await callTool("dsb_build", { brandPath: "golden/sample.brand.json" });
    const result = jsonToolResult<{ ok: boolean; dryRun: boolean; error?: string; tokens?: unknown }>(response);
    expect(result.ok).toBe(false);
    expect(result.dryRun).toBe(true);
    expect(result.error).toContain("user has not confirmed");
    expect(result.tokens).toBeUndefined();
  }, requestTimeoutMs);

  it("returns the validator finding for an injected violation", async () => {
    const tokens = corruptedTokens();
    const dir = mkdtempSync(join(tmpdir(), "dsb-mcp-"));
    const tokensPath = join(dir, "tokens.json");
    try {
      writeFileSync(tokensPath, `${JSON.stringify(tokens, null, 2)}\n`);
      const cli = await runCli(["src/cli.ts", "validate", tokensPath]);
      expect(cli.code).toBe(1);
      expect(cli.stderr).toContain("[contrast-fail]");

      const response = await callTool("dsb_validate", { tokens });
      const result = jsonToolResult<{ ok: boolean; findings: readonly { code: string; severity: string; message: string }[] }>(response);
      expect(result.ok).toBe(false);
      expect(result.findings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: "contrast-fail",
            severity: "error",
          }),
        ]),
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }, requestTimeoutMs);

  it("contains malformed input errors and keeps serving subsequent tool calls", async () => {
    const bad = await callTool("dsb_build", {});
    const badResult = jsonToolResult<{ ok: boolean; error?: string }>(bad);
    expect(badResult.ok).toBe(false);
    expect(badResult.error).toContain("expected exactly one of brand or brandPath");
    expect(client.child.exitCode).toBeNull();

    const good = await callTool("dsb_validate", { tokensPath: "golden/sample.tokens.json" });
    const goodResult = jsonToolResult<{ ok: boolean; findings: readonly unknown[] }>(good);
    expect(goodResult.ok).toBe(true);
    expect(goodResult.findings).toEqual(expect.any(Array));
  }, requestTimeoutMs);

  async function callTool(name: string, args: unknown): Promise<ToolCallResponse> {
    const response = await client.request("tools/call", { name, arguments: args });
    expect(response.error).toBeUndefined();
    return response.result as ToolCallResponse;
  }
});

function jsonToolResult<T>(response: ToolCallResponse): T {
  expect(response.isError).not.toBe(true);
  expect(response.content[0].type).toBe("text");
  return JSON.parse(response.content[0].text) as T;
}

function corruptedTokens(): TokensDocument {
  const tokens = JSON.parse(readFileSync(join(root, "golden/sample.tokens.json"), "utf8")) as TokensDocument;
  ((tokens.primitive.color as Record<string, unknown>).neutral as Record<string, Record<string, unknown>>)["50"].$value = "oklch(0.55 0 0)";
  return tokens;
}

function runCli(args: readonly string[]): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--import", "tsx", ...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error(`timeout running CLI ${args.join(" ")}`));
    }, requestTimeoutMs);
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve({ code, stdout, stderr });
    });
  });
}
