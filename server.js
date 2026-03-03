const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static('dist'));

const servers = new Map();
const serverProcesses = new Map();

const BASE_DIR = path.join(__dirname, 'servers');
const STEAMCMD_DIR = path.join(__dirname, 'steamcmd');

if (!fs.existsSync(BASE_DIR)) {
  fs.mkdirSync(BASE_DIR, { recursive: true });
}

if (!fs.existsSync(STEAMCMD_DIR)) {
  fs.mkdirSync(STEAMCMD_DIR, { recursive: true });
}

function getPublicIP() {
  return process.env.RAILWAY_PUBLIC_DOMAIN || 
         process.env.RAILWAY_STATIC_URL ||
         'localhost';
}

app.get('/api/servers', (req, res) => {
  const serverList = Array.from(servers.values()).map(server => {
    const process = serverProcesses.get(server.id);
    return {
      ...server,
      status: process ? 'running' : 'stopped'
    };
  });
  res.json(serverList);
});

app.post('/api/servers', (req, res) => {
  const { name, maxPlayers, map, gamemode } = req.body;
  const id = crypto.randomBytes(16).toString('hex');
  const port = 27015 + servers.size;
  
  const server = {
    id,
    name: name || `GMod Server ${servers.size + 1}`,
    status: 'stopped',
    ip: getPublicIP(),
    port,
    players: 0,
    maxPlayers: maxPlayers || 16,
    map: map || 'gm_flatgrass',
    gamemode: gamemode || 'sandbox'
  };

  const serverDir = path.join(BASE_DIR, id);
  if (!fs.existsSync(serverDir)) {
    fs.mkdirSync(serverDir, { recursive: true });
  }

  const configContent = `
hostname "${server.name}"
sv_defaultgamemode "${server.gamemode}"
map "${server.map}"
maxplayers ${server.maxPlayers}
sv_lan 0
sv_region 4
  `.trim();

  fs.writeFileSync(path.join(serverDir, 'server.cfg'), configContent);

  servers.set(id, server);
  res.json(server);
});

app.post('/api/servers/:id/start', (req, res) => {
  const { id } = req.params;
  const server = servers.get(id);

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  if (serverProcesses.has(id)) {
    return res.status(400).json({ error: 'Server already running' });
  }

  const serverDir = path.join(BASE_DIR, id);
  const gmodDir = path.join(serverDir, 'gmod');
  
  if (!fs.existsSync(gmodDir)) {
    return res.status(400).json({ error: 'GMod files not installed. Please download first.' });
  }

  const scriptPath = path.join(gmodDir, 'srcds_run');
  const execPath = process.platform === 'win32' 
    ? path.join(gmodDir, 'srcds.exe')
    : scriptPath;

  if (!fs.existsSync(execPath)) {
    return res.status(400).json({ error: 'Server executable not found' });
  }

  const args = [
    '-console',
    '-game', 'garrysmod',
    '+maxplayers', server.maxPlayers.toString(),
    '+map', server.map,
    '+gamemode', server.gamemode,
    '-port', server.port.toString(),
    '+exec', 'server.cfg'
  ];

  try {
    const serverProcess = spawn(execPath, args, {
      cwd: gmodDir,
      detached: false
    });

    serverProcess.stdout.on('data', (data) => {
      console.log(`[${server.name}] ${data}`);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error(`[${server.name}] ERROR: ${data}`);
    });

    serverProcess.on('close', (code) => {
      console.log(`[${server.name}] Process exited with code ${code}`);
      serverProcesses.delete(id);
    });

    serverProcesses.set(id, serverProcess);
    server.status = 'running';

    res.json({ message: 'Server started', server });
  } catch (error) {
    console.error('Failed to start server:', error);
    res.status(500).json({ error: 'Failed to start server' });
  }
});

app.post('/api/servers/:id/stop', (req, res) => {
  const { id } = req.params;
  const server = servers.get(id);
  const serverProcess = serverProcesses.get(id);

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  if (!serverProcess) {
    return res.status(400).json({ error: 'Server not running' });
  }

  try {
    serverProcess.kill('SIGTERM');
    serverProcesses.delete(id);
    server.status = 'stopped';
    res.json({ message: 'Server stopped', server });
  } catch (error) {
    console.error('Failed to stop server:', error);
    res.status(500).json({ error: 'Failed to stop server' });
  }
});

app.delete('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  const server = servers.get(id);
  const serverProcess = serverProcesses.get(id);

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    serverProcesses.delete(id);
  }

  const serverDir = path.join(BASE_DIR, id);
  if (fs.existsSync(serverDir)) {
    fs.rmSync(serverDir, { recursive: true, force: true });
  }

  servers.delete(id);
  res.json({ message: 'Server deleted' });
});

app.post('/api/install-steamcmd', async (req, res) => {
  res.json({ message: 'SteamCMD installation started' });

  try {
    const isLinux = process.platform === 'linux';
    
    if (isLinux) {
      if (!fs.existsSync(path.join(STEAMCMD_DIR, 'steamcmd.sh'))) {
        const downloadScript = `
cd ${STEAMCMD_DIR}
curl -sqL "https://steamcdn-a.akamaihd.net/client/installer/steamcmd_linux.tar.gz" | tar zxvf -
chmod +x steamcmd.sh
        `.trim();

        require('child_process').exec(downloadScript, (error, stdout, stderr) => {
          if (error) {
            console.error('SteamCMD installation error:', error);
          } else {
            console.log('SteamCMD installed successfully');
          }
        });
      }
    }
  } catch (error) {
    console.error('Failed to install SteamCMD:', error);
  }
});

app.post('/api/servers/:id/download-gmod', async (req, res) => {
  const { id } = req.params;
  const server = servers.get(id);

  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }

  res.json({ message: 'GMod download started' });

  const serverDir = path.join(BASE_DIR, id);
  const gmodDir = path.join(serverDir, 'gmod');

  if (!fs.existsSync(gmodDir)) {
    fs.mkdirSync(gmodDir, { recursive: true });
  }

  try {
    const isLinux = process.platform === 'linux';
    const steamcmdExec = isLinux 
      ? path.join(STEAMCMD_DIR, 'steamcmd.sh')
      : path.join(STEAMCMD_DIR, 'steamcmd.exe');

    if (fs.existsSync(steamcmdExec)) {
      const installScript = `
${steamcmdExec} +force_install_dir "${gmodDir}" +login anonymous +app_update 4020 validate +quit
      `.trim();

      require('child_process').exec(installScript, (error, stdout, stderr) => {
        if (error) {
          console.error('GMod download error:', error);
        } else {
          console.log('GMod downloaded successfully for server:', server.name);
          
          const serverCfgDest = path.join(gmodDir, 'garrysmod', 'cfg', 'server.cfg');
          const serverCfgSrc = path.join(serverDir, 'server.cfg');
          
          if (!fs.existsSync(path.dirname(serverCfgDest))) {
            fs.mkdirSync(path.dirname(serverCfgDest), { recursive: true });
          }
          
          if (fs.existsSync(serverCfgSrc)) {
            fs.copyFileSync(serverCfgSrc, serverCfgDest);
          }
        }
      });
    } else {
      console.error('SteamCMD not installed. Please install it first.');
    }
  } catch (error) {
    console.error('Failed to download GMod:', error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('message', (message) => {
    console.log('Received:', message);
  });
});

function broadcastLog(serverId, message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ serverId, message }));
    }
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`GMod Control Panel running on port ${PORT}`);
  console.log(`Public IP: ${getPublicIP()}`);
});
