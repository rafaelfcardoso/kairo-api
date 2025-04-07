import { Client } from "../node_modules/@modelcontextprotocol/sdk/dist/esm/client/index.js";
import { SSEClientTransport } from "../node_modules/@modelcontextprotocol/sdk/dist/esm/client/sse.js";

async function testMCP() {
  const transport = new SSEClientTransport(new URL("http://localhost:3002/sse"));
  const client = new Client({
    name: "test-client",
    version: "1.0.0"
  });

  await client.connect(transport);

  try {
    // Test creating a task
    const result = await client.callTool({
      name: "create-task",
      arguments: {
        title: "Test Task",
        description: "Testing MCP server"
      }
    });
    console.log("Task created:", result);
  } catch (error) {
    console.error("Error calling tool:", error);
  }
}

testMCP().catch(console.error);
