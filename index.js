const mineflayer = require('mineflayer');

process.on('uncaughtException', (err) => {
  // Gracefully drop complex item/registry parsing packets so the script never crashes
  if (err.message.includes('PartialReadError') || err.message.includes('Read error')) {
    return;
  }
  console.error('Unhandled script system error:', err);
  process.exit(1);
});

const botOptions = {
  host: 'ffaseerver.mcsh.io',
  port: 25565,
  username: 'CloudGuard_7', // Make sure this doesn't conflict with your other bot!
  version: '1.21.1',
  hideErrors: true,
  checkTimeoutInterval: 60 * 1000 // Prevents premature socket drop-offs
};

console.log('Connecting bot to Minecraft server via GitHub Actions...');
const bot = mineflayer.createBot(botOptions);

// FIX 1: Turn off default heavy world physics parsing. 
// This keeps the bot perfectly anchored on the map without lagging the connection.
bot.physicsEnabled = false; 

bot.on('login', () => {
  console.log('Success: Bot logged into the server!');
  
  if (bot._client) {
    bot._client.write('settings', {
      locale: 'en_US',
      viewDistance: 2, // Minimal view distance reduces heavy chunk network packets
      chatFlags: 0,
      chatColors: true,
      skinParts: 0,
      mainHand: 1,
      enableTextFiltering: false,
      allowServerListings: true
    });
  }
});

bot.on('spawn', () => {
  console.log('Bot successfully spawned into the world grid!');
  
  // FIX 2: Gentle jump loop to send constant traffic packets without triggering anti-cheats
  setInterval(() => {
    if (bot && bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 200);
    }
  }, 15000); 
});

bot.on('end', (reason) => {
  console.log(`Disconnected (Reason: ${reason}). Resetting cloud runner loop...`);
  process.exit(0); 
});

bot.on('error', (err) => {
  console.log(`Network connection exception handled: ${err.message}`);
});
