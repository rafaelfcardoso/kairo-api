# Dual‑Entry Deployment Plan (Nest API + MCP Adapter)

## Why

Railway should spin up **one process** that serves:

1. `/api/v1/**`, `/health`, Swagger, etc. ← NestJS (main.ts)
2. `/mcp` POST/GET + `/sse` + `/messages` ← MCP Adapter (server.ts)

Running two `npm run start:*` commands independently creates two Railway services and wastes ports.  
Instead we start **both** servers in a single parent script.

---

## Tasks

| #   | Task                                                                                                                                                                                                | File(s)           | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------ |
| 1   | **Refactor `server.ts`** to export `startMcpServer()` and remove auto‑listen                                                                                                                        | `src/server.ts`   | ☐      |
| 2   | **Refactor `main.ts`** to export `startNestServer()` (returns Promise\<INestApplication\>)                                                                                                          | `src/main.ts`     | ☐      |
| 3   | **Create `src/index.ts`** — bootstrap both via `Promise.all([startNestServer(), startMcpServer()])`                                                                                                 | `src/index.ts`    | ☐      |
| 4   | **Update package.json scripts**<br>  • `start`       → `node dist/index.js`<br>  • `start:dev` → `cross-env NODE_ENV=development ts-node src/index.ts`<br>  • `start:prod` remains alias of `start` | `package.json`    | ☐      |
| 5   | **Railway deploy** — set `startCommand` to `npm start`                                                                                                                                              | Railway dashboard | ☐      |
| 6   | **Verify**<br>curl `/api/v1/health` ⇒ 200<br>curl `/mcp` initialize ⇒ JSON‑RPC 401<br>SSE `/mcp` stream ⇒ 200 text/event-stream                                                                     | —                 | ☐      |

### Nice‑to‑have

- Consolidate PORTs: Railway injects `$PORT`; Nest listens on it, MCP uses `$PORT_MCP` (falls back to `$PORT + 1`).
- Add graceful shutdown hooks so both servers close on SIGTERM.

---

## Acceptance criteria

- `railway up` logs show **both** “Nest application started” **and** “Zenith MCP Adapter Server running”.
- Single public URL answers both `/api/v1` and `/mcp`.
