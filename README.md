# CUM Tap — Telegram Mini App

Игра уже умеет открываться как Mini App: SDK Telegram, haptic при тапах/встрече, fullscreen, имя игрока в подсказке.

## 1. Выложи игру на HTTPS

Нужен публичный `https://...` (HTTP Telegram не примет).

Варианты:
- **Vercel / Netlify / Cloudflare Pages** — залей папку проекта
- **GitHub Pages** — Pages → Deploy from branch

В корне должны открываться:
- `/index.html`
- `/game.js`, `/telegram.js`, `/style.css`
- `/assets/...`

Проверь в обычном браузере, что игра грузится по HTTPS.

## 2. Создай бота

1. Открой [@BotFather](https://t.me/BotFather)
2. `/newbot` → имя и username
3. Скопируй токен

### Railway (рекомендуется)

См. подробности в [RAILWAY.md](./RAILWAY.md): один сервис отдаёт игру + API + бота, Postgres хранит топ и облачный сейв.

### Быстрый способ (без кода)

В BotFather:
1. `/mybots` → свой бот → **Bot Settings** → **Menu Button**
2. **Configure menu button** → URL = твой `https://...`
3. В чате с ботом появится кнопка меню — откроет игру

### Способ с кнопкой «Играть» (скрипт)

```bash
cp .env.example .env
# заполни BOT_TOKEN и GAME_URL
npm install
npm run bot
```

Команды бота:
- `/start` — приветствие + кнопка Mini App
- `/play` — снова кнопка игры

## 3. Звуки (опционально)

Положи в `assets`:
- `sfx-tap.mp3` — тап
- `sfx-meet.mp3` — встреча на 100%

## Лидерборд (Telegram)

В игре вкладка **Топ**. Рейтинг по **балансу CUM** на счёте, рядом показывается **уровень**. Данные пишутся в JSONBin / API.

Полностью «в воздухе» без общего хранилища топ между игроками **невозможен** — нужен хоть какой-то общий склад.

### Без своего сервера (рекомендуется) — JSONBin

1. Зайди на [jsonbin.io](https://jsonbin.io), зарегистрируйся  
2. Create Bin → тело: `{"players":{}}` → Create  
3. Скопируй **Bin ID** и **Master Key** (API Keys)  
4. В `payment-config.js`:
   ```js
   jsonbinId: "твой_bin_id",
   jsonbinKey: "$2a$...твой_master_key",
   leaderboardApi: "",
   ```
5. Задеплой игру / обнови Mini App — топ заработает из Telegram

Ключ будет в клиенте (для казуалки ок). Для жёсткой защиты от читов нужен сервер.

### Со своим API бота

1. Задеплой бота на HTTPS, `npm start`  
2. В `payment-config.js`: `leaderboardApi: "https://твой-бот-хост"`  
3. Команда `/top` в боте


## Донат (Т‑Банк / Сбер)

В игре кнопка **Донат**:
- 1000 CUM — 49 ₽
- 5000 CUM — 149 ₽
- 10000 CUM — 249 ₽

Выбор банка → `pay.html` → возврат в игру → начисление CUM.

Настройки: `payment-config.js`
- `demoMode: true` — тестовая кнопка «Оплатить» (сейчас так)
- Для боя: `demoMode: false` и ссылки эквайринга в `tbankUrl` / `sberUrl`  
  Плейсхолдеры: `{amount}` `{orderId}` `{cum}` `{returnUrl}`  
  Return URL в кабинете банка: `https://твой-сайт/index.html?donate=success&order={orderId}`

Без серверного webhook клиентский возврат можно подделать — для продакшена лучше начислять CUM с бэкенда после callback банка.

