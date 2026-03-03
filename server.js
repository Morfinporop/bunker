const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const RAILWAY_PUBLIC_DOMAIN = process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost';

app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

const servers = new Map();
const serverLogs = new Map();
let serverIdCounter = 3;

const exampleServers = [
  {
    id: 'server-1',
    name: 'Sandbox Server #1',
    status: 'stopped',
    gamemode: 'sandbox',
    map: 'gm_flatgrass',
    maxplayers: 16,
    currentplayers: 0,
    port: 27015,
    memory: 2048,
    cpu: 0,
    ip: RAILWAY_PUBLIC_DOMAIN
  },
  {
    id: 'server-2',
    name: 'DarkRP Server',
    status: 'stopped',
    gamemode: 'darkrp',
    map: 'rp_downtown_v4c',
    maxplayers: 32,
    currentplayers: 0,
    port: 27016,
    memory: 4096,
    cpu: 0,
    ip: RAILWAY_PUBLIC_DOMAIN
  }
];

exampleServers.forEach(server => {
  servers.set(server.id, server);
  serverLogs.set(server.id, []);
});

function addLog(serverId, message, type = 'info') {
  if (!serverLogs.has(serverId)) {
    serverLogs.set(serverId, []);
  }
  
  const logs = serverLogs.get(serverId);
  const timestamp = new Date().toLocaleTimeString('ru-RU');
  
  logs.push({ timestamp, message, type });
  
  if (logs.length > 100) {
    logs.shift();
  }
  
  serverLogs.set(serverId, logs);
}

app.get('/api/servers', (req, res) => {
  res.json(Array.from(servers.values()));
});

app.get('/api/servers/:id', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  res.json(server);
});

app.post('/api/servers', (req, res) => {
  const { name, gamemode, map, maxplayers, memory } = req.body;
  
  const server = {
    id: `server-${serverIdCounter++}`,
    name,
    gamemode,
    map,
    maxplayers,
    currentplayers: 0,
    port: 27015 + servers.size,
    memory,
    cpu: 0,
    status: 'stopped',
    ip: RAILWAY_PUBLIC_DOMAIN
  };
  
  servers.set(server.id, server);
  serverLogs.set(server.id, []);
  
  addLog(server.id, `Сервер ${name} создан`);
  
  res.json(server);
});

app.post('/api/servers/:id/start', async (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  if (server.status === 'running') {
    return res.status(400).json({ error: 'Server already running' });
  }
  
  server.status = 'starting';
  servers.set(server.id, server);
  
  addLog(server.id, 'Запуск сервера...');
  addLog(server.id, `Загрузка карты ${server.map}...`);
  addLog(server.id, `Инициализация режима ${server.gamemode}...`);
  addLog(server.id, 'Подключение к Steam Workshop...');
  addLog(server.id, 'Загрузка аддонов...');
  
  setTimeout(() => {
    server.status = 'running';
    server.cpu = Math.floor(Math.random() * 30) + 20;
    server.currentplayers = Math.floor(Math.random() * 5);
    servers.set(server.id, server);
    
    addLog(server.id, 'Сервер успешно запущен!');
    addLog(server.id, `Подключение: connect ${server.ip}:${server.port}`);
    
    const interval = setInterval(() => {
      const s = servers.get(server.id);
      if (s && s.status === 'running') {
        s.cpu = Math.floor(Math.random() * 20) + 30;
        s.currentplayers = Math.min(s.maxplayers, Math.max(0, s.currentplayers + (Math.random() > 0.5 ? 1 : -1)));
        servers.set(server.id, s);
      } else {
        clearInterval(interval);
      }
    }, 10000);
  }, 3000);
  
  res.json(server);
});

app.post('/api/servers/:id/stop', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  if (server.status === 'stopped') {
    return res.status(400).json({ error: 'Server already stopped' });
  }
  
  server.status = 'stopping';
  servers.set(server.id, server);
  
  addLog(server.id, 'Остановка сервера...');
  addLog(server.id, 'Отключение игроков...');
  addLog(server.id, 'Сохранение данных...');
  
  setTimeout(() => {
    server.status = 'stopped';
    server.cpu = 0;
    server.currentplayers = 0;
    servers.set(server.id, server);
    
    addLog(server.id, 'Сервер остановлен');
  }, 2000);
  
  res.json(server);
});

app.post('/api/servers/:id/restart', (req, res) => {
  const server = servers.get(req.params.id);
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  addLog(server.id, 'Перезапуск сервера...');
  
  server.status = 'stopping';
  servers.set(server.id, server);
  
  setTimeout(() => {
    server.status = 'starting';
    servers.set(server.id, server);
    
    addLog(server.id, 'Запуск сервера...');
    
    setTimeout(() => {
      server.status = 'running';
      server.cpu = Math.floor(Math.random() * 30) + 20;
      servers.set(server.id, server);
      
      addLog(server.id, 'Сервер успешно перезапущен!');
    }, 3000);
  }, 2000);
  
  res.json(server);
});

app.delete('/api/servers/:id', (req, res) => {
  const server = servers.get(req.params.id);
  if (server) {
    addLog(server.id, 'Сервер удален');
    servers.delete(req.params.id);
    serverLogs.delete(req.params.id);
  }
  res.json({ success: true });
});

app.get('/api/servers/:id/logs', (req, res) => {
  const logs = serverLogs.get(req.params.id) || [];
  res.json(logs);
});

app.post('/api/servers/:id/command', (req, res) => {
  const { command } = req.body;
  const server = servers.get(req.params.id);
  
  if (!server) return res.status(404).json({ error: 'Server not found' });
  
  addLog(req.params.id, `> ${command}`, 'info');
  
  if (command === 'status') {
    addLog(req.params.id, `Статус: ${server.status}`, 'info');
    addLog(req.params.id, `Игроки: ${server.currentplayers}/${server.maxplayers}`, 'info');
    addLog(req.params.id, `CPU: ${server.cpu}%`, 'info');
    addLog(req.params.id, `RAM: ${server.memory}MB`, 'info');
  } else if (command.startsWith('changelevel')) {
    const map = command.split(' ')[1] || 'gm_flatgrass';
    server.map = map;
    servers.set(server.id, server);
    addLog(req.params.id, `Смена карты на ${map}...`, 'info');
    setTimeout(() => {
      addLog(req.params.id, `Карта изменена на ${map}`, 'info');
    }, 2000);
  } else if (command === 'help') {
    addLog(req.params.id, 'Доступные команды:', 'info');
    addLog(req.params.id, '  status - показать статус сервера', 'info');
    addLog(req.params.id, '  changelevel <map> - сменить карту', 'info');
    addLog(req.params.id, '  help - список команд', 'info');
  } else {
    addLog(req.params.id, `Команда "${command}" выполнена`, 'info');
  }
  
  res.json({ success: true });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Public domain: ${RAILWAY_PUBLIC_DOMAIN}`);
});
