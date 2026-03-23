# Event CRM

CRM для компании по организации мероприятий: сделки с воронкой, залы, календарь слотов, контакты, задачи с напоминаниями в Telegram, интеграция Telethon для сбора заявок из чата.

## Стек

- **Backend:** Python, FastAPI, PostgreSQL (asyncpg), Redis
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts
- **Деплой:** Docker Compose

## Быстрый старт

1. Скопируйте пример переменных и настройте при необходимости:
   ```bash
   cp .env.production.example .env.production
   ```

2. Запуск через Docker Compose:
   ```bash
   docker-compose --env-file .env.production up -d --build
   ```

3. Откройте в браузере:
   - Фронтенд: http://localhost:3000
   - API (Swagger): http://localhost:8000/docs

4. Первый вход (тестовые данные создаются при первом запуске):
   - **Админ:** `admin@eventcrm.local` / `admin`
   - **Менеджер:** `manager@eventcrm.local` / `manager`
   - **Сотрудник:** `employee@eventcrm.local` / `employee`

   Подробнее: см. **DEPLOY_WINDOWS.md** — инструкция по развёртыванию на Windows в Docker и полный список тестовых учётных данных и демо-данных.

## Разработка без Docker

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate   # или source .venv/bin/activate на Linux/Mac
pip install -r requirements.txt
```
Создайте `.env` в `backend/` с переменными (например, `DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/event_crm`, `REDIS_URL=redis://localhost:6379/0`, `SECRET_KEY=dev`). Запустите PostgreSQL и Redis локально, затем:
```bash
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
Фронтенд на http://localhost:3000 проксирует `/api` на http://localhost:8000.

## Основные возможности

- **Дашборд:** аналитика по сделкам, конверсия, выручка, воронка, отчёт по менеджерам
- **Сделки:** воронка с этапами, перетаскивание карточек между этапами, карточка сделки (контакт, зал, дата/время, цена, задаток, участники, комментарии, доп. задачи, автоформирование счёта)
- **Календарь:** свободные слоты по залам, отображение аренд с признаком «подтверждено после задатка»
- **Контакты:** база арендаторов с количеством мероприятий и суммой
- **Задачи:** список с напоминаниями (отправка в Telegram при настроенном боте и `telegram_user_id` у пользователя)
- **Настройки:** воронки, залы и цены, менеджеры, интеграция Telethon (QR-авторизация, чат, ключевые слова / AI-контекст для создания сделок из сообщений)

## Переменные окружения (production)

См. `.env.production.example`. Ключевые:

- `SECRET_KEY` — секрет для JWT
- `DATABASE_URL`, `REDIS_URL` — БД и кэш
- `TELEGRAM_BOT_TOKEN` — бот для напоминаний
- `TELEGRAM_API_ID`, `TELEGRAM_API_HASH` — для Telethon (получить на my.telegram.org)
- `OPENAI_API_KEY` — опционально, для AI-фильтрации сообщений в Telethon
