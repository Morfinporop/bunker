# GMOD Host - Панель управления серверами Garry's Mod

Современная панель управления серверами Garry's Mod с glassmorphism дизайном 2026 года, полностью оптимизированная для Railway.

## Возможности

- Создание и управление множественными серверами GMod
- Консоль в реальном времени с выполнением команд
- Файловый менеджер для управления аддонами
- Мониторинг ресурсов (CPU, RAM, онлайн игроки)
- Автоматическое получение публичного IP через Railway
- Управление конфигурацией и параметрами запуска
- Современный glassmorphism интерфейс

## Деплой на Railway

### Способ 1: Через GitHub

1. Загрузите код в GitHub репозиторий
2. Зайдите на [Railway](https://railway.app)
3. Нажмите "New Project" → "Deploy from GitHub repo"
4. Выберите ваш репозиторий
5. Railway автоматически:
   - Обнаружит Node.js 22 приложение
   - Установит все зависимости
   - Соберет frontend
   - Запустит backend сервер
   - Предоставит публичный домен

### Способ 2: Railway CLI

```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Автоматические переменные окружения

Railway автоматически установит:
- `PORT` - порт для приложения
- `RAILWAY_PUBLIC_DOMAIN` - ваш публичный домен

## Локальная разработка

Установите зависимости:
```bash
npm install
```

Запустите dev сервер frontend:
```bash
npm run dev
```

В другом терминале запустите backend:
```bash
node server.js
```

Откройте http://localhost:5173

## Публичное подключение к серверам

После деплоя на Railway вы получите домен вида:
```
your-app.up.railway.app
```

Подключение к серверу GMod из игры:
```
connect your-app.up.railway.app:27015
```

## Технологии

### Frontend
- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- Axios для API запросов
- Glassmorphism UI дизайн

### Backend
- Node.js 22
- Express.js
- REST API
- In-memory хранилище серверов

### Платформа
- Railway с Nixpacks
- Docker support
- Автоматический CI/CD

## Структура проекта

```
├── src/
│   ├── App.tsx          # Главный компонент панели управления
│   ├── main.tsx         # Точка входа React
│   └── index.css        # Tailwind стили
├── server.js            # Backend Express сервер
├── Dockerfile           # Docker конфигурация
├── nixpacks.toml        # Конфигурация Nixpacks для Railway
├── railway.json         # Настройки Railway
├── Procfile             # Команда запуска
└── package.json         # Зависимости и скрипты
```

## API Endpoints

### Серверы
- `GET /api/servers` - Получить список всех серверов
- `GET /api/servers/:id` - Получить информацию о сервере
- `POST /api/servers` - Создать новый сервер
- `DELETE /api/servers/:id` - Удалить сервер

### Управление
- `POST /api/servers/:id/start` - Запустить сервер
- `POST /api/servers/:id/stop` - Остановить сервер
- `POST /api/servers/:id/restart` - Перезапустить сервер

### Консоль и логи
- `GET /api/servers/:id/logs` - Получить логи консоли
- `POST /api/servers/:id/command` - Выполнить команду

## Доступные команды консоли

- `status` - Показать текущий статус сервера
- `changelevel <map>` - Сменить карту (например: `changelevel gm_construct`)
- `help` - Показать список доступных команд

Примеры:
```
> status
Статус: running
Игроки: 5/16
CPU: 45%
RAM: 2048MB

> changelevel gm_construct
Смена карты на gm_construct...
Карта изменена на gm_construct

> help
Доступные команды:
  status - показать статус сервера
  changelevel <map> - сменить карту
  help - список команд
```

## Системные требования Railway

Минимальные:
- Node.js 22+
- 512MB RAM
- 1GB диск

Рекомендуемые для production:
- 1GB+ RAM
- 2GB+ диск

## Особенности реализации

### Nixpacks конфигурация
Проект использует упрощенную конфигурацию Nixpacks без проблемных зависимостей tar/curl:

```toml
[phases.setup]
nixPkgs = ['nodejs_22']

[phases.install]
cmds = ['npm install']

[phases.build]
cmds = ['npm run build']

[start]
cmd = 'node server.js'
```

### Dockerfile альтернатива
Также включен Dockerfile для деплоя через Docker:

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["node", "server.js"]
```

## Решение проблем

### Ошибка "undefined variable 'tar'"
Используйте предоставленный `nixpacks.toml` который исключает проблемные пакеты.

### Сервер не запускается
Проверьте что переменная `PORT` установлена (Railway делает это автоматически).

### API не отвечает
Убедитесь что `RAILWAY_PUBLIC_DOMAIN` правильно установлен в переменных окружения.

## Лицензия

MIT

## Поддержка

Проект полностью готов к работе на Railway без дополнительных настроек.
