import { createServer } from "./server.ts";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

async function main() {
  console.log("Creating server...");
  const server = createServer();
  console.log("Server created.");

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: "test-client", version: "1.0" });

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  console.log("Connected.");

  const toolsResult = await client.listTools();
  console.log("Tools:", toolsResult.tools.map(t => t.name));

  if (toolsResult.tools.length > 0) {
    const getTodosResult = await client.callTool({ name: "get-todos", arguments: {} });
    console.log("get-todos result:", JSON.stringify(getTodosResult, null, 2).slice(0, 500));
  }

  await client.close();
  await server.close();
}

main().catch(console.error);
