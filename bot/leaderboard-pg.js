const { query } = require("./db");

async function upsertPlayer(entry) {
  const balance = Math.max(0, Math.floor(Number(entry.balance != null ? entry.balance : entry.score) || 0));
  const level = Math.min(100, Math.max(1, Math.floor(Number(entry.level) || 1)));
  const prestige = Math.max(0, Math.floor(Number(entry.prestige) || 0));
  const score = balance;
  const userId = Number(entry.userId);
  const careerEarned = Math.max(
    balance,
    Math.floor(Number(entry.careerEarned) || 0)
  );

  const result = await query(
    `
    INSERT INTO players (user_id, name, username, photo_url, balance, level, prestige, score, career_earned, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      name = EXCLUDED.name,
      username = EXCLUDED.username,
      photo_url = COALESCE(NULLIF(EXCLUDED.photo_url, ''), players.photo_url),
      balance = EXCLUDED.balance,
      level = EXCLUDED.level,
      prestige = EXCLUDED.prestige,
      score = EXCLUDED.score,
      career_earned = GREATEST(players.career_earned, EXCLUDED.career_earned),
      updated_at = NOW()
    RETURNING *
    `,
    [
      userId,
      entry.name || "Игрок",
      entry.username || "",
      entry.photoUrl || "",
      balance,
      level,
      prestige,
      score,
      careerEarned,
    ]
  );

  return mapRow(result.rows[0]);
}

async function getTop(limit = 50) {
  const result = await query(
    `
    SELECT *
    FROM players
    ORDER BY balance DESC, level DESC, updated_at ASC
    LIMIT $1
    `,
    [Math.min(100, Math.max(1, limit))]
  );
  return result.rows.map((row, i) => ({ rank: i + 1, ...mapRow(row) }));
}

async function getRank(userId) {
  const top = await getTop(200);
  return top.find((p) => String(p.userId) === String(userId)) || null;
}

async function saveGame(userId, saveJson) {
  await query(
    `
    INSERT INTO game_saves (user_id, save_json, updated_at)
    VALUES ($1, $2::jsonb, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      save_json = EXCLUDED.save_json,
      updated_at = NOW()
    `,
    [Number(userId), JSON.stringify(saveJson || {})]
  );
  return true;
}

async function loadGame(userId) {
  const result = await query(`SELECT save_json, updated_at FROM game_saves WHERE user_id = $1`, [
    Number(userId),
  ]);
  if (!result.rows.length) return null;
  return {
    save: result.rows[0].save_json,
    updatedAt: result.rows[0].updated_at,
  };
}

function mapRow(row) {
  if (!row) return null;
  return {
    userId: Number(row.user_id),
    name: row.name,
    username: row.username || "",
    photoUrl: row.photo_url || "",
    balance: Number(row.balance) || 0,
    level: Number(row.level) || 1,
    prestige: Number(row.prestige) || 0,
    score: Number(row.score != null ? row.score : row.balance) || 0,
    careerEarned: Number(row.career_earned) || 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
  };
}

module.exports = { upsertPlayer, getTop, getRank, saveGame, loadGame };
