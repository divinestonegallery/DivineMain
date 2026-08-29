import { readdirSync } from "node:fs";
import net from "node:net";
import { spawn } from "node:child_process";

async function availablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;
      probe.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitUntilReady(url, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode != null) throw new Error(`Next.js test server exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // The production server is still starting; retry until the deadline.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Next.js test server did not become ready within 30 seconds");
}

const port = await availablePort();
if (!port) throw new Error("Could not reserve a local test port");
const baseUrl = `http://127.0.0.1:${port}`;
const nextBin = new URL("../node_modules/next/dist/bin/next", import.meta.url).pathname;
const server = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(port) },
  stdio: ["ignore", "inherit", "inherit"],
});

let exitCode = 1;
try {
  await waitUntilReady(baseUrl, server);
  const testFiles = readdirSync("tests")
    .filter((file) => file.endsWith(".test.mjs"))
    .sort()
    .map((file) => `tests/${file}`);
  const runner = spawn(process.execPath, ["--test", ...testFiles], {
    cwd: process.cwd(),
    env: { ...process.env, TEST_BASE_URL: baseUrl },
    stdio: "inherit",
  });
  exitCode = await new Promise((resolve, reject) => {
    runner.once("error", reject);
    runner.once("exit", (code) => resolve(code ?? 1));
  });
} finally {
  if (server.exitCode == null) {
    await new Promise((resolve) => {
      server.once("exit", resolve);
      server.kill("SIGTERM");
    });
  }
}

process.exit(exitCode);
