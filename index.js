"use strict";

const mineflayer = require("mineflayer");
const config = require("./settings.json");

// Ignore corrupt packet errors instead of crashing
process.on("uncaughtException", (err) => {
  const msg = String(err?.message || err);
  if (msg.includes("PartialReadError") || msg.includes("Read error")) return;
  console.error("Unhandled error:", err);
});

// Keeps the Node process alive no matter what
setInterval(() => {}, 1000 * 60 * 60);

let bot;
let reconnecting = false;

function scheduleReconnect(reason) {
  if (reconnecting) return;
  reconnecting = true;
  console.log(`END: ${reason}. Reconnecting in 60s`);
  setTimeout(() => {
    reconnecting = false;
    launchBotEngine();
  }, 60000);
}

function launchBotEngine() {
  console.log("Initializing bot...");

  bot = mineflayer.createBot({
    host: config.server?.ip || "ffaseerver.mcsh.io",
    port: config.server?.port || 25565,
    username: config.auth?.username || "HostKeeperBot",
    version: config.server?.version || "1.21.1",
    viewDistance: "tiny",
    hideErrors: false
  });

  bot.on("login", () => console.log("Logged in"));
  bot.on("spawn", () => console.log("Spawned"));

  bot.on("kicked", (reason, loggedIn) =>
    console.log("KICKED:", JSON.stringify(reason), "loggedIn:", loggedIn));

  bot.on("error", (err) => console.log("ERROR:", err.stack || err.message));

  bot.on("end", (reason) => scheduleReconnect(reason));
}

launchBotEngine();
