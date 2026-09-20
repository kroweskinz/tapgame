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

  function formatCum(n) {
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

  /** Rank by coins on balance; level is tie-breaker and shown in UI */
  function sortPlayers(map) {
    return Object.values(map || {})
      .sort((a, b) => {
        const ba = Number(a.balance != null ? a.balance : a.score) || 0;
        const bb = Number(b.balance != null ? b.balance : b.score) || 0;
        if (bb !== ba) return bb - ba;
        return (Number(b.level) || 1) - (Number(a.level) || 1);
      })
      .slice(0, 50)
      .map((p, i) => ({
        rank: i + 1,
        ...p,
        balance: Math.floor(Number(p.balance != null ? p.balance : p.score) || 0),
        level: Math.min(100, Math.max(1, Math.floor(Number(p.level) || 1))),
      }));
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
      Общий топ нужен общий склад данных.<br/><br/>
      Укажи в <code>payment-config.js</code> поля <code>jsonbinId</code> и <code>jsonbinKey</code>
      или <code>leaderboardApi</code>.
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
        cachedPlayers = sortPlayers(
          Object.fromEntries((data.players || []).map((p) => [String(p.userId), p]))
        );
      } else {
        const record = await jsonbinRead();
        cachedPlayers = sortPlayers(record.players);
      }
      const user = getTgUser();
      myRank = findMe(cachedPlayers, user && user.id);
      renderList();
    } catch (err) {
      listEl.innerHTML =
        '<p class="lb-empty">Не удалось загрузить топ.<br/>Проверь jsonbinId / jsonbinKey.</p>';
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
        const bal = Math.floor(Number(p.balance != null ? p.balance : p.score) || 0);
        const lvl = Math.floor(Number(p.level) || 1);
        return `
          <div class="lb-row">
            <span class="lb-rank">${medal}</span>
            <div class="lb-info">
              <div class="lb-name">${escapeHtml(name)}</div>
              <div class="lb-sub">Уровень ${lvl}</div>
            </div>
            <div class="lb-score-wrap">
              <span class="lb-score">${formatCum(bal)}</span>
              <span class="lb-score-unit">CUM</span>
            </div>
          </div>`;
      })
      .join("");

    if (metaEl) {
      if (myRank) {
        const bal = Math.floor(Number(myRank.balance != null ? myRank.balance : myRank.score) || 0);
        metaEl.textContent = `Ты: #${myRank.rank} · ${formatCum(bal)} CUM · ур. ${myRank.level}`;
      } else if (getTgUser()) {
        metaEl.textContent = "Пока нет в топе — тапай и нажми «Обновить»";
      } else {
        metaEl.textContent = "Открой из Telegram, чтобы попасть в топ";
      }
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
        balance: stats.balance || 0,
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

    const run = writeLock.then(async () => {
      const record = await jsonbinRead();
      const players = record.players || {};
      const id = String(user.id);
      const balance = Math.max(0, Math.floor(Number(stats.balance) || 0));
      const level = Math.min(100, Math.max(1, Math.floor(Number(stats.level) || 1)));
      const prestige = Math.max(0, Math.floor(Number(stats.prestige) || 0));

      players[id] = {
        userId: user.id,
        name: [user.first_name, user.last_name].filter(Boolean).join(" ") || "Игрок",
        username: user.username || "",
        photoUrl: user.photo_url || "",
        balance,
        score: balance,
        level,
        prestige,
        updatedAt: Date.now(),
      };

      const ranked = Object.values(players).sort((a, b) => {
        const ba = Number(a.balance != null ? a.balance : a.score) || 0;
        const bb = Number(b.balance != null ? b.balance : b.score) || 0;
        if (bb !== ba) return bb - ba;
        return (Number(b.level) || 1) - (Number(a.level) || 1);
      });
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
    if (now - lastSubmitAt < 5000) return myRank;
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
