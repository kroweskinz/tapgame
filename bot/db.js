const { Pool } = require("pg");

let pool = null;

/**
 * Resolve Postgres URL for Railway / local.
 * Prefer private Railway URL; never silently fall back to localhost in production.
 */
function resolveDatabaseUrl() {
  const candidates = [
    process.env.DATABASE_PRIVATE_URL,
    process.env.DATABASE_URL,
    process.env.POSTGRES_URL,
    process.env.POSTGRES_PRIVATE_URL,
  ].filter(Boolean);

  let url = candidates[0] || "";

  // Compose from discrete PG* vars (Railway sometimes injects these)
  if ((!url || isLocalhostUrl(url)) && process.env.PGHOST && process.env.PGHOST !== "localhost") {
    const user = encodeURIComponent(process.env.PGUSER || "postgres");
    const pass = encodeURIComponent(process.env.PGPASSWORD || "");
    const host = process.env.PGHOST;
    const port = process.env.PGPORT || "5432";
    const db = process.env.PGDATABASE || "railway";
    url = `postgresql://${user}:${pass}@${host}:${port}/${db}`;
  }

  return url;
}

function isLocalhostUrl(url) {
  try {
    const u = new URL(url);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1";
  } catch (_) {
    return /localhost|127\.0\.0\.1|::1/.test(String(url));
  }
}

function isRailway() {
  return Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_PROJECT_ID);
}

function needsSsl(url) {
  if (process.env.PGSSL === "true") return true;
  if (process.env.PGSSL === "false") return false;
  // Public Railway proxy usually needs SSL; internal *.railway.internal often does not
  try {
    const host = new URL(url).hostname;
    if (host.endsWith(".railway.internal")) return false;
    if (host.includes("railway.app") || host.includes("rlwy.net")) return true;
  } catch (_) {
    /* ignore */
  }
  return false;
}

function getPool() {
  if (pool) return pool;

  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL не задан. В Railway: Variables → DATABASE_URL = ${{Postgres.DATABASE_URL}}"
    );
  }

  if (isRailway() && isLocalhostUrl(connectionString)) {
    throw new Error(
      "DATABASE_URL указывает на localhost (127.0.0.1). " +
        "Удали ручной DATABASE_URL и добавь Variable Reference: ${{Postgres.DATABASE_URL}}"
    );
  }

  let hostHint = "?";
  try {
    hostHint = new URL(connectionString).hostname;
  } catch (_) {
    /* ignore */
  }
  console.log(`Postgres connecting to host: ${hostHint}`);

  pool = new Pool({
    connectionString,
    ssl: needsSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
    max: 10,
    connectionTimeoutMillis: 15000,
  });
  pool.on("error", (err) => {
    console.error("Postgres pool error", err.message);
  });
  return pool;
}

async function migrate(retries = 12) {
  let lastErr;
  for (let i = 1; i <= retries; i++) {
    try {
      const db = getPool();
      await db.query(`
        CREATE TABLE IF NOT EXISTS players (
          user_id BIGINT PRIMARY KEY,
          name TEXT NOT NULL DEFAULT 'Игрок',
          username TEXT NOT NULL DEFAULT '',
          photo_url TEXT NOT NULL DEFAULT '',
          balance BIGINT NOT NULL DEFAULT 0,
          level INT NOT NULL DEFAULT 1,
          prestige INT NOT NULL DEFAULT 0,
          score BIGINT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS players_score_idx ON players (balance DESC, level DESC);

        CREATE TABLE IF NOT EXISTS game_saves (
          user_id BIGINT PRIMARY KEY,
          save_json JSONB NOT NULL DEFAULT '{}'::jsonb,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS bot_users (
          user_id BIGINT PRIMARY KEY,
          chat_id BIGINT NOT NULL,
          name TEXT NOT NULL DEFAULT 'Игрок',
          username TEXT NOT NULL DEFAULT '',
          notify_enabled BOOLEAN NOT NULL DEFAULT TRUE,
          last_notified_at TIMESTAMPTZ,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS bot_users_notify_idx
          ON bot_users (notify_enabled, last_notified_at);

        CREATE TABLE IF NOT EXISTS leaderboard_events (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          icon TEXT NOT NULL DEFAULT '🏆',
          theme TEXT NOT NULL DEFAULT 'gold',
          prize1_icon TEXT NOT NULL DEFAULT '🥇',
          prize1_text TEXT NOT NULL DEFAULT '',
          prize2_icon TEXT NOT NULL DEFAULT '🥈',
          prize2_text TEXT NOT NULL DEFAULT '',
          prize3_icon TEXT NOT NULL DEFAULT '🥉',
          prize3_text TEXT NOT NULL DEFAULT '',
          starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          ends_at TIMESTAMPTZ NOT NULL,
          active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS leaderboard_events_active_idx
          ON leaderboard_events (active, ends_at);

        ALTER TABLE players
          ADD COLUMN IF NOT EXISTS career_earned BIGINT NOT NULL DEFAULT 0;

        CREATE TABLE IF NOT EXISTS event_scores (
          event_id INT NOT NULL REFERENCES leaderboard_events(id) ON DELETE CASCADE,
          user_id BIGINT NOT NULL,
          name TEXT NOT NULL DEFAULT 'Игрок',
          username TEXT NOT NULL DEFAULT '',
          photo_url TEXT NOT NULL DEFAULT '',
          baseline BIGINT NOT NULL DEFAULT 0,
          score BIGINT NOT NULL DEFAULT 0,
          level INT NOT NULL DEFAULT 1,
          prestige INT NOT NULL DEFAULT 0,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (event_id, user_id)
        );

        CREATE INDEX IF NOT EXISTS event_scores_rank_idx
          ON event_scores (event_id, score DESC, updated_at ASC);
      `);
      console.log("Postgres schema ready");
      return;
    } catch (err) {
      lastErr = err;
      console.error(`Postgres migrate attempt ${i}/${retries}:`, err.message);
      // Reset pool so next try re-reads env / reconnects
      try {
        if (pool) await pool.end();
      } catch (_) {
        /* ignore */
      }
      pool = null;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  throw lastErr;
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, migrate, query, resolveDatabaseUrl };
