import { openSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const logDir = resolve(process.cwd(), ".logs");

await mkdir(logDir, { recursive: true });

function run(label, args) {
  const out = openSync(resolve(logDir, `${label}.out.log`), "a");
  const err = openSync(resolve(logDir, `${label}.err.log`), "a");
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32" ? ["/c", "npm.cmd", ...args] : args;
  const child = spawn(command, commandArgs, {
    cwd: process.cwd(),
    detached: true,
    shell: false,
    stdio: ["ignore", out, err]
  });

  child.unref();
  return child.pid;
}

const serverPid = run("server", ["run", "server"]);
const clientPid = run("client", ["run", "client"]);

console.log(`server pid ${serverPid}`);
console.log(`client pid ${clientPid}`);
