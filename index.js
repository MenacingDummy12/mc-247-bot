const mineflayer = require('mineflayer');

// CRUCIAL FIX: Catch packet parsing errors globally to prevent the script from crashing
process.on('uncaughtException', (err) => {
  if (err.message.includes('PartialReadError') || err.message.includes('Read error')) {
    console.log(`[Parser Warning] Ignored a broken server packet: ${err.message}`);
  } else {
    console.error('System encountered an unhandled error:', err);
    process.exit(1);
  }
});

const botOptions = {
  host: 'ffaseerver.mcsh.io',
  port: 25565,
  username: 'HostKeeperBot',
  version: '1.21.11',
  hideErrors: true // Tells mineflayer to suppress internal protocol errors
};

console.log('Connecting bot to Minecraft server via GitHub Actions...');
const bot = mineflayer.createBot(botOptions);

bot.on('login', () => {
  console.log('Success: Bot logged into the server!');
  
  if (bot._client) {
    bot._client.write('settings', {
      locale: 'en_US',
      viewDistance: 4, // Drop view distance to minimize packet load size
      chatFlags: 0,
      chatColors: true,
      skinParts: 127,
      mainHand: 1,
      enableTextFiltering: false,
      allowServerListings: true
    });
    console.log('Client configuration packets successfully injected.');
  }
});

bot.on('spawn', () => {
  console.log('Bot successfully spawned into the world grid!');
  setInterval(() => {
    if (bot && bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, 30000); 
});

bot.on('end', (reason) => {
  console.log(`Disconnected (Reason: ${reason}). Resetting cloud workflow thread loop...`);
  process.exit(0); 
});

bot.on('error', (err) => {
  console.log(`Connection network exception handled: ${err.message}`);
});
