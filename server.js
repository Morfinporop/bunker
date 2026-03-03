const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

const PORT = process.env.PORT || 3001;
const DATA_DIR = path.join(__dirname, 'servers_data');

const servers = new Map();

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Error creating data directory:', err);
  }
}

app.post('/api/servers', async (req, res) => {
  const { name, port = 27015, gamemode = 'sandbox', map = 'gm_flatgrass' } = req.body;
  
  const id = Date.now().toString();
  const serverData = {
    id,
    name,
    port,
    gamemode,
    map,
    status: 'stopped',
    players: 0,
    maxPlayers: 16,
    tickrate: 66,
    created: new Date().toISOString(),
    console: [],
    files: []
  };
  
  servers.set(id, serverData);
  
  const serverDir = path.join(DATA_DIR, id);
  await fs.mkdir(serverDir, { recursive: true });
  await fs.writeFile(
    path.join(serverDir, 'config.json'),
    JSON.stringify(serverData, null, 2)
  );
  
  res.json(serverData);
});

app.get('/api/servers', (req, res) => {
  res.json(Array.from(servers.values()));
});

app.get('/api/servers/:id', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  res.json(server);
});

app.delete('/api/servers/:id', async (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  if (server.status === 'running') {
    return res.status(400).json({ error: 'Stop server before deleting' });
  }
  
  servers.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/servers/:id/start', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.status = 'running';
  server.console.push({
    time: new Date().toISOString(),
    message: `Server ${server.name} started on port ${server.port}`
  });
  
  io.emit('serverStatus', { id: server.id, status: 'running' });
  io.emit('console', { id: server.id, line: `[INFO] Server started successfully` });
  
  res.json(server);
});

app.post('/api/servers/:id/stop', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.status = 'stopped';
  server.console.push({
    time: new Date().toISOString(),
    message: `Server ${server.name} stopped`
  });
  
  io.emit('serverStatus', { id: server.id, status: 'stopped' });
  io.emit('console', { id: server.id, line: `[INFO] Server stopped` });
  
  res.json(server);
});

app.post('/api/servers/:id/restart', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.status = 'restarting';
  setTimeout(() => {
    server.status = 'running';
    io.emit('serverStatus', { id: server.id, status: 'running' });
  }, 2000);
  
  io.emit('console', { id: server.id, line: `[INFO] Server restarting...` });
  
  res.json(server);
});

app.post('/api/servers/:id/command', (req, res) => {
  const { command } = req.body;
  const server = servers.get(req.params.id);
  
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  server.console.push({
    time: new Date().toISOString(),
    message: `> ${command}`
  });
  
  io.emit('console', { 
    id: server.id, 
    line: `[COMMAND] ${command}` 
  });
  
  setTimeout(() => {
    io.emit('console', { 
      id: server.id, 
      line: `[RESPONSE] Command executed: ${command}` 
    });
  }, 100);
  
  res.json({ success: true });
});

app.get('/api/servers/:id/files', async (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  const files = [
    { name: 'server.cfg', type: 'file', size: 1024, modified: new Date().toISOString() },
    { name: 'addons', type: 'folder', size: 0, modified: new Date().toISOString() },
    { name: 'gamemodes', type: 'folder', size: 0, modified: new Date().toISOString() },
    { name: 'data', type: 'folder', size: 0, modified: new Date().toISOString() }
  ];
  
  res.json(files);
});

app.put('/api/servers/:id/settings', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) {
    return res.status(404).json({ error: 'Server not found' });
  }
  
  Object.assign(server, req.body);
  res.json(server);
});

app.get('/api/stats', (req, res) => {
  const totalServers = servers.size;
  const runningServers = Array.from(servers.values()).filter(s => s.status === 'running').length;
  const totalPlayers = Array.from(servers.values()).reduce((acc, s) => acc + s.players, 0);
  
  res.json({
    totalServers,
    runningServers,
    totalPlayers,
    uptime: process.uptime()
  });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

ensureDataDir().then(() => {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access: http://localhost:${PORT}`);
  });
});
