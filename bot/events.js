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

function mapScoreRow(row, rank) {
  if (!row) return null;
  return {
    rank: rank || null,
    userId: Number(row.user_id),
    name: row.name || "Игрок",
    username: row.username || "",
    photoUrl: row.photo_url || "",
    score: Number(row.score) || 0,
    level: Number(row.level) || 1,
    prestige: Number(row.prestige) || 0,
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
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

async function getActiveEventIds() {
  const result = await query(
    `
    SELECT id FROM leaderboard_events
    WHERE active = TRUE AND ends_at > NOW()
    ORDER BY ends_at ASC
    LIMIT 20
    `
  );
  return result.rows.map((r) => Number(r.id));
}

async function getEventTop(eventId, limit = 20) {
  const result = await query(
    `
    SELECT *
    FROM event_scores
    WHERE event_id = $1
    ORDER BY score DESC, updated_at ASC
    LIMIT $2
    `,
    [Number(eventId), Math.min(50, Math.max(1, limit))]
  );
  return result.rows.map((row, i) => mapScoreRow(row, i + 1));
}

async function getEventRank(eventId, userId) {
  const mine = await query(
    `
    SELECT * FROM event_scores
    WHERE event_id = $1 AND user_id = $2
    `,
    [Number(eventId), Number(userId)]
  );
  if (!mine.rows.length) return null;
  const row = mine.rows[0];
  const score = Number(row.score) || 0;
  const updatedAt = row.updated_at;
  const better = await query(
    `
    SELECT COUNT(*)::int AS cnt
    FROM event_scores
    WHERE event_id = $1
      AND (
        score > $2
        OR (score = $2 AND updated_at < $3)
      )
    `,
    [Number(eventId), score, updatedAt]
  );
  return mapScoreRow(row, (better.rows[0].cnt || 0) + 1);
}

async function attachLeaderboards(events, limit = 10, userId = null) {
  const list = Array.isArray(events) ? events : [];
  if (!list.length) return [];

  const ids = list.map((e) => Number(e.id));
  const tops = await query(
    `
    SELECT * FROM (
      SELECT
        es.*,
        ROW_NUMBER() OVER (
          PARTITION BY es.event_id
          ORDER BY es.score DESC, es.updated_at ASC
        ) AS rn
      FROM event_scores es
      WHERE es.event_id = ANY($1::int[])
    ) ranked
    WHERE rn <= $2
    ORDER BY event_id ASC, rn ASC
    `,
    [ids, Math.min(30, Math.max(1, limit))]
  );

  const byEvent = {};
  for (const row of tops.rows) {
    const eid = Number(row.event_id);
    if (!byEvent[eid]) byEvent[eid] = [];
    byEvent[eid].push(mapScoreRow(row, Number(row.rn)));
  }

  const out = [];
  for (const ev of list) {
    const id = Number(ev.id);
    let me = null;
    if (userId) {
      me = await getEventRank(id, userId);
    }
    out.push({
      ...ev,
      leaderboard: byEvent[id] || [],
      me,
    });
  }
  return out;
}

/**
 * Event score = CUM earned after the player first syncs during this event.
 * First submit sets baseline = careerEarned (pre-event farm doesn't count).
 * Later submits: score = careerEarned - baseline.
 */
async function upsertEventScore(entry) {
  const eventId = Number(entry.eventId);
  const userId = Number(entry.userId);
  const career = Math.max(0, Math.floor(Number(entry.careerEarned) || 0));
  const level = Math.min(100, Math.max(1, Math.floor(Number(entry.level) || 1)));
  const prestige = Math.max(0, Math.floor(Number(entry.prestige) || 0));

  const existing = await query(
    `SELECT baseline, score FROM event_scores WHERE event_id = $1 AND user_id = $2`,
    [eventId, userId]
  );

  let baseline;
  let score;
  if (!existing.rows.length) {
    baseline = career;
    score = 0;
  } else {
    baseline = Number(existing.rows[0].baseline) || 0;
    // career should be monotonic; if it dipped, keep previous score
    const computed = Math.max(0, career - baseline);
    score = Math.max(Number(existing.rows[0].score) || 0, computed);
  }

  const result = await query(
    `
    INSERT INTO event_scores (
      event_id, user_id, name, username, photo_url,
      baseline, score, level, prestige, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
    ON CONFLICT (event_id, user_id) DO UPDATE SET
      name = EXCLUDED.name,
      username = EXCLUDED.username,
      photo_url = COALESCE(NULLIF(EXCLUDED.photo_url, ''), event_scores.photo_url),
      score = GREATEST(event_scores.score, EXCLUDED.score),
      level = EXCLUDED.level,
      prestige = EXCLUDED.prestige,
      updated_at = NOW()
    RETURNING *
    `,
    [
      eventId,
      userId,
      entry.name || "Игрок",
      entry.username || "",
      entry.photoUrl || "",
      baseline,
      score,
      level,
      prestige,
    ]
  );

  return getEventRank(eventId, userId).then((me) => ({
    player: mapScoreRow(result.rows[0], me && me.rank),
    me,
  }));
}

async function submitToActiveEvents(entry) {
  const ids = await getActiveEventIds();
  const results = [];
  for (const eventId of ids) {
    const saved = await upsertEventScore({ ...entry, eventId });
    results.push({ eventId, ...saved });
  }
  return results;
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
  const event = mapEvent(result.rows[0]);

  // Snapshot current careers so event score starts from creation moment
  try {
    await query(
      `
      INSERT INTO event_scores (
        event_id, user_id, name, username, photo_url,
        baseline, score, level, prestige, updated_at
      )
      SELECT
        $1,
        user_id,
        name,
        username,
        photo_url,
        career_earned,
        0,
        level,
        prestige,
        NOW()
      FROM players
      WHERE career_earned > 0
      ON CONFLICT (event_id, user_id) DO NOTHING
      `,
      [event.id]
    );
  } catch (err) {
    console.error("event baseline snapshot", err);
  }

  return event;
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
  getEventTop,
  getEventRank,
  attachLeaderboards,
  upsertEventScore,
  submitToActiveEvents,
  getActiveEventIds,
};
