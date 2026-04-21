import * as MelbourneService from './melbourne.service';

const POLL_INTERVAL_MS     = 60_000;   // sync every 1 min
const SNAPSHOT_INTERVAL_MS = 300_000;  // snapshot every 5 min

export function startMelbournePoller() {
  // Initial sync + first snapshot
  MelbourneService.fetchAndSync()
    .then(() => MelbourneService.captureSnapshot())
    .catch(console.error);

  setInterval(() => MelbourneService.fetchAndSync().catch(console.error), POLL_INTERVAL_MS);
  setInterval(() => MelbourneService.captureSnapshot().catch(console.error), SNAPSHOT_INTERVAL_MS);
}
