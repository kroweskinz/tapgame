(() => {
  "use strict";

  const EVENT_ICONS = ["🏆", "🌲", "⚡", "💎", "🔥", "👑", "🎁", "🌟", "🎯", "🪙", "🐉", "🧿"];
  const PRIZE_ICONS = ["🥇", "🥈", "🥉", "💰", "💎", "🎁", "⭐", "🪙", "🏅", "👑", "🧸", "🎮"];
  const THEMES = [
    { id: "gold", label: "Золото" },
    { id: "emerald", label: "Изумруд" },
    { id: "crimson", label: "Рубин" },
    { id: "aurora", label: "Аврора" },
  ];
  const DURATIONS = [
    { h: 12, label: "12 ч" },
    { h: 24, label: "1 день" },
    { h: 48, label: "2 дня" },
    { h: 72, label: "3 дня" },
    { h: 168, label: "7 дней" },
  ];

  let isAdmin = false;
  let events = [];
  let tickTimer = null;
  let form = {
    title: "",
    description: "",
    icon: "🏆",
    theme: "gold",
    durationHours: 48,
    prize1Icon: "🥇",
    prize1Text: "",
    prize2Icon: "🥈",
    prize2Text: "",
    prize3Icon: "🥉",
    prize3Text: "",
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function apiBase() {
    if (window.CumLeaderboard && typeof window.CumLeaderboard.resolveApiBase === "function") {
      return window.CumLeaderboard.resolveApiBase();
    }
    try {
      const res = await fetch(`${location.origin}/api/health`, { cache: "no-store" });
      if (res.ok) return location.origin;
    } catch (_) {
      /* ignore */
    }
    return "";
  }

  function initData() {
    const tg = window.Telegram && window.Telegram.WebApp;
    return (tg && tg.initData) || "";
  }

  function formatRemain(ms) {
    if (ms <= 0) return "завершено";
    const total = Math.floor(ms / 1000);
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (d > 0) return `${d}д ${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function renderCountdownBits() {
    document.querySelectorAll("[data-event-ends]").forEach((el) => {
      const ends = Number(el.getAttribute("data-event-ends")) || 0;
      const remain = ends - Date.now();
      el.textContent = formatRemain(remain);
      el.classList.toggle("is-ended", remain <= 0);
    });
  }

  function startTick() {
    if (tickTimer) return;
    tickTimer = setInterval(renderCountdownBits, 1000);
  }

  function formatCum(n) {
    const v = Math.floor(Number(n) || 0);
    if (v >= 1e12) return (v / 1e12).toFixed(2) + "T";
    if (v >= 1e9) return (v / 1e9).toFixed(2) + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(2) + "M";
    if (v >= 1e4) return (v / 1e3).toFixed(1) + "K";
    if (v >= 1000) return (v / 1e3).toFixed(2) + "K";
    return String(v);
  }

  function renderEventCard(ev) {
    const ends = new Date(ev.endsAt).getTime();
    const prizes = (ev.prizes || [])
      .filter((p) => p && p.text)
      .map(
        (p) =>
          `<div class="ev-prize"><span class="ev-prize-icon">${escapeHtml(p.icon || "🎁")}</span><div class="ev-prize-body"><span class="ev-prize-place">${p.place} место</span><span class="ev-prize-text">${escapeHtml(p.text)}</span></div></div>`
      )
      .join("");

    const board = Array.isArray(ev.leaderboard) ? ev.leaderboard : [];
    const rows = board.length
      ? board
          .map((p) => {
            const name = p.username ? `@${p.username}` : p.name || "Игрок";
            const medal =
              p.rank === 1 ? "🥇" : p.rank === 2 ? "🥈" : p.rank === 3 ? "🥉" : `#${p.rank}`;
            return `
              <div class="ev-lb-row">
                <span class="ev-lb-rank">${medal}</span>
                <span class="ev-lb-name">${escapeHtml(name)}</span>
                <span class="ev-lb-score">${formatCum(p.score)}</span>
              </div>`;
          })
          .join("")
      : `<p class="ev-lb-empty">Рейтинг события пуст — тапай, чтобы попасть в топ</p>`;

    const meLine = ev.me
      ? `<div class="ev-lb-me">Ты: #${ev.me.rank} · ${formatCum(ev.me.score)} CUM за событие</div>`
      : `<div class="ev-lb-me">Счёт события идёт с момента создания. Тапай и жми «Обновить».</div>`;

    return `
      <article class="ev-card theme-${escapeHtml(ev.theme || "gold")}">
        <div class="ev-card-glow" aria-hidden="true"></div>
        <div class="ev-card-top">
          <div class="ev-icon-wrap"><span class="ev-icon">${escapeHtml(ev.icon || "🏆")}</span></div>
          <div class="ev-card-titles">
            <h3>${escapeHtml(ev.title)}</h3>
            ${ev.description ? `<p>${escapeHtml(ev.description)}</p>` : ""}
          </div>
        </div>
        <div class="ev-countdown">
          <span class="ev-countdown-label">До конца</span>
          <span class="ev-countdown-value" data-event-ends="${ends}">${formatRemain(ends - Date.now())}</span>
        </div>
        ${prizes ? `<div class="ev-prizes">${prizes}</div>` : ""}
        <div class="ev-lb">
          <div class="ev-lb-head">Топ события</div>
          <div class="ev-lb-list">${rows}</div>
          ${meLine}
        </div>
      </article>
    `;
  }

  function renderPublic() {
    const host = document.getElementById("events-list");
    if (!host) return;
    if (!events.length) {
      host.innerHTML = `<p class="ev-empty">Сейчас нет активных событий в топе. Загляни позже.</p>`;
      return;
    }
    host.innerHTML = events.map(renderEventCard).join("");
    renderCountdownBits();
    startTick();
  }

  function iconPicker(list, selected, attr) {
    return list
      .map(
        (icon) =>
          `<button type="button" class="ev-icon-pick ${icon === selected ? "active" : ""}" data-${attr}="${escapeHtml(icon)}">${escapeHtml(icon)}</button>`
      )
      .join("");
  }

  function renderAdmin() {
    const host = document.getElementById("events-admin");
    if (!host) return;
    if (!isAdmin) {
      host.hidden = true;
      host.innerHTML = "";
      return;
    }
    host.hidden = false;
    host.innerHTML = `
      <div class="ev-admin-card">
        <div class="ev-admin-head">
          <span class="ev-admin-badge">ADMIN</span>
          <h3>Создать событие топа</h3>
        </div>
        <label class="ev-field">
          <span>Название</span>
          <input type="text" id="ev-title" maxlength="80" placeholder="Например: Лесной марафон" value="${escapeHtml(form.title)}" />
        </label>
        <label class="ev-field">
          <span>Описание</span>
          <input type="text" id="ev-desc" maxlength="240" placeholder="Кто в топе — тот и приз" value="${escapeHtml(form.description)}" />
        </label>
        <div class="ev-field">
          <span>Иконка события</span>
          <div class="ev-icon-grid" id="ev-icon-grid">${iconPicker(EVENT_ICONS, form.icon, "icon")}</div>
        </div>
        <div class="ev-field">
          <span>Оформление</span>
          <div class="ev-theme-row" id="ev-theme-row">
            ${THEMES.map(
              (t) =>
                `<button type="button" class="ev-theme-btn theme-${t.id} ${form.theme === t.id ? "active" : ""}" data-theme="${t.id}">${t.label}</button>`
            ).join("")}
          </div>
        </div>
        <div class="ev-field">
          <span>Длительность</span>
          <div class="ev-dur-row" id="ev-dur-row">
            ${DURATIONS.map(
              (d) =>
                `<button type="button" class="ev-dur-btn ${form.durationHours === d.h ? "active" : ""}" data-hours="${d.h}">${d.label}</button>`
            ).join("")}
          </div>
        </div>
        <div class="ev-prize-edit">
          <div class="ev-prize-edit-row">
            <div class="ev-icon-grid tiny" data-prize-icon="1">${iconPicker(PRIZE_ICONS, form.prize1Icon, "picon")}</div>
            <input type="text" id="ev-p1" maxlength="120" placeholder="Приз за 1 место" value="${escapeHtml(form.prize1Text)}" />
          </div>
          <div class="ev-prize-edit-row">
            <div class="ev-icon-grid tiny" data-prize-icon="2">${iconPicker(PRIZE_ICONS, form.prize2Icon, "picon")}</div>
            <input type="text" id="ev-p2" maxlength="120" placeholder="Приз за 2 место" value="${escapeHtml(form.prize2Text)}" />
          </div>
          <div class="ev-prize-edit-row">
            <div class="ev-icon-grid tiny" data-prize-icon="3">${iconPicker(PRIZE_ICONS, form.prize3Icon, "picon")}</div>
            <input type="text" id="ev-p3" maxlength="120" placeholder="Приз за 3 место" value="${escapeHtml(form.prize3Text)}" />
          </div>
        </div>
        <button type="button" class="ev-create-btn" id="ev-create-btn">Опубликовать событие</button>
        <p class="ev-admin-hint" id="ev-admin-hint"></p>
      </div>
    `;
    bindAdmin();
  }

  function setHint(text, ok) {
    const el = document.getElementById("ev-admin-hint");
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("ok", !!ok);
    el.classList.toggle("err", !!text && !ok);
  }

  function readFormInputs() {
    form.title = (document.getElementById("ev-title") || {}).value || form.title;
    form.description = (document.getElementById("ev-desc") || {}).value || form.description;
    form.prize1Text = (document.getElementById("ev-p1") || {}).value || form.prize1Text;
    form.prize2Text = (document.getElementById("ev-p2") || {}).value || form.prize2Text;
    form.prize3Text = (document.getElementById("ev-p3") || {}).value || form.prize3Text;
  }

  function bindAdmin() {
    const host = document.getElementById("events-admin");
    if (!host) return;

    host.querySelectorAll("[data-icon]").forEach((btn) => {
      btn.addEventListener("click", () => {
        form.icon = btn.getAttribute("data-icon");
        readFormInputs();
        renderAdmin();
      });
    });

    host.querySelectorAll("[data-theme]").forEach((btn) => {
      btn.addEventListener("click", () => {
        form.theme = btn.getAttribute("data-theme");
        readFormInputs();
        renderAdmin();
      });
    });

    host.querySelectorAll("[data-hours]").forEach((btn) => {
      btn.addEventListener("click", () => {
        form.durationHours = Number(btn.getAttribute("data-hours")) || 48;
        readFormInputs();
        renderAdmin();
      });
    });

    host.querySelectorAll("[data-prize-icon]").forEach((grid) => {
      const place = grid.getAttribute("data-prize-icon");
      grid.querySelectorAll("[data-picon]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const icon = btn.getAttribute("data-picon");
          if (place === "1") form.prize1Icon = icon;
          if (place === "2") form.prize2Icon = icon;
          if (place === "3") form.prize3Icon = icon;
          readFormInputs();
          renderAdmin();
        });
      });
    });

    const createBtn = document.getElementById("ev-create-btn");
    if (createBtn) {
      createBtn.addEventListener("click", async () => {
        readFormInputs();
        if (!form.title.trim()) {
          setHint("Укажи название события", false);
          return;
        }
        createBtn.disabled = true;
        setHint("Публикуем…", true);
        try {
          const base = await apiBase();
          const res = await fetch(`${base}/api/events/admin/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: initData(),
              title: form.title.trim(),
              description: form.description.trim(),
              icon: form.icon,
              theme: form.theme,
              durationHours: form.durationHours,
              prize1Icon: form.prize1Icon,
              prize1Text: form.prize1Text.trim(),
              prize2Icon: form.prize2Icon,
              prize2Text: form.prize2Text.trim(),
              prize3Icon: form.prize3Icon,
              prize3Text: form.prize3Text.trim(),
            }),
          });
          const data = await res.json();
          if (!data.ok) {
            setHint("Не удалось создать: " + (data.error || res.status), false);
            createBtn.disabled = false;
            return;
          }
          form.title = "";
          form.description = "";
          form.prize1Text = "";
          form.prize2Text = "";
          form.prize3Text = "";
          await refresh();
          renderAdmin();
          setHint("Событие опубликовано!", true);
        } catch (_) {
          setHint("Ошибка сети", false);
          createBtn.disabled = false;
        }
      });
    }
  }

  async function checkAdmin() {
    const base = await apiBase();
    const dataInit = initData();
    if (!base || !dataInit) {
      isAdmin = false;
      return false;
    }
    try {
      const res = await fetch(`${base}/api/events/admin/me`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData: dataInit }),
      });
      const data = await res.json();
      isAdmin = !!(data && data.ok && data.admin);
      return isAdmin;
    } catch (_) {
      isAdmin = false;
      return false;
    }
  }

  async function loadEvents() {
    const base = await apiBase();
    if (!base) {
      events = [];
      return;
    }
    try {
      const dataInit = initData();
      let data;
      if (dataInit) {
        const res = await fetch(`${base}/api/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: dataInit }),
        });
        data = await res.json();
      } else {
        const res = await fetch(`${base}/api/events`, { cache: "no-store" });
        data = await res.json();
      }
      events = data && data.ok && Array.isArray(data.events) ? data.events : [];
    } catch (_) {
      events = [];
    }
  }

  async function refresh() {
    await loadEvents();
    renderPublic();
    if (isAdmin) renderAdmin();
  }

  async function onPanelOpen() {
    await checkAdmin();
    await refresh();
    renderAdmin();
  }

  window.TapEvents = {
    onPanelOpen,
    refresh,
    isAdmin: () => isAdmin,
  };
})();
