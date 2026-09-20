const { query } = require("./db");

async function upsertBotUser({ userId, chatId, name, username }) {
  const uid = Number(userId);
  const cid = Number(chatId != null ? chatId : userId);
  if (!uid || !cid) return null;

  const result = await query(
    `
    INSERT INTO bot_users (user_id, chat_id, name, username, notify_enabled, last_seen_at, created_at)
    VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      chat_id = EXCLUDED.chat_id,
      name = COALESCE(NULLIF(EXCLUDED.name, ''), bot_users.name),
      username = COALESCE(NULLIF(EXCLUDED.username, ''), bot_users.username),
      last_seen_at = NOW()
    RETURNING *
    `,
    [uid, cid, name || "Игрок", username || ""]
  );
  return result.rows[0] || null;
}

async function setNotify(userId, enabled) {
  await query(`UPDATE bot_users SET notify_enabled = $2 WHERE user_id = $1`, [
    Number(userId),
    !!enabled,
  ]);
}

async function listNotifiableUsers() {
  const result = await query(
    `
    SELECT user_id, chat_id, name, username
    FROM bot_users
    WHERE notify_enabled = TRUE
    ORDER BY user_id ASC
    `
  );
  return result.rows;
}

async function markNotified(userIds) {
  if (!userIds || !userIds.length) return;
  await query(
    `
    UPDATE bot_users
    SET last_notified_at = NOW()
    WHERE user_id = ANY($1::bigint[])
    `,
    [userIds.map(Number)]
  );
}

module.exports = {
  upsertBotUser,
  setNotify,
  listNotifiableUsers,
  markNotified,
};
