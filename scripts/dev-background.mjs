import { openSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { spawn } from "node:child_process";

const projectRoot = process.cwd();
const logDir = resolve(projectRoot, ".logs");
const statePath = resolve(logDir, "launcher-state.json");
const requestedServices = new Set(process.argv.slice(2));
const services = requestedServices.size ? requestedServices : new Set(["server", "client"]);

await mkdir(logDir, { recursive: true });

const currentState = await readState();
const nextState = {
  ...currentState,
  projectRoot,
  updatedAt: new Date().toISOString(),
  processes: {
    ...(currentState.processes ?? {})
  }
};

function run(label, args) {
  const out = openSync(resolve(logDir, `${label}.out.log`), "a");
  const err = openSync(resolve(logDir, `${label}.err.log`), "a");
  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const commandArgs = process.platform === "win32" ? ["/c", "npm.cmd", ...args] : args;
  const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    detached: true,
    shell: false,
    stdio: ["ignore", out, err]
  });

  child.unref();
  nextState.processes[label] = {
    pid: child.pid,
    command: `npm ${args.join(" ")}`,
    logOut: resolve(logDir, `${label}.out.log`),
    logErr: resolve(logDir, `${label}.err.log`),
    startedAt: new Date().toISOString()
  };
  return child.pid;
}

if (services.has("server")) {
  console.log(`server pid ${run("server", ["run", "server"])}`);
}
if (services.has("client")) {
  console.log(`client pid ${run("client", ["run", "client"])}`);
}

await writeFile(statePath, `${JSON.stringify(nextState, null, 2)}\n`, "utf8");

async function readState() {
  try {
    return JSON.parse(await readFile(statePath, "utf8"));
  } catch {
    return {};
  }
}
