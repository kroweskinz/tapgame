(() => {
  "use strict";

  /**
   * 55+ achievements. Each: id, icon, title, desc, check(ctx), reward (CUM)
   * ctx = { state, stats, now }
   */
  const ACHIEVEMENTS = [
    // —— Тапы —— (скилл, не монеты)
    { id: "tap_1", icon: "👆", title: "Первый тап", desc: "Сделай 1 тап", reward: 1000, check: (c) => c.state.totalTaps >= 1 },
    { id: "tap_500", icon: "🖐️", title: "Разминка", desc: "Сделай 500 тапов", reward: 25000, check: (c) => c.state.totalTaps >= 500 },
    { id: "tap_2k", icon: "👊", title: "В темпе", desc: "Сделай 2 000 тапов", reward: 100000, check: (c) => c.state.totalTaps >= 2000 },
    { id: "tap_10k", icon: "💪", title: "Десять тысяч", desc: "Сделай 10 000 тапов", reward: 500000, check: (c) => c.state.totalTaps >= 10000 },
    { id: "tap_50k", icon: "🔥", title: "Горячие пальцы", desc: "Сделай 50 000 тапов", reward: 2000000, check: (c) => c.state.totalTaps >= 50000 },
    { id: "tap_150k", icon: "⚡", title: "Железная рука", desc: "Сделай 150 000 тапов", reward: 10000000, check: (c) => c.state.totalTaps >= 150000 },
    { id: "tap_500k", icon: "🌪️", title: "Ураган тапов", desc: "Сделай 500 000 тапов", reward: 50000000, check: (c) => c.state.totalTaps >= 500000 },
    { id: "tap_2m", icon: "🚀", title: "Марафонец", desc: "Сделай 2 000 000 тапов", reward: 250000000, check: (c) => c.state.totalTaps >= 2000000 },
    { id: "tap_10m", icon: "👑", title: "Легенда экрана", desc: "Сделай 10 000 000 тапов", reward: 2000000000, check: (c) => c.state.totalTaps >= 10000000 },

    // —— Встречи ——
    { id: "meet_1", icon: "🤝", title: "Знакомство", desc: "Доведи сближение до 100% 1 раз", reward: 5000, check: (c) => c.state.meetings >= 1 },
    { id: "meet_50", icon: "🌲", title: "Лесные посиделки", desc: "50 встреч персонажей", reward: 200000, check: (c) => c.state.meetings >= 50 },
    { id: "meet_200", icon: "💚", title: "Свой круг", desc: "200 встреч", reward: 1000000, check: (c) => c.state.meetings >= 200 },
    { id: "meet_750", icon: "🧲", title: "Притяжение", desc: "750 встреч", reward: 5000000, check: (c) => c.state.meetings >= 750 },
    { id: "meet_2k", icon: "💫", title: "Неразлучные", desc: "2 000 встреч", reward: 25000000, check: (c) => c.state.meetings >= 2000 },
    { id: "meet_5k", icon: "🌌", title: "Судьба сведена", desc: "5 000 встреч", reward: 100000000, check: (c) => c.state.meetings >= 5000 },
    { id: "meet_15k", icon: "🧿", title: "Вечное сближение", desc: "15 000 встреч", reward: 500000000, check: (c) => c.state.meetings >= 15000 },

    // —— Уровни ——
    { id: "lvl_10", icon: "🌱", title: "Росток", desc: "Достигни 10 уровня", reward: 100000, check: (c) => c.state.playerLevel >= 10 },
    { id: "lvl_25", icon: "🌿", title: "Подрос", desc: "Достигни 25 уровня", reward: 500000, check: (c) => c.state.playerLevel >= 25 },
    { id: "lvl_40", icon: "🌳", title: "Крепкий ствол", desc: "Достигни 40 уровня", reward: 2000000, check: (c) => c.state.playerLevel >= 40 },
    { id: "lvl_55", icon: "🏔️", title: "Высота", desc: "Достигни 55 уровня", reward: 10000000, check: (c) => c.state.playerLevel >= 55 },
    { id: "lvl_70", icon: "🦅", title: "Высотный пилот", desc: "Достигни 70 уровня", reward: 50000000, check: (c) => c.state.playerLevel >= 70 },
    { id: "lvl_85", icon: "🐉", title: "Дракон опыта", desc: "Достигни 85 уровня", reward: 200000000, check: (c) => c.state.playerLevel >= 85 },
    { id: "lvl_100", icon: "💯", title: "Кап", desc: "Достигни максимального 100 уровня", reward: 1000000000, check: (c) => c.state.playerLevel >= 100 },

    // —— Баланс —— (~1M ≈ 2 мин → пороги в десятках миллионов и выше)
    { id: "bal_1m", icon: "🪙", title: "Миллион на счету", desc: "Накопи 1 000 000 CUM на счету", reward: 100000, check: (c) => c.state.balance >= 1000000 },
    { id: "bal_10m", icon: "💰", title: "Десять миллионов", desc: "Накопи 10 000 000 CUM", reward: 1000000, check: (c) => c.state.balance >= 10000000 },
    { id: "bal_100m", icon: "💎", title: "Сто миллионов", desc: "Накопи 100 000 000 CUM", reward: 10000000, check: (c) => c.state.balance >= 100000000 },
    { id: "bal_1b", icon: "🏦", title: "Миллиардер леса", desc: "Накопи 1 000 000 000 CUM", reward: 50000000, check: (c) => c.state.balance >= 1000000000 },
    { id: "bal_10b", icon: "🤑", title: "Десять ярдов", desc: "Накопи 10 000 000 000 CUM", reward: 250000000, check: (c) => c.state.balance >= 10000000000 },
    { id: "bal_100b", icon: "🏆", title: "Империя CUM", desc: "Накопи 100 000 000 000 CUM", reward: 1000000000, check: (c) => c.state.balance >= 100000000000 },
    { id: "bal_1t", icon: "🏛️", title: "Триллион на поляне", desc: "Накопи 1 000 000 000 000 CUM", reward: 5000000000, check: (c) => c.state.balance >= 1000000000000 },

    // —— Lifetime ——
    { id: "life_10m", icon: "📈", title: "Разгон экономики", desc: "Заработай 10 000 000 CUM за всё время", reward: 500000, check: (c) => c.state.lifetime >= 10000000 },
    { id: "life_100m", icon: "📊", title: "Серьёзный доход", desc: "Заработай 100 000 000 CUM за всё время", reward: 5000000, check: (c) => c.state.lifetime >= 100000000 },
    { id: "life_1b", icon: "🧾", title: "Миллиард за жизнь", desc: "Заработай 1 000 000 000 CUM за всё время", reward: 25000000, check: (c) => c.state.lifetime >= 1000000000 },
    { id: "life_10b", icon: "🌟", title: "Магнат поляны", desc: "Заработай 10 000 000 000 CUM за всё время", reward: 100000000, check: (c) => c.state.lifetime >= 10000000000 },
    { id: "life_100b", icon: "🪐", title: "Галактика CUM", desc: "Заработай 100 000 000 000 CUM за всё время", reward: 500000000, check: (c) => c.state.lifetime >= 100000000000 },
    { id: "life_1t", icon: "🌌", title: "Триллионер", desc: "Заработай 1 000 000 000 000 CUM за всё время", reward: 2500000000, check: (c) => c.state.lifetime >= 1000000000000 },

    // —— Комбо ——
    { id: "combo_25", icon: "✨", title: "Искра комбо", desc: "Набери комбо 25", reward: 200000, check: (c) => c.stats.maxCombo >= 25 },
    { id: "combo_75", icon: "🎇", title: "Серия ударов", desc: "Набери комбо 75", reward: 1000000, check: (c) => c.stats.maxCombo >= 75 },
    { id: "combo_150", icon: "🎆", title: "Безумие ритма", desc: "Набери комбо 150", reward: 5000000, check: (c) => c.stats.maxCombo >= 150 },
    { id: "combo_300", icon: "🌀", title: "В трансе", desc: "Набери комбо 300", reward: 25000000, check: (c) => c.stats.maxCombo >= 300 },
    { id: "combo_600", icon: "🧿", title: "Шестьсот ударов", desc: "Набери комбо 600", reward: 150000000, check: (c) => c.stats.maxCombo >= 600 },

    // —— Криты ——
    { id: "crit_50", icon: "💥", title: "Критический момент", desc: "Выбей 50 критов", reward: 250000, check: (c) => c.stats.crits >= 50 },
    { id: "crit_250", icon: "🎯", title: "Меткий", desc: "Выбей 250 критов", reward: 1500000, check: (c) => c.stats.crits >= 250 },
    { id: "crit_1k", icon: "⚔️", title: "Критующий", desc: "Выбей 1 000 критов", reward: 10000000, check: (c) => c.stats.crits >= 1000 },
    { id: "crit_5k", icon: "🗡️", title: "Мастер крита", desc: "Выбей 5 000 критов", reward: 50000000, check: (c) => c.stats.crits >= 5000 },
    { id: "crit_25k", icon: "☠️", title: "Крит-машина", desc: "Выбей 25 000 критов", reward: 250000000, check: (c) => c.stats.crits >= 25000 },

    // —— Апгрейды ——
    { id: "up_10", icon: "⬆️", title: "Первые вложения", desc: "Купи 10 апгрейдов суммарно", reward: 250000, check: (c) => c.stats.upgradesBought >= 10 },
    { id: "up_40", icon: "🔧", title: "Механик", desc: "Купи 40 апгрейдов суммарно", reward: 2000000, check: (c) => c.stats.upgradesBought >= 40 },
    { id: "up_100", icon: "🛠️", title: "Инженер леса", desc: "Купи 100 апгрейдов", reward: 15000000, check: (c) => c.stats.upgradesBought >= 100 },
    { id: "up_250", icon: "🏭", title: "Конвейер улучшений", desc: "Купи 250 апгрейдов", reward: 100000000, check: (c) => c.stats.upgradesBought >= 250 },
    { id: "up_power20", icon: "🥊", title: "Силач", desc: "Сила тапа ур. 20+", reward: 25000000, check: (c) => (c.state.levels.power || 0) >= 20 },
    { id: "up_mult20", icon: "✖️", title: "Множитель души", desc: "Множитель ур. 20+", reward: 25000000, check: (c) => (c.state.levels.mult || 0) >= 20 },
    { id: "up_auto15", icon: "🤖", title: "Автопилот включён", desc: "Автотап ур. 15+", reward: 20000000, check: (c) => (c.state.levels.auto || 0) >= 15 },
    { id: "up_auto30", icon: "🛸", title: "Ферма тапов", desc: "Автотап ур. 30+", reward: 150000000, check: (c) => (c.state.levels.auto || 0) >= 30 },
    { id: "up_crit15", icon: "🎲", title: "Везунчик", desc: "Крит-шанс ур. 15+", reward: 30000000, check: (c) => (c.state.levels.crit || 0) >= 15 },
    { id: "up_all_10", icon: "🧩", title: "Полный набор X", desc: "Каждый апгрейд минимум ур. 10", reward: 200000000, check: (c) => Object.values(c.state.levels || {}).every((v) => v >= 10) },

    // —— Бусты ——
    { id: "boost_15", icon: "⚡", title: "Подзарядка", desc: "Активируй 15 бустов", reward: 1000000, check: (c) => c.stats.boostsUsed >= 15 },
    { id: "boost_50", icon: "🔋", title: "Любитель бустов", desc: "Активируй 50 бустов", reward: 10000000, check: (c) => c.stats.boostsUsed >= 50 },
    { id: "boost_150", icon: "☄️", title: "Зависимый от ×N", desc: "Активируй 150 бустов", reward: 75000000, check: (c) => c.stats.boostsUsed >= 150 },
    { id: "boost_x5_20", icon: "5️⃣", title: "Пятёрочка", desc: "Активируй буст ×5 двадцать раз", reward: 20000000, check: (c) => c.stats.boostX5 >= 20 },
    { id: "boost_frenzy_20", icon: "😡", title: "Ярость!", desc: "Активируй «Ярость тапов» 20 раз", reward: 25000000, check: (c) => c.stats.boostFrenzy >= 20 },

    // —— Престиж ——
    { id: "pres_1", icon: "⭐", title: "Новая жизнь", desc: "Сделай 1 престиж", reward: 5000000, check: (c) => c.state.prestige >= 1 },
    { id: "pres_5", icon: "🌟", title: "Цикличность", desc: "Сделай 5 престижей", reward: 50000000, check: (c) => c.state.prestige >= 5 },
    { id: "pres_15", icon: "✨", title: "Перерождённый", desc: "Сделай 15 престижей", reward: 250000000, check: (c) => c.state.prestige >= 15 },
    { id: "pres_40", icon: "♾️", title: "Вечный рестарт", desc: "Сделай 40 престижей", reward: 2000000000, check: (c) => c.state.prestige >= 40 },

    // —— Донат ——
    { id: "don_1", icon: "❤️", title: "Спасибо!", desc: "Соверши донат любого размера", reward: 500000, check: (c) => c.stats.donateCount >= 1 },
    { id: "don_100k", icon: "💝", title: "Меценат леса", desc: "Получи 100 000+ CUM с донатов", reward: 1000000, check: (c) => c.stats.donateCum >= 100000 },
    { id: "don_1m", icon: "💖", title: "Щедрый спонсор", desc: "Получи 1 000 000+ CUM с донатов", reward: 5000000, check: (c) => c.stats.donateCum >= 1000000 },
    { id: "don_10m", icon: "💗", title: "Золотой донор", desc: "Получи 10 000 000+ CUM с донатов", reward: 50000000, check: (c) => c.stats.donateCum >= 10000000 },

    // —— Время ——
    { id: "time_30m", icon: "⏱️", title: "Полчаса в чаще", desc: "Играй суммарно 30 минут", reward: 500000, check: (c) => c.stats.playSeconds >= 1800 },
    { id: "time_3h", icon: "🕒", title: "Три часа в лесу", desc: "Играй суммарно 3 часа", reward: 5000000, check: (c) => c.stats.playSeconds >= 10800 },
    { id: "time_12h", icon: "🕰️", title: "Полсуток на поляне", desc: "Играй суммарно 12 часов", reward: 50000000, check: (c) => c.stats.playSeconds >= 43200 },
    { id: "time_48h", icon: "🏕️", title: "Житель поляны", desc: "Играй суммарно 48 часов", reward: 500000000, check: (c) => c.stats.playSeconds >= 172800 },

    // —— Особые ——
    { id: "broke", icon: "🧾", title: "Всё вкачал", desc: "Баланс < 10 000 при lifetime ≥ 100 000 000 и 40+ апгрейдах", reward: 5000000, check: (c) => c.state.lifetime >= 100000000 && c.state.balance < 10000 && c.stats.upgradesBought >= 40 },
    { id: "rich_and_fast", icon: "🏎️", title: "Быстрый старт", desc: "Набери 100 000 000 CUM lifetime за первые 5 минут сессии", reward: 10000000, check: (c) => c.stats.sessionLifeAt100mSec > 0 && c.stats.sessionLifeAt100mSec <= 300 },
    { id: "night", icon: "🌙", title: "Ночной лес", desc: "Сделай 1 000 тапов между 00:00 и 05:00", reward: 5000000, check: (c) => (c.stats.nightTaps || 0) >= 1000 },
    { id: "morning", icon: "☀️", title: "Ранняя пташка", desc: "Сделай 1 000 тапов между 05:00 и 08:00", reward: 5000000, check: (c) => (c.stats.morningTaps || 0) >= 1000 },
    { id: "streak_white", icon: "🤍", title: "Белый дождь", desc: "Увидь эффект полос при встрече 500 раз", reward: 10000000, check: (c) => c.state.meetings >= 500 },
    { id: "big_meet_bonus", icon: "🎁", title: "Щедрая встреча", desc: "Прокачай бонус встречи до 5 000+", reward: 25000000, check: (c) => c.state.meetBonus >= 5000 },
    { id: "step_master", icon: "👟", title: "Широкий шаг", desc: "Шаг сближения ≥ 20%", reward: 50000000, check: (c) => c.state.step >= 0.2 },
    { id: "cps_10k", icon: "📡", title: "Пассивный доход", desc: "Достигни 10 000+ CUM/сек", reward: 10000000, check: (c) => c.stats.peakCps >= 10000 },
    { id: "cps_100k", icon: "🛰️", title: "Печатный станок", desc: "Достигни 100 000+ CUM/сек", reward: 75000000, check: (c) => c.stats.peakCps >= 100000 },
    { id: "cps_1m", icon: "🏭", title: "Фабрика CUM", desc: "Достигни 1 000 000+ CUM/сек", reward: 500000000, check: (c) => c.stats.peakCps >= 1000000 },
    { id: "half_ach", icon: "🎖️", title: "Полпути", desc: "Открой 30 достижений", reward: 50000000, check: (c) => Object.keys(c.state.achievements || {}).length >= 30 },
    { id: "almost_all", icon: "👑", title: "Охотник за славой", desc: "Открой 50 достижений", reward: 500000000, check: (c) => Object.keys(c.state.achievements || {}).length >= 50 },
    { id: "completionist", icon: "🌈", title: "Платиновый лес", desc: "Открой 65 достижений", reward: 5000000000, check: (c) => Object.keys(c.state.achievements || {}).length >= 65 },
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
      nightTaps: 0,
      morningTaps: 0,
      mutedOnce: false,
      openedLeaderboard: false,
      openedAchievements: false,
      sessionStart: Date.now(),
      sessionLifetimeAt500s: 0,
      sessionLifeAt5kSec: 0,
      sessionLifeAt100mSec: 0,
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
