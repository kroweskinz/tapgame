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
  const prev = store.players[entry.userId] || {};
  // Only raise score, never lower (anti-cheat soft)
  const score = Math.max(Number(prev.score) || 0, Number(entry.score) || 0);
  const lifetime = Math.max(Number(prev.lifetime) || 0, Number(entry.lifetime) || 0);
  const level = Math.max(Number(prev.level) || 1, Number(entry.level) || 1);
  const prestige = Math.max(Number(prev.prestige) || 0, Number(entry.prestige) || 0);

  store.players[entry.userId] = {
    userId: entry.userId,
    name: entry.name || prev.name || "Игрок",
    username: entry.username || prev.username || "",
    photoUrl: entry.photoUrl || prev.photoUrl || "",
    score,
    lifetime,
    level,
    prestige,
    updatedAt: Date.now(),
  };

  // Prune lowest if too many
  const list = Object.values(store.players).sort((a, b) => b.score - a.score);
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
      if (b.score !== a.score) return b.score - a.score;
      if (b.level !== a.level) return b.level - a.level;
      return b.lifetime - a.lifetime;
    })
    .slice(0, limit)
    .map((p, i) => ({ rank: i + 1, ...p }));
}

function getRank(userId) {
  const top = getTop(MAX_ENTRIES);
  const idx = top.findIndex((p) => String(p.userId) === String(userId));
  if (idx < 0) return null;
  return top[idx];
}

module.exports = { upsertPlayer, getTop, getRank };
