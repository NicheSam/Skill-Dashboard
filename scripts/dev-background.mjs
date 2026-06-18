import { openSync, writeFileSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync, spawn } from "node:child_process";

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
  const outPath = resolve(logDir, `${label}.out.log`);
  const errPath = resolve(logDir, `${label}.err.log`);
  if (process.platform === "win32") {
    const pid = startWindowsProcess(args, outPath, errPath);
    nextState.processes[label] = {
      pid,
      command: `npm ${args.join(" ")}`,
      logOut: outPath,
      logErr: errPath,
      startedAt: new Date().toISOString()
    };
    return pid;
  }

  const out = openSync(outPath, "a");
  const err = openSync(errPath, "a");
  const command = process.platform === "win32" ? `npm.cmd ${args.join(" ")}` : "npm";
  const commandArgs = process.platform === "win32" ? [] : args;
  const child = spawn(command, commandArgs, {
    cwd: projectRoot,
    detached: true,
    shell: process.platform === "win32",
    stdio: ["ignore", out, err]
  });

  child.unref();
  nextState.processes[label] = {
    pid: child.pid,
    command: `npm ${args.join(" ")}`,
    logOut: outPath,
    logErr: errPath,
    startedAt: new Date().toISOString()
  };
  return child.pid;
}

function startWindowsProcess(args, outPath, errPath) {
  void outPath;
  void errPath;
  const service = args[1] ?? "service";
  const scriptPath = resolve(logDir, `run-${service}.cmd`);
  writeFileSync(scriptPath, `@echo off\r\ncd /d "${projectRoot}"\r\nnpm.cmd ${args.join(" ")}\r\n`, "utf8");
  const script = `Start-Process -FilePath 'cmd.exe' -ArgumentList '/k "${escapePowerShell(scriptPath)}"' -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script], {
    cwd: projectRoot,
    encoding: "utf8"
  }).trim();
  const pid = Number(output.split(/\r?\n/).pop());
  if (!Number.isInteger(pid) || pid <= 0) throw new Error(`Could not start ${args.join(" ")}`);
  return pid;
}

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''");
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
