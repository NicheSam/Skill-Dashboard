import { spawn } from "node:child_process";

const children = [];

function run(label, command, args) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    shell: false,
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`);
      shutdown(code);
    }
  });

  children.push(child);
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm";
const npmPrefix = process.platform === "win32" ? ["/c", "npm.cmd"] : [];

run("server", npmCommand, [...npmPrefix, "run", "server"]);
run("client", npmCommand, [...npmPrefix, "run", "client"]);
