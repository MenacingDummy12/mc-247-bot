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

  bot.on('login', () => {
    botState.status = "connected";
    botState.startTime = Date.now();
    console.log("Logged in");
  });

  bot.on('spawn', () => console.log("Spawned"));

  bot.on('kicked', (reason, loggedIn) =>
    console.log("KICKED:", JSON.stringify(reason), "loggedIn:", loggedIn));

  bot.on('error', (err) => console.log("ERROR:", err.stack || err.message));

  bot.on('end', (reason) => {
    botState.status = "disconnected";
    console.log(`END: ${reason}. Reconnecting in 60s`);
    setTimeout(launchBotEngine, 60000);
  });
}
