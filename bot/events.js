const { query } = require("./db");

function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description || "",
    icon: row.icon || "🏆",
    theme: row.theme || "gold",
    prizes: [
      { place: 1, icon: row.prize1_icon || "🥇", text: row.prize1_text || "" },
      { place: 2, icon: row.prize2_icon || "🥈", text: row.prize2_text || "" },
      { place: 3, icon: row.prize3_icon || "🥉", text: row.prize3_text || "" },
    ],
    startsAt: row.starts_at ? new Date(row.starts_at).toISOString() : null,
    endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
    active: row.active !== false,
    createdBy: row.created_by ? Number(row.created_by) : null,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : null,
  };
}

async function listActiveEvents() {
  const result = await query(
    `
    SELECT * FROM leaderboard_events
    WHERE active = TRUE AND ends_at > NOW()
    ORDER BY ends_at ASC
    LIMIT 20
    `
  );
  return result.rows.map(mapEvent);
}

async function listAllEvents(limit = 30) {
  const result = await query(
    `
    SELECT * FROM leaderboard_events
    ORDER BY created_at DESC
    LIMIT $1
    `,
    [limit]
  );
  return result.rows.map(mapEvent);
}

async function createEvent(data) {
  const result = await query(
    `
    INSERT INTO leaderboard_events (
      title, description, icon, theme,
      prize1_icon, prize1_text,
      prize2_icon, prize2_text,
      prize3_icon, prize3_text,
      starts_at, ends_at, active, created_by
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,TRUE,$13
    )
    RETURNING *
    `,
    [
      data.title,
      data.description || "",
      data.icon || "🏆",
      data.theme || "gold",
      data.prize1Icon || "🥇",
      data.prize1Text || "",
      data.prize2Icon || "🥈",
      data.prize2Text || "",
      data.prize3Icon || "🥉",
      data.prize3Text || "",
      data.startsAt || new Date(),
      data.endsAt,
      data.createdBy || null,
    ]
  );
  return mapEvent(result.rows[0]);
}

async function deactivateEvent(id) {
  const result = await query(
    `
    UPDATE leaderboard_events
    SET active = FALSE
    WHERE id = $1
    RETURNING *
    `,
    [Number(id)]
  );
  return mapEvent(result.rows[0]);
}

module.exports = {
  listActiveEvents,
  listAllEvents,
  createEvent,
  deactivateEvent,
};
