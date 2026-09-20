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
const {
  upsertBotUser,
  setNotify,
  listNotifiableUsers,
  markNotified,
} = require("./users");

const token = process.env.BOT_TOKEN || "";
const gameUrl = process.env.GAME_URL;
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || "0.0.0.0";
const NOTIFY_EVERY_MS = Number(process.env.NOTIFY_EVERY_MS || 4 * 60 * 60 * 1000);

let dbReady = false;
let dbError = null;
let bot = null;
let notifyTimer = null;

const resolvedGameUrl = gameUrl && /^https:\/\//i.test(gameUrl) ? gameUrl : null;

function playKeyboard(url) {
  return {
    reply_markup: {
      inline_keyboard: [[{ text: "🎮 Играть", web_app: { url } }]],
    },
  };
}

function requireDb(res) {
  if (!dbReady) {
    res.status(503).json({
      ok: false,
      error: "db_unavailable",
      detail: dbError || "Postgres ещё не подключён. Проверь DATABASE_URL=${{Postgres.DATABASE_URL}}",
    });
    return false;
  }
  return true;
}

async function initDatabase() {
  const dbUrl = resolveDatabaseUrl();
  if (!dbUrl) {
    dbError =
      "Нет DATABASE_URL. Add Variable Reference: Postgres.DATABASE_URL (не localhost!)";
    console.error(dbError);
    return false;
  }
  try {
    await migrate();
    dbReady = true;
    dbError = null;
    console.log("Database ready");
    return true;
  } catch (err) {
    dbReady = false;
    dbError = err.message || String(err);
    console.error("Database init failed:", dbError);
    return false;
  }
}

async function trackUserFromMsg(msg) {
  if (!dbReady || !msg || !msg.from) return;
  try {
    await upsertBotUser({
      userId: msg.from.id,
      chatId: msg.chat.id,
      name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" ") || "Игрок",
      username: msg.from.username || "",
    });
  } catch (err) {
    console.error("trackUserFromMsg", err.message);
  }
}

async function trackUserFromTg(user) {
  if (!dbReady || !user || !user.id) return;
  try {
    await upsertBotUser({
      userId: user.id,
      chatId: user.id, // private chat id == user id
      name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок",
      username: user.username || "",
    });
  } catch (err) {
    console.error("trackUserFromTg", err.message);
  }
}

function reminderText(name) {
  const n = name || "друг";
  return `${n}, лес скучает без тебя и мое хранилище уже полное 🌲\nЗайди в CUM Tap — натапай монет и поднимись в топе.`;
}

async function sendReminders() {
  if (!bot || !dbReady) return;
  let users = [];
  try {
    users = await listNotifiableUsers();
  } catch (err) {
    console.error("listNotifiableUsers", err.message);
    return;
  }
  if (!users.length) {
    console.log("Reminders: nobody to notify");
    return;
  }

  console.log(`Reminders: sending to ${users.length} users`);
  const okIds = [];
  for (const u of users) {
    try {
      const opts = resolvedGameUrl ? playKeyboard(resolvedGameUrl) : undefined;
      await bot.sendMessage(u.chat_id, reminderText(u.name), opts);
      okIds.push(u.user_id);
      // soft rate-limit ~25 msg/sec max; stay safer
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      const code = err && err.response && err.response.statusCode;
      // blocked / chat not found → disable notify
      if (code === 403 || code === 400) {
        try {
          await setNotify(u.user_id, false);
        } catch (_) {
          /* ignore */
        }
      }
      console.error(`Remind fail ${u.user_id}:`, err.message);
    }
  }
  try {
    await markNotified(okIds);
  } catch (err) {
    console.error("markNotified", err.message);
  }
}

function startNotifyLoop() {
  if (notifyTimer) return;
  // first wave after 2 minutes (not immediately on every restart flood)
  setTimeout(() => {
    sendReminders();
    notifyTimer = setInterval(sendReminders, NOTIFY_EVERY_MS);
  }, 2 * 60 * 1000);
  console.log(`Notify loop armed: every ${Math.round(NOTIFY_EVERY_MS / 3600000)}h`);
}

function startBot() {
  if (!token) {
    console.warn("BOT_TOKEN не задан — бот выключен, сайт/API всё равно работают");
    return;
  }
  if (bot) return;

  bot = new TelegramBot(token, { polling: true });

  bot.onText(/\/start/, async (msg) => {
    await trackUserFromMsg(msg);
    const name = msg.from && msg.from.first_name ? msg.from.first_name : "друг";
    if (!resolvedGameUrl) {
      bot.sendMessage(
        msg.chat.id,
        `Привет, ${name}!\n\nЗадай GAME_URL в Railway = твой публичный домен HTTPS.`
      );
      return;
    }
    bot.sendMessage(
      msg.chat.id,
      `Привет, ${name}!\n\nCUM Tap на Railway.\nРаз в 4 часа пришлю напоминание зайти в игру.\nОтключить: /mute\nВключить снова: /unmute`,
      playKeyboard(resolvedGameUrl)
    );
  });

  bot.onText(/\/play/, async (msg) => {
    await trackUserFromMsg(msg);
    if (!resolvedGameUrl) {
      bot.sendMessage(msg.chat.id, "GAME_URL не задан.");
      return;
    }
    bot.sendMessage(msg.chat.id, "Открывай игру:", playKeyboard(resolvedGameUrl));
  });

  bot.onText(/\/mute/, async (msg) => {
    await trackUserFromMsg(msg);
    if (dbReady) await setNotify(msg.from.id, false);
    bot.sendMessage(msg.chat.id, "Ок, напоминания выключены. Вернуть: /unmute");
  });

  bot.onText(/\/unmute/, async (msg) => {
    await trackUserFromMsg(msg);
    if (dbReady) await setNotify(msg.from.id, true);
    bot.sendMessage(msg.chat.id, "Напоминания снова включены (каждые 4 часа).");
  });

  bot.onText(/\/top/, async (msg) => {
    await trackUserFromMsg(msg);
    if (!dbReady) {
      bot.sendMessage(msg.chat.id, "База ещё не готова. Проверь DATABASE_URL.");
      return;
    }
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

  console.log("Telegram bot polling started");
  startNotifyLoop();
}

function createApp() {
  const app = express();
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "512kb" }));

  const root = path.join(__dirname, "..");
  app.use(express.static(root, { extensions: ["html"], index: false }));

  app.get("/api/health", (_req, res) => {
    res.status(200).json({
      ok: true,
      alive: true,
      db: dbReady,
      dbError: dbError || null,
      gameUrl: resolvedGameUrl,
      bot: Boolean(token),
      notifyEveryHours: Math.round(NOTIFY_EVERY_MS / 3600000),
      service: "cum-tap-railway",
    });
  });

  app.get("/api/leaderboard", async (req, res) => {
    if (!requireDb(res)) return;
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
    if (!requireDb(res)) return;
    try {
      const body = req.body || {};
      const auth = validateInitData(body.initData, token);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
        return;
      }
      const user = auth.user;
      await trackUserFromTg(user);
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

  app.post("/api/save", async (req, res) => {
    if (!requireDb(res)) return;
    try {
      const body = req.body || {};
      const auth = validateInitData(body.initData, token);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
        return;
      }
      await trackUserFromTg(auth.user);
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
    if (!requireDb(res)) return;
    try {
      const body = req.body || {};
      const auth = validateInitData(body.initData, token);
      if (!auth.ok) {
        res.status(401).json({ ok: false, error: auth.error || "unauthorized" });
        return;
      }
      await trackUserFromTg(auth.user);
      const data = await loadGame(auth.user.id);
      res.json({ ok: true, data });
    } catch (err) {
      console.error("load", err);
      res.status(500).json({ ok: false, error: "db_error" });
    }
  });

  app.get("/", (_req, res) => {
    res.sendFile(path.join(root, "index.html"));
  });

  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ ok: false, error: "not_found" });
      return;
    }
    // SPA-ish fallback for client routes
    res.sendFile(path.join(root, "index.html"), (err) => {
      if (err) next(err);
    });
  });

  return app;
}

async function main() {
  const app = createApp();

  app.listen(port, host, () => {
    console.log(`CUM Tap listening on ${host}:${port}`);
    console.log("GAME_URL =", resolvedGameUrl || "(не задан)");
  });

  // DB + bot after HTTP is up (domain responds even if Postgres misconfigured)
  const ok = await initDatabase();
  startBot();

  if (!ok) {
    console.warn("Retrying database connection every 10s…");
    setInterval(async () => {
      if (dbReady) return;
      await initDatabase();
    }, 10000);
  }
}

main().catch((err) => {
  console.error("Fatal", err);
  process.exit(1);
});
