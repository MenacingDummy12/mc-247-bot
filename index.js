"use strict";

const mineflayer = require("mineflayer");
const config = require("./settings.json");

// ------------------------------------------------------------
// Settings
// ------------------------------------------------------------
const HOST = config.server?.ip || "ffaseerver.mcsh.io";
const PORT = Number(config.server?.port) || 25565;
const USERNAME = config.auth?.username || "KeepAlive_Bot9";
// Empty/missing version = let mineflayer detect it from the server (recommended)
const VERSION = config.server?.version || false;
const DEBUG = Boolean(config.debug);          // true = show raw protocol warnings
const ANTI_AFK = config.antiAfk !== false;    // swing arm now and then (no movement)
const RUN_MINUTES = Number(process.env.RUN_MINUTES || config.runMinutes || 340);

const BASE_DELAY = 30 * 1000;   // first reconnect wait
const MAX_DELAY = 5 * 60 * 1000; // longest reconnect wait
const STABLE_MS = 2 * 60 * 1000; // connected this long = reset the wait

function log(...args) {
  console.log(`[${new Date().toISOString()}]`, ...args);
}

// ------------------------------------------------------------
// Never crash on harmless packet-parsing errors
// ------------------------------------------------------------
process.on("uncaughtException", (err) => {
  const msg = String(err?.message || err);
  if (msg.includes("PartialReadError") || msg.includes("Read error")) return;
  console.error("Unhandled error:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

// ------------------------------------------------------------
// Bot lifecycle
// ------------------------------------------------------------
let bot = null;
let reconnectTimer = null;
let afkTimer = null;
let connectedAt = 0;
let delay = BASE_DELAY;
let shuttingDown = false;

function scheduleReconnect(reason) {
  if (shuttingDown || reconnectTimer) return;

  clearInterval(afkTimer);
  afkTimer = null;

  const wasStable = connectedAt > 0 && Date.now() - connectedAt >= STABLE_MS;
  if (wasStable) delay = BASE_DELAY;
  connectedAt = 0;

  log(`Disconnected (${reason}). Reconnecting in ${Math.round(delay / 1000)}s...`);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    launchBot();
  }, delay);

  if (!wasStable) delay = Math.min(delay * 2, MAX_DELAY);
}

function launchBot() {
  if (shuttingDown) return;

  log(`Connecting to ${HOST}:${PORT} as ${USERNAME} (version: ${VERSION || "auto-detect"})`);

  let b;
  try {
    b = mineflayer.createBot({
      host: HOST,
      port: PORT,
      username: USERNAME,
      version: VERSION,
      viewDistance: "tiny",
      physicsEnabled: false, // do not send movement packets
      hideErrors: !DEBUG
    });
  } catch (err) {
    log("Could not create bot:", err.message);
    scheduleReconnect("create failed");
    return;
  }

  bot = b;
  b.physicsEnabled = false;

  b.on("login", () => {
    if (b !== bot) return;
    connectedAt = Date.now();
    b.physicsEnabled = false;
    log(`Logged in. Protocol version: ${b.version}`);
  });

  b.on("spawn", () => {
    if (b !== bot) return;
    b.physicsEnabled = false;
    const p = b.entity?.position;
    log(`Spawned${p ? ` at ${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)}` : ""}`);

    if (ANTI_AFK && !afkTimer) {
      afkTimer = setInterval(() => {
        try {
          if (b === bot && b.entity) b.swingArm("right");
        } catch (e) {
          /* ignore */
        }
      }, 45 * 1000);
    }
  });

  b.on("kicked", (reason, loggedIn) => {
    if (b !== bot) return;
    log("KICKED:", JSON.stringify(reason), "loggedIn:", loggedIn);
  });

  b.on("error", (err) => {
    if (b !== bot) return;
    log("ERROR:", err?.message || err);
  });

  b.on("end", (reason) => {
    if (b !== bot) return;
    scheduleReconnect(reason || "unknown");
  });
}

// ------------------------------------------------------------
// Clean shutdown (also runs when the workflow is cancelled)
// ------------------------------------------------------------
function shutdown(why) {
  if (shuttingDown) return;
  shuttingDown = true;
  log(`Shutting down (${why}).`);
  clearTimeout(reconnectTimer);
  clearInterval(afkTimer);
  try {
    if (bot) bot.quit();
  } catch (e) {
    /* ignore */
  }
  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Stop before GitHub's 6-hour job limit; the next scheduled run takes over
setTimeout(() => shutdown(`reached ${RUN_MINUTES} minute limit`), RUN_MINUTES * 60 * 1000);

launchBot();
