import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

let servers = [];
let logs = {};

function generateServerId() {
  return `gmod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getServerLogs(serverId) {
  if (!logs[serverId]) {
    logs[serverId] = [];
  }
  return logs[serverId];
}

function addLog(serverId, message) {
  if (!logs[serverId]) {
    logs[serverId] = [];
  }
  const logEntry = {
    timestamp: new Date().toISOString(),
    message
  };
  logs[serverId].push(logEntry);
  if (logs[serverId].length > 1000) {
    logs[serverId] = logs[serverId].slice(-1000);
  }
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'log',
        serverId,
        data: logEntry
      }));
    }
  });
}

app.get('/api/servers', (req, res) => {
  res.json(servers);
});

app.post('/api/servers', (req, res) => {
  const { name, gamemode, maxplayers, map } = req.body;
  
  const port = 27015 + servers.length;
  const serverId = generateServerId();
  
  const newServer = {
    id: serverId,
    name: name || 'GMod Server',
    gamemode: gamemode || 'sandbox',
    maxplayers: parseInt(maxplayers) || 16,
    map: map || 'gm_flatgrass',
    port,
    status: 'stopped',
    players: 0,
    cpu: 0,
    ram: 0,
    created: new Date().toISOString()
  };
  
  servers.push(newServer);
  addLog(serverId, `Server ${name} created on port ${port}`);
  
  res.json(newServer);
});

app.delete('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  const serverIndex = servers.findIndex(s => s.id === id);
  
  if (serverIndex === -1) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  const server = servers[serverIndex];
  servers.splice(serverIndex, 1);
  delete logs[id];
  
  addLog(id, `Server ${server.name} deleted`);
  res.json({ success: true });
});

app.post('/api/servers/:id/start', (req, res) => {
  const { id } = req.params;
  const server = servers.find(s => s.id === id);
  
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.status = 'starting';
  addLog(id, 'Starting server...');
  addLog(id, 'Loading gamemode: ' + server.gamemode);
  addLog(id, 'Loading map: ' + server.map);
  
  setTimeout(() => {
    server.status = 'running';
    server.players = 0;
    server.cpu = Math.floor(Math.random() * 30 + 10);
    server.ram = Math.floor(Math.random() * 500 + 200);
    addLog(id, `Server started on port ${server.port}`);
    addLog(id, `Max players: ${server.maxplayers}`);
    
    const interval = setInterval(() => {
      const srv = servers.find(s => s.id === id);
      if (!srv || srv.status !== 'running') {
        clearInterval(interval);
        return;
      }
      
      if (Math.random() > 0.7) {
        const change = Math.floor(Math.random() * 3) - 1;
        srv.players = Math.max(0, Math.min(srv.maxplayers, srv.players + change));
        if (change > 0) {
          addLog(id, `Player connected [${srv.players}/${srv.maxplayers}]`);
        } else if (change < 0 && srv.players < srv.maxplayers - 1) {
          addLog(id, `Player disconnected [${srv.players}/${srv.maxplayers}]`);
        }
      }
      
      srv.cpu = Math.max(5, srv.cpu + (Math.random() * 10 - 5));
      srv.ram = Math.max(100, srv.ram + (Math.random() * 50 - 25));
    }, 5000);
  }, 2000);
  
  res.json(server);
});

app.post('/api/servers/:id/stop', (req, res) => {
  const { id } = req.params;
  const server = servers.find(s => s.id === id);
  
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.status = 'stopping';
  addLog(id, 'Stopping server...');
  
  setTimeout(() => {
    server.status = 'stopped';
    server.players = 0;
    server.cpu = 0;
    server.ram = 0;
    addLog(id, 'Server stopped');
  }, 1500);
  
  res.json(server);
});

app.post('/api/servers/:id/restart', (req, res) => {
  const { id } = req.params;
  const server = servers.find(s => s.id === id);
  
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.status = 'restarting';
  addLog(id, 'Restarting server...');
  
  setTimeout(() => {
    server.status = 'running';
    addLog(id, 'Server restarted successfully');
  }, 3000);
  
  res.json(server);
});

app.get('/api/servers/:id/logs', (req, res) => {
  const { id } = req.params;
  res.json(getServerLogs(id));
});

app.post('/api/servers/:id/command', (req, res) => {
  const { id } = req.params;
  const { command } = req.body;
  
  const server = servers.find(s => s.id === id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  addLog(id, `> ${command}`);
  
  setTimeout(() => {
    if (command.includes('status')) {
      addLog(id, `hostname: ${server.name}`);
      addLog(id, `map: ${server.map} at (0, 0, 0)`);
      addLog(id, `players: ${server.players}/${server.maxplayers}`);
    } else if (command.includes('changelevel')) {
      const mapMatch = command.match(/changelevel\s+(\S+)/);
      if (mapMatch) {
        server.map = mapMatch[1];
        addLog(id, `Changing level to ${mapMatch[1]}...`);
      }
    } else if (command.includes('say')) {
      addLog(id, `Console: ${command.replace('say', '').trim()}`);
    } else {
      addLog(id, `Command executed: ${command}`);
    }
  }, 100);
  
  res.json({ success: true });
});

app.get('/api/servers/:id/files', (req, res) => {
  const { id } = req.params;
  const { path = '/' } = req.query;
  
  const files = [
    { name: 'garrysmod', type: 'directory', size: 0 },
    { name: 'server.cfg', type: 'file', size: 1024 },
    { name: 'autoexec.cfg', type: 'file', size: 512 },
  ];
  
  if (path === '/garrysmod' || path === '/garrysmod/') {
    files.push(
      { name: 'addons', type: 'directory', size: 0 },
      { name: 'cfg', type: 'directory', size: 0 },
      { name: 'lua', type: 'directory', size: 0 },
      { name: 'data', type: 'directory', size: 0 }
    );
  }
  
  res.json(files);
});

app.get('/api/servers/:id/file', (req, res) => {
  const { path } = req.query;
  
  if (path.includes('server.cfg')) {
    res.json({
      content: `hostname "${servers[0]?.name || 'GMod Server'}"
sv_password ""
rcon_password "changeme"
sv_allowupload 1
sv_allowdownload 1
net_maxfilesize 64`
    });
  } else if (path.includes('autoexec.cfg')) {
    res.json({
      content: `exec server.cfg
log on`
    });
  } else {
    res.json({ content: '' });
  }
});

app.post('/api/servers/:id/file', (req, res) => {
  const { id } = req.params;
  const { path, content } = req.body;
  
  addLog(id, `File saved: ${path}`);
  res.json({ success: true });
});

app.put('/api/servers/:id', (req, res) => {
  const { id } = req.params;
  const server = servers.find(s => s.id === id);
  
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  Object.assign(server, req.body);
  addLog(id, 'Server settings updated');
  
  res.json(server);
});

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Public URL: ${process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:' + PORT}`);
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received:', data);
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});
