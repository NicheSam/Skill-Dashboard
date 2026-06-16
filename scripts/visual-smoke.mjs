import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
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
}

async function waitFor(url, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Keep polling until the dev server is ready.
    }
    await delay(500);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function browserPath() {
  const candidates =
    process.platform === "win32"
      ? [
          "C:/Program Files/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
          "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
          "C:/Program Files/Microsoft/Edge/Application/msedge.exe"
        ]
      : ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];

  return candidates.find((candidate) => process.platform !== "win32" || existsSync(candidate));
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
  const browser = browserPath();
  if (!browser) throw new Error("No supported Edge or Chrome executable was found.");

  run("server", [...npmPrefix, "run", "server"]);
  run("client", [...npmPrefix, "run", "client"]);

  await waitFor("http://127.0.0.1:8765");
  await waitFor("http://127.0.0.1:8766/api/health");
  await delay(1500);

  const outputDir = resolve(process.cwd(), "output", "playwright");
  const profilePath = resolve(outputDir, "chrome-profile");
  mkdirSync(outputDir, { recursive: true });

  const shots = [
    { name: "desktop", size: "1440,1000" },
    { name: "mobile", size: "390,844" }
  ].map((shot) => ({
    ...shot,
    path: resolve(outputDir, `skill-dashboard-${shot.name}.png`)
  }));

  for (const shot of shots) {
    const result = spawnSync(
      browser,
      [
        "--headless=new",
        "--disable-gpu",
        "--disable-gpu-compositing",
        "--disable-dev-shm-usage",
        "--no-sandbox",
        "--hide-scrollbars",
        `--window-size=${shot.size}`,
        "--virtual-time-budget=3000",
        `--user-data-dir=${profilePath}-${shot.name}`,
        `--screenshot=${shot.path}`,
        "http://127.0.0.1:8765"
      ],
      { encoding: "utf8" }
    );

    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || `Screenshot command exited with ${result.status}`);
    }
  }

  console.log(JSON.stringify({ screenshots: shots.map((shot) => shot.path) }, null, 2));
} catch (error) {
  exitCode = 1;
  console.error(error);
} finally {
  shutdown();
  process.exit(exitCode);
}
