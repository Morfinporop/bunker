import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  Server, 
  Play, 
  Square, 
  RotateCw, 
  Trash2, 
  Terminal, 
  FolderOpen, 
  Settings, 
  Home,
  Cpu,
  HardDrive,
  Users,
  Activity,
  Save,
  Plus,
  Send,
  File,
  Folder,
  ChevronRight,
  Eye
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

interface Server {
  id: string;
  name: string;
  gamemode: string;
  maxplayers: number;
  map: string;
  port: number;
  status: 'running' | 'stopped' | 'starting' | 'stopping' | 'restarting';
  players: number;
  cpu: number;
  ram: number;
  created: string;
}

interface LogEntry {
  timestamp: string;
  message: string;
}

interface FileItem {
  name: string;
  type: 'file' | 'directory';
  size: number;
}

function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'overview' | 'console' | 'files' | 'settings'>('home');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [command, setCommand] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [fileContent, setFileContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    gamemode: 'sandbox',
    maxplayers: 16,
    map: 'gm_flatgrass'
  });
  const logsEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadServers();
    
    const ws = new WebSocket(
      window.location.protocol === 'https:' 
        ? `wss://${window.location.host}` 
        : `ws://${window.location.hostname}:${window.location.port || 3000}`
    );
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log' && data.serverId === selectedServer?.id) {
          setLogs(prev => [...prev, data.data]);
        }
      } catch (e) {
        console.error('WebSocket error:', e);
      }
    };
    
    wsRef.current = ws;
    
    const interval = setInterval(loadServers, 3000);
    
    return () => {
      clearInterval(interval);
      ws.close();
    };
  }, []);

  useEffect(() => {
    if (selectedServer) {
      loadLogs();
      if (activeTab === 'files') {
        loadFiles();
      }
    }
  }, [selectedServer, activeTab]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const loadServers = async () => {
    try {
      const { data } = await axios.get(`${API_URL}/api/servers`);
      setServers(data);
      if (selectedServer) {
        const updated = data.find((s: Server) => s.id === selectedServer.id);
        if (updated) setSelectedServer(updated);
      }
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const loadLogs = async () => {
    if (!selectedServer) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/servers/${selectedServer.id}/logs`);
      setLogs(data);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  const loadFiles = async () => {
    if (!selectedServer) return;
    try {
      const { data } = await axios.get(`${API_URL}/api/servers/${selectedServer.id}/files`, {
        params: { path: currentPath }
      });
      setFiles(data);
    } catch (error) {
      console.error('Failed to load files:', error);
    }
  };

  const createServer = async () => {
    try {
      const { data } = await axios.post(`${API_URL}/api/servers`, newServer);
      setServers([...servers, data]);
      setShowCreateModal(false);
      setNewServer({ name: '', gamemode: 'sandbox', maxplayers: 16, map: 'gm_flatgrass' });
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('Вы уверены что хотите удалить этот сервер?')) return;
    try {
      await axios.delete(`${API_URL}/api/servers/${id}`);
      setServers(servers.filter(s => s.id !== id));
      if (selectedServer?.id === id) {
        setSelectedServer(null);
        setActiveTab('home');
      }
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const startServer = async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/servers/${id}/start`);
      loadServers();
    } catch (error) {
      console.error('Failed to start server:', error);
    }
  };

  const stopServer = async (id: string) => {
    try {
      await axios.post(`${API_URL}/api/servers/${id}/stop`);
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

  const sendCommand = async () => {
    if (!selectedServer || !command.trim()) return;
    try {
      await axios.post(`${API_URL}/api/servers/${selectedServer.id}/command`, { command });
      setCommand('');
    } catch (error) {
      console.error('Failed to send command:', error);
    }
  };

  const openFile = async (file: FileItem) => {
    if (file.type === 'directory') {
      setCurrentPath(`${currentPath}${file.name}/`);
      loadFiles();
    } else {
      try {
        const { data } = await axios.get(`${API_URL}/api/servers/${selectedServer?.id}/file`, {
          params: { path: `${currentPath}${file.name}` }
        });
        setFileContent(data.content);
        setSelectedFile(file.name);
      } catch (error) {
        console.error('Failed to open file:', error);
      }
    }
  };

  const saveFile = async () => {
    if (!selectedServer || !selectedFile) return;
    try {
      await axios.post(`${API_URL}/api/servers/${selectedServer.id}/file`, {
        path: `${currentPath}${selectedFile}`,
        content: fileContent
      });
      alert('Файл сохранен');
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  const updateServerSettings = async () => {
    if (!selectedServer) return;
    try {
      await axios.put(`${API_URL}/api/servers/${selectedServer.id}`, selectedServer);
      alert('Настройки сохранены');
      loadServers();
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-500';
      case 'stopped': return 'bg-red-500';
      case 'starting': return 'bg-yellow-500';
      case 'stopping': return 'bg-orange-500';
      case 'restarting': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Работает';
      case 'stopped': return 'Остановлен';
      case 'starting': return 'Запускается';
      case 'stopping': return 'Останавливается';
      case 'restarting': return 'Перезагружается';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 text-gray-100">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-black/40 backdrop-blur-xl border-r border-gray-700/50">
        <div className="p-6 border-b border-gray-700/50">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
            GMod Hosting
          </h1>
        </div>

        <nav className="p-4 space-y-2">
          <button
            onClick={() => { setActiveTab('home'); setSelectedServer(null); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              activeTab === 'home'
                ? 'bg-gray-700/50 text-white shadow-lg'
                : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Главная</span>
          </button>

          {selectedServer && (
            <>
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'overview'
                    ? 'bg-gray-700/50 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
                }`}
              >
                <Eye className="w-5 h-5" />
                <span>Обзор</span>
              </button>

              <button
                onClick={() => setActiveTab('console')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'console'
                    ? 'bg-gray-700/50 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
                }`}
              >
                <Terminal className="w-5 h-5" />
                <span>Консоль</span>
              </button>

              <button
                onClick={() => setActiveTab('files')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'files'
                    ? 'bg-gray-700/50 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
                }`}
              >
                <FolderOpen className="w-5 h-5" />
                <span>Файлы</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'settings'
                    ? 'bg-gray-700/50 text-white shadow-lg'
                    : 'text-gray-400 hover:bg-gray-800/30 hover:text-gray-200'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span>Настройки</span>
              </button>
            </>
          )}
        </nav>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {activeTab === 'home' && (
          <div>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold">Ваши серверы</h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all shadow-lg"
              >
                <Plus className="w-5 h-5" />
                Создать сервер
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servers.map(server => (
                <div
                  key={server.id}
                  className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">{server.name}</h3>
                    <div className={`w-3 h-3 rounded-full ${getStatusColor(server.status)} shadow-lg`} />
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-gray-400">
                    <div className="flex justify-between">
                      <span>Статус:</span>
                      <span className="text-gray-200">{getStatusText(server.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Порт:</span>
                      <span className="text-gray-200">{server.port}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Игроки:</span>
                      <span className="text-gray-200">{server.players}/{server.maxplayers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Карта:</span>
                      <span className="text-gray-200">{server.map}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {server.status === 'running' ? (
                      <button
                        onClick={() => stopServer(server.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                      >
                        <Square className="w-4 h-4" />
                        Стоп
                      </button>
                    ) : (
                      <button
                        onClick={() => startServer(server.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-all"
                      >
                        <Play className="w-4 h-4" />
                        Старт
                      </button>
                    )}

                    <button
                      onClick={() => restartServer(server.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-all"
                    >
                      <RotateCw className="w-4 h-4" />
                      Перезапуск
                    </button>

                    <button
                      onClick={() => { setSelectedServer(server); setActiveTab('overview'); }}
                      className="px-4 py-2 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all"
                    >
                      <Server className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => deleteServer(server.id)}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {servers.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Нет созданных серверов</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'overview' && selectedServer && (
          <div>
            <h2 className="text-3xl font-bold mb-8">{selectedServer.name}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-600/20 rounded-lg">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Игроки</div>
                    <div className="text-2xl font-bold">{selectedServer.players}/{selectedServer.maxplayers}</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600/20 rounded-lg">
                    <Cpu className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">CPU</div>
                    <div className="text-2xl font-bold">{selectedServer.cpu.toFixed(1)}%</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-600/20 rounded-lg">
                    <HardDrive className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">RAM</div>
                    <div className="text-2xl font-bold">{selectedServer.ram.toFixed(0)} MB</div>
                  </div>
                </div>
              </div>

              <div className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 ${getStatusColor(selectedServer.status)} bg-opacity-20 rounded-lg`}>
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Статус</div>
                    <div className="text-xl font-bold">{getStatusText(selectedServer.status)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
              <h3 className="text-xl font-semibold mb-4">Информация о сервере</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">IP адрес</div>
                  <div className="font-mono bg-black/50 px-3 py-2 rounded">
                    {window.location.hostname}:{selectedServer.port}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Режим игры</div>
                  <div className="font-mono bg-black/50 px-3 py-2 rounded">{selectedServer.gamemode}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Карта</div>
                  <div className="font-mono bg-black/50 px-3 py-2 rounded">{selectedServer.map}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">Создан</div>
                  <div className="font-mono bg-black/50 px-3 py-2 rounded">
                    {new Date(selectedServer.created).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'console' && selectedServer && (
          <div>
            <h2 className="text-3xl font-bold mb-8">Консоль - {selectedServer.name}</h2>

            <div className="bg-black/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
              <div className="h-[600px] overflow-y-auto p-4 font-mono text-sm space-y-1">
                {logs.map((log, index) => (
                  <div key={index} className="text-gray-300">
                    <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                    {log.message}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>

              <div className="border-t border-gray-700/50 p-4 bg-black/30">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
                    placeholder="Введите команду..."
                    className="flex-1 bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  />
                  <button
                    onClick={sendCommand}
                    className="px-6 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all flex items-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Отправить
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'files' && selectedServer && (
          <div>
            <h2 className="text-3xl font-bold mb-8">Файлы - {selectedServer.name}</h2>

            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-1 bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
                <div className="mb-4 text-sm text-gray-400 font-mono">{currentPath}</div>
                <div className="space-y-1">
                  {currentPath !== '/' && (
                    <button
                      onClick={() => {
                        const parts = currentPath.split('/').filter(Boolean);
                        parts.pop();
                        setCurrentPath(parts.length ? '/' + parts.join('/') + '/' : '/');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 rounded-lg transition-all text-left"
                    >
                      <ChevronRight className="w-4 h-4 rotate-180" />
                      <span>..</span>
                    </button>
                  )}
                  {files.map((file, index) => (
                    <button
                      key={index}
                      onClick={() => openFile(file)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800/50 rounded-lg transition-all text-left"
                    >
                      {file.type === 'directory' ? (
                        <Folder className="w-4 h-4 text-yellow-500" />
                      ) : (
                        <File className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="flex-1">{file.name}</span>
                      {file.type === 'directory' && <ChevronRight className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="col-span-2 bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4">
                {selectedFile ? (
                  <div className="h-full flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-lg font-semibold">{selectedFile}</div>
                      <button
                        onClick={saveFile}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all"
                      >
                        <Save className="w-4 h-4" />
                        Сохранить
                      </button>
                    </div>
                    <textarea
                      value={fileContent}
                      onChange={(e) => setFileContent(e.target.value)}
                      className="flex-1 bg-black/50 border border-gray-700/50 rounded-lg p-4 font-mono text-sm focus:outline-none focus:border-gray-600 resize-none"
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    <div className="text-center">
                      <FolderOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Выберите файл для редактирования</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && selectedServer && (
          <div>
            <h2 className="text-3xl font-bold mb-8">Настройки - {selectedServer.name}</h2>

            <div className="bg-black/30 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2">Название сервера</label>
                  <input
                    type="text"
                    value={selectedServer.name}
                    onChange={(e) => setSelectedServer({ ...selectedServer, name: e.target.value })}
                    className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Режим игры</label>
                  <select
                    value={selectedServer.gamemode}
                    onChange={(e) => setSelectedServer({ ...selectedServer, gamemode: e.target.value })}
                    className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="darkrp">DarkRP</option>
                    <option value="ttt">Trouble in Terrorist Town</option>
                    <option value="prophunt">Prop Hunt</option>
                    <option value="deathrun">Deathrun</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Максимум игроков</label>
                  <input
                    type="number"
                    value={selectedServer.maxplayers}
                    onChange={(e) => setSelectedServer({ ...selectedServer, maxplayers: parseInt(e.target.value) })}
                    className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Карта</label>
                  <input
                    type="text"
                    value={selectedServer.map}
                    onChange={(e) => setSelectedServer({ ...selectedServer, map: e.target.value })}
                    className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  />
                </div>

                <button
                  onClick={updateServerSettings}
                  className="w-full px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-5 h-5" />
                  Сохранить настройки
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700/50 rounded-xl p-8 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-6">Создать новый сервер</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Название</label>
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  placeholder="Мой сервер"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Режим игры</label>
                <select
                  value={newServer.gamemode}
                  onChange={(e) => setNewServer({ ...newServer, gamemode: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="darkrp">DarkRP</option>
                  <option value="ttt">Trouble in Terrorist Town</option>
                  <option value="prophunt">Prop Hunt</option>
                  <option value="deathrun">Deathrun</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Максимум игроков</label>
                <input
                  type="number"
                  value={newServer.maxplayers}
                  onChange={(e) => setNewServer({ ...newServer, maxplayers: parseInt(e.target.value) })}
                  className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Карта</label>
                <input
                  type="text"
                  value={newServer.map}
                  onChange={(e) => setNewServer({ ...newServer, map: e.target.value })}
                  className="w-full bg-black/50 border border-gray-700/50 rounded-lg px-4 py-2 focus:outline-none focus:border-gray-600"
                  placeholder="gm_flatgrass"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-all"
              >
                Отмена
              </button>
              <button
                onClick={createServer}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-700 to-gray-800 hover:from-gray-600 hover:to-gray-700 rounded-lg transition-all"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
