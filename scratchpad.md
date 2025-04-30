# MCP/iOS Integration Review and Action Plan

## Background and Motivation

You have created a new branch to finalize the integration between the Zenith MCP backend server and the iOS (Swift) client. The goal is to ensure seamless, spec-compliant communication, covering endpoint exposure, authentication, JSON-RPC, SSE streaming, error handling, and clear documentation for frontend consumption.

## Task Tracker — 2025‑04‑29

| #   | Task                                                                                | Owner   | Blocking | Status |
| --- | ----------------------------------------------------------------------------------- | ------- | -------- | ------ |
| 1   | **Expose POST `/mcp`** using `StreamableHTTPServerTransport`                        | backend | –        | ☑️     |
| 1.1 | Remove call to `server.handleJsonRpc` in `server.ts`                                | backend | 1        | ☑️     |
| 1.2 | Wire `await transport.handleRequest(req, res, req.body)` inside the new route       | backend | 1        | ☑️     |
| 2   | **Implement GET `/mcp`** with `Accept: text/event-stream` for SSE                   | backend | 1        | ☑️     |
| 2.1 | Echo `Content-Type: text/event-stream` and stream JSON‑RPC notifications            | backend | 2        | ☑️     |
| 3   | **Bearer Auth** middleware on _all_ `/mcp` verbs (POST & GET)                       | backend | –        | ☑️     |
| 4   | **Session‑ID handshake**                                                            | backend | 1        | ☑️     |
| 4.1 | Generate `Mcp-Session-Id` on first request                                          | backend | 4        | ☑️     |
| 4.2 | Echo header on every subsequent response and reuse same transport                   | backend | 4        | ☑️     |
| 5   | **HTTP ↔ JSON‑RPC error mapping** per integration doc §9                           | backend | –        | ☐      |
| 6   | **Update docs** (`mcp-backend-integration.md`) with new examples & deprecation note | backend | 1‑5      | ☐      |

## Success Criteria (task is “Done” when **all** checks pass)

### 1  POST `/mcp`

- [ ] `curl -X POST http://localhost:3002/mcp \\
       -H "Authorization: Bearer TEST" \\
       -H "Content-Type: application/json" \\
       -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'`
      returns **200**, valid JSON‑RPC, **and** a `Mcp-Session-Id` header.
- [ ] `npm run build` shows **no** TypeScript error about `handleJsonRpc`.

### 2  GET `/mcp` (SSE)

- [ ] `curl -N http://localhost:3002/mcp \\
       -H "Authorization: Bearer TEST" \\
       -H "Accept: text/event-stream"` keeps the connection open.
- [ ] Triggering a tool from another terminal produces an `event:` line with a JSON‑RPC notification.

### 3  Bearer Auth

- [ ] Omitting the `Authorization` header returns **401** plus  
       `WWW-Authenticate: Bearer realm="MCP"`.

### 4  Session ID

- [ ] Subsequent POSTs that include `Mcp-Session-Id: <id>` reuse the same transport (no new key in the `transports` map).

### 5  Error Mapping

- [ ] Forcing a `RateLimited` error inside a tool returns HTTP **429** and JSON‑RPC error `{code:-32004}`.

### 6  Documentation

- [ ] `zenith-api/mcp-backend-integration.md` now shows POST + GET examples and notes that `handleJsonRpc` is deprecated in SDK ≥ 1.8.

## Executor's Feedback or Assistance Requests

- Both POST and GET `/mcp` endpoints have been tested and are MCP-compliant.
- Session management and Bearer authentication work for both verbs.
- SDK requires careful matching of transport instantiation and method signatures; required fields in `initialize` must be provided by the client.
- Ready for E2E integration testing with the iOS frontend.

## Lessons

- Always check SDK transport method signatures and required params.
- MCP `initialize` requires protocolVersion, capabilities, and clientInfo in params.
- Use a single `Accept` header with both `application/json, text/event-stream` for best compatibility.

## Lessons

- Always test with the actual MCP Swift SDK client for compatibility
- Use clear debug output for handshake, auth, and streaming failures
- If E2E or migration issues arise, log them here for future reference

---

## Background and Motivation

Recent E2E tests for MCP error mapping are failing due to unexpected HTTP 406 responses. The goal is to ensure all error scenarios return the correct status codes and JSON-RPC error objects, as required for iOS client integration and MCP compliance.

---

## Project Status Board

- [x] **Audit E2E Test Headers**

  - Ensure all Supertest requests in `mcp-errors.e2e-spec.ts` send `Content-Type: application/json` and `Accept: application/json`.
  - **Success:** All requests consistently send these headers.

- [x] **Review /mcp Route and Middleware**

  - Examine Express `/mcp` route and any global middleware for content negotiation or error-handling logic that could cause 406 responses.
  - **Success:** Identify and document any middleware or handler returning 406.

- [x] **Patch Error Mapping Logic**

  - Fix any issues in the MCP transport or error handler to ensure correct status codes are returned for all error scenarios.
  - **Success:** All documented error cases return the mapped status code and JSON-RPC error.

- [x] **Re-run Isolated E2E Tests**
  - Run only `mcp-errors.e2e-spec.ts` and verify all tests pass.
  - **Success:** All E2E tests for MCP error mapping pass with correct codes.

---

## Executor's Feedback or Assistance Requests

- Blocked if: Unable to identify the cause of 406 after headers and middleware review.
- Will request user guidance if server-side logic is ambiguous.

---

## Lessons

- Always set both `Content-Type` and `Accept` headers in API E2E tests.
- 406 errors often indicate content negotiation issues, not business logic bugs.
- Isolated E2E runs are critical for rapid feedback.

---

### API Change Log

- **2025‑04‑29**  `@modelcontextprotocol/sdk` v1.8 removed `McpServer.handleJsonRpc`.  
  Switch to `StreamableHTTPServerTransport.handleRequest`.  
  Verify the version with `npm info @modelcontextprotocol/sdk version`.
