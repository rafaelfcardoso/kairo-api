import { startNestServer } from './main';

async function startUnifiedServer() {
  // Use the same PORT for both servers unless overridden
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

  // Only start the NestJS API server, which now also serves MCP endpoints
  await startNestServer(port);
  console.log('[Unified] NestJS API and MCP Adapter endpoints are running on the same server.');
}

startUnifiedServer().catch((err) => {
  console.error('[Unified] Failed to start server:', err);
  process.exit(1);
});
