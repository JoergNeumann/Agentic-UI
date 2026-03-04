import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

// Works both from source (server.ts) and compiled (dist/server.js)
const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

// In-Memory Todo-Liste
interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

let todos: TodoItem[] = [
  { id: 1, text: "MCP Apps kennenlernen", done: false },
  { id: 2, text: "Ersten MCP Server bauen", done: true },
  { id: 3, text: "UI mit App-Klasse verbinden", done: false },
];

let nextId = 4;

/**
 * Creates a new MCP server instance with tools and resources registered.
 */
export function createServer(): McpServer {
  const server = new McpServer({
    name: "Todo MCP App Server",
    version: "1.0.0",
  });

  const resourceUri = "ui://todo-app/mcp-app.html";

  // Tool: Todos abrufen
  registerAppTool(server,
    "get-todos",
    {
      title: "Get Todos",
      description: "Gibt die aktuelle Todo-Liste zurueck und zeigt sie in einer interaktiven UI an.",
      inputSchema: {},
      outputSchema: z.object({
        todos: z.array(z.object({
          id: z.number(),
          text: z.string(),
          done: z.boolean(),
        })),
      }),
      _meta: { ui: { resourceUri } },
    },
    async (): Promise<CallToolResult> => {
      return {
        content: [{ type: "text", text: JSON.stringify(todos) }],
        structuredContent: { todos },
      };
    },
  );

  // Tool: Todo hinzufuegen
  registerAppTool(server,
    "add-todo",
    {
      title: "Add Todo",
      description: "Fuegt ein neues Todo zur Liste hinzu.",
      inputSchema: {
        text: z.string().describe("Der Text des neuen Todos"),
      },
      outputSchema: z.object({
        todos: z.array(z.object({
          id: z.number(),
          text: z.string(),
          done: z.boolean(),
        })),
      }),
      _meta: { ui: { resourceUri } },
    },
    async ({ text }): Promise<CallToolResult> => {
      const newTodo: TodoItem = { id: nextId++, text, done: false };
      todos.push(newTodo);
      return {
        content: [{ type: "text", text: JSON.stringify(todos) }],
        structuredContent: { todos },
      };
    },
  );

  // Tool: Todo-Status umschalten
  registerAppTool(server,
    "toggle-todo",
    {
      title: "Toggle Todo",
      description: "Schaltet den Erledigt-Status eines Todos um.",
      inputSchema: {
        id: z.number().describe("Die ID des Todos"),
      },
      outputSchema: z.object({
        todos: z.array(z.object({
          id: z.number(),
          text: z.string(),
          done: z.boolean(),
        })),
      }),
      _meta: { ui: { resourceUri } },
    },
    async ({ id }): Promise<CallToolResult> => {
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        todo.done = !todo.done;
      }
      return {
        content: [{ type: "text", text: JSON.stringify(todos) }],
        structuredContent: { todos },
      };
    },
  );

  // Tool: Todo loeschen
  registerAppTool(server,
    "delete-todo",
    {
      title: "Delete Todo",
      description: "Loescht ein Todo aus der Liste.",
      inputSchema: {
        id: z.number().describe("Die ID des zu loeschenden Todos"),
      },
      outputSchema: z.object({
        todos: z.array(z.object({
          id: z.number(),
          text: z.string(),
          done: z.boolean(),
        })),
      }),
      _meta: { ui: { resourceUri } },
    },
    async ({ id }): Promise<CallToolResult> => {
      todos = todos.filter((t) => t.id !== id);
      return {
        content: [{ type: "text", text: JSON.stringify(todos) }],
        structuredContent: { todos },
      };
    },
  );

  // Resource: Gebuendelte HTML-Datei fuer die UI ausliefern
  registerAppResource(server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(path.join(DIST_DIR, "mcp-app.html"), "utf-8");
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}
