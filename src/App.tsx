import { useState, useEffect } from 'react';
import axios from 'axios';
import io from 'socket.io-client';

const API_URL = import.meta.env.PROD ? '' : 'http://localhost:3001';
const socket = io(API_URL);

interface Server {
  id: string;
  name: string;
  port: number;
  gamemode: string;
  map: string;
  status: string;
  players: number;
  maxPlayers: number;
  tickrate: number;
  created: string;
}

interface FileItem {
  name: string;
  type: string;
  size: number;
  modified: string;
}

export default function App() {
  const [view, setView] = useState<'create' | 'list' | 'panel'>('list');
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'console' | 'files' | 'settings' | 'startup'>('dashboard');
  const [serverName, setServerName] = useState('');
  const [serverPort, setServerPort] = useState('27015');
  const [gamemode, setGamemode] = useState('sandbox');
  const [map, setMap] = useState('gm_flatgrass');
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [command, setCommand] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);

  useEffect(() => {
    loadServers();
    
    socket.on('console', (data) => {
      if (selectedServer && data.id === selectedServer.id) {
        setConsoleLines(prev => [...prev, data.line].slice(-100));
      }
    });

    socket.on('serverStatus', (data) => {
      if (selectedServer && data.id === selectedServer.id) {
        setSelectedServer(prev => prev ? { ...prev, status: data.status } : null);
      }
      loadServers();
    });

    return () => {
      socket.off('console');
      socket.off('serverStatus');
    };
  }, [selectedServer]);

  const loadServers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/servers`);
      setServers(res.data);
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const createServer = async () => {
    if (!serverName.trim()) return;
    
    try {
      const res = await axios.post(`${API_URL}/api/servers`, {
        name: serverName,
        port: parseInt(serverPort),
        gamemode,
        map
      });
      setServers([...servers, res.data]);
      setServerName('');
      setView('list');
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const startServer = async (id: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/servers/${id}/start`);
      if (selectedServer?.id === id) {
        setSelectedServer(res.data);
      }
      loadServers();
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };

  const stopServer = async (id: string) => {
    try {
      const res = await axios.post(`${API_URL}/api/servers/${id}/stop`);
      if (selectedServer?.id === id) {
        setSelectedServer(res.data);
      }
      loadServers();
    } catch (error) {
      console.error('Failed to stop server:', error);
    }
  };

  const restartServer = async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/servers/${id}/restart`);
      loadServers();
    } catch (error) {
      console.error('Failed to restart server:', error);
    }
  };

  const deleteServer = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/servers/${id}`);
      setServers(servers.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const sendCommand = async () => {
    if (!command.trim() || !selectedServer) return;
    
    try {
      await axios.post(`${API_URL}/api/servers/${selectedServer.id}/command`, { command });
      setCommand('');
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  };

  const loadFiles = async () => {
    if (!selectedServer) return;
    
    try {
      const res = await axios.get(`${API_URL}/api/servers/${selectedServer.id}/files`);
      setFiles(res.data);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const updateSettings = async (settings: Partial<Server>) => {
    if (!selectedServer) return;
    
    try {
      const res = await axios.put(`${API_URL}/api/servers/${selectedServer.id}/settings`, settings);
      setSelectedServer(res.data);
      loadServers();
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const openPanel = (server: Server) => {
    setSelectedServer(server);
    setView('panel');
    setTab('dashboard');
    setConsoleLines([]);
  };

  if (view === 'create') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => setView('list')}
            className="mb-6 px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
          >
            ← Назад
          </button>
          
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl">
            <h1 className="text-3xl font-bold text-white mb-8">Создать сервер</h1>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Название сервера</label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  placeholder="Мой сервер GMod"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Порт</label>
                <input
                  type="number"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Режим игры</label>
                <select
                  value={gamemode}
                  onChange={(e) => setGamemode(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white focus:outline-none focus:border-white/40 transition-all"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="darkrp">DarkRP</option>
                  <option value="ttt">Trouble in Terrorist Town</option>
                  <option value="prophunt">Prop Hunt</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/80 mb-2">Карта</label>
                <input
                  type="text"
                  value={map}
                  onChange={(e) => setMap(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
              </div>
              
              <button
                onClick={createServer}
                className="w-full py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl text-white font-medium hover:bg-white/30 transition-all shadow-lg"
              >
                Создать сервер
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'panel' && selectedServer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setView('list')}
              className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white hover:bg-white/20 transition-all"
            >
              ← Назад к списку
            </button>
            
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-white/10 backdrop-blur-xl border border-white/20 rounded-xl text-white">
                {selectedServer.status === 'running' ? (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Запущен
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                    Остановлен
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 shadow-2xl mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">{selectedServer.name}</h1>
            <p className="text-white/60">ID: {selectedServer.id}</p>
          </div>

          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {['dashboard', 'console', 'files', 'settings', 'startup'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t as any);
                  if (t === 'files') loadFiles();
                }}
                className={`px-6 py-3 rounded-xl font-medium transition-all whitespace-nowrap ${
                  tab === t
                    ? 'bg-white/20 backdrop-blur-xl border border-white/30 text-white shadow-lg'
                    : 'bg-white/5 backdrop-blur-xl border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                {t === 'dashboard' && 'Главная'}
                {t === 'console' && 'Консоль'}
                {t === 'files' && 'Файлы'}
                {t === 'settings' && 'Настройки'}
                {t === 'startup' && 'Запуск'}
              </button>
            ))}
          </div>

          {tab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                  <div className="text-white/60 text-sm mb-2">Статус</div>
                  <div className="text-2xl font-bold text-white">{selectedServer.status}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                  <div className="text-white/60 text-sm mb-2">Игроки</div>
                  <div className="text-2xl font-bold text-white">{selectedServer.players}/{selectedServer.maxPlayers}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                  <div className="text-white/60 text-sm mb-2">Порт</div>
                  <div className="text-2xl font-bold text-white">{selectedServer.port}</div>
                </div>
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                  <div className="text-white/60 text-sm mb-2">Tickrate</div>
                  <div className="text-2xl font-bold text-white">{selectedServer.tickrate}</div>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Управление</h2>
                <div className="flex flex-wrap gap-3">
                  {selectedServer.status !== 'running' ? (
                    <button
                      onClick={() => startServer(selectedServer.id)}
                      className="px-6 py-3 bg-green-500/20 backdrop-blur-xl border border-green-400/30 rounded-xl text-green-300 font-medium hover:bg-green-500/30 transition-all"
                    >
                      Запустить
                    </button>
                  ) : (
                    <button
                      onClick={() => stopServer(selectedServer.id)}
                      className="px-6 py-3 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-xl text-red-300 font-medium hover:bg-red-500/30 transition-all"
                    >
                      Остановить
                    </button>
                  )}
                  <button
                    onClick={() => restartServer(selectedServer.id)}
                    className="px-6 py-3 bg-blue-500/20 backdrop-blur-xl border border-blue-400/30 rounded-xl text-blue-300 font-medium hover:bg-blue-500/30 transition-all"
                  >
                    Перезапустить
                  </button>
                </div>
              </div>

              <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Информация</h2>
                <div className="space-y-3 text-white/80">
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span>Режим игры:</span>
                    <span className="font-medium">{selectedServer.gamemode}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span>Карта:</span>
                    <span className="font-medium">{selectedServer.map}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-white/10">
                    <span>Создан:</span>
                    <span className="font-medium">{new Date(selectedServer.created).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'console' && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <div className="bg-black/40 rounded-xl p-4 h-96 overflow-y-auto font-mono text-sm mb-4">
                {consoleLines.length === 0 ? (
                  <div className="text-white/40">Консоль пуста. Запустите сервер для просмотра логов.</div>
                ) : (
                  consoleLines.map((line, i) => (
                    <div key={i} className="text-green-400 mb-1">{line}</div>
                  ))
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
                  placeholder="Введите команду..."
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                />
                <button
                  onClick={sendCommand}
                  className="px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl text-white font-medium hover:bg-white/30 transition-all"
                >
                  Отправить
                </button>
              </div>
            </div>
          )}

          {tab === 'files' && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4">Файловый менеджер</h2>
              <div className="space-y-2">
                {files.length === 0 ? (
                  <div className="text-white/40 text-center py-8">Файлы не найдены</div>
                ) : (
                  files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {file.type === 'folder' ? '📁' : '📄'}
                        </div>
                        <div>
                          <div className="text-white font-medium">{file.name}</div>
                          <div className="text-white/40 text-sm">
                            {file.type === 'folder' ? 'Папка' : `${(file.size / 1024).toFixed(2)} KB`}
                          </div>
                        </div>
                      </div>
                      <div className="text-white/40 text-sm">
                        {new Date(file.modified).toLocaleString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'settings' && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Настройки сервера</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Название сервера</label>
                  <input
                    type="text"
                    defaultValue={selectedServer.name}
                    onBlur={(e) => updateSettings({ name: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Максимум игроков</label>
                  <input
                    type="number"
                    defaultValue={selectedServer.maxPlayers}
                    onBlur={(e) => updateSettings({ maxPlayers: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Tickrate</label>
                  <input
                    type="number"
                    defaultValue={selectedServer.tickrate}
                    onBlur={(e) => updateSettings({ tickrate: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'startup' && (
            <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-6">Параметры запуска</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Режим игры</label>
                  <input
                    type="text"
                    defaultValue={selectedServer.gamemode}
                    onBlur={(e) => updateSettings({ gamemode: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Карта</label>
                  <input
                    type="text"
                    defaultValue={selectedServer.map}
                    onBlur={(e) => updateSettings({ map: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">Порт сервера</label>
                  <input
                    type="number"
                    defaultValue={selectedServer.port}
                    onBlur={(e) => updateSettings({ port: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-all"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">GMod Control Panel</h1>
            <p className="text-white/60">Управление серверами Garry's Mod</p>
          </div>
          <button
            onClick={() => setView('create')}
            className="px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl text-white font-medium hover:bg-white/30 transition-all shadow-lg"
          >
            + Создать сервер
          </button>
        </div>

        {servers.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">🎮</div>
            <h2 className="text-2xl font-bold text-white mb-2">Серверов пока нет</h2>
            <p className="text-white/60 mb-6">Создайте свой первый сервер Garry's Mod</p>
            <button
              onClick={() => setView('create')}
              className="px-6 py-3 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl text-white font-medium hover:bg-white/30 transition-all"
            >
              Создать сервер
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server) => (
              <div key={server.id} className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{server.name}</h3>
                    <p className="text-white/60 text-sm">{server.gamemode}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    server.status === 'running'
                      ? 'bg-green-500/20 text-green-300 border border-green-400/30'
                      : 'bg-red-500/20 text-red-300 border border-red-400/30'
                  }`}>
                    {server.status === 'running' ? 'Online' : 'Offline'}
                  </div>
                </div>

                <div className="space-y-2 mb-4 text-sm text-white/80">
                  <div className="flex justify-between">
                    <span>Игроки:</span>
                    <span className="font-medium">{server.players}/{server.maxPlayers}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Порт:</span>
                    <span className="font-medium">{server.port}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Карта:</span>
                    <span className="font-medium">{server.map}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openPanel(server)}
                    className="flex-1 px-4 py-2 bg-white/20 backdrop-blur-xl border border-white/30 rounded-xl text-white text-sm font-medium hover:bg-white/30 transition-all"
                  >
                    Управление
                  </button>
                  {server.status !== 'running' && (
                    <button
                      onClick={() => deleteServer(server.id)}
                      className="px-4 py-2 bg-red-500/20 backdrop-blur-xl border border-red-400/30 rounded-xl text-red-300 text-sm font-medium hover:bg-red-500/30 transition-all"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
