# CUM Tap — Railway + Postgres

Игра + Telegram-бот + API + лидерборд + облачный сейв в одном сервисе на Railway.

## Что в Postgres

- `players` — лидерборд (баланс CUM, уровень, престиж)
- `game_saves` — облачный прогресс по Telegram `user_id`

## Деплой на Railway (UI)

1. Зайди на [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `kroweskinz/tapgame`
2. **Add Database** → **PostgreSQL** (должен быть отдельный сервис в проекте)
3. Открой сервис **приложения** (не Postgres) → **Variables**:
   - Удали `DATABASE_URL`, если там `localhost` / `127.0.0.1`
   - **Add Variable** → **Add Reference** → Postgres → `DATABASE_URL`  
     Должно получиться: `DATABASE_URL=${{Postgres.DATABASE_URL}}`
   - `BOT_TOKEN` = токен от BotFather
   - `GAME_URL` = публичный HTTPS домен приложения
   - `HOST` = `0.0.0.0`
4. **Settings → Networking → Generate Domain**
5. Обнови `GAME_URL` этим доменом → **Redeploy**

### Если ошибка `ECONNREFUSED 127.0.0.1:5432`

Значит приложение подключается к localhost, а не к Postgres Railway.

1. Сервис приложения → Variables  
2. Найди `DATABASE_URL`  
3. Если значение содержит `localhost` / `127.0.0.1` — **удали**  
4. Добавь заново через **Variable Reference** → `Postgres.DATABASE_URL`  
5. Redeploy

В логах при старте должно быть что-то вроде:  
`Postgres connecting to host: postgres.railway.internal`  
(не `127.0.0.1`).

### Домен открывается, но «не работает»

1. Домен должен висеть на сервисе **приложения** (Node), **не** на Postgres  
2. Открой `https://твой-домен/` — игра  
3. Открой `https://твой-домен/api/health`  
   - `"db": true` — ок  
   - `"db": false` — смотри поле `dbError` (часто localhost в DATABASE_URL)  
4. В Variables поставь `GAME_URL` = этот же домен и Redeploy  
5. В BotFather Web App URL = этот же домен

После последнего пуша сайт поднимается даже без БД; топ/сейв заработают после починки DATABASE_URL.

## Локально

```bash
cp .env.example .env
# DATABASE_URL = Postgres.DATABASE_PUBLIC_URL из Railway
npm install
npm start
```

Открой http://localhost:3000

## Клиент

При деплое monolith `leaderboardApi` можно оставить пустым — используется same-origin `/api`.  
JSONBin остаётся запасным вариантом, если API недоступен.
