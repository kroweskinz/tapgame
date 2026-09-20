# CUM Tap — Railway + Postgres

Игра + Telegram-бот + API + лидерборд + облачный сейв в одном сервисе на Railway.

## Что в Postgres

- `players` — лидерборд (баланс CUM, уровень, престиж)
- `game_saves` — облачный прогресс по Telegram `user_id`

## Деплой на Railway (UI)

1. Зайди на [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → `kroweskinz/tapgame`
2. **Add Database** → **PostgreSQL**
3. В сервисе приложения (Variables):
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}` (variable reference)
   - `BOT_TOKEN` = токен от BotFather
   - `GAME_URL` = пока заглушка `https://example.com` (обновим после выдачи домена)
   - `HOST` = `0.0.0.0`
4. **Settings → Networking → Generate Domain** → скопируй HTTPS URL  
5. Поставь `GAME_URL` = этот URL (например `https://tapgame-production.up.railway.app`)
6. В BotFather → Menu Button / Web App URL = тот же `GAME_URL`
7. Redeploy

Проверка: открой `https://твой-домен/api/health` → `{"ok":true,"db":true,...}`

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
