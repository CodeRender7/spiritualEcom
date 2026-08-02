# T5 — OpenObserve ingestion + openobserve-mcp + incident skill

- Labels: `wayfinder:task`
- Blocking: blocked-by T1 (OpenObserve already up, but tracer schema still open)

## Question

Point OpenObserve at DivineKart app logs + OpenCode trace export; build an `openobserve-mcp` server the opencode swarm can call (query / audit / incident drill-down); add a `diagnosing-bugs`-paired incident-response skill that drives the OpenObserve query from an incident alert.

## Notes

- OpenObserve live at http://localhost:5080 (UI) / 5081 (ingest). Incident loop integrates the **loop** execution pattern.

## Resolution

(answer recorded here on close)