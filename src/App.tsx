import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

interface Server {
  id: string
  name: string
  status: 'running' | 'stopped' | 'starting' | 'stopping'
  gamemode: string
  map: string
  maxplayers: number
  currentplayers: number
  port: number
  memory: number
  cpu: number
  ip: string
}

interface ConsoleLog {
  timestamp: string
  message: string
  type: 'info' | 'error' | 'warning'
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [servers, setServers] = useState<Server[]>([])
  const [selectedServer, setSelectedServer] = useState<Server | null>(null)
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([])
  const [consoleInput, setConsoleInput] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newServerData, setNewServerData] = useState({
    name: '',
    gamemode: 'sandbox',
    map: 'gm_flatgrass',
    maxplayers: 16,
    memory: 2048,
    port: 27015
  })

  useEffect(() => {
    loadServers()
    const interval = setInterval(loadServers, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedServer && currentView === 'console') {
      loadConsoleLogs(selectedServer.id)
    }
  }, [selectedServer, currentView])

  const loadServers = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/servers`)
      setServers(response.data)
    } catch (error) {
      console.error('Failed to load servers:', error)
    }
  }

  const loadConsoleLogs = async (serverId: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/servers/${serverId}/logs`)
      setConsoleLogs(response.data)
    } catch (error) {
      console.error('Failed to load logs:', error)
    }
  }

  const createServer = async () => {
    try {
      await axios.post(`${API_URL}/api/servers`, newServerData)
      setShowCreateModal(false)
      setNewServerData({
        name: '',
        gamemode: 'sandbox',
        map: 'gm_flatgrass',
        maxplayers: 16,
        memory: 2048,
        port: 27015
      })
      loadServers()
    } catch (error) {
      console.error('Failed to create server:', error)
    }
  }

  const startServer = async (serverId: string) => {
    try {
      await axios.post(`${API_URL}/api/servers/${serverId}/start`)
      loadServers()
    } catch (error) {
      console.error('Failed to start server:', error)
    }
  }

  const stopServer = async (serverId: string) => {
    try {
      await axios.post(`${API_URL}/api/servers/${serverId}/stop`)
      loadServers()
    } catch (error) {
      console.error('Failed to stop server:', error)
    }
  }

  const restartServer = async (serverId: string) => {
    try {
      await axios.post(`${API_URL}/api/servers/${serverId}/restart`)
      loadServers()
    } catch (error) {
      console.error('Failed to restart server:', error)
    }
  }

  const deleteServer = async (serverId: string) => {
    if (!confirm('Вы уверены что хотите удалить сервер?')) return
    try {
      await axios.delete(`${API_URL}/api/servers/${serverId}`)
      setSelectedServer(null)
      loadServers()
    } catch (error) {
      console.error('Failed to delete server:', error)
    }
  }

  const sendCommand = async () => {
    if (!selectedServer || !consoleInput.trim()) return
    try {
      await axios.post(`${API_URL}/api/servers/${selectedServer.id}/command`, {
        command: consoleInput
      })
      setConsoleInput('')
      loadConsoleLogs(selectedServer.id)
    } catch (error) {
      console.error('Failed to send command:', error)
    }
  }

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Панель управления серверами</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
        >
          Создать сервер
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {servers.map(server => (
          <div
            key={server.id}
            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 cursor-pointer"
            onClick={() => {
              setSelectedServer(server)
              setCurrentView('overview')
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{server.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                server.status === 'running' ? 'bg-green-500/20 text-green-400' :
                server.status === 'stopped' ? 'bg-red-500/20 text-red-400' :
                'bg-yellow-500/20 text-yellow-400'
              }`}>
                {server.status === 'running' ? 'Запущен' : server.status === 'stopped' ? 'Остановлен' : 'Загрузка'}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-300">
              <div className="flex justify-between">
                <span>Игроки:</span>
                <span className="text-white font-semibold">{server.currentplayers}/{server.maxplayers}</span>
              </div>
              <div className="flex justify-between">
                <span>Режим:</span>
                <span className="text-white font-semibold">{server.gamemode}</span>
              </div>
              <div className="flex justify-between">
                <span>Карта:</span>
                <span className="text-white font-semibold">{server.map}</span>
              </div>
              <div className="flex justify-between">
                <span>IP:</span>
                <span className="text-indigo-400 font-mono text-xs">{server.ip}:{server.port}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/10">
              <div className="flex justify-between text-xs text-gray-400">
                <span>CPU: {server.cpu}%</span>
                <span>RAM: {server.memory}MB</span>
              </div>
            </div>
          </div>
        ))}

        {servers.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-400">
            <p className="text-xl mb-2">Нет активных серверов</p>
            <p className="text-sm">Создайте свой первый сервер Garry's Mod</p>
          </div>
        )}
      </div>
    </div>
  )

  const renderOverview = () => {
    if (!selectedServer) return null

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{selectedServer.name}</h1>
            <p className="text-gray-400">ID: {selectedServer.id}</p>
          </div>
          <div className="flex gap-3">
            {selectedServer.status === 'stopped' && (
              <button
                onClick={() => startServer(selectedServer.id)}
                className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
              >
                Запустить
              </button>
            )}
            {selectedServer.status === 'running' && (
              <>
                <button
                  onClick={() => restartServer(selectedServer.id)}
                  className="px-6 py-3 bg-yellow-600 text-white rounded-xl font-semibold hover:bg-yellow-700 transition-all"
                >
                  Перезапустить
                </button>
                <button
                  onClick={() => stopServer(selectedServer.id)}
                  className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-all"
                >
                  Остановить
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-2">Статус</p>
            <p className="text-2xl font-bold text-white capitalize">{selectedServer.status}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-2">Игроки онлайн</p>
            <p className="text-2xl font-bold text-white">{selectedServer.currentplayers}/{selectedServer.maxplayers}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-2">Использование CPU</p>
            <p className="text-2xl font-bold text-white">{selectedServer.cpu}%</p>
          </div>
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <p className="text-gray-400 text-sm mb-2">Использование RAM</p>
            <p className="text-2xl font-bold text-white">{selectedServer.memory}MB</p>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Информация о сервере</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-400">IP адрес:</span>
              <span className="text-white font-mono">{selectedServer.ip}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-400">Порт:</span>
              <span className="text-white font-mono">{selectedServer.port}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-400">Игровой режим:</span>
              <span className="text-white">{selectedServer.gamemode}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-400">Карта:</span>
              <span className="text-white">{selectedServer.map}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-400">Максимум игроков:</span>
              <span className="text-white">{selectedServer.maxplayers}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/10">
              <span className="text-gray-400">Строка подключения:</span>
              <span className="text-indigo-400 font-mono text-xs">connect {selectedServer.ip}:{selectedServer.port}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderConsole = () => {
    if (!selectedServer) return null

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Консоль - {selectedServer.name}</h1>

        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 h-[600px] flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-1 mb-4 font-mono text-sm">
            {consoleLogs.map((log, index) => (
              <div key={index} className={`${
                log.type === 'error' ? 'text-red-400' :
                log.type === 'warning' ? 'text-yellow-400' :
                'text-gray-300'
              }`}>
                <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
              </div>
            ))}
            {consoleLogs.length === 0 && (
              <div className="text-gray-500">Консоль пуста. Запустите сервер для просмотра логов.</div>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendCommand()}
              placeholder="Введите команду..."
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={sendCommand}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all"
            >
              Отправить
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderFiles = () => {
    if (!selectedServer) return null

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Файловый менеджер - {selectedServer.name}</h1>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <div className="mb-4 flex gap-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
              Загрузить файл
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Создать папку
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
              <span className="text-2xl">📁</span>
              <div className="flex-1">
                <p className="text-white font-semibold">addons</p>
                <p className="text-xs text-gray-400">15 файлов</p>
              </div>
              <button className="text-gray-400 hover:text-white">⋮</button>
            </div>
            <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
              <span className="text-2xl">📁</span>
              <div className="flex-1">
                <p className="text-white font-semibold">lua</p>
                <p className="text-xs text-gray-400">42 файла</p>
              </div>
              <button className="text-gray-400 hover:text-white">⋮</button>
            </div>
            <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
              <span className="text-2xl">📁</span>
              <div className="flex-1">
                <p className="text-white font-semibold">data</p>
                <p className="text-xs text-gray-400">8 файлов</p>
              </div>
              <button className="text-gray-400 hover:text-white">⋮</button>
            </div>
            <div className="flex items-center gap-3 p-3 hover:bg-white/5 rounded-lg cursor-pointer">
              <span className="text-2xl">📄</span>
              <div className="flex-1">
                <p className="text-white font-semibold">server.cfg</p>
                <p className="text-xs text-gray-400">2.4 KB</p>
              </div>
              <button className="text-gray-400 hover:text-white">⋮</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderSettings = () => {
    if (!selectedServer) return null

    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Настройки - {selectedServer.name}</h1>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Основные настройки</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Название сервера</label>
              <input
                type="text"
                defaultValue={selectedServer.name}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Игровой режим</label>
              <select
                defaultValue={selectedServer.gamemode}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="sandbox">Sandbox</option>
                <option value="darkrp">DarkRP</option>
                <option value="ttt">Trouble in Terrorist Town</option>
                <option value="prophunt">Prop Hunt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Максимум игроков</label>
              <input
                type="number"
                defaultValue={selectedServer.maxplayers}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">Выделенная память (MB)</label>
              <input
                type="number"
                defaultValue={selectedServer.memory}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
              Сохранить изменения
            </button>
            <button
              onClick={() => deleteServer(selectedServer.id)}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700"
            >
              Удалить сервер
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="flex h-screen">
        <aside className="w-72 bg-black/20 backdrop-blur-xl border-r border-white/10 p-6">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-white mb-1">GMOD Host</h1>
            <p className="text-sm text-gray-400">Панель управления</p>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => {
                setCurrentView('dashboard')
                setSelectedServer(null)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                currentView === 'dashboard'
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-300 hover:bg-white/5'
              }`}
            >
              <span className="text-xl">🏠</span>
              Главная
            </button>

            {selectedServer && (
              <>
                <div className="pt-4 pb-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase px-4">
                    {selectedServer.name}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('overview')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentView === 'overview'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">📊</span>
                  Обзор
                </button>
                <button
                  onClick={() => setCurrentView('console')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentView === 'console'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">💻</span>
                  Консоль
                </button>
                <button
                  onClick={() => setCurrentView('files')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentView === 'files'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">📁</span>
                  Файлы
                </button>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${
                    currentView === 'settings'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-300 hover:bg-white/5'
                  }`}
                >
                  <span className="text-xl">⚙️</span>
                  Настройки
                </button>
              </>
            )}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-8">
          {currentView === 'dashboard' && renderDashboard()}
          {currentView === 'overview' && renderOverview()}
          {currentView === 'console' && renderConsole()}
          {currentView === 'files' && renderFiles()}
          {currentView === 'settings' && renderSettings()}
        </main>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-8 max-w-md w-full">
            <h2 className="text-2xl font-bold text-white mb-6">Создать новый сервер</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Название сервера</label>
                <input
                  type="text"
                  value={newServerData.name}
                  onChange={(e) => setNewServerData({...newServerData, name: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="Мой GMod сервер"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Игровой режим</label>
                <select
                  value={newServerData.gamemode}
                  onChange={(e) => setNewServerData({...newServerData, gamemode: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="sandbox">Sandbox</option>
                  <option value="darkrp">DarkRP</option>
                  <option value="ttt">Trouble in Terrorist Town</option>
                  <option value="prophunt">Prop Hunt</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Стартовая карта</label>
                <input
                  type="text"
                  value={newServerData.map}
                  onChange={(e) => setNewServerData({...newServerData, map: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Максимум игроков</label>
                <input
                  type="number"
                  value={newServerData.maxplayers}
                  onChange={(e) => setNewServerData({...newServerData, maxplayers: parseInt(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Память (MB)</label>
                <input
                  type="number"
                  value={newServerData.memory}
                  onChange={(e) => setNewServerData({...newServerData, memory: parseInt(e.target.value)})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={createServer}
                className="flex-1 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
              >
                Создать
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-6 py-3 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
