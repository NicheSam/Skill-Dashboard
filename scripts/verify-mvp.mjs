import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const npmPrefix = process.platform === "win32" ? ["/c", "npm.cmd"] : [];
const children = [];

function run(label, args) {
  const child = spawn(npmCommand, args, {
    cwd: process.cwd(),
    shell: false,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => process.stdout.write(`[${label}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${label}] ${chunk}`));
  children.push(child);
  return child;
}

async function waitFor(url, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch {
      // Keep polling until the dev servers are ready.
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function shutdown() {
  for (const child of children) {
    if (child.killed || child.pid === undefined) continue;
    if (process.platform === "win32") {
      spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      child.kill("SIGTERM");
    }
  }
}

let exitCode = 0;

try {
  run("server", [...npmPrefix, "run", "server"]);
  run("client", [...npmPrefix, "run", "client"]);

  const front = await waitFor("http://127.0.0.1:8765");
  const health = await waitFor("http://127.0.0.1:8766/api/health");
  const inventory = await fetch("http://127.0.0.1:8766/api/inventory");
  if (!inventory.ok) {
    throw new Error(`Inventory request failed with ${inventory.status}`);
  }
  const inventoryJson = await inventory.json();
  const firstCapability = inventoryJson.capabilities?.[0];
  if (!firstCapability?.id) {
    throw new Error("Inventory did not return any capabilities");
  }

  const scan = await fetch("http://127.0.0.1:8766/api/scan", { method: "POST" });
  if (!scan.ok) {
    throw new Error(`Scan request failed with ${scan.status}`);
  }

  console.log(
    JSON.stringify(
      {
        frontStatus: front.status,
        health: await health.json(),
        inventoryCount: inventoryJson.capabilities.length,
        scanStatus: scan.status
      },
      null,
      2
    )
  );
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  shutdown();
  process.exit(exitCode);
}
