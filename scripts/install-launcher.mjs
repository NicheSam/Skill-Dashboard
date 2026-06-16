import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir } from "node:os";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const source = resolve(projectRoot, ".codex", "skills", "skill-dashboard-launcher");
const codexHome = process.env.CODEX_HOME || join(homedir(), ".codex");
const destination = resolve(codexHome, "skills", "skill-dashboard-launcher");
const configPath = resolve(destination, "config.json");

const config = {
  projectRoot,
  appUrl: "http://localhost:8765",
  installedAt: new Date().toISOString()
};

await mkdir(resolve(codexHome, "skills"), { recursive: true });
await rm(destination, { recursive: true, force: true });
await cp(source, destination, { recursive: true });
await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");

console.log(`Installed skill-dashboard-launcher to ${destination}`);
console.log(`Wrote project path to ${configPath}`);
console.log("Reload Codex skills, then call: $skill-dashboard-launcher");
