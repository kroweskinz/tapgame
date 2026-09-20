const { Pool } = require("pg");

let pool = null;

function getPool() {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  pool = new Pool({
    connectionString,
    ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });
  pool.on("error", (err) => {
    console.error("Postgres pool error", err.message);
  });
  return pool;
}

async function migrate() {
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
  `);
  console.log("Postgres schema ready");
}

async function query(text, params) {
  return getPool().query(text, params);
}

module.exports = { getPool, migrate, query };
