require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");
const TelegramBot = require("node-telegram-bot-api");
const { validateInitData } = require("./tg-auth");
const { migrate, resolveDatabaseUrl } = require("./db");
const {
  upsertPlayer,
  getTop,
  getRank,
  saveGame,
  loadGame,
} = require("./leaderboard-pg");

const token = process.env.BOT_TOKEN;
const gameUrl = process.env.GAME_URL;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";

if (!token) {
  console.error("Укажи BOT_TOKEN");
  process.exit(1);
}

const dbUrl = resolveDatabaseUrl();
if (!dbUrl) {
  console.error(
    "Нет DATABASE_URL. В Railway у сервиса приложения добавь:\n" +
      "DATABASE_URL = ${{Postgres.DATABASE_URL}}\n" +
      "(Add Variable → Variable Reference → Postgres → DATABASE_URL)"
  );
  process.exit(1);
}

async function main() {
  await migrate();

  const bot = new TelegramBot(token, { polling: true });

  const resolvedGameUrl = gameUrl && /^https:\/\//i.test(gameUrl) ? gameUrl : null;

  function playKeyboard(url) {
    return {
      reply_markup: {
        inline_keyboard: [[{ text: "🎮 Играть", web_app: { url } }]],
      },
    };
  }

  bot.onText(/\/start/, (msg) => {
    const name = msg.from && msg.from.first_name ? msg.from.first_name : "друг";
    if (!resolvedGameUrl) {
      bot.sendMessage(
        msg.chat.id,
        `Привет, ${name}!\n\nЗадай GAME_URL в переменных Railway (публичный HTTPS этой игры).`
      );
      return;
    }
    bot.sendMessage(
      msg.chat.id,
      `Привет, ${name}!\n\nCUM Tap на Railway + Postgres.\nЖми кнопку, чтобы открыть игру.`,
      playKeyboard(resolvedGameUrl)
    );
  });

  bot.onText(/\/play/, (msg) => {
    if (!resolvedGameUrl) {
      bot.sendMessage(msg.chat.id, "GAME_URL не задан в переменных Railway.");
      return;
    }
    bot.sendMessage(msg.chat.id, "Открывай игру:", playKeyboard(resolvedGameUrl));
  });

  bot.onText(/\/top/, async (msg) => {
    try {
      const top = await getTop(10);
      if (!top.length) {
        bot.sendMessage(msg.chat.id, "Лидерборд пока пуст.");
        return;
      }
      const lines = top.map((p) => {
        const who = p.username ? `@${p.username}` : p.name;
        return `${p.rank}. ${who} — ${p.balance} CUM · ур.${p.level}`;
      });
      bot.sendMessage(msg.chat.id, `🏆 Топ игроков\n\n${lines.join("\n")}`);
    } catch (err) {
      console.error("/top", err);
      bot.sendMessage(msg.chat.id, "Не удалось загрузить топ.");
    }
  });

  bot.on("polling_error", (err) => {
    console.error("polling_error", err.message);
  });

  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "512kb" }));

  // Static Mini App (monolith on Railway)
  const root = path.join(__dirname, "..");
  app.use(express.static(root, { extensions: ["html"] }));

  app.get("/api/health", async (_req, res) => {
    try {
      await migrate();
      res.json({ ok: true, db: true, service: "cum-tap-railway" });
    } catch (err) {
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.get("/api/leaderboard", async (req, res) => {
    try {
      const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
      const players = await getTop(limit);
      res.json({ ok: true, players });
    } catch (err) {
      console.error("leaderboard", err);
      res.status(500).json({ ok: false, error: "db_error" });
    }
  });

  app.post("/api/leaderboard/submit", async (req, res) => {
    try {
      const body = req.body || {};
      const auth = validateInitData(body.initData, token);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
        return;
      }
      const user = auth.user;
      const balance = Math.max(0, Math.floor(Number(body.balance) || 0));
      const level = Math.min(100, Math.max(1, Math.floor(Number(body.level) || 1)));
      const prestige = Math.max(0, Math.floor(Number(body.prestige) || 0));

      const saved = await upsertPlayer({
        userId: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок",
        username: user.username || "",
        photoUrl: user.photo_url || "",
        balance,
        score: balance,
        level,
        prestige,
      });
      const me = await getRank(user.id);
      res.json({ ok: true, player: saved, me });
    } catch (err) {
      console.error("submit", err);
      res.status(500).json({ ok: false, error: "db_error" });
    }
  });

  // Cloud save (Telegram user → Postgres)
  app.post("/api/save", async (req, res) => {
    try {
      const body = req.body || {};
      const auth = validateInitData(body.initData, token);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
        return;
      }
      if (!body.save || typeof body.save !== "object") {
        res.status(400).json({ ok: false, error: "bad_save" });
        return;
      }
      await saveGame(auth.user.id, body.save);
      res.json({ ok: true });
    } catch (err) {
      console.error("save", err);
      res.status(500).json({ ok: false, error: "db_error" });
    }
  });

  app.post("/api/load", async (req, res) => {
    try {
      const body = req.body || {};
      const auth = validateInitData(body.initData, token);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
        return;
      }
      const data = await loadGame(auth.user.id);
      res.json({ ok: true, data });
    } catch (err) {
      console.error("load", err);
      res.status(500).json({ ok: false, error: "db_error" });
    }
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next();
    res.sendFile(path.join(root, "index.html"));
  });

  app.listen(port, host, () => {
    console.log(`CUM Tap listening on ${host}:${port}`);
    console.log("GAME_URL =", resolvedGameUrl || "(не задан — поставь публичный URL Railway)");
  });
}

main().catch((err) => {
  console.error("Fatal", err);
  process.exit(1);
});
