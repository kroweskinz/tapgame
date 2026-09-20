require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");

const token = process.env.BOT_TOKEN;
const gameUrl = process.env.GAME_URL;

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
    inline_keyboard: [
      [{ text: "🎮 Играть", web_app: { url: gameUrl } }],
    ],
  },
};

bot.onText(/\/start/, (msg) => {
  const name = msg.from && msg.from.first_name ? msg.from.first_name : "друг";
  bot.sendMessage(
    msg.chat.id,
    `Привет, ${name}!\n\nCUM Tap — тапалка в лесу.\nЖми кнопку ниже, чтобы открыть игру.`,
    playKeyboard
  );
});

bot.onText(/\/play/, (msg) => {
  bot.sendMessage(msg.chat.id, "Открывай игру:", playKeyboard);
});

bot.on("polling_error", (err) => {
  console.error("polling_error", err.message);
});

console.log("Бот запущен. GAME_URL =", gameUrl);
