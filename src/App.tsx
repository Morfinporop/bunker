import { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';

interface Server {
  id: string;
  name: string;
  status: 'stopped' | 'starting' | 'running' | 'stopping';
  ip: string;
  port: number;
  players: number;
  maxPlayers: number;
  map: string;
  gamemode: string;
}

export function App() {
  const [servers, setServers] = useState<Server[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newServer, setNewServer] = useState({
    name: '',
    maxPlayers: 16,
    map: 'gm_flatgrass',
    gamemode: 'sandbox'
  });

  const API_URL = window.location.hostname === 'localhost' ? 'http://localhost:3001/api' : '/api';

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/servers`);
      setServers(response.data);
    } catch (error) {
      console.error('Error fetching servers:', error);
    }
  };

  const createServer = async () => {
    try {
      await axios.post(`${API_URL}/servers`, newServer);
      setShowCreateModal(false);
      setNewServer({ name: '', maxPlayers: 16, map: 'gm_flatgrass', gamemode: 'sandbox' });
      fetchServers();
    } catch (error) {
      console.error('Error creating server:', error);
    }
  };

  const startServer = async (id: string) => {
    try {
      await axios.post(`${API_URL}/servers/${id}/start`);
      fetchServers();
    } catch (error) {
      console.error('Error starting server:', error);
    }
  };

  const stopServer = async (id: string) => {
    try {
      await axios.post(`${API_URL}/servers/${id}/stop`);
      fetchServers();
    } catch (error) {
      console.error('Error stopping server:', error);
    }
  };

  const deleteServer = async (id: string) => {
    if (!confirm('Удалить сервер?')) return;
    try {
      await axios.delete(`${API_URL}/servers/${id}`);
      fetchServers();
    } catch (error) {
      console.error('Error deleting server:', error);
    }
  };

  const installSteamCMD = async () => {
    try {
      await axios.post(`${API_URL}/install-steamcmd`);
      alert('SteamCMD установка начата');
    } catch (error) {
      console.error('Error installing SteamCMD:', error);
    }
  };

  const downloadGmod = async (serverId: string) => {
    try {
      await axios.post(`${API_URL}/servers/${serverId}/download-gmod`);
      alert('Скачивание Garry\'s Mod начато');
    } catch (error) {
      console.error('Error downloading Gmod:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">GMod Control Panel</h1>
          <p className="text-gray-300">Управление серверами Garry's Mod</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-purple-500/30">
            <h3 className="text-gray-400 text-sm mb-2">Всего серверов</h3>
            <p className="text-3xl font-bold text-white">{servers.length}</p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-green-500/30">
            <h3 className="text-gray-400 text-sm mb-2">Активных</h3>
            <p className="text-3xl font-bold text-green-400">
              {servers.filter(s => s.status === 'running').length}
            </p>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-lg border border-blue-500/30">
            <h3 className="text-gray-400 text-sm mb-2">Игроков онлайн</h3>
            <p className="text-3xl font-bold text-blue-400">
              {servers.reduce((acc, s) => acc + s.players, 0)}
            </p>
          </div>
        </div>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            + Создать сервер
          </button>
          <button
            onClick={installSteamCMD}
            className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
          >
            Установить SteamCMD
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {servers.map(server => (
            <div
              key={server.id}
              className="bg-gray-800/70 backdrop-blur-sm p-6 rounded-lg border border-gray-700 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-xl font-bold text-white">{server.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      server.status === 'running' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                      server.status === 'starting' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                      server.status === 'stopping' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                      'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                    }`}>
                      {server.status === 'running' ? 'Работает' :
                       server.status === 'starting' ? 'Запуск...' :
                       server.status === 'stopping' ? 'Остановка...' : 'Остановлен'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">IP адрес</p>
                      <p className="text-white font-mono">{server.ip}:{server.port}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Игроки</p>
                      <p className="text-white">{server.players}/{server.maxPlayers}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Карта</p>
                      <p className="text-white">{server.map}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Режим</p>
                      <p className="text-white">{server.gamemode}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  {server.status === 'stopped' ? (
                    <>
                      <button
                        onClick={() => startServer(server.id)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-all"
                      >
                        Запустить
                      </button>
                      <button
                        onClick={() => downloadGmod(server.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-all"
                      >
                        Скачать GMod
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => stopServer(server.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-all"
                      disabled={server.status !== 'running'}
                    >
                      Остановить
                    </button>
                  )}
                  <button
                    onClick={() => deleteServer(server.id)}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-all"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {servers.length === 0 && (
          <div className="text-center py-16 bg-gray-800/30 rounded-lg border border-gray-700">
            <p className="text-gray-400 text-lg">Нет серверов. Создайте первый сервер!</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-purple-500/30">
            <h2 className="text-2xl font-bold text-white mb-6">Создать новый сервер</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 mb-2">Название сервера</label>
                <input
                  type="text"
                  value={newServer.name}
                  onChange={(e) => setNewServer({...newServer, name: e.target.value})}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
                  placeholder="Мой GMod сервер"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Макс. игроков</label>
                <input
                  type="number"
                  value={newServer.maxPlayers}
                  onChange={(e) => setNewServer({...newServer, maxPlayers: parseInt(e.target.value)})}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Карта</label>
                <input
                  type="text"
                  value={newServer.map}
                  onChange={(e) => setNewServer({...newServer, map: e.target.value})}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
                  placeholder="gm_flatgrass"
                />
              </div>

              <div>
                <label className="block text-gray-300 mb-2">Режим игры</label>
                <select
                  value={newServer.gamemode}
                  onChange={(e) => setNewServer({...newServer, gamemode: e.target.value})}
                  className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 outline-none"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="darkrp">DarkRP</option>
                  <option value="murder">Murder</option>
                  <option value="prophunt">Prop Hunt</option>
                  <option value="ttt">Trouble in Terrorist Town</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button
                onClick={createServer}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
