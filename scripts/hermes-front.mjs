import { spawn } from "node:child_process";
import { createServer } from "node:http";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const PUBLIC_PORT = Number(process.env.HERMES_PUBLIC_PORT || process.env.PORT || 3000);
const INTERNAL_PORT = Number(process.env.HERMES_INTERNAL_PORT || 3001);
const HOME = process.env.HOME || os.homedir();
const BRIDGE_DIR =
  process.env.HERMES_BRIDGE_DIR ||
  path.join(HOME, ".hermes", "hermes-agent", "scripts", "whatsapp-bridge");
const SESSION_DIR =
  process.env.HERMES_SESSION_DIR ||
  path.join(HOME, ".hermes", "platforms", "whatsapp", "session");
const BRIDGE_SCRIPT = path.join(BRIDGE_DIR, "bridge.js");
const BRIDGE_TOKEN = process.env.HERMES_BRIDGE_TOKEN || "";

let lastQr = null;
let pairState = "disconnected";
let pairUser = null;
let loggedOut = false;
let bridgeChild = null;
let shuttingDown = false;

if (!fs.existsSync(BRIDGE_SCRIPT)) {
  console.error(`Hermes WhatsApp bridge not found at ${BRIDGE_SCRIPT}`);
  console.error("Install the official bridge, then run this front again.");
  process.exit(1);
}

fs.mkdirSync(SESSION_DIR, { recursive: true });

if (process.env.HERMES_INSECURE_TLS === "1") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function parsePairLine(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("{")) return;
  try {
    const event = JSON.parse(trimmed);
    if (event.event === "qr" && typeof event.qr === "string") {
      lastQr = event.qr;
      pairState = "connecting";
      loggedOut = false;
      return;
    }
    if (event.event === "connected") {
      lastQr = null;
      pairState = "connected";
      pairUser = event.user || null;
      loggedOut = false;
      return;
    }
    if (event.event === "error" && event.error === "logged_out") {
      pairState = "disconnected";
      pairUser = null;
      lastQr = null;
      loggedOut = true;
      return;
    }
    if (event.event === "disconnected") {
      if (pairState === "connected") pairState = "disconnected";
    }
  } catch {
    // Non-JSON bridge chatter.
  }
}

function resetSession() {
  try {
    fs.rmSync(SESSION_DIR, { recursive: true, force: true });
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  } catch {
    // Best-effort; the next pair attempt still starts.
  }
}

function startBridge() {
  const child = spawn(
    process.execPath,
    [
      BRIDGE_SCRIPT,
      "--port",
      String(INTERNAL_PORT),
      "--session",
      SESSION_DIR,
      "--mode",
      process.env.WHATSAPP_MODE || "bot",
      "--pair-json",
    ],
    {
      cwd: BRIDGE_DIR,
      env: {
        ...process.env,
        HOME,
        WHATSAPP_ENABLED: "true",
        WHATSAPP_MODE: process.env.WHATSAPP_MODE || "bot",
        WHATSAPP_ALLOWED_USERS: process.env.WHATSAPP_ALLOWED_USERS || "*",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );

  const onData = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    for (const line of text.split(/\r?\n/)) parsePairLine(line);
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("exit", () => {
    if (bridgeChild === child) bridgeChild = null;
    if (shuttingDown) return;
    if (loggedOut) resetSession();
    if (pairState === "connected") pairState = "disconnected";
    setTimeout(startBridge, 2000);
  });

  bridgeChild = child;
  return child;
}

function isAuthorized(req) {
  if (!BRIDGE_TOKEN) return true;
  const auth = String(req.headers.authorization || "");
  const headerToken = String(req.headers["x-hermes-token"] || "");
  return auth === `Bearer ${BRIDGE_TOKEN}` || headerToken === BRIDGE_TOKEN;
}

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": "*",
    connection: "close",
  });
  res.end(body);
}

function forward(req, res) {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PUBLIC_PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type,authorization",
      connection: "close",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/qr") {
    if (!isAuthorized(req)) {
      json(res, 401, { error: "Unauthorized" });
      return;
    }
    json(res, 200, {
      qr: lastQr,
      status: pairState,
      user: pairUser,
    });
    return;
  }

  if (url.pathname !== "/health" && !isAuthorized(req)) {
    json(res, 401, { error: "Unauthorized" });
    return;
  }

  const upstream = http.request(
    {
      host: "127.0.0.1",
      port: INTERNAL_PORT,
      method: req.method,
      path: req.url,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${INTERNAL_PORT}`,
        connection: "close",
      },
    },
    (up) => {
      const chunks = [];
      up.on("data", (chunk) => chunks.push(chunk));
      up.on("end", () => {
        const body = Buffer.concat(chunks);
        const headers = { ...up.headers };
        delete headers["transfer-encoding"];
        delete headers.connection;
        headers["content-length"] = String(body.length);
        headers.connection = "close";
        headers["access-control-allow-origin"] = "*";
        res.writeHead(up.statusCode || 502, headers);
        res.end(body);
      });
    },
  );

  upstream.on("error", () => {
    if (url.pathname === "/health") {
      json(res, 200, { status: pairState || "connecting", queueLength: 0 });
      return;
    }
    json(res, 503, { error: "Hermes WhatsApp bridge is starting." });
  });

  req.pipe(upstream);
}

startBridge();
const server = createServer();
server.keepAliveTimeout = 1;
server.headersTimeout = 10_000;
server.requestTimeout = 30_000;
server.on("request", forward);
server.listen({ port: PUBLIC_PORT, host: "0.0.0.0" }, () => {
  console.log(`Hermes front http://127.0.0.1:${PUBLIC_PORT} (QR at /qr)`);
  console.log(`Session ${SESSION_DIR}`);
});

function shutdown() {
  shuttingDown = true;
  bridgeChild?.kill("SIGTERM");
  server.close();
  setTimeout(() => process.exit(0), 500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
