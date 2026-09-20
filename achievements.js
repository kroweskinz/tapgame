(() => {
  "use strict";

  /**
   * 55+ achievements. Each: id, icon, title, desc, check(ctx), reward (CUM)
   * ctx = { state, stats, now }
   */
  const ACHIEVEMENTS = [
    // —— Тапы ——
    { id: "tap_1", icon: "👆", title: "Первый тап", desc: "Сделай 1 тап", reward: 5, check: (c) => c.state.totalTaps >= 1 },
    { id: "tap_10", icon: "🖐️", title: "Разминка", desc: "Сделай 10 тапов", reward: 10, check: (c) => c.state.totalTaps >= 10 },
    { id: "tap_50", icon: "👊", title: "В темпе", desc: "Сделай 50 тапов", reward: 25, check: (c) => c.state.totalTaps >= 50 },
    { id: "tap_100", icon: "💪", title: "Сотня", desc: "Сделай 100 тапов", reward: 50, check: (c) => c.state.totalTaps >= 100 },
    { id: "tap_500", icon: "🔥", title: "Горячие пальцы", desc: "Сделай 500 тапов", reward: 120, check: (c) => c.state.totalTaps >= 500 },
    { id: "tap_1k", icon: "⚡", title: "Тысячник", desc: "Сделай 1 000 тапов", reward: 250, check: (c) => c.state.totalTaps >= 1000 },
    { id: "tap_5k", icon: "🌪️", title: "Ураган тапов", desc: "Сделай 5 000 тапов", reward: 600, check: (c) => c.state.totalTaps >= 5000 },
    { id: "tap_10k", icon: "🚀", title: "Марафонец", desc: "Сделай 10 000 тапов", reward: 1200, check: (c) => c.state.totalTaps >= 10000 },
    { id: "tap_50k", icon: "👑", title: "Легенда экрана", desc: "Сделай 50 000 тапов", reward: 5000, check: (c) => c.state.totalTaps >= 50000 },

    // —— Встречи ——
    { id: "meet_1", icon: "🤝", title: "Знакомство", desc: "Доведи сближение до 100% 1 раз", reward: 15, check: (c) => c.state.meetings >= 1 },
    { id: "meet_5", icon: "🌲", title: "Лесные посиделки", desc: "5 встреч персонажей", reward: 40, check: (c) => c.state.meetings >= 5 },
    { id: "meet_10", icon: "💚", title: "Свой круг", desc: "10 встреч", reward: 80, check: (c) => c.state.meetings >= 10 },
    { id: "meet_25", icon: "🧲", title: "Притяжение", desc: "25 встреч", reward: 150, check: (c) => c.state.meetings >= 25 },
    { id: "meet_50", icon: "💫", title: "Неразлучные", desc: "50 встреч", reward: 300, check: (c) => c.state.meetings >= 50 },
    { id: "meet_100", icon: "🌌", title: "Судьба сведена", desc: "100 встреч", reward: 700, check: (c) => c.state.meetings >= 100 },
    { id: "meet_250", icon: "🧿", title: "Вечное сближение", desc: "250 встреч", reward: 2000, check: (c) => c.state.meetings >= 250 },

    // —— Уровни ——
    { id: "lvl_5", icon: "🌱", title: "Росток", desc: "Достигни 5 уровня", reward: 30, check: (c) => c.state.playerLevel >= 5 },
    { id: "lvl_10", icon: "🌿", title: "Подрос", desc: "Достигни 10 уровня", reward: 60, check: (c) => c.state.playerLevel >= 10 },
    { id: "lvl_20", icon: "🌳", title: "Крепкий ствол", desc: "Достигни 20 уровня", reward: 120, check: (c) => c.state.playerLevel >= 20 },
    { id: "lvl_30", icon: "🏔️", title: "Высота", desc: "Достигни 30 уровня", reward: 200, check: (c) => c.state.playerLevel >= 30 },
    { id: "lvl_50", icon: "🦅", title: "Полвека", desc: "Достигни 50 уровня", reward: 500, check: (c) => c.state.playerLevel >= 50 },
    { id: "lvl_75", icon: "🐉", title: "Дракон опыта", desc: "Достигни 75 уровня", reward: 1200, check: (c) => c.state.playerLevel >= 75 },
    { id: "lvl_100", icon: "💯", title: "Кап", desc: "Достигни максимального 100 уровня", reward: 5000, check: (c) => c.state.playerLevel >= 100 },

    // —— Баланс ——
    { id: "bal_100", icon: "🪙", title: "Мелочь в кармане", desc: "Накопи 100 CUM на счету", reward: 10, check: (c) => c.state.balance >= 100 },
    { id: "bal_500", icon: "💰", title: "Кошелёк толстеет", desc: "Накопи 500 CUM", reward: 25, check: (c) => c.state.balance >= 500 },
    { id: "bal_1k", icon: "💎", title: "Тысяча на руках", desc: "Накопи 1 000 CUM", reward: 50, check: (c) => c.state.balance >= 1000 },
    { id: "bal_5k", icon: "🏦", title: "Мини-банкир", desc: "Накопи 5 000 CUM", reward: 150, check: (c) => c.state.balance >= 5000 },
    { id: "bal_10k", icon: "🤑", title: "Десять тысяч", desc: "Накопи 10 000 CUM", reward: 300, check: (c) => c.state.balance >= 10000 },
    { id: "bal_50k", icon: "🏆", title: "Состоятельный", desc: "Накопи 50 000 CUM", reward: 1000, check: (c) => c.state.balance >= 50000 },
    { id: "bal_100k", icon: "🏛️", title: "Империя CUM", desc: "Накопи 100 000 CUM", reward: 3000, check: (c) => c.state.balance >= 100000 },

    // —— Lifetime ——
    { id: "life_1k", icon: "📈", title: "Первый милли… почти", desc: "Заработай 1 000 CUM за всё время", reward: 40, check: (c) => c.state.lifetime >= 1000 },
    { id: "life_10k", icon: "📊", title: "Серьёзный доход", desc: "Заработай 10 000 CUM за всё время", reward: 200, check: (c) => c.state.lifetime >= 10000 },
    { id: "life_100k", icon: "🧾", title: "Бухгалтер леса", desc: "Заработай 100 000 CUM за всё время", reward: 1500, check: (c) => c.state.lifetime >= 100000 },
    { id: "life_1m", icon: "🌟", title: "Миллионер CUM", desc: "Заработай 1 000 000 CUM за всё время", reward: 10000, check: (c) => c.state.lifetime >= 1000000 },

    // —— Комбо ——
    { id: "combo_5", icon: "✨", title: "Искра комбо", desc: "Набери комбо ×5", reward: 20, check: (c) => c.stats.maxCombo >= 5 },
    { id: "combo_15", icon: "🎇", title: "Серия ударов", desc: "Набери комбо 15", reward: 60, check: (c) => c.stats.maxCombo >= 15 },
    { id: "combo_35", icon: "🎆", title: "Безумие ритма", desc: "Набери комбо 35", reward: 150, check: (c) => c.stats.maxCombo >= 35 },
    { id: "combo_60", icon: "🌀", title: "В трансе", desc: "Набери комбо 60", reward: 400, check: (c) => c.stats.maxCombo >= 60 },
    { id: "combo_100", icon: "🧿", title: "Сто ударов подряд", desc: "Набери комбо 100", reward: 1000, check: (c) => c.stats.maxCombo >= 100 },

    // —— Криты ——
    { id: "crit_1", icon: "💥", title: "Критический момент", desc: "Выбей 1 крит", reward: 15, check: (c) => c.stats.crits >= 1 },
    { id: "crit_10", icon: "🎯", title: "Меткий", desc: "Выбей 10 критов", reward: 50, check: (c) => c.stats.crits >= 10 },
    { id: "crit_50", icon: "⚔️", title: "Критующий", desc: "Выбей 50 критов", reward: 150, check: (c) => c.stats.crits >= 50 },
    { id: "crit_100", icon: "🗡️", title: "Мастер крита", desc: "Выбей 100 критов", reward: 350, check: (c) => c.stats.crits >= 100 },
    { id: "crit_500", icon: "☠️", title: "Крит-машина", desc: "Выбей 500 критов", reward: 1500, check: (c) => c.stats.crits >= 500 },

    // —— Апгрейды ——
    { id: "up_first", icon: "⬆️", title: "Первый апгрейд", desc: "Купи любой апгрейд", reward: 20, check: (c) => c.stats.upgradesBought >= 1 },
    { id: "up_10", icon: "🔧", title: "Механик", desc: "Купи 10 апгрейдов суммарно", reward: 80, check: (c) => c.stats.upgradesBought >= 10 },
    { id: "up_25", icon: "🛠️", title: "Инженер леса", desc: "Купи 25 апгрейдов", reward: 200, check: (c) => c.stats.upgradesBought >= 25 },
    { id: "up_50", icon: "🏭", title: "Конвейер улучшений", desc: "Купи 50 апгрейдов", reward: 500, check: (c) => c.stats.upgradesBought >= 50 },
    { id: "up_power5", icon: "🥊", title: "Силач", desc: "Сила тапа ур. 5+", reward: 100, check: (c) => (c.state.levels.power || 0) >= 5 },
    { id: "up_mult5", icon: "✖️", title: "Множитель души", desc: "Множитель ур. 5+", reward: 100, check: (c) => (c.state.levels.mult || 0) >= 5 },
    { id: "up_auto1", icon: "🤖", title: "Автопилот включён", desc: "Купи автотап", reward: 80, check: (c) => (c.state.levels.auto || 0) >= 1 },
    { id: "up_auto5", icon: "🛸", title: "Ферма тапов", desc: "Автотап ур. 5+", reward: 250, check: (c) => (c.state.levels.auto || 0) >= 5 },
    { id: "up_crit_maxish", icon: "🎲", title: "Везунчик", desc: "Крит-шанс ур. 5+", reward: 150, check: (c) => (c.state.levels.crit || 0) >= 5 },
    { id: "up_all_types", icon: "🧩", title: "Полный набор", desc: "Купи хотя бы по 1 уровню каждого апгрейда", reward: 300, check: (c) => Object.values(c.state.levels || {}).every((v) => v >= 1) },

    // —— Бусты ——
    { id: "boost_1", icon: "⚡", title: "Подзарядка", desc: "Активируй любой буст", reward: 40, check: (c) => c.stats.boostsUsed >= 1 },
    { id: "boost_5", icon: "🔋", title: "Любитель бустов", desc: "Активируй 5 бустов", reward: 120, check: (c) => c.stats.boostsUsed >= 5 },
    { id: "boost_15", icon: "☄️", title: "Зависимый от ×N", desc: "Активируй 15 бустов", reward: 400, check: (c) => c.stats.boostsUsed >= 15 },
    { id: "boost_x5", icon: "5️⃣", title: "Пятёрочка", desc: "Активируй буст ×5", reward: 80, check: (c) => c.stats.boostX5 >= 1 },
    { id: "boost_frenzy", icon: "😡", title: "Ярость!", desc: "Активируй «Ярость тапов»", reward: 100, check: (c) => c.stats.boostFrenzy >= 1 },

    // —— Престиж ——
    { id: "pres_1", icon: "⭐", title: "Новая жизнь", desc: "Сделай 1 престиж", reward: 200, check: (c) => c.state.prestige >= 1 },
    { id: "pres_3", icon: "🌟", title: "Цикличность", desc: "Сделай 3 престижа", reward: 500, check: (c) => c.state.prestige >= 3 },
    { id: "pres_5", icon: "✨", title: "Перерождённый", desc: "Сделай 5 престижей", reward: 1000, check: (c) => c.state.prestige >= 5 },
    { id: "pres_10", icon: "♾️", title: "Вечный рестарт", desc: "Сделай 10 престижей", reward: 3000, check: (c) => c.state.prestige >= 10 },

    // —— Донат ——
    { id: "don_1", icon: "❤️", title: "Спасибо!", desc: "Соверши донат любого размера", reward: 100, check: (c) => c.stats.donateCount >= 1 },
    { id: "don_1k", icon: "💝", title: "Меценат леса", desc: "Получи 1 000+ CUM с донатов", reward: 200, check: (c) => c.stats.donateCum >= 1000 },
    { id: "don_5k", icon: "💖", title: "Щедрый спонсор", desc: "Получи 5 000+ CUM с донатов", reward: 500, check: (c) => c.stats.donateCum >= 5000 },
    { id: "don_10k", icon: "💗", title: "Золотой донор", desc: "Получи 10 000+ CUM с донатов", reward: 1000, check: (c) => c.stats.donateCum >= 10000 },

    // —— Время / стиль ——
    { id: "time_5m", icon: "⏱️", title: "Пять минут славы", desc: "Играй суммарно 5 минут", reward: 30, check: (c) => c.stats.playSeconds >= 300 },
    { id: "time_30m", icon: "🕒", title: "Полчаса в лесу", desc: "Играй суммарно 30 минут", reward: 150, check: (c) => c.stats.playSeconds >= 1800 },
    { id: "time_2h", icon: "🕰️", title: "Застрял с пользой", desc: "Играй суммарно 2 часа", reward: 600, check: (c) => c.stats.playSeconds >= 7200 },
    { id: "time_10h", icon: "🏕️", title: "Житель поляны", desc: "Играй суммарно 10 часов", reward: 2500, check: (c) => c.stats.playSeconds >= 36000 },

    // —— Особые / фан ——
    { id: "broke", icon: "🧾", title: "Всё вкачал", desc: "Потрать апгрейд так, чтобы баланс стал < 10 при lifetime ≥ 200", reward: 50, check: (c) => c.state.lifetime >= 200 && c.state.balance < 10 && c.stats.upgradesBought >= 1 },
    { id: "rich_and_fast", icon: "🏎️", title: "Быстрый старт", desc: "Набери 500 CUM lifetime за первые 3 минуты сессии", reward: 100, check: (c) => c.stats.sessionLifetimeAt500s > 0 && c.stats.sessionLifetimeAt500s <= 180 },
    { id: "night", icon: "🌙", title: "Ночной лес", desc: "Тапни между 00:00 и 05:00", reward: 40, check: (c) => c.stats.nightTap },
    { id: "morning", icon: "☀️", title: "Ранняя пташка", desc: "Тапни между 05:00 и 08:00", reward: 40, check: (c) => c.stats.morningTap },
    { id: "mute", icon: "🔇", title: "Тишина в чаще", desc: "Выключи звук", reward: 10, check: (c) => c.stats.mutedOnce },
    { id: "open_lb", icon: "🏅", title: "Зритель арены", desc: "Открой вкладку «Топ»", reward: 15, check: (c) => c.stats.openedLeaderboard },
    { id: "open_ach", icon: "📜", title: "Коллекционер", desc: "Открой окно достижений", reward: 15, check: (c) => c.stats.openedAchievements },
    { id: "streak_white", icon: "🤍", title: "Белый дождь", desc: "Увидь эффект полос при встрече 3 раза", reward: 60, check: (c) => c.state.meetings >= 3 },
    { id: "big_meet_bonus", icon: "🎁", title: "Щедрая встреча", desc: "Прокачай бонус встречи до 150+", reward: 120, check: (c) => c.state.meetBonus >= 150 },
    { id: "step_master", icon: "👟", title: "Широкий шаг", desc: "Шаг сближения ≥ 8%", reward: 120, check: (c) => c.state.step >= 0.08 },
    { id: "cps_10", icon: "📡", title: "Пассивный доход", desc: "Достигни 10+ CUM/сек с автотапом", reward: 200, check: (c) => c.stats.peakCps >= 10 },
    { id: "cps_100", icon: "🛰️", title: "Печатный станок", desc: "Достигни 100+ CUM/сек", reward: 800, check: (c) => c.stats.peakCps >= 100 },
    { id: "half_ach", icon: "🎖️", title: "Полпути", desc: "Открой 25 достижений", reward: 500, check: (c) => Object.keys(c.state.achievements || {}).length >= 25 },
    { id: "almost_all", icon: "👑", title: "Охотник за славой", desc: "Открой 40 достижений", reward: 2000, check: (c) => Object.keys(c.state.achievements || {}).length >= 40 },
    { id: "completionist", icon: "🌈", title: "Платиновый лес", desc: "Открой 50 достижений", reward: 10000, check: (c) => Object.keys(c.state.achievements || {}).length >= 50 },
  ];

  function defaultStats() {
    return {
      crits: 0,
      maxCombo: 0,
      boostsUsed: 0,
      boostX5: 0,
      boostFrenzy: 0,
      upgradesBought: 0,
      donateCount: 0,
      donateCum: 0,
      playSeconds: 0,
      nightTap: false,
      morningTap: false,
      mutedOnce: false,
      openedLeaderboard: false,
      openedAchievements: false,
      sessionStart: Date.now(),
      sessionLifetimeAt500s: 0,
      peakCps: 0,
    };
  }

  let hooks = {
    getState: () => ({}),
    getStats: () => defaultStats(),
    setStats: () => {},
    onUnlock: () => {},
    formatNum: (n) => String(n),
  };

  let filter = "all"; // all | done | locked

  function ctx() {
    return {
      state: hooks.getState(),
      stats: hooks.getStats(),
      now: Date.now(),
    };
  }

  function unlockedCount(state) {
    return Object.keys((state && state.achievements) || {}).length;
  }

  function evaluate() {
    const c = ctx();
    const state = c.state;
    if (!state.achievements) state.achievements = {};
    const newly = [];

    // Multi-pass for achievements that depend on unlock count
    for (let pass = 0; pass < 3; pass++) {
      for (const a of ACHIEVEMENTS) {
        if (state.achievements[a.id]) continue;
        let ok = false;
        try {
          ok = !!a.check(c);
        } catch (_) {
          ok = false;
        }
        if (!ok) continue;
        state.achievements[a.id] = Date.now();
        newly.push(a);
        c.state = state;
      }
    }
    return newly;
  }

  function render() {
    const list = document.getElementById("ach-list");
    const meta = document.getElementById("ach-meta");
    const badge = document.getElementById("ach-badge");
    if (!list) return;

    const state = hooks.getState();
    const unlocked = state.achievements || {};
    const done = unlockedCount(state);
    const total = ACHIEVEMENTS.length;

    if (meta) meta.textContent = `Открыто ${done} / ${total}`;
    if (badge) {
      badge.textContent = String(done);
      badge.hidden = done <= 0;
    }

    const items = ACHIEVEMENTS.filter((a) => {
      const isDone = !!unlocked[a.id];
      if (filter === "done") return isDone;
      if (filter === "locked") return !isDone;
      return true;
    });

    list.innerHTML = items
      .map((a) => {
        const isDone = !!unlocked[a.id];
        return `
          <div class="ach-card ${isDone ? "is-done" : "is-locked"}">
            <div class="ach-icon">${a.icon}</div>
            <div class="ach-body">
              <div class="ach-title">${a.title}</div>
              <div class="ach-desc">${a.desc}</div>
              <div class="ach-reward">+${hooks.formatNum(a.reward)} CUM${isDone ? " · получено" : ""}</div>
            </div>
            <div class="ach-status">${isDone ? "✓" : "•"}</div>
          </div>`;
      })
      .join("");
  }

  function openModal() {
    const modal = document.getElementById("ach-modal");
    if (!modal) return;
    const stats = hooks.getStats();
    stats.openedAchievements = true;
    hooks.setStats(stats);
    modal.hidden = false;
    tick();
    render();
  }

  function closeModal() {
    const modal = document.getElementById("ach-modal");
    if (modal) modal.hidden = true;
  }

  function tick() {
    const newly = evaluate();
    if (newly.length) {
      newly.forEach((a) => hooks.onUnlock(a));
      render();
    }
    const badge = document.getElementById("ach-badge");
    const state = hooks.getState();
    if (badge) {
      const n = unlockedCount(state);
      badge.textContent = String(n);
      badge.hidden = n <= 0;
    }
  }

  function bindUi() {
    const openBtn = document.getElementById("ach-open");
    const closeBtn = document.getElementById("ach-close");
    const modal = document.getElementById("ach-modal");
    if (openBtn) {
      openBtn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openModal();
      });
    }
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeModal();
      });
    }
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }
    document.querySelectorAll("[data-ach-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        filter = btn.getAttribute("data-ach-filter") || "all";
        document.querySelectorAll("[data-ach-filter]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        render();
      });
    });
  }

  window.CumAchievements = {
    list: ACHIEVEMENTS,
    defaultStats,
    init(opts) {
      hooks = { ...hooks, ...opts };
      bindUi();
      tick();
      render();
    },
    tick,
    open: openModal,
    close: closeModal,
    render,
    unlockedCount: () => unlockedCount(hooks.getState()),
  };
})();
