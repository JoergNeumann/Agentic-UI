import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ReadResourceResult,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const DIST_DIR = import.meta.filename.endsWith(".ts")
  ? path.join(import.meta.dirname, "dist")
  : import.meta.dirname;

export function createServer(): McpServer {
  const server = new McpServer({
    name: "Color Picker MCP App",
    version: "1.0.0",
  });

  const resourceUri = "ui://color-picker/mcp-app.html";

  registerAppTool(
    server,
    "color-picker",
    {
      title: "Color Picker",
      description:
        "Opens an interactive color picker. Optionally provide an initial color in hex format (e.g. #ff6600).",
      inputSchema: {
        initialColor: z
          .string()
          .regex(/^#[0-9a-fA-F]{6}$/)
          .optional()
          .describe("Initial color in hex format, e.g. #ff6600"),
      },
      outputSchema: z.object({
        hex: z.string(),
        rgb: z.object({ r: z.number(), g: z.number(), b: z.number() }),
        hsl: z.object({ h: z.number(), s: z.number(), l: z.number() }),
      }),
      _meta: { ui: { resourceUri } },
    },
    async (args: {
      initialColor?: string;
    }): Promise<CallToolResult> => {
      const hex = args.initialColor ?? "#3b82f6";
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);

      // Convert to HSL
      const rn = r / 255;
      const gn = g / 255;
      const bn = b / 255;
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      let h = 0;
      let s = 0;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        else if (max === gn) h = ((bn - rn) / d + 2) / 6;
        else h = ((rn - gn) / d + 4) / 6;
      }

      return {
        content: [
          {
            type: "text",
            text: `Color: ${hex} | RGB(${r}, ${g}, ${b}) | HSL(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
          },
        ],
        structuredContent: {
          hex,
          rgb: { r, g, b },
          hsl: {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
          },
        },
      };
    },
  );

  registerAppResource(
    server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      const html = await fs.readFile(
        path.join(DIST_DIR, "mcp-app.html"),
        "utf-8",
      );
      return {
        contents: [{ uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html }],
      };
    },
  );

  return server;
}
