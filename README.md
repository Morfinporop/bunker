# GMod Control Panel - Хостинг серверов Garry's Mod

Современная панель управления серверами Garry's Mod с glassmorphism дизайном.

## Возможности

- Создание и управление серверами GMod
- Консоль в реальном времени
- Файловый менеджер
- Настройки сервера
- Параметры запуска
- WebSocket для мониторинга в реальном времени

## Деплой на Railway

1. Загрузите проект на GitHub
2. Подключите репозиторий к Railway
3. Railway автоматически определит Node.js и установит зависимости
4. Сервер запустится на порту, предоставленном Railway
5. Получите домен для доступа к панели

## Локальная разработка

```bash
npm install
npm run dev
```

В другом терминале запустите backend:

```bash
node server.js
```

## Технологии

- React 19
- TypeScript
- Tailwind CSS 4
- Vite
- Express
- Socket.io
- Glassmorphism UI

## API

Backend предоставляет REST API для управления серверами:

- `POST /api/servers` - создать сервер
- `GET /api/servers` - список серверов
- `GET /api/servers/:id` - информация о сервере
- `POST /api/servers/:id/start` - запустить сервер
- `POST /api/servers/:id/stop` - остановить сервер
- `POST /api/servers/:id/restart` - перезапустить сервер
- `DELETE /api/servers/:id` - удалить сервер
- `POST /api/servers/:id/command` - отправить команду
- `GET /api/servers/:id/files` - список файлов
- `PUT /api/servers/:id/settings` - обновить настройки

WebSocket события:
- `console` - логи консоли
- `serverStatus` - изменение статуса сервера
