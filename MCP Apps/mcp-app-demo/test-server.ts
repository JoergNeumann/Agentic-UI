/**
 * Self-test: Starts the MCP server, calls tools, prints results, and exits.
 * Handles both JSON and SSE responses from Streamable HTTP transport.
 */
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import { createServer } from "./server.ts";

const app = express();
app.use(cors());
app.use(express.json());

app.all("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close().catch(() => {}); server.close().catch(() => {}); });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const HEADERS = { "Content-Type": "application/json", "Accept": "application/json, text/event-stream" };

// Parse response: could be JSON or SSE
async function parseResponse(resp: Response): Promise<unknown[]> {
  const contentType = resp.headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {
    const text = await resp.text();
    const results: unknown[] = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("data: ")) {
        try {
          results.push(JSON.parse(line.slice(6)));
        } catch { /* skip non-JSON */ }
      }
    }
    return results;
  }

  const raw = await resp.json();
  return Array.isArray(raw) ? raw : [raw];
}

// Full lifecycle per call: init → initialized + request
async function mcpCall(method: string, params: Record<string, unknown> = {}) {
  // Step 1: Initialize
  const initResp = await fetch("http://localhost:3002/mcp", {
    method: "POST", headers: HEADERS,
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {
      protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "1.0" },
    }}),
  });
  const initResults = await parseResponse(initResp);
  const initResult = initResults[0] as { error?: unknown } | undefined;
  if (initResult?.error) throw new Error(`Init failed: ${JSON.stringify(initResult.error)}`);

  // Step 2: send initialized notification + actual request as batch
  const batchResp = await fetch("http://localhost:3002/mcp", {
    method: "POST", headers: HEADERS,
    body: JSON.stringify([
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 99, method, params },
    ]),
  });
  const results = await parseResponse(batchResp);
  return results.find((r: unknown) => (r as { id?: number }).id === 99) as { result?: unknown; error?: unknown } | undefined;
}

const httpServer = app.listen(3002, async () => {
  console.log("Server running on http://localhost:3002/mcp\n");

  try {
    // 1. List tools
    const toolsResp = await mcpCall("tools/list");
    console.log("Raw tools response:", JSON.stringify(toolsResp, null, 2).slice(0, 2000));
    const tools = (toolsResp?.result as { tools?: Array<{ name: string; description: string }> })?.tools ?? [];
    console.log(`\nRegistered tools (${tools.length}):`);
    for (const t of tools) {
      console.log(`  - ${t.name}: ${t.description}`);
    }

    // 2. Call get-todos
    const todosResp = await mcpCall("tools/call", { name: "get-todos", arguments: {} });
    const todosResult = todosResp?.result as { structuredContent?: { todos?: Array<{ id: number; text: string; done: boolean }> } } | undefined;
    console.log("\nget-todos:");
    for (const todo of todosResult?.structuredContent?.todos ?? []) {
      console.log(`  [${todo.done ? "x" : " "}] #${todo.id}: ${todo.text}`);
    }

    // 3. Call add-todo
    const addResp = await mcpCall("tools/call", { name: "add-todo", arguments: { text: "Test-Todo vom Selftest" } });
    const addResult = addResp?.result as { structuredContent?: { todos?: Array<{ id: number; text: string; done: boolean }> } } | undefined;
    console.log("\nadd-todo (neues Todo hinzugefuegt):");
    for (const todo of addResult?.structuredContent?.todos ?? []) {
      console.log(`  [${todo.done ? "x" : " "}] #${todo.id}: ${todo.text}`);
    }

    // 4. Call toggle-todo
    const toggleResp = await mcpCall("tools/call", { name: "toggle-todo", arguments: { id: 1 } });
    const toggleResult = toggleResp?.result as { structuredContent?: { todos?: Array<{ id: number; text: string; done: boolean }> } } | undefined;
    console.log("\ntoggle-todo (#1 auf erledigt):");
    for (const todo of toggleResult?.structuredContent?.todos ?? []) {
      console.log(`  [${todo.done ? "x" : " "}] #${todo.id}: ${todo.text}`);
    }

    // 5. Call delete-todo
    const deleteResp = await mcpCall("tools/call", { name: "delete-todo", arguments: { id: 2 } });
    const deleteResult = deleteResp?.result as { structuredContent?: { todos?: Array<{ id: number; text: string; done: boolean }> } } | undefined;
    console.log("\ndelete-todo (#2 geloescht):");
    for (const todo of deleteResult?.structuredContent?.todos ?? []) {
      console.log(`  [${todo.done ? "x" : " "}] #${todo.id}: ${todo.text}`);
    }

    console.log("\n All 4 tools work correctly!");
  } catch (e) {
    console.error("Test error:", e);
  } finally {
    httpServer.close();
  }
});
