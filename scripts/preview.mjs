import { createServer } from "node:http";
import http from "node:http";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_PORT = Number(process.env.PORT || 43147);
const INTERNAL_PORT = Number(process.env.INTERNAL_PORT || 43148);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const startingPage = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="1" />
    <title>Starting Relay</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, sans-serif; background: #111; color: #eee; padding: 3rem; }
    </style>
  </head>
  <body>
    <p>Starting Relay…</p>
  </body>
</html>`;

let nextReady = false;

function startNext() {
  const child = spawn(
    process.execPath,
    [
      path.join(ROOT, "node_modules/next/dist/bin/next"),
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      String(INTERNAL_PORT),
    ],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] },
  );

  const onData = (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
    if (text.includes("Ready") || text.includes("started")) {
      nextReady = true;
    }
  };

  child.stdout.on("data", onData);
  child.stderr.on("data", onData);
  child.on("exit", () => {
    nextReady = false;
  });

  return child;
}

function forward(req, res) {
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
        delete headers["connection"];
        headers["content-length"] = String(body.length);
        headers.connection = "close";
        res.writeHead(up.statusCode || 502, headers);
        res.end(body);
      });
    },
  );

  upstream.on("error", () => {
    const body = startingPage;
    res.writeHead(nextReady ? 502 : 503, {
      "content-type": "text/html; charset=utf-8",
      "content-length": Buffer.byteLength(body),
      connection: "close",
    });
    res.end(body);
  });

  req.pipe(upstream);
}

function attach(server) {
  server.keepAliveTimeout = 1;
  server.headersTimeout = 10_000;
  server.requestTimeout = 30_000;
  server.on("request", forward);
  server.on("clientError", (_err, socket) => {
    if (!socket.writableEnded) {
      socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\nContent-Length: 0\r\n\r\n");
    }
  });
  return server;
}

function listen(server, options) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

const nextChild = startNext();
const ipv4 = attach(createServer());
const ipv6 = attach(createServer());

await listen(ipv4, { port: PUBLIC_PORT, host: "0.0.0.0" });
try {
  await listen(ipv6, { port: PUBLIC_PORT, host: "::", ipv6Only: true });
  console.log(`Relay preview http://127.0.0.1:${PUBLIC_PORT} and http://[::1]:${PUBLIC_PORT}`);
} catch (error) {
  console.log(`Relay preview http://127.0.0.1:${PUBLIC_PORT} (IPv6 unavailable: ${error.message})`);
}

function shutdown() {
  nextChild.kill("SIGTERM");
  ipv4.close();
  ipv6.close();
  setTimeout(() => process.exit(0), 500).unref();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
