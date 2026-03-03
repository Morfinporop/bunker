# GMod Hosting Panel

Современная панель управления для хостинга серверов Garry's Mod с glassmorphism дизайном.

## Возможности

- Создание и управление серверами GMod
- Реальная консоль с логами
- Файловый менеджер
- Настройки серверов
- Статистика (CPU, RAM, игроки)
- WebSocket для логов в реальном времени
- Готово для деплоя на Railway

## Деплой на Railway

1. Загрузите код на GitHub
2. Подключите репозиторий к Railway
3. Railway автоматически обнаружит Dockerfile и развернет приложение
4. Получите публичный URL в разделе Settings > Networking

## Локальная разработка

```bash
npm install
npm run dev
```

Для запуска с backend:
```bash
npm start
```

## Переменные окружения

Не требуются! Приложение автоматически определяет Railway домен.

## Технологии

- React + TypeScript
- Vite
- Tailwind CSS
- Express.js
- WebSocket
- Axios

## Структура проекта

- `/src` - Frontend (React)
- `server.js` - Backend API
- `Dockerfile` - Конфигурация для Railway
- `nixpacks.toml` - Альтернативная конфигурация

## API Endpoints

- `GET /api/servers` - Список серверов
- `POST /api/servers` - Создать сервер
- `DELETE /api/servers/:id` - Удалить сервер
- `POST /api/servers/:id/start` - Запустить сервер
- `POST /api/servers/:id/stop` - Остановить сервер
- `POST /api/servers/:id/restart` - Перезапустить сервер
- `GET /api/servers/:id/logs` - Получить логи
- `POST /api/servers/:id/command` - Выполнить команду
- `GET /api/servers/:id/files` - Список файлов
- `GET /api/servers/:id/file` - Получить файл
- `POST /api/servers/:id/file` - Сохранить файл
- `PUT /api/servers/:id` - Обновить настройки

## Лицензия

MIT
