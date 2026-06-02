// Manages the lifecycle of the built app served by `vite preview`.
// Cucumber's BeforeAll/AfterAll hooks call start()/stop() once for the
// whole suite so the preview server isn't rebuilt per scenario.

import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import net from 'node:net';

const PREVIEW_PORT = 4173;
const PREVIEW_HOST = '127.0.0.1';
const READY_TIMEOUT_MS = 30_000;

let proc = null;
let url = null;

function isPortFree(host, port) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.once('error', () => resolve(false));
    s.once('listening', () => {
      s.close(() => resolve(true));
    });
    s.listen(port, host);
  });
}

async function waitForHttp(url, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* not ready yet */
    }
    await sleep(250);
  }
  throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

function ensureBuilt(root) {
  const dist = join(root, 'dist');
  if (!existsSync(join(dist, 'index.html'))) {
    throw new Error(`dist/index.html not found. Run 'bun run build' before 'bun run test:e2e'.`);
  }
  return dist;
}

export async function startServer() {
  if (proc) return url;

  const root = resolve(process.cwd());
  const dist = ensureBuilt(root);

  const free = await isPortFree(PREVIEW_HOST, PREVIEW_PORT);
  if (!free) {
    throw new Error(`Port ${PREVIEW_PORT} is already in use. Stop any other preview server.`);
  }

  // Vite preview needs to be run from the project root with --out pointing to dist.
  // We use the local binary via bunx.
  proc = spawn(
    'bunx',
    [
      'vite',
      'preview',
      '--host',
      PREVIEW_HOST,
      '--port',
      String(PREVIEW_PORT),
      '--strictPort',
      '--outDir',
      dist
    ],
    {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' }
    }
  );

  proc.stdout.on('data', (chunk) => {
    if (process.env.E2E_DEBUG) process.stdout.write(`[preview] ${chunk}`);
  });
  proc.stderr.on('data', (chunk) => {
    if (process.env.E2E_DEBUG) process.stderr.write(`[preview!] ${chunk}`);
  });
  proc.on('exit', (code) => {
    if (process.env.E2E_DEBUG && code !== 0 && code !== null) {
      process.stderr.write(`[preview] exited with code ${code}\n`);
    }
    proc = null;
    url = null;
  });

  url = `http://${PREVIEW_HOST}:${PREVIEW_PORT}`;
  await waitForHttp(url, READY_TIMEOUT_MS);
  return url;
}

export async function stopServer() {
  if (!proc) return;
  proc.kill('SIGTERM');
  // Give it a moment to exit gracefully.
  const exited = await Promise.race([
    new Promise((res) => proc.once('exit', () => res(true))),
    sleep(2000).then(() => false)
  ]);
  if (!exited) {
    proc.kill('SIGKILL');
  }
  proc = null;
  url = null;
}
