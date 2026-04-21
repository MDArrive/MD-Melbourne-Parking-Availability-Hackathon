import * as MelbourneService from './melbourne.service';

const POLL_INTERVAL_MS     = 60_000;    // sync every 1 min
const SNAPSHOT_INTERVAL_MS = 300_000;   // snapshot every 5 min
const PRUNE_INTERVAL_MS    = 3_600_000; // prune once per hour
const RETENTION_DAYS       = 7;

let syncFailures = 0;
let snapshotFailures = 0;

async function runSync() {
  try {
    const count = await MelbourneService.fetchAndSync();
    syncFailures = 0;
    return count;
  } catch (err) {
    syncFailures++;
    console.error(`[poller] fetchAndSync failed (attempt ${syncFailures}):`, err);
    return 0;
  }
}

async function runSnapshot() {
  try {
    await MelbourneService.captureSnapshot();
    snapshotFailures = 0;
  } catch (err) {
    snapshotFailures++;
    console.error(`[poller] captureSnapshot failed (attempt ${snapshotFailures}):`, err);
  }
}

async function runPrune() {
  try {
    const count = await MelbourneService.pruneOldSnapshots(RETENTION_DAYS);
    if (count > 0) console.log(`[poller] Pruned ${count} snapshots older than ${RETENTION_DAYS} days`);
  } catch (err) {
    console.error('[poller] pruneOldSnapshots failed:', err);
  }
}

export function startMelbournePoller() {
  // Initial sync → only snapshot if sensors were actually loaded
  runSync().then(count => { if (count > 0) runSnapshot(); });

  setInterval(runSync,     POLL_INTERVAL_MS);
  setInterval(runSnapshot, SNAPSHOT_INTERVAL_MS);
  setInterval(runPrune,    PRUNE_INTERVAL_MS);
}
