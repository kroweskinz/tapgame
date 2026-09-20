(() => {
  "use strict";

  function apiBase() {
    const cfg = window.CUM_CONFIG || window.CUM_PAYMENT || {};
    return String(cfg.leaderboardApi || "").replace(/\/$/, "");
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

  let lastSubmitAt = 0;
  let cachedPlayers = [];
  let myRank = null;
  let loading = false;

  async function fetchTop() {
    const base = apiBase();
    const listEl = document.getElementById("leaderboard-list");
    const metaEl = document.getElementById("leaderboard-meta");
    if (!listEl) return;

    if (!base) {
      listEl.innerHTML =
        '<p class="lb-empty">Лидерборд не подключен.<br/>Укажи <code>leaderboardApi</code> в config.js и запусти бота с API.</p>';
      if (metaEl) metaEl.textContent = "";
      return;
    }

    loading = true;
    listEl.innerHTML = '<p class="lb-empty">Загрузка…</p>';
    try {
      const res = await fetch(`${base}/api/leaderboard?limit=50`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok) throw new Error("bad_response");
      cachedPlayers = data.players || [];
      renderList();
    } catch (err) {
      listEl.innerHTML =
        '<p class="lb-empty">Не удалось загрузить топ.<br/>Проверь, что API бота доступен по HTTPS.</p>';
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
      metaEl.textContent = myRank ? `Ты: #${myRank.rank} · ${formatScore(myRank.score)} очков` : "Открой из Telegram, чтобы попасть в топ";
    }
  }

  async function submit(stats) {
    const base = apiBase();
    if (!base) return null;

    const tg = window.Telegram && window.Telegram.WebApp;
    const initData = tg && tg.initData;
    if (!initData) return null;

    const now = Date.now();
    if (now - lastSubmitAt < 8000) return myRank;
    lastSubmitAt = now;

    try {
      const res = await fetch(`${base}/api/leaderboard/submit`, {
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
    } catch (_) {
      /* offline */
    }
    return null;
  }

  window.CumLeaderboard = {
    refresh: fetchTop,
    submit,
    isLoading: () => loading,
  };
})();
