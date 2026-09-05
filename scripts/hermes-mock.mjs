import { createServer } from "node:http";

const PORT = Number(process.env.HERMES_MOCK_PORT || 18765);
const inbox = [];
const sent = [];
let connectionState = process.env.HERMES_MOCK_STATUS || "connected";

function json(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "access-control-allow-origin": "*",
  });
  res.end(body);
}

const server = createServer((req, res) => {
  const url = new URL(req.url || "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  if (req.method === "GET" && url.pathname === "/health") {
    json(res, 200, { status: connectionState, queueLength: inbox.length, uptime: process.uptime() });
    return;
  }

  if (req.method === "GET" && url.pathname === "/messages") {
    const messages = inbox.splice(0, inbox.length);
    json(res, 200, messages);
    return;
  }

  if (req.method === "GET" && url.pathname === "/sent") {
    json(res, 200, sent);
    return;
  }

  if (req.method === "POST" && url.pathname === "/inbox") {
    readBody(req).then((payload) => {
      const items = Array.isArray(payload) ? payload : [payload];
      inbox.push(...items);
      json(res, 200, { queued: items.length });
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/send") {
    if (connectionState !== "connected") {
      json(res, 503, { error: "Not connected to WhatsApp" });
      return;
    }
    readBody(req).then((payload) => {
      if (!payload?.chatId || !payload?.message) {
        json(res, 400, { error: "chatId and message are required" });
        return;
      }
      const messageId = `mock_${Date.now()}`;
      sent.push({ ...payload, messageId, at: new Date().toISOString() });
      json(res, 200, { success: true, messageId });
    });
    return;
  }

  json(res, 404, { error: "Not found" });
});

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Hermes mock bridge http://127.0.0.1:${PORT}`);
});
