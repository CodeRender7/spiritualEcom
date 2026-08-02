# T1 — Langfuse deployment topology

- Labels: `wayfinder:task`
- Blocking: (none)

## Question

Decide the exact Langfuse image set + worker entry + Redis dependency + Postgres DB that converges to a healthy, non-restart-looping deployment.

## Findings (status)

- `langfuse:2` web image: entrypoint `dumb-init -- ./web/entrypoint.sh`, Cmd `node ./web/server.js`. Running migrations inside the container caused a `CREATE INDEX CONCURRENTLY` **deadlock** (`P3009`/`40P01`) when both web (migrating) and worker contested locks. **Fixed** by deleting the postgres volume, migrating on web-only with worker stopped, then scheduling worker separately.
- Valid config requires: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` (exactly 64 hex = `openssl rand -hex 32`), `SALT`, `DIRECT_URL`.
- `langfuse-worker:2` image has the **correct** entrypoint (`./worker/entrypoint.sh`, `node worker/dist/index.js`) — no manual `command:` override. Requires `REDIS_HOST/REDIS_PORT` to consume the BullMQ queue.
- Web needs `REDIS_HOST/REDIS_PORT` too so web enqueues and worker drains.

## Resolution

**CLOSED.** Healthy topology, verified live:
- `langfuse:2` web + `langfuse-worker:2` worker + dedicated `langfuse-db` postgres :15 + shared `redis` (BullMQ queue).
- Worker uses the image's native entrypoint (`./worker/entrypoint.sh`, `node worker/dist/index.js`) — **no** `command:` override. Both container logs show no restart loop: worker logs show "Finished upserting default model prices".
- Required env: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY` (64 hex = `openssl rand -hex 32`), `SALT`, `REDIS_HOST/REDIS_PORT` on both web + worker.
- Deadlock avoided by: migrate on **web-only** (worker stopped), fresh postgres volume, then bring worker up afterward.

Status: `Verified` — Langfuse UI HTTP 200, worker healthy, OpenObserve HTTP 200.