/**
 * Entry point: Starts the MCP server with Streamable HTTP transport.
 * Run with: npm run serve
 */
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { createServer } from "./server.ts";

const port = parseInt(process.env.PORT ?? "3002", 10);

const app = express();
app.use(cors());
app.use(express.json());

app.all("/mcp", async (req: Request, res: Response) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on("close", () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("MCP error:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

const httpServer = app.listen(port, () => {
  console.log(`MCP Server laeuft auf http://localhost:${port}/mcp`);
});

const shutdown = () => {
  console.log("\nShutting down...");
  httpServer.close(() => process.exit(0));
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
