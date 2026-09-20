const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "leaderboard.json");
const MAX_ENTRIES = 200;

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({ players: {} }, null, 2));
  }
}

function readStore() {
  ensureStore();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
  } catch (_) {
    return { players: {} };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function upsertPlayer(entry) {
  const store = readStore();
  const balance = Math.max(0, Math.floor(Number(entry.balance != null ? entry.balance : entry.score) || 0));
  const level = Math.min(100, Math.max(1, Math.floor(Number(entry.level) || 1)));
  const prestige = Math.max(0, Math.floor(Number(entry.prestige) || 0));

  store.players[entry.userId] = {
    userId: entry.userId,
    name: entry.name || "Игрок",
    username: entry.username || "",
    photoUrl: entry.photoUrl || "",
    balance,
    score: balance,
    level,
    prestige,
    updatedAt: Date.now(),
  };

  const list = Object.values(store.players).sort((a, b) => {
    const ba = Number(a.balance != null ? a.balance : a.score) || 0;
    const bb = Number(b.balance != null ? b.balance : b.score) || 0;
    if (bb !== ba) return bb - ba;
    return (Number(b.level) || 1) - (Number(a.level) || 1);
  });
  if (list.length > MAX_ENTRIES) {
    const keep = new Set(list.slice(0, MAX_ENTRIES).map((p) => String(p.userId)));
    store.players = Object.fromEntries(
      Object.entries(store.players).filter(([id]) => keep.has(id))
    );
  }

  writeStore(store);
  return store.players[entry.userId];
}

function getTop(limit = 50) {
  const store = readStore();
  return Object.values(store.players)
    .sort((a, b) => {
      const ba = Number(a.balance != null ? a.balance : a.score) || 0;
      const bb = Number(b.balance != null ? b.balance : b.score) || 0;
      if (bb !== ba) return bb - ba;
      return (Number(b.level) || 1) - (Number(a.level) || 1);
    })
    .slice(0, limit)
    .map((p, i) => ({
      rank: i + 1,
      ...p,
      balance: Math.floor(Number(p.balance != null ? p.balance : p.score) || 0),
      level: Math.min(100, Math.max(1, Math.floor(Number(p.level) || 1))),
    }));
}

function getRank(userId) {
  const top = getTop(MAX_ENTRIES);
  const idx = top.findIndex((p) => String(p.userId) === String(userId));
  if (idx < 0) return null;
  return top[idx];
}

module.exports = { upsertPlayer, getTop, getRank };
