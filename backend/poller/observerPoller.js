/**
 * pure scheduling - no business logic, no DB, no blockchain details.
 */

import dotenv from 'dotenv';
import { ObserverService } from '../services/observerService.js';
import { EvaluatorService } from '../services/evaluatorService.js';
import { JsonRpcEthereum } from '../protocols/ethereum/JsonRpcEthereum.js';


dotenv.config();

const ETH_RPC_URL = process.env.ETH_RPC_URL;
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || '60000', 10);

if (!ETH_RPC_URL) {
  console.error('ERROR: ETH_RPC_URL environment variable is required');
  console.error('Please set it in your .env file');
  process.exit(1);
}

if (isNaN(POLL_INTERVAL_MS) || POLL_INTERVAL_MS < 1000) {
  console.error('ERROR: POLL_INTERVAL_MS must be a number >= 1000');
  process.exit(1);
}

const eth = new JsonRpcEthereum(ETH_RPC_URL);
const observer = new ObserverService(eth);
const evaluator = new EvaluatorService(eth);

let isRunning = false;


/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Run observation cycle with error handling
 * 
 * @returns {Promise<void>}
 */
async function runCycle() {
  try {
    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting observation cycle...`);
    const observations = await observer.runOnce();
    const alertsFired = await evaluator.evaluate(observations);

    const duration = Date.now() - startTime;
    console.log(
      `[${new Date().toISOString()}] Cycle complete: ` +
      `${observations.length} observations, ${alertsFired} alerts fired in ${duration}ms`
    );
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Observation cycle failed:`, error.message);
  }
}

async function startPolling() {
  if (isRunning) {
    console.warn('Poller is already running');
    return;
  }

  isRunning = true;
  console.log('='.repeat(60));
  console.log('Koin Ping Observer Poller Starting');
  console.log('='.repeat(60));
  console.log(`RPC URL: ${ETH_RPC_URL}`);
  console.log(`Poll Interval: ${POLL_INTERVAL_MS}ms (${POLL_INTERVAL_MS / 1000}s)`);
  console.log('='.repeat(60));

  await runCycle();

  while (isRunning) {
    await sleep(POLL_INTERVAL_MS);
    
    if (isRunning) {
      await runCycle();
    }
  }

  console.log('Poller stopped');
}

function stopPolling() {
  if (!isRunning) {
    return;
  }

  console.log('\n' + '='.repeat(60));
  console.log('Shutting down poller gracefully...');
  console.log('='.repeat(60));
  isRunning = false;
}

// -------------------------
// Graceful Shutdown Handlers
// -------------------------

process.on('SIGINT', () => {
  stopPolling();
  setTimeout(() => process.exit(0), 2000);
});

process.on('SIGTERM', () => {
  stopPolling();
  setTimeout(() => process.exit(0), 2000);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  startPolling().catch((error) => {
    console.error('Fatal error in poller:', error);
    process.exit(1);
  });
}

export { startPolling, stopPolling };

