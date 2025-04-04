const fs = require('fs');
const path = require('path');

// Find the actual direct path
const sdkRoot = path.resolve('./node_modules/@modelcontextprotocol/sdk');
const clientPath = path.join(sdkRoot, 'dist/cjs/client/index.js');
const ssePath = path.join(sdkRoot, 'dist/cjs/client/sse.js');

console.log('Client path exists:', fs.existsSync(clientPath));
console.log('SSE path exists:', fs.existsSync(ssePath));

// Use dynamic require only if files exist
const Client = fs.existsSync(clientPath) ? require(clientPath).Client : null;
const SSEClientTransport = fs.existsSync(ssePath) ? require(ssePath).SSEClientTransport : null;

if (!Client || !SSEClientTransport) {
  console.error('Required modules not found!');
  process.exit(1);
}

async function testMCP() {
  const transport = new SSEClientTransport(new URL('http://localhost:3001'));
  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  });

  await client.connect(transport);

  try {
    // Test creating a task
    const result = await client.callTool({
      name: 'create-task',
      arguments: {
        title: 'Test Task',
        description: 'Testing MCP server',
      },
    });

    console.log('Task created:', result);
  } catch (error) {
    console.error('Error calling tool:', error);
  }
}

testMCP().catch(console.error);
