require("dotenv").config();
const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");
const { validateInitData } = require("./tg-auth");
const { upsertPlayer, getTop, getRank } = require("./leaderboard-store");

const token = process.env.BOT_TOKEN;
const gameUrl = process.env.GAME_URL;
const port = Number(process.env.PORT || 3000);

if (!token) {
  console.error("Укажи BOT_TOKEN в файле .env");
  process.exit(1);
}
if (!gameUrl || !/^https:\/\//i.test(gameUrl)) {
  console.error("Укажи GAME_URL с https:// в файле .env (Mini App требует HTTPS)");
  process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });

const playKeyboard = {
  reply_markup: {
    inline_keyboard: [[{ text: "🎮 Играть", web_app: { url: gameUrl } }]],
  },
};

bot.onText(/\/start/, (msg) => {
  const name = msg.from && msg.from.first_name ? msg.from.first_name : "друг";
  bot.sendMessage(
    msg.chat.id,
    `Привет, ${name}!\n\nCUM Tap — тапалка в лесу.\nЖми кнопку ниже, чтобы открыть игру.\n\nТоп игроков — во вкладке «Топ» внутри игры.`,
    playKeyboard
  );
});

bot.onText(/\/play/, (msg) => {
  bot.sendMessage(msg.chat.id, "Открывай игру:", playKeyboard);
});

bot.onText(/\/top/, async (msg) => {
  const top = getTop(10);
  if (!top.length) {
    bot.sendMessage(msg.chat.id, "Лидерборд пока пуст. Сыграй и зайди во вкладку «Топ».");
    return;
  }
  const lines = top.map((p) => {
    const who = p.username ? `@${p.username}` : p.name;
    return `${p.rank}. ${who} — ур.${p.level}, ${Math.floor(p.score)} очков`;
  });
  bot.sendMessage(msg.chat.id, `🏆 Топ игроков\n\n${lines.join("\n")}`);
});

bot.on("polling_error", (err) => {
  console.error("polling_error", err.message);
});

const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/leaderboard", (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const top = getTop(limit);
  res.json({ ok: true, players: top });
});

app.post("/api/leaderboard/submit", (req, res) => {
  const body = req.body || {};
  const auth = validateInitData(body.initData, token);
  if (!auth.ok) {
    res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
    return;
  }

  const user = auth.user;
  const lifetime = Math.max(0, Math.floor(Number(body.lifetime) || 0));
  const level = Math.min(100, Math.max(1, Math.floor(Number(body.level) || 1)));
  const prestige = Math.max(0, Math.floor(Number(body.prestige) || 0));
  // Score: lifetime CUM + level weight + prestige weight
  const score = lifetime + level * 500 + prestige * 5000;

  const saved = upsertPlayer({
    userId: user.id,
    name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок",
    username: user.username || "",
    photoUrl: user.photo_url || "",
    lifetime,
    level,
    prestige,
    score,
  });

  const me = getRank(user.id);
  res.json({ ok: true, player: saved, me });
});

app.listen(port, () => {
  console.log(`API + лидерборд на порту ${port}`);
  console.log("Бот запущен. GAME_URL =", gameUrl);
  console.log("Укажи в игре CUM_CONFIG.leaderboardApi = URL этого сервера (https)");
});
