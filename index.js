"use strict";

// Modules & Dependencies
const mineflayer = require("mineflayer");
const { Movements, pathfinder, goals } = require("mineflayer-pathfinder");
const { GoalBlock } = goals;
const express = require("express");

// Local settings payload configuration 
// (Ensure your settings.json matches your ffaseerver.mcsh.io criteria!)
const config = require("./settings.json");

// ============================================================
// CRUCIAL ANTI-CRASH FILTER
// ============================================================
process.on('uncaughtException', (err) => {
  if (err.message.includes('PartialReadError') || err.message.includes('Read error')) {
    // Gracefully drop corrupt or unparsed 1.21 item/sound packets
    return; 
  }
  console.error('Unhandled engine error encountered:', err);
});

// ============================================================
// EXPRESS SERVER SETUP
// ============================================================
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 5000;

let botState = {
  status: "disconnected",
  x: "0", y: "0", z: "0",
  uptime: 0,
  startTime: Date.now()
};

// Main Dashboard Interface Payload
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <title>${config.name || "AFK Bot"} Dashboard</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #0d1117; color: #e6edf3;
            display: flex; justify-content: center; align-items: center;
            min-height: 100vh; margin: 0; padding: 24px;
          }
          main { width: 100%; max-width: 400px; }
          header { margin-bottom: 28px; }
          header h1 { font-size: 26px; font-weight: 700; color: #f0f6fc; margin: 0; }
          header p { font-size: 14px; color: #8b949e; margin: 6px 0 0; }
          .status-section { border-radius: 12px; padding: 20px 24px; margin-bottom: 16px; display: flex; align-items: center; gap: 16px; }
          .status-section.online  { background: #0d2218; border: 2px solid #238636; color: #3fb950;}
          .status-section.offline { background: #200d0d; border: 2px solid #da3633; color: #f85149;}
          .stat-card { background: #161b22; border: 1px solid #21262d; border-radius: 10px; padding: 16px 20px; margin-bottom: 10px; }
          dt { font-size: 12px; color: #8b949e; font-weight: 600; margin-bottom: 4px; }
          dd { margin: 0; font-size: 17px; font-weight: 600; color: #e6edf3; }
          footer { margin-top: 20px; text-align: center; font-size: 12px; color: #484f58; }
        </style>
      </head>
      <body>
        <main role="main">
          <header>
            <h1>${config.name || "AFK Bot"} Dashboard</h1>
            <p>Live Infrastructure Monitoring Node</p>
          </header>
          <section id="status-card" class="status-section offline">
            <div>
              <div id="status-label" style="font-weight:700; font-size:18px;">Connecting...</div>
            </div>
          </section>
          <section>
            <div class="stat-card"><dt>Uptime</dt><dd id="uptime-text">0s</dd></div>
            <div class="stat-card"><dt>Coordinates</dt><dd id="coords-text">0, 0, 0</dd></div>
            <div class="stat-card"><dt>Target Endpoint</dt><dd>${config.server?.ip || "ffaseerver.mcsh.io"}</dd></div>
          </section>
          <footer><p>Updates automatically via API stream metrics</p></footer>
        </main>
        <script>
          async function updateMetrics() {
            try {
              const r = await fetch('/health');
              const d = await r.json();
              const card = document.getElementById('status-card');
              const label = document.getElementById('status-label');
              
              if(d.status === 'connected') {
                card.className = 'status-section online';
                label.innerText = 'ONLINE';
              } else {
                card.className = 'status-section offline';
                label.innerText = 'OFFLINE (Cooldown)';
              }
              document.getElementById('uptime-text').innerText = Math.floor(d.uptime) + 's';
              document.getElementById('coords-text').innerText = d.x + ', ' + d.y + ', ' + d.z;
            } catch(e) {}
          }
          setInterval(updateMetrics, 2000);
        </script>
      </body>
    </html>
  `);
});

// JSON Monitoring Route API endpoint
app.get('/health', (req, res) => {
  if (botState.status === "connected") {
    botState.uptime = (Date.now() - botState.startTime) / 1000;
  }
  res.json(botState);
});

app.listen(PORT, () => console.log(`Dashboard panel telemetry live on port ${PORT}`));

// ============================================================
// MINECRAFT CLIENT PROCESS CORE
// ============================================================
let bot;

function launchBotEngine() {
  console.log("Initializing bot networking stack...");
  
  bot = mineflayer.createBot({
    host: config.server?.ip || "ffaseerver.mcsh.io",
    port: config.server?.port || 25565,
    username: config.auth?.username || "HostKeeperBot",
    version: config.server?.version || "1.21.1",
    hideErrors: true
  });

  bot.physicsEnabled = false; // Prevents server container strain drops

  bot.on('login', () => {
    botState.status = "connected";
    botState.startTime = Date.now();
    console.log("Success: Network core authenticated.");
    
    if (bot._client) {
      bot._client.write('settings', {
        locale: 'en_US', viewDistance: 2, chatFlags: 0, chatColors: true,
        skinParts: 0, mainHand: 1, enableTextFiltering: false, allowServerListings: true
      });
    }
  });

  bot.on('spawn', () => {
    const pos = bot.entity.position;
    botState.x = pos.x.toFixed(1);
    botState.y = pos.y.toFixed(1);
    botState.z = pos.z.toFixed(1);
    console.log(`Bot positioned safely at boundary: ${botState.x}, ${botState.y}, ${botState.z}`);
  });

  // Anti-Spam Reconnect Safety Catch
  bot.on('end', (reason) => {
    botState.status = "disconnected";
    console.log(`Disconnected (${reason}). Initiating a 45-second firewall boundary cooldown...`);
    setTimeout(launchBotEngine, 45000);
  });

  bot.on('error', (err) => console.log(`Socket exception handled safely: ${err.message}`));
}

launchBotEngine();
