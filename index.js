const mineflayer = require('mineflayer');

process.on('uncaughtException', (err) => {
  if (err.message.includes('PartialReadError') || err.message.includes('Read error')) {
    return; // Ignore parsing packets safely
  }
  console.error('Unhandled system exception:', err);
  process.exit(1);
});

const botOptions = {
  host: 'ffaseerver.mcsh.io',
  port: 25565,
  username: 'CloudGuard_7', // Make sure this is completely unique!
  version: '1.21.1',
  hideErrors: true,
  checkTimeoutInterval: 90 * 1000 // Give it a long safety window to load chunks
};

function startBot() {
  console.log('Connecting bot to Minecraft server via GitHub Actions...');
  const bot = mineflayer.createBot(botOptions);

  bot.physicsEnabled = false; // Keep physics off to save cloud server bandwidth

  bot.on('login', () => {
    console.log('Success: Bot logged into the server!');
    if (bot._client) {
      bot._client.write('settings', {
        locale: 'en_US', viewDistance: 2, chatFlags: 0, chatColors: true,
        skinParts: 0, mainHand: 1, enableTextFiltering: false, allowServerListings: true
      });
    }
  });

  bot.on('spawn', () => {
    console.log('Bot successfully spawned into the world grid!');
  });

  // CRUCIAL CHANGE: Instead of instantly killing the container,
  // wait 45 seconds before attempting a safe retry connection loop.
  bot.on('end', (reason) => {
    console.log(`Disconnected (Reason: ${reason}). Waiting 45 seconds before rejoining to prevent spam locks...`);
    setTimeout(() => {
      startBot();
    }, 45000);
  });

  bot.on('error', (err) => {
    console.log(`Network connection exception handled: ${err.message}`);
  });
}

// Initial boot
startBot();
