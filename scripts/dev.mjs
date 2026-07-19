import { spawn } from "node:child_process";

const children = [
  spawn(process.execPath, ["--watch", "server.js"], { stdio: "inherit" }),
  spawn(process.platform === "win32" ? "npm.cmd" : "npm", ["run", "dev:client"], { stdio: "inherit" })
];

function stop(signal = "SIGTERM") {
  for (const child of children) child.kill(signal);
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

const results = await Promise.all(children.map((child) => new Promise((resolve) => child.on("exit", resolve))));
process.exit(results.some((code) => code !== 0 && code !== null) ? 1 : 0);
