import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const appUrl = "http://localhost:8765";
const healthUrl = "http://127.0.0.1:8766/api/health";
const frontendUrl = "http://127.0.0.1:8765";

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

async function isReachable(url) {
  try {
    const response = await fetch(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitFor(url, label, timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isReachable(url)) return true;
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 750));
  }

  throw new Error(`${label} did not become reachable at ${url}`);
}

async function assertProjectRoot() {
  const packagePath = resolve(projectRoot, "package.json");
  const raw = await readFile(packagePath, "utf8");
  const pkg = JSON.parse(raw);

  if (pkg.name !== "skill-dashboard") {
    throw new Error(`Unexpected package name in ${packagePath}: ${pkg.name}`);
  }
}

async function main() {
  await assertProjectRoot();

  if (!existsSync(resolve(projectRoot, "node_modules"))) {
    console.log("node_modules not found; running npm install");
    await runNpm(["install"]);
  }

  const backendReady = await isReachable(healthUrl);
  const frontendReady = await isReachable(frontendUrl);

  if (!backendReady || !frontendReady) {
    console.log("Skill-Dashboard is not fully reachable; starting background dev server");
    await runNpm(["run", "dev:background"]);
  }

  await waitFor(healthUrl, "API server");
  await waitFor(frontendUrl, "Frontend");

  console.log(`Skill-Dashboard is ready: ${appUrl}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
