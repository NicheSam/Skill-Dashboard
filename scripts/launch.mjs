import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const appUrl = "http://localhost:8765";
const frontendUrl = "http://127.0.0.1:8765";
const healthUrl = "http://127.0.0.1:8766/api/health";
const logDir = resolve(projectRoot, ".logs");
const statePath = resolve(logDir, "launcher-state.json");

function npmCommand(args, options = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32" ? ["/c", "npm.cmd", ...args] : args;

  return spawn(command, commandArgs, {
    cwd: projectRoot,
    env: process.env,
    shell: false,
    stdio: options.stdio ?? "inherit"
  });
}

function runNpm(args) {
  return new Promise((resolvePromise, reject) => {
    const child = npmCommand(args);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        reject(new Error(`npm ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function probeApi() {
  try {
    const response = await fetch(healthUrl, { method: "GET" });
    const body = await response.json().catch(() => ({}));
    return {
      reachable: response.ok,
      owned: response.ok && body?.service === "skill-dashboard-api",
      detail: response.ok ? "healthy" : `HTTP ${response.status}`
    };
  } catch (error) {
    return { reachable: false, owned: false, detail: errorMessage(error) };
  }
}

async function probeFrontend() {
  try {
    const response = await fetch(frontendUrl, { method: "GET" });
    const text = await response.text().catch(() => "");
    return {
      reachable: response.ok,
      owned: response.ok && text.includes("<title>Skill-Dashboard</title>"),
      detail: response.ok ? "healthy" : `HTTP ${response.status}`
    };
  } catch (error) {
    return { reachable: false, owned: false, detail: errorMessage(error) };
  }
}

async function waitForReady(timeoutMs = 30000) {
  const startedAt = Date.now();
  let lastApi = null;
  let lastFrontend = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastApi = await probeApi();
    lastFrontend = await probeFrontend();
    if (lastApi.owned && lastFrontend.owned) return;
    await delay(750);
  }

  throw new Error(
    [
      "Skill-Dashboard did not become ready before timeout.",
      `API: ${formatProbe(lastApi)}`,
      `Frontend: ${formatProbe(lastFrontend)}`,
      `Inspect logs: ${resolve(logDir, "server.err.log")} and ${resolve(logDir, "client.err.log")}`
    ].join("\n")
  );
}

async function assertProjectRoot() {
  const packagePath = resolve(projectRoot, "package.json");
  const raw = await readFile(packagePath, "utf8");
  const pkg = JSON.parse(raw);

  if (pkg.name !== "skill-dashboard") {
    throw new Error(`Unexpected package name in ${packagePath}: ${pkg.name}`);
  }
}

async function classifyStartup() {
  const [api, frontend, state] = await Promise.all([probeApi(), probeFrontend(), readState()]);
  const serverPid = state?.processes?.server?.pid;
  const clientPid = state?.processes?.client?.pid;

  if (api.reachable && !api.owned) {
    throw new Error(portConflictMessage("API", "8766", api, resolve(logDir, "server.err.log")));
  }
  if (frontend.reachable && !frontend.owned) {
    throw new Error(portConflictMessage("frontend", "8765", frontend, resolve(logDir, "client.err.log")));
  }

  const missing = [];
  if (!api.owned) missing.push("server");
  if (!frontend.owned) missing.push("client");

  const stale = [];
  if (serverPid && !isProcessAlive(serverPid) && !api.owned) stale.push(`server pid ${serverPid}`);
  if (clientPid && !isProcessAlive(clientPid) && !frontend.owned) stale.push(`client pid ${clientPid}`);

  return { api, frontend, missing, stale };
}

async function main() {
  await assertProjectRoot();

  if (!existsSync(resolve(projectRoot, "node_modules"))) {
    console.log("node_modules not found; running npm install");
    await runNpm(["install"]);
  }

  const startup = await classifyStartup();

  if (startup.missing.length === 0) {
    console.log(`Skill-Dashboard is already ready: ${appUrl}`);
    return;
  }

  if (startup.stale.length) {
    console.log(`Detected stale launcher state: ${startup.stale.join(", ")}`);
  }

  console.log(`Starting missing service(s): ${startup.missing.join(", ")}`);
  await runNpm(["run", "dev:background", "--", ...startup.missing]);
  await waitForReady();

  console.log(`Skill-Dashboard is ready: ${appUrl}`);
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return {};
  }
}

function portConflictMessage(label, port, probe, logPath) {
  return [
    `Port ${port} is reachable, but it does not look like the Skill-Dashboard ${label}.`,
    `Probe result: ${formatProbe(probe)}`,
    "Stop the process using that port, then run npm run launch again.",
    `If this came from Skill-Dashboard, inspect: ${logPath}`
  ].join("\n");
}

function formatProbe(probe) {
  if (!probe) return "not checked";
  return `${probe.reachable ? "reachable" : "unreachable"}, ${probe.owned ? "owned" : "not owned"}, ${probe.detail}`;
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function delay(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
