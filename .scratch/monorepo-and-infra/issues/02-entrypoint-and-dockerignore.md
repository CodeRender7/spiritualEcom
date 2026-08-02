# 02 — Fix backend entrypoint + .dockerignore

- **Status:** closed
- **Type:** task

`backend/scripts/entrypoint.sh` waits on Postgres with `curl`/`pg_isready`; `pg_isready` isn't installed in the image and the curl exit code is unreliable. Use a robust `pg_isready` loop (client now installed). Add `.dockerignore` at root / backend / storefront to keep `node_modules`, `.next`, `.env`, `.git` out of build contexts.

Verified: entrypoint uses an `until pg_isready ...` loop; root `.dockerignore` present.

Blocked by: 01
