import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const publicDir = path.resolve(process.cwd(), "apps", "web", "dist");
const indexFile = path.join(publicDir, "index.html");

const publicPort = Number(process.env.PORT || 3000);
const publicHost = process.env.HOST || "0.0.0.0";
const apiPort = Number(process.env.CONTROLPACT_INTERNAL_API_PORT || 3101);

if (!fs.existsSync(indexFile)) {
  console.error(`ControlPact frontend build not found: ${indexFile}`);
  process.exit(1);
}

const apiProcess = spawn(
  process.execPath,
  ["apps/api/dist/server.js"],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(apiPort),
      HOST: "127.0.0.1",
    },
    stdio: "inherit",
  },
);

apiProcess.on("exit", (code, signal) => {
  console.error(
    `ControlPact API exited unexpectedly (code=${code}, signal=${signal}).`,
  );
  process.exit(code ?? 1);
});

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".mjs", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".gif", "image/gif"],
  [".webp", "image/webp"],
  [".ico", "image/x-icon"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".txt", "text/plain; charset=utf-8"],
  [".map", "application/json; charset=utf-8"],
]);

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(ext) || "application/octet-stream";

  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);

  const stream = fs.createReadStream(filePath);
  stream.on("error", () => {
    if (!res.headersSent) {
      res.statusCode = 500;
    }
    res.end("Internal Server Error");
  });
  stream.pipe(res);
}

function proxyToApi(req, res, targetPath) {
  const proxyReq = http.request(
    {
      hostname: "127.0.0.1",
      port: apiPort,
      method: req.method,
      path: targetPath,
      headers: {
        ...req.headers,
        host: `127.0.0.1:${apiPort}`,
      },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res);
    },
  );

  proxyReq.on("error", (error) => {
    console.error("API proxy error:", error.message);
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    res.end(
      JSON.stringify({
        success: false,
        message: "ControlPact API is temporarily unavailable.",
      }),
    );
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const rawUrl = req.url || "/";
  const queryIndex = rawUrl.indexOf("?");
  const rawPath = queryIndex >= 0 ? rawUrl.slice(0, queryIndex) : rawUrl;
  const rawQuery = queryIndex >= 0 ? rawUrl.slice(queryIndex) : "";

  if (rawPath === "/controlpact-api" || rawPath.startsWith("/controlpact-api/")) {
    const stripped = rawPath.replace(/^\/controlpact-api/, "") || "/";
    proxyToApi(req, res, stripped + rawQuery);
    return;
  }

  // Keep direct API paths working as well.
  if (rawPath === "/v1" || rawPath.startsWith("/v1/")) {
    proxyToApi(req, res, rawUrl);
    return;
  }

  let decodedPath;
  try {
    decodedPath = decodeURIComponent(rawPath);
  } catch {
    res.statusCode = 400;
    res.end("Bad Request");
    return;
  }

  const relativePath =
    decodedPath === "/" ? "index.html" : decodedPath.replace(/^\/+/, "");

  const candidate = path.resolve(publicDir, relativePath);

  if (
    candidate.startsWith(publicDir + path.sep) &&
    fs.existsSync(candidate) &&
    fs.statSync(candidate).isFile()
  ) {
    sendFile(res, candidate);
    return;
  }

  // SPA fallback.
  sendFile(res, indexFile);
});

server.listen(publicPort, publicHost, () => {
  console.log(
    `ControlPact full stack listening at http://${publicHost}:${publicPort}`,
  );
  console.log(`Frontend: ${publicDir}`);
  console.log(`Internal API: http://127.0.0.1:${apiPort}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}; shutting down ControlPact.`);
  server.close(() => {
    if (!apiProcess.killed) {
      apiProcess.kill("SIGTERM");
    }
    process.exit(0);
  });

  setTimeout(() => {
    if (!apiProcess.killed) {
      apiProcess.kill("SIGKILL");
    }
    process.exit(1);
  }, 10000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
