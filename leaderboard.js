(() => {
  "use strict";

  function cfg() {
    return window.CUM_CONFIG || window.CUM_PAYMENT || {};
  }

  function apiBase() {
    return String(cfg().leaderboardApi || "").replace(/\/$/, "");
  }

  function jsonbinConfig() {
    const c = cfg();
    const id = String(c.jsonbinId || "").trim();
    const key = String(c.jsonbinKey || "").trim();
    if (!id || !key) return null;
    return { id, key };
  }

  function mode() {
    if (apiBase()) return "api";
    if (jsonbinConfig()) return "jsonbin";
    return "none";
  }

  function formatScore(n) {
    const v = Math.floor(Number(n) || 0);
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (v >= 1e4) return (v / 1e3).toFixed(1) + "K";
    if (v >= 1000) return (v / 1e3).toFixed(2) + "K";
    return String(v);
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getTgUser() {
    const tg = window.Telegram && window.Telegram.WebApp;
    const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (u && u.id) return u;
    return null;
  }

  function calcScore(lifetime, level, prestige) {
    return Math.max(0, Math.floor(lifetime || 0)) + Math.max(1, level || 1) * 500 + Math.max(0, prestige || 0) * 5000;
  }

  function sortPlayers(map) {
    return Object.values(map || {})
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.level !== a.level) return b.level - a.level;
        return b.lifetime - a.lifetime;
      })
      .slice(0, 50)
      .map((p, i) => ({ rank: i + 1, ...p }));
  }

  function findMe(list, userId) {
    if (!userId) return null;
    return list.find((p) => String(p.userId) === String(userId)) || null;
  }

  let lastSubmitAt = 0;
  let cachedPlayers = [];
  let myRank = null;
  let loading = false;
  let writeLock = Promise.resolve();

  async function jsonbinRead() {
    const jb = jsonbinConfig();
    const res = await fetch(`https://api.jsonbin.io/v3/b/${jb.id}/latest`, {
      headers: {
        "X-Master-Key": jb.key,
        "X-Bin-Meta": "false",
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error("jsonbin_read_" + res.status);
    const data = await res.json();
    // X-Bin-Meta false returns record directly; otherwise .record
    const record = data && data.record ? data.record : data;
    if (!record || typeof record !== "object") return { players: {} };
    if (!record.players || typeof record.players !== "object") return { players: {} };
    return record;
  }

  async function jsonbinWrite(record) {
    const jb = jsonbinConfig();
    const res = await fetch(`https://api.jsonbin.io/v3/b/${jb.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Master-Key": jb.key,
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) throw new Error("jsonbin_write_" + res.status);
  }

  function setupHintHtml() {
    return `<p class="lb-empty">
      Общий топ нужен общий склад данных (без своего сервера тоже ок).<br/><br/>
      <strong>Вариант без сервера (JSONBin, 2 минуты):</strong><br/>
      1) Зайди на <a href="https://jsonbin.io" target="_blank" rel="noopener">jsonbin.io</a>, создай Bin с телом <code>{"players":{}}</code><br/>
      2) Вставь в <code>payment-config.js</code>:<br/>
      <code>jsonbinId</code> и <code>jsonbinKey</code> (Master Key)<br/><br/>
      Либо укажи <code>leaderboardApi</code>, если крутишь бота с API.
    </p>`;
  }

  async function fetchTop() {
    const listEl = document.getElementById("leaderboard-list");
    const metaEl = document.getElementById("leaderboard-meta");
    if (!listEl) return;

    const m = mode();
    if (m === "none") {
      listEl.innerHTML = setupHintHtml();
      if (metaEl) metaEl.textContent = "";
      return;
    }

    loading = true;
    listEl.innerHTML = '<p class="lb-empty">Загрузка…</p>';
    try {
      if (m === "api") {
        const res = await fetch(`${apiBase()}/api/leaderboard?limit=50`, { cache: "no-store" });
        const data = await res.json();
        if (!data.ok) throw new Error("bad_response");
        cachedPlayers = data.players || [];
      } else {
        const record = await jsonbinRead();
        cachedPlayers = sortPlayers(record.players);
        const user = getTgUser();
        myRank = findMe(cachedPlayers, user && user.id);
      }
      renderList();
    } catch (err) {
      listEl.innerHTML =
        '<p class="lb-empty">Не удалось загрузить топ.<br/>Проверь jsonbinId / jsonbinKey или leaderboardApi.</p>';
      if (metaEl) metaEl.textContent = "";
    } finally {
      loading = false;
    }
  }

  function renderList() {
    const listEl = document.getElementById("leaderboard-list");
    const metaEl = document.getElementById("leaderboard-meta");
    if (!listEl) return;

    if (!cachedPlayers.length) {
      listEl.innerHTML = '<p class="lb-empty">Пока никого нет — будь первым!</p>';
      if (metaEl) metaEl.textContent = myRank ? `Твоё место: #${myRank.rank}` : "";
      return;
    }

    listEl.innerHTML = cachedPlayers
      .map((p) => {
        const name = p.username ? `@${p.username}` : p.name || "Игрок";
        const medal = p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`;
        return `
          <div class="lb-row">
            <span class="lb-rank">${medal}</span>
            <div class="lb-info">
              <div class="lb-name">${escapeHtml(name)}</div>
              <div class="lb-sub">ур. ${p.level}${p.prestige ? ` · прест. ${p.prestige}` : ""}</div>
            </div>
            <span class="lb-score">${formatScore(p.score)}</span>
          </div>`;
      })
      .join("");

    if (metaEl) {
      metaEl.textContent = myRank
        ? `Ты: #${myRank.rank} · ${formatScore(myRank.score)} очков`
        : getTgUser()
          ? "Пока нет в топе — тапай и обнови"
          : "Открой из Telegram, чтобы попасть в топ";
    }
  }

  async function submitViaApi(stats) {
    const tg = window.Telegram && window.Telegram.WebApp;
    const initData = tg && tg.initData;
    if (!initData) return null;

    const res = await fetch(`${apiBase()}/api/leaderboard/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        initData,
        lifetime: stats.lifetime || 0,
        level: stats.level || 1,
        prestige: stats.prestige || 0,
      }),
    });
    const data = await res.json();
    if (data.ok) {
      myRank = data.me || null;
      return myRank;
    }
    return null;
  }

  async function submitViaJsonbin(stats) {
    const user = getTgUser();
    if (!user) return null;

    // Serialize writes to reduce lost updates
    const run = writeLock.then(async () => {
      const record = await jsonbinRead();
      const players = record.players || {};
      const id = String(user.id);
      const prev = players[id] || {};
      const lifetime = Math.max(Number(prev.lifetime) || 0, Math.floor(stats.lifetime || 0));
      const level = Math.max(Number(prev.level) || 1, Math.floor(stats.level || 1));
      const prestige = Math.max(Number(prev.prestige) || 0, Math.floor(stats.prestige || 0));
      const score = Math.max(Number(prev.score) || 0, calcScore(lifetime, level, prestige));

      players[id] = {
        userId: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок",
        username: user.username || "",
        photoUrl: user.photo_url || "",
        lifetime,
        level,
        prestige,
        score,
        updatedAt: Date.now(),
      };

      // Keep top 200 by score
      const ranked = Object.values(players).sort((a, b) => b.score - a.score);
      const keep = {};
      ranked.slice(0, 200).forEach((p) => {
        keep[String(p.userId)] = p;
      });

      await jsonbinWrite({ players: keep });
      cachedPlayers = sortPlayers(keep);
      myRank = findMe(cachedPlayers, user.id);
      return myRank;
    });

    writeLock = run.catch(() => {});
    return run;
  }

  async function submit(stats) {
    const m = mode();
    if (m === "none") return null;

    const now = Date.now();
    if (now - lastSubmitAt < 8000) return myRank;
    lastSubmitAt = now;

    try {
      if (m === "api") return await submitViaApi(stats);
      return await submitViaJsonbin(stats);
    } catch (_) {
      return null;
    }
  }

  window.CumLeaderboard = {
    refresh: fetchTop,
    submit,
    isLoading: () => loading,
    mode,
  };
})();
