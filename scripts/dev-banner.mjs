import http from 'node:http';
import os from 'node:os';

// Ignore SIGPIPE — concurrently can close our stdout pipe
process.on('SIGPIPE', () => {});

const BACKEND_PORT = process.env.BACKEND_PORT || '5001';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '5173';
const POLL_INTERVAL = 500;
const TIMEOUT = 30_000;

function probe(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}${path}`, (res) => {
      res.resume();
      resolve(true);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => { req.destroy(); resolve(false); });
  });
}

function getNetworkIP() {
  return Object.values(os.networkInterfaces())
    .flat()
    .find((i) => i && i.family === 'IPv4' && !i.internal)?.address;
}

async function waitForServers() {
  const start = Date.now();
  let backendReady = false;
  let frontendReady = false;

  process.stdout.write('\n  Waiting for servers to start...');

  while (Date.now() - start < TIMEOUT) {
    if (!backendReady) backendReady = await probe(BACKEND_PORT, '/health');
    if (!frontendReady) frontendReady = await probe(FRONTEND_PORT);

    if (backendReady && frontendReady) {
      process.stdout.write('\r\x1b[K');
      return true;
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
  }

  process.stdout.write('\r\x1b[K');
  return false;
}

const ready = await waitForServers();

if (!ready) {
  console.error('\n  Servers did not start within 30s.');
  console.error('  Check logs: logs/backend.log, logs/frontend.log\n');
  process.exit(1);
}

const ip = getNetworkIP();
const bold = (s) => `\x1b[1m${s}\x1b[22m`;
const dim = (s) => `\x1b[2m${s}\x1b[22m`;

const localURL = `http://localhost:${FRONTEND_PORT}`;
const networkURL = ip ? `http://${ip}:${FRONTEND_PORT}` : null;
const backendURL = `http://localhost:${BACKEND_PORT}/api`;

const lines = [
  '',
  '   App running:',
  '',
  `   \u2192 Local:    ${localURL}`,
];

if (networkURL) {
  lines.push(`   \u2192 Network:  ${bold(networkURL)}`);
}

lines.push('');
lines.push(`   Backend API: ${backendURL}`);
lines.push('');
lines.push(`   Logs: ${dim('logs/backend.log, logs/frontend.log')}`);
lines.push('');

const maxLen = lines.reduce((m, l) => {
  // Strip ANSI codes for length calculation
  const plain = l.replace(/\x1b\[[0-9;]*m/g, '');
  return Math.max(m, plain.length);
}, 0);

const pad = (line) => {
  const plain = line.replace(/\x1b\[[0-9;]*m/g, '');
  return line + ' '.repeat(maxLen - plain.length);
};

console.log();
console.log(`  \u250c${'─'.repeat(maxLen + 2)}\u2510`);
for (const line of lines) {
  console.log(`  \u2502 ${pad(line)} \u2502`);
}
console.log(`  \u2514${'─'.repeat(maxLen + 2)}\u2518`);
console.log();

// Keep process alive so concurrently doesn't exit
await new Promise(() => {});
