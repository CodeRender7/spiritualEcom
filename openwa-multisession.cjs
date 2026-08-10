#! /usr/bin/env node
/**
 * Multi-session EasyAPI for OpenWA.
 *
 * Replaces the stock single-session `bin/server.js` CLI. One process hosts
 * N WhatsApp sessions (one Chrome account each) behind one Express app.
 *
 * Routing (with `client.middleware(true, PORT)`):
 *   /<sessionId>/method  -> that named session   (e.g. /host/sendText)
 *   /method              -> the legacy "session" account (mounted LAST,
 *                           never calls next(), owns unprefixed routes)
 *
 * Webhooks (listener events: onMessage/onAck/...) are registered per client
 * and every payload is tagged with sessionId via prepEventData. QR/STARTUP
 * lifecycle events flow through the package-global `ev` emitter (already
 * namespaced per session) to WA_EV as {ts, data, sessionId, namespace}.
 *
 * Env:
 *   WA_SESSIONS   comma-separated session ids (default: "session")
 *   WA_EV         lifecycle webhook URL (QR codes etc.)
 *   WA_WEBHOOK    listener webhook URL (messages, acks)
 *   WA_CLI_CONFIG path to base config JSON (default /config/config.json)
 *   PORT          API port (default from config file, else 8080)
 *   WA_*          any other config key, camelized (WA_USE_CHROME -> useChrome)
 *
 * started via:  node /usr/src/app/openwa-multisession.cjs
 * (start.sh in the base image prepends `node`; compose `command` is the
 * script path itself).
 */
"use strict";

const fs = require("fs");
const http = require("http");
const express = require("express");
const axios = require("axios");
const tcpPortUsed = require("tcp-port-used");
const { create, ev } = require("@open-wa/wa-automate");

const CONFIG_PATH = process.env.WA_CLI_CONFIG || "/config/config.json";
const SESSIONS = (process.env.WA_SESSIONS || "session")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// The popup (QR page web server) is a singleton whose port logic is
//   `preferredPort = (typeof popup === "boolean" && popup && _p) ? Number(_p) : popup`
// with `_p = process.env.PORT || config.port`. Because create() re-applies
// WA_* env over the config when inDocker is true, an in-code `popup: 7000`
// gets overwritten by the WA_POPUP env var. So we force WA_POPUP itself to a
// numeric port BEFORE the config is built:  
//   - buildBaseConfig() then sees popup as a number
//   - getConfigFromProcessEnv() inside create() keeps it non-boolean
// Both mappers agree, and the popup binds its own port instead of the API's.
// To disable the popup entirely, set WA_POPUP=false.
if (process.env.WA_POPUP !== "false" && process.env.WA_POPUP !== "0") {
  process.env.WA_POPUP = String(Number(process.env.WA_POPUP_PORT || 7000));
}

/** WA_PORT -> port, WA_USE_CHROME -> useChrome (mirrors stock camelization). */
function camelize(envKey) {
  const parts = envKey.replace(/^WA_/, "").toLowerCase().split("_");
  return parts[0] + parts.slice(1).map((p) => p[0].toUpperCase() + p.slice(1)).join("");
}

/** Merge base config: file first, WA_* env wins (same precedence as stock cliConfig). */
function buildBaseConfig() {
  let file = {};
  try {
    file = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (e) {
    if (process.env.WA_VERBOSE) console.error(`[multi] config read failed: ${e.message}`);
  }
  for (const k of Object.keys(process.env)) {
    if (!k.startsWith("WA_") || k === "WA_CLI_CONFIG") continue;
    let v = process.env[k];
    if (v === "true") v = true;
    else if (v === "false") v = false;
    else if (/^\d+$/.test(v)) v = Number(v);
    file[camelize(k)] = v;
  }
  return file;
}

const baseConfig = buildBaseConfig();
const PORT = Number(process.env.PORT || baseConfig.port || 8080);
const HOST = baseConfig.host || "0.0.0.0";

const app = express();
app.use(express.json({ limit: "99mb" }));

const clients = {}; // sessionId -> client

/**
 * Independent, pre-auth health probe. Registered before any client middleware
 * so it is always reachable and never blocks on a session's OPENING state.
 * Body mirrors the stock healthCheck shape for drop-in compatibility.
 */
app.post("/healthCheck", (req, res) => {
  res.json({
    success: true,
    response: {
      multi: true,
      sessions: Object.keys(clients).map((id) => ({
        id,
        state: (clients[id].getState && clients[id].getState()) || "unknown",
      })),
    },
  });
});

/** Live session inventory for the backend to discover OpenWA accounts. */
app.get("/meta/sessions", (req, res) => {
  res.json({
    success: true,
    sessions: Object.keys(clients).map((id) => ({ id, state: clients[id].getState ? clients[id].getState() : "unknown" })),
  });
});

async function registerWebhooks(client, sessionId) {
  if (!baseConfig.webhook) return;
  const webhooks = Array.isArray(baseConfig.webhook) ? baseConfig.webhook : [{ url: baseConfig.webhook, events: "all" }];
  for (const wh of webhooks) {
    if (!wh.url || !wh.events) continue;
    await client.registerWebhook(wh.url, wh.events, wh.requestConfig || {}).then(() => {
      if (process.env.WA_VERBOSE) console.log(`[multi] webhook registered ${sessionId} -> ${wh.url}`);
    });
  }
}

async function forwardLifecycleEvents() {
  if (!process.env.WA_EV && !baseConfig.ev) return;
  const evUrl = process.env.WA_EV || baseConfig.ev;
  let ef = baseConfig.ef || [];
  if (!Array.isArray(ef)) ef = [ef];
  ef = ef.flatMap((s) => String(s).split(",")).filter(Boolean);
  const allowSessionData = !!process.env.ALLOW_SESSION_DATA;
  ev.on("**", (data, sessionId, namespace) => {
    if (ef.length && !ef.includes(namespace)) return;
    if (!allowSessionData && (namespace === "sessionData" || namespace === "sessionDataBase64")) return;
    axios
      .post(evUrl, { ts: Date.now(), data, sessionId, namespace })
      .catch(() => {}); // fire-and-forget like stock
  });
  console.log(`[multi] EV forwarding -> ${evUrl} (ef: ${ef.join(",") || "*"})`);
}

async function main() {
  if (SESSIONS.length === 0) {
    console.error("[multi] WA_SESSIONS is empty; aborting.");
    process.exit(1);
  }

  // Longest id first so "host2" is mounted before "host" (avoids substring collisions);
  // the legacy "session" id is always mounted last (it never calls next()).
  const mountOrder = [...SESSIONS].sort((a, b) => {
    if (a === "session") return 1;
    if (b === "session") return -1;
    return b.length - a.length;
  });
  console.log(`[multi] booting sessions in mount order: ${mountOrder.join(", ")}`);

  // Server listens immediately so /healthCheck and /meta/sessions are live from
  // boot (container reports healthy before any QR scan, and the backend can
  // poll session state while accounts connect). Client middlewares mount
  // progressively as each create() resolves.
  http.createServer(app).listen(PORT, HOST, () => {
    console.log(`[multi] listening on ${HOST}:${PORT} â€” sessions: ${SESSIONS.join(", ")}`);
  });

  await forwardLifecycleEvents();

  let anyReady = false;
  for (const sessionId of mountOrder) {
    const config = { ...baseConfig, sessionId };
    // The popup (QR scanning page) is a singleton that prefers the API port.
    // Our API listens immediately, so push the popup onto its own port to
    // avoid EADDRINUSE (the stock CLI binds the API only after create()).
    if (config.popup) {
      config.popup = Number(process.env.WA_POPUP_PORT || 7000);
    }
    try {
      console.log(`[multi] creating session "${sessionId}" ...`);
      const client = await create(config);
      clients[sessionId] = client;
      app.use(client.middleware(true, PORT));
      await registerWebhooks(client, sessionId);
      client.onLogout(() => {
        console.error(`[multi] SESSION LOGGED OUT: ${sessionId} (process stays alive; other sessions unaffected)`);
      });
      if (process.env.KEEP_ALIVE) {
        client.onStateChanged(async (state) => {
          if (state === "CONFLICT" || state === "UNLAUNCHED") await client.forceRefocus();
        });
      }
      anyReady = true;
      console.log(`[multi] session "${sessionId}" ready`);
    } catch (e) {
      console.error(`[multi] FAILED to create session "${sessionId}": ${e.stack || e}`);
      // Keep the process alive for the other sessions; a failed account is
      // retried on container restart.
    }
  }

  if (!anyReady) {
    console.error("[multi] no session could be created; exiting.");
    process.exit(1);
  }
  console.log(`[multi] all sessions attempted. live: ${SESSIONS.join(", ")}`);
}

main().catch((e) => {
  console.error("[multi] fatal:", e.stack || e);
  process.exit(1);
});