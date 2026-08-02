# T4 — Application-layer Langfuse tracing

- Labels: `wayfinder:research`
- Blocking: blocked-by T2 (langfuse keys needed), T1 (topology)

## Question

Instrument Medusa `backend` + `storefront` with the Langfuse SDK/tracing (traces at the SDK calls, DB and HTTP spans) AND add a custom OpenCode overlay (`.opencode` hook/plugin) so "opencode-self" agent runs export traces to Langfuse. Decide which spans are captured across the three levels.

## Notes for the actor

- Use `codebase-memory-mcp` `search_graph`/`trace_path` to find the Medusa workline entry points (`backend` handlers, `storefront` medusaFetch) before instrumenting.
- Keys come from T2.

## Resolution

(answer recorded here on close)