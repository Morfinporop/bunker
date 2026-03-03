# GMod Control Panel

Панель управления хостингом серверов Garry's Mod

## Деплой на Railway

1. Создайте репозиторий на GitHub
2. Загрузите все файлы
3. Подключите репозиторий к Railway
4. Railway автоматически соберет и запустит проект

## Возможности

- Создание и управление серверами GMod
- Установка SteamCMD
- Автоматическое скачивание файлов сервера
- Запуск/остановка серверов
- Мониторинг статуса серверов
- Управление настройками (карта, режим игры, макс. игроки)

## API Endpoints

- GET /api/servers - список серверов
- POST /api/servers - создать сервер
- POST /api/servers/:id/start - запустить сервер
- POST /api/servers/:id/stop - остановить сервер
- DELETE /api/servers/:id - удалить сервер
- POST /api/install-steamcmd - установить SteamCMD
- POST /api/servers/:id/download-gmod - скачать файлы GMod

## Технологии

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express
- Хостинг: Railway
