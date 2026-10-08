/**
 * A tiny Chrome DevTools Protocol driver, for checking the real rendered page.
 *
 * Node 24 ships a WebSocket client, so this needs no packages. It launches
 * headless Chrome, loads a URL at a given viewport, runs an expression in the
 * page and prints the result, optionally writing a screenshot.
 *
 *   node scripts/probe.mjs <url> [--w 390] [--h 844] [--shot out.png]
 *                                [--eval "expr"] [--wait 2500] [--full] [--dark] [--offline] [--then url] [--storage file.json] [--slow]
 */
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

const args = process.argv.slice(2);
const url = args[0];
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const width = Number(flag("w", 390));
const height = Number(flag("h", 844));
const wait = Number(flag("wait", 2500));
const shot = flag("shot", null);
const expression = flag("eval", null);

const PORT = 9222 + Math.floor(Math.random() * 500);
const profile = mkdtempSync(join(tmpdir(), "probe-"));

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    "--no-first-run",
    "--disable-extensions",
    "--hide-scrollbars",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function endpoint() {
  for (let i = 0; i < 60; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const json = await res.json();
      if (json.webSocketDebuggerUrl) return json.webSocketDebuggerUrl;
    } catch {
      // Chrome is still starting.
    }
    await sleep(200);
  }
  throw new Error("Chrome did not expose a debugging endpoint");
}

/** Minimal CDP session: send a command, await its reply by id. */
function session(ws) {
  let nextId = 1;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });

  return (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
}

const ws = new WebSocket(await endpoint());
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
const send = session(ws);

try {
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", {
    targetId,
    flatten: true,
  });
  const cmd = (method, params) => send(method, params, sessionId);

  // Plant localStorage before any page script runs, so a persisted payload
  // from an earlier version can be reproduced exactly.
  const storageFile = flag("storage", null);
  if (storageFile) {
    const entries = JSON.parse(readFileSync(storageFile, "utf8"));
    const source = Object.entries(entries)
      .map(
        ([k, v]) =>
          `try{localStorage.setItem(${JSON.stringify(k)},${JSON.stringify(
            typeof v === "string" ? v : JSON.stringify(v),
          )})}catch(e){}`,
      )
      .join("");
    await cmd("Page.addScriptToEvaluateOnNewDocument", { source });
  }

  await cmd("Page.enable");
  await cmd("Runtime.enable");
  await cmd("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 2,
    mobile: width < 768,
  });

  // Surface page errors rather than letting a broken render look merely ugly.
  const errors = [];
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === "Runtime.exceptionThrown") {
      errors.push(
        msg.params.exceptionDetails.exception?.description ??
          msg.params.exceptionDetails.text,
      );
    }
    if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
      errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
    }
  });

  if (has("dark")) {
    await cmd("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-color-scheme", value: "dark" }],
    });
  }

  await cmd("Page.navigate", { url });
  await sleep(wait);

  // Load once to populate the service worker caches, then cut the network and
  // reload: the only honest way to check an offline claim.
  // Throttle, to reproduce what a phone on a real network sees. A fast local
  // connection hides loading states entirely.
  if (has("slow")) {
    await cmd("Network.enable");
    await cmd("Network.emulateNetworkConditions", {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });
  }

  if (has("offline")) {
    await cmd("Network.enable");
    await cmd("Network.emulateNetworkConditions", {
      offline: true,
      latency: 0,
      downloadThroughput: 0,
      uploadThroughput: 0,
    });
    // CDP's offline emulation applies to the page target, not to the service
    // worker's. For a real test the server itself has to go away, so --settle
    // holds here long enough for the caller to stop it.
    await sleep(Number(flag("settle", 0)));

    const next = flag("then", null);
    if (next) {
      // A genuine top-level navigation to a different route, with the network
      // down — the only way to prove the offline shell really serves a route.
      await cmd("Page.navigate", { url: next });
    } else {
      await cmd("Page.reload", { ignoreCache: false });
    }
    await sleep(wait);
  }

  if (expression) {
    const { result, exceptionDetails } = await cmd("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (exceptionDetails) console.error("EVAL ERROR:", exceptionDetails.text);
    else console.log(JSON.stringify(result.value, null, 2));
  }

  if (shot) {
    const { data } = await cmd("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: has("full"),
    });
    writeFileSync(shot, Buffer.from(data, "base64"));
    console.error(`screenshot -> ${shot}`);
  }

  if (errors.length) {
    console.error("PAGE ERRORS:");
    for (const e of errors) console.error("  " + e);
  }
} finally {
  ws.close();
  chrome.kill();
}
