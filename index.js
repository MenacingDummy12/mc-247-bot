const mineflayer = require('mineflayer');

const botOptions = {
  host: 'ffaseerver.mcsh.io',
  port: 25565,
  username: 'HostKeeperBot',
  version: '1.21.1'
};

console.log('Connecting bot to Minecraft server via GitHub Actions...');
const bot = mineflayer.createBot(botOptions);

bot.on('login', () => console.log('Success: Bot logged into the server!'));

bot.on('spawn', () => {
  setInterval(() => {
    if (bot && bot.entity) {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }
  }, 30000); 
});

bot.on('end', (reason) => {
  console.log(`Disconnected (Reason: ${reason}). Exiting script to trigger runner reload...`);
  process.exit(0); // Safely exits so GitHub can instantly cycle a fresh runner
});

bot.on('error', (err) => {
  console.log(`Connection error: ${err.message}`);
  process.exit(1);
});
