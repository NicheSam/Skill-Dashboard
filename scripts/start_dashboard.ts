import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const child = spawn(npmCommand, ["run", "dev"], {
  cwd: projectRoot,
  shell: true,
  stdio: "inherit"
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
