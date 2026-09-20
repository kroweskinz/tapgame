(() => {
  "use strict";

  const SAVE_KEY = "cum-tap-forest-v1";
  const PRESTIGE_REQ = 1000;
  const MUTE_KEY = "cum-tap-muted";

  /* Положи свои файлы сюда:
     assets/sfx-tap.mp3  — звук тапа
     assets/sfx-meet.mp3 — звук при 100% сближении
     (также подойдут .wav / .ogg с теми же именами) */
  const SFX = {
    tap: ["assets/sfx-tap.mp3", "assets/sfx-tap.wav", "assets/sfx-tap.ogg"],
    meet: ["assets/sfx-meet.mp3", "assets/sfx-meet.wav", "assets/sfx-meet.ogg"],
  };

  const UPGRADES = [
    {
      id: "power",
      title: "Сила тапа",
      desc: "+1 CUM за каждый тап",
      baseCost: 15,
      costMult: 1.45,
      effect: (s) => {
        s.tapPower += 1;
      },
      meta: (s) => `Сейчас: ${s.tapPower}`,
    },
    {
      id: "mult",
      title: "Множитель",
      desc: "+0.25 к общему множителю",
      baseCost: 50,
      costMult: 1.55,
      effect: (s) => {
        s.multiBonus += 0.25;
      },
      meta: (s) => `Сейчас: ×${formatNum(getMultiplier(s))}`,
    },
    {
      id: "speed",
      title: "Шаг сближения",
      desc: "Ближе за тап — чаще бонус встречи",
      baseCost: 40,
      costMult: 1.5,
      effect: (s) => {
        s.step += 0.012;
      },
      meta: (s) => `Шаг: ${(s.step * 100).toFixed(1)}%`,
    },
    {
      id: "crit",
      title: "Крит-шанс",
      desc: "+4% шанс критического тапа (×5)",
      baseCost: 80,
      costMult: 1.6,
      effect: (s) => {
        s.critChance = Math.min(0.5, s.critChance + 0.04);
      },
      meta: (s) => `Шанс: ${Math.round(s.critChance * 100)}%`,
    },
    {
      id: "auto",
      title: "Автотап",
      desc: "+0.5 авто-тапа в секунду",
      baseCost: 120,
      costMult: 1.65,
      effect: (s) => {
        s.autoTaps += 0.5;
      },
      meta: (s) => `${formatNum(s.autoTaps)}/сек`,
    },
    {
      id: "meet",
      title: "Бонус встречи",
      desc: "+25 CUM когда персонажи встречаются",
      baseCost: 100,
      costMult: 1.5,
      effect: (s) => {
        s.meetBonus += 25;
      },
      meta: (s) => `Бонус: ${s.meetBonus}`,
    },
    {
      id: "combo",
      title: "Комбо-окно",
      desc: "Дольше держать комбо (+0.2с)",
      baseCost: 90,
      costMult: 1.55,
      effect: (s) => {
        s.comboWindow = Math.min(2.5, s.comboWindow + 0.2);
      },
      meta: (s) => `Окно: ${s.comboWindow.toFixed(1)}с`,
    },
  ];

  const BOOSTS = [
    {
      id: "x2",
      title: "Буст ×2",
      desc: "Удваивает доход на 20 секунд",
      cost: 75,
      duration: 20,
      mult: 2,
    },
    {
      id: "x5",
      title: "Буст ×5",
      desc: "×5 ко всем CUM на 12 секунд",
      cost: 250,
      duration: 12,
      mult: 5,
    },
    {
      id: "frenzy",
      title: "Ярость тапов",
      desc: "×3 + автотап ×3 на 15 секунд",
      cost: 400,
      duration: 15,
      mult: 3,
      autoMult: 3,
    },
  ];

  function defaultState() {
    return {
      balance: 0,
      lifetime: 0,
      tapPower: 1,
      multiBonus: 0,
      step: 0.035,
      progress: 0,
      critChance: 0.05,
      autoTaps: 0,
      meetBonus: 50,
      comboWindow: 0.9,
      levels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
      prestige: 0,
      boostUntil: 0,
      boostMult: 1,
      boostAutoMult: 1,
      boostLabel: "",
      combo: 0,
      lastTapAt: 0,
      meetings: 0,
      totalTaps: 0,
    };
  }

  let state = load() || defaultState();
  let autoAcc = 0;
  let hintHidden = false;
  let muted = localStorage.getItem(MUTE_KEY) === "1";
  let audioUnlocked = false;

  const sfxBuffers = { tap: null, meet: null };
  const sfxVolumes = { tap: 0.55, meet: 0.85 };

  function tryLoadAudio(urls) {
    return new Promise((resolve) => {
      let i = 0;
      const tryNext = () => {
        if (i >= urls.length) {
          resolve(null);
          return;
        }
        const audio = new Audio();
        audio.preload = "auto";
        const url = urls[i++];
        const onOk = () => {
          cleanup();
          resolve(audio);
        };
        const onFail = () => {
          cleanup();
          tryNext();
        };
        const cleanup = () => {
          audio.removeEventListener("canplaythrough", onOk);
          audio.removeEventListener("error", onFail);
        };
        audio.addEventListener("canplaythrough", onOk, { once: true });
        audio.addEventListener("error", onFail, { once: true });
        audio.src = url;
        audio.load();
      };
      tryNext();
    });
  }

  async function loadSfx() {
    const [tap, meet] = await Promise.all([
      tryLoadAudio(SFX.tap),
      tryLoadAudio(SFX.meet),
    ]);
    sfxBuffers.tap = tap;
    sfxBuffers.meet = meet;
    if (!tap) console.info("Звук тапа: положи файл assets/sfx-tap.mp3 (или .wav/.ogg)");
    if (!meet) console.info("Звук встречи: положи файл assets/sfx-meet.mp3 (или .wav/.ogg)");
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    [sfxBuffers.tap, sfxBuffers.meet].forEach((a) => {
      if (!a) return;
      const prev = a.volume;
      a.volume = 0;
      a.play()
        .then(() => {
          a.pause();
          a.currentTime = 0;
          a.volume = prev;
        })
        .catch(() => {});
    });
  }

  function playSfx(name) {
    if (muted) return;
    const base = sfxBuffers[name];
    if (!base || !base.src) return;
    unlockAudio();
    try {
      const node = base.cloneNode();
      node.volume = sfxVolumes[name] ?? 0.6;
      node.play().catch(() => {});
    } catch (_) {
      /* ignore */
    }
  }

  function updateMuteBtn() {
    if (!el.muteBtn) return;
    el.muteBtn.textContent = muted ? "🔇" : "🔊";
    el.muteBtn.classList.toggle("is-muted", muted);
    el.muteBtn.setAttribute("aria-label", muted ? "Включить звук" : "Выключить звук");
  }

  const el = {
    balance: document.getElementById("balance"),
    tapPower: document.getElementById("tap-power"),
    multiplier: document.getElementById("multiplier"),
    cps: document.getElementById("cps"),
    progressFill: document.getElementById("progress-fill"),
    distancePct: document.getElementById("distance-pct"),
    approaching: document.getElementById("char-approaching"),
    standing: document.getElementById("char-standing"),
    stage: document.getElementById("stage"),
    floatLayer: document.getElementById("float-layer"),
    rippleLayer: document.getElementById("ripple-layer"),
    comboBanner: document.getElementById("combo-banner"),
    comboText: document.getElementById("combo-text"),
    boostBanner: document.getElementById("boost-banner"),
    boostText: document.getElementById("boost-text"),
    boostTimer: document.getElementById("boost-timer"),
    meetFlash: document.getElementById("meet-flash"),
    streakLayer: document.getElementById("streak-layer"),
    hint: document.getElementById("hint"),
    shopUpgrades: document.getElementById("shop-upgrades"),
    shopBoosts: document.getElementById("shop-boosts"),
    lifetime: document.getElementById("lifetime"),
    prestigeLevel: document.getElementById("prestige-level"),
    prestigeBonus: document.getElementById("prestige-bonus"),
    prestigeBtn: document.getElementById("prestige-btn"),
    prestigeReq: document.getElementById("prestige-req"),
    toast: document.getElementById("toast"),
    panel: document.getElementById("panel"),
    muteBtn: document.getElementById("mute-btn"),
  };

  function formatNum(n) {
    if (!Number.isFinite(n)) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (abs >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (abs >= 1e4) return (n / 1e3).toFixed(1) + "K";
    if (abs >= 1000) return (n / 1e3).toFixed(2) + "K";
    if (Number.isInteger(n) || Math.abs(n - Math.round(n)) < 0.05) return String(Math.round(n));
    return n.toFixed(1);
  }

  function getPrestigeMult(s = state) {
    return 1 + s.prestige * 0.25;
  }

  function getBoostMult(s = state) {
    return Date.now() < s.boostUntil ? s.boostMult : 1;
  }

  function getBoostAutoMult(s = state) {
    return Date.now() < s.boostUntil ? s.boostAutoMult || 1 : 1;
  }

  function getComboMult(s = state) {
    if (s.combo < 5) return 1;
    if (s.combo < 15) return 1.5;
    if (s.combo < 35) return 2;
    if (s.combo < 60) return 3;
    return 4;
  }

  function getMultiplier(s = state) {
    return (1 + s.multiBonus) * getPrestigeMult(s) * getBoostMult(s) * getComboMult(s);
  }

  function upgradeCost(upgrade, level) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, level));
  }

  function earn(amount, opts = {}) {
    const gained = Math.max(0, amount);
    state.balance += gained;
    state.lifetime += gained;
    if (opts.x != null && opts.y != null) {
      spawnFloat(opts.x, opts.y, gained, opts.crit);
    }
    return gained;
  }

  function doTap(clientX, clientY, fromAuto = false) {
    const now = Date.now();
    const stageRect = el.stage.getBoundingClientRect();
    const x = clientX ?? stageRect.left + stageRect.width * 0.45;
    const y = clientY ?? stageRect.top + stageRect.height * 0.55;

    if (!fromAuto) {
      if (now - state.lastTapAt <= state.comboWindow * 1000) {
        state.combo += 1;
      } else {
        state.combo = 1;
      }
      state.lastTapAt = now;
      state.totalTaps += 1;

      if (!hintHidden && state.totalTaps >= 3) {
        hintHidden = true;
        el.hint.style.opacity = "0";
      }

      el.approaching.classList.remove("tap-squash");
      void el.approaching.offsetWidth;
      el.approaching.classList.add("tap-squash");
      spawnRipple(x - stageRect.left, y - stageRect.top);
      playSfx("tap");
    }

    let crit = false;
    let power = state.tapPower;
    if (Math.random() < state.critChance) {
      crit = true;
      power *= 5;
    }

    if (!fromAuto && window.TapTelegram) {
      window.TapTelegram.haptic(crit ? "medium" : "light");
    }

    const mult = getMultiplier();
    const gained = earn(power * mult, {
      x: x - stageRect.left,
      y: y - stageRect.top,
      crit,
    });

    state.progress = Math.min(1, state.progress + state.step);
    updateApproachPosition();

    if (state.progress >= 1) {
      onMeet(stageRect);
    }

    updateHUD();
    return gained;
  }

  function onMeet(stageRect) {
    state.progress = 0;
    state.meetings += 1;
    const bonus = Math.floor(state.meetBonus * getMultiplier());
    earn(bonus, {
      x: stageRect.width * 0.5,
      y: stageRect.height * 0.4,
      crit: true,
    });

    playSfx("meet");
    spawnMeetStreaks();
    if (window.TapTelegram) window.TapTelegram.haptic("meet");

    el.meetFlash.hidden = false;
    void el.meetFlash.offsetWidth;
    setTimeout(() => {
      el.meetFlash.hidden = true;
    }, 550);

    showToast(`Встреча! +${formatNum(bonus)} CUM`);
    updateApproachPosition();
  }

  function spawnMeetStreaks() {
    const layer = el.streakLayer;
    if (!layer) return;
    layer.innerHTML = "";

    const count = 28 + Math.floor(Math.random() * 10);
    for (let i = 0; i < count; i++) {
      const streak = document.createElement("div");
      streak.className = "meet-streak";
      const left = Math.random() * 100;
      const width = 1.5 + Math.random() * 4;
      const height = 18 + Math.random() * 28;
      const delay = Math.random() * 0.45;
      const dur = 0.85 + Math.random() * 0.7;
      streak.style.left = `${left}%`;
      streak.style.setProperty("--w", `${width}px`);
      streak.style.setProperty("--h", `${height}%`);
      streak.style.setProperty("--delay", `${delay}s`);
      streak.style.setProperty("--dur", `${dur}s`);
      layer.appendChild(streak);
    }

    const clearAfter = 1800;
    clearTimeout(spawnMeetStreaks._t);
    spawnMeetStreaks._t = setTimeout(() => {
      layer.innerHTML = "";
    }, clearAfter);
  }

  function updateApproachPosition() {
    // Start far left (~10%), end near center (~44%)
    const left = 10 + state.progress * 34;
    const scale = 0.9 + state.progress * 0.12;
    el.approaching.style.left = `${left}%`;
    el.approaching.style.transform = `translateX(-50%) scale(${scale})`;
    el.approaching.style.transformOrigin = "center bottom";
    el.progressFill.style.width = `${state.progress * 100}%`;
    el.distancePct.textContent = `${Math.round(state.progress * 100)}%`;
  }

  function spawnFloat(x, y, amount, crit) {
    const node = document.createElement("div");
    node.className = "float-coin" + (crit ? " crit" : "");
    node.textContent = (crit ? "CRIT " : "") + `+${formatNum(amount)} CUM`;
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    el.floatLayer.appendChild(node);
    setTimeout(() => node.remove(), 900);
  }

  function spawnRipple(x, y) {
    const node = document.createElement("div");
    node.className = "ripple";
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    el.rippleLayer.appendChild(node);
    setTimeout(() => node.remove(), 520);
  }

  let toastTimer = null;
  function showToast(text) {
    el.toast.textContent = text;
    el.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.hidden = true;
    }, 1600);
  }

  let shopDirty = true;
  let lastShopSig = "";

  function shopSignature() {
    const boostLeft = Math.max(0, state.boostUntil - Date.now());
    return [
      Math.floor(state.balance),
      JSON.stringify(state.levels),
      state.tapPower,
      state.multiBonus,
      state.step,
      state.critChance,
      state.autoTaps,
      state.meetBonus,
      state.comboWindow,
      Math.ceil(boostLeft),
      state.boostLabel,
      state.lifetime,
      state.prestige,
    ].join("|");
  }

  function updateHUD() {
    el.balance.textContent = formatNum(state.balance);
    el.tapPower.textContent = formatNum(state.tapPower * getMultiplier());
    el.multiplier.textContent = formatNum(getMultiplier());
    const cps = state.autoTaps * getBoostAutoMult() * state.tapPower * getMultiplier();
    el.cps.textContent = formatNum(cps);

    const comboMult = getComboMult();
    if (state.combo >= 5 && Date.now() - state.lastTapAt < state.comboWindow * 1000) {
      el.comboBanner.hidden = false;
      el.comboText.textContent = `COMBO ×${comboMult}  ·  ${state.combo}`;
    } else {
      el.comboBanner.hidden = true;
      if (Date.now() - state.lastTapAt >= state.comboWindow * 1000) {
        state.combo = 0;
      }
    }

    const boostLeft = (state.boostUntil - Date.now()) / 1000;
    if (boostLeft > 0) {
      el.boostBanner.hidden = false;
      el.boostText.textContent = state.boostLabel || `БУСТ ×${state.boostMult}`;
      el.boostTimer.textContent = `${Math.ceil(boostLeft)}с`;
    } else {
      el.boostBanner.hidden = true;
      if (state.boostMult !== 1) {
        state.boostMult = 1;
        state.boostAutoMult = 1;
        state.boostLabel = "";
      }
    }

    el.lifetime.textContent = formatNum(state.lifetime);
    el.prestigeLevel.textContent = String(state.prestige);
    el.prestigeBonus.textContent = `×${getPrestigeMult().toFixed(2)}`;
    el.prestigeReq.textContent = formatNum(PRESTIGE_REQ);
    const canPrestige = state.lifetime >= PRESTIGE_REQ;
    el.prestigeBtn.disabled = !canPrestige;
    el.prestigeBtn.textContent = canPrestige
      ? `Престиж (+×0.25) → ×${(getPrestigeMult() + 0.25).toFixed(2)}`
      : `Нужно ${formatNum(PRESTIGE_REQ)} CUM за жизнь`;

    const sig = shopSignature();
    if (shopDirty || sig !== lastShopSig) {
      lastShopSig = sig;
      shopDirty = false;
      renderShops();
    }
  }

  function renderShops() {
    el.shopUpgrades.innerHTML = UPGRADES.map((u) => {
      const level = state.levels[u.id] || 0;
      const cost = upgradeCost(u, level);
      const can = state.balance >= cost;
      return `
        <div class="shop-item">
          <div class="title">${u.title} <span style="opacity:.55">Lv ${level}</span></div>
          <div class="desc">${u.desc}</div>
          <div class="meta">${u.meta(state)}</div>
          <button type="button" class="buy-btn" data-buy="${u.id}" ${can ? "" : "disabled"}>
            ${formatNum(cost)} CUM
          </button>
        </div>
      `;
    }).join("");

    el.shopBoosts.innerHTML = BOOSTS.map((b) => {
      const active = Date.now() < state.boostUntil && state.boostLabel.includes(b.title.split(" ")[0]);
      const can = state.balance >= b.cost && Date.now() >= state.boostUntil;
      return `
        <div class="shop-item">
          <div class="title">${b.title}</div>
          <div class="desc">${b.desc}</div>
          <div class="meta">${b.duration}с · ${active ? "активен" : "готов"}</div>
          <button type="button" class="buy-btn" data-boost="${b.id}" ${can ? "" : "disabled"}>
            ${formatNum(b.cost)} CUM
          </button>
        </div>
      `;
    }).join("");
  }

  function buyUpgrade(id) {
    const u = UPGRADES.find((x) => x.id === id);
    if (!u) return;
    const level = state.levels[id] || 0;
    const cost = upgradeCost(u, level);
    if (state.balance < cost) return;
    state.balance -= cost;
    state.levels[id] = level + 1;
    u.effect(state);
    shopDirty = true;
    showToast(`${u.title} ↑`);
    updateHUD();
    save();
  }

  function buyBoost(id) {
    const b = BOOSTS.find((x) => x.id === id);
    if (!b) return;
    if (state.balance < b.cost) return;
    if (Date.now() < state.boostUntil) return;
    state.balance -= b.cost;
    state.boostUntil = Date.now() + b.duration * 1000;
    state.boostMult = b.mult;
    state.boostAutoMult = b.autoMult || 1;
    state.boostLabel = b.title;
    shopDirty = true;
    showToast(`${b.title} активирован!`);
    updateHUD();
    save();
  }

  function doPrestige() {
    if (state.lifetime < PRESTIGE_REQ) return;
    state.prestige += 1;
    const prestige = state.prestige;
    state = defaultState();
    state.prestige = prestige;
    shopDirty = true;
    showToast(`Престиж ${prestige}! Множитель ×${getPrestigeMult().toFixed(2)}`);
    updateApproachPosition();
    updateHUD();
    save();
  }

  function save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (_) {
      /* ignore quota */
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return { ...defaultState(), ...JSON.parse(raw) };
    } catch (_) {
      return null;
    }
  }

  /** Make near-black pixels transparent for studio portraits */
  function loadCutout(src, canvas, maxW) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h);
        const px = data.data;
        for (let i = 0; i < px.length; i += 4) {
          const r = px[i];
          const g = px[i + 1];
          const b = px[i + 2];
          const lum = (r + g + b) / 3;
          if (lum < 28) {
            px[i + 3] = 0;
          } else if (lum < 48) {
            px[i + 3] = Math.round(((lum - 28) / 20) * 255);
          }
        }
        ctx.putImageData(data, 0, 0);
        resolve();
      };
      img.onerror = reject;
      img.src = src;
    });
  }

  // Events
  el.stage.addEventListener(
    "pointerdown",
    (e) => {
      if (e.target.closest(".panel, .dock, button")) return;
      e.preventDefault();
      unlockAudio();
      if (openPanel) setPanel(openPanel);
      doTap(e.clientX, e.clientY);
      save();
    },
    { passive: false }
  );

  el.muteBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    updateMuteBtn();
    if (!muted) unlockAudio();
  });

  el.shopUpgrades.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-buy]");
    if (!btn) return;
    buyUpgrade(btn.getAttribute("data-buy"));
  });

  el.shopBoosts.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-boost]");
    if (!btn) return;
    buyBoost(btn.getAttribute("data-boost"));
  });

  el.prestigeBtn.addEventListener("click", doPrestige);

  let openPanel = null;

  function setPanel(name) {
    const app = document.getElementById("app");
    if (openPanel === name) {
      openPanel = null;
      el.panel.classList.remove("open");
      el.panel.setAttribute("aria-hidden", "true");
      app.classList.remove("panel-open");
      document.querySelectorAll(".dock-btn").forEach((b) => b.classList.remove("active"));
      return;
    }
    openPanel = name;
    el.panel.classList.add("open");
    el.panel.setAttribute("aria-hidden", "false");
    app.classList.add("panel-open");
    document.querySelectorAll(".dock-btn").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-panel") === name);
    });
    document.querySelectorAll(".panel-section").forEach((sec) => {
      sec.hidden = sec.getAttribute("data-section") !== name;
    });
  }

  document.querySelectorAll(".dock-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      setPanel(btn.getAttribute("data-panel"));
    });
  });

  // Game loop
  let last = performance.now();
  let saveAcc = 0;
  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // Decay combo visually via HUD
    if (state.combo > 0 && now - state.lastTapAt > state.comboWindow * 1000) {
      state.combo = 0;
    }

    const autoRate = state.autoTaps * getBoostAutoMult();
    if (autoRate > 0) {
      autoAcc += autoRate * dt;
      while (autoAcc >= 1) {
        autoAcc -= 1;
        doTap(null, null, true);
      }
    }

    saveAcc += dt;
    if (saveAcc > 2) {
      saveAcc = 0;
      save();
    }

    updateHUD();
    requestAnimationFrame(tick);
  }

  async function init() {
    const tgInfo = window.TapTelegram ? window.TapTelegram.init() : null;
    if (tgInfo && tgInfo.user && el.hint) {
      const name = tgInfo.user.first_name || "";
      if (name) {
        el.hint.textContent = `${name}, тапай по экрану — подойди ближе и получи CUM`;
      }
    }

    el.prestigeReq.textContent = formatNum(PRESTIGE_REQ);
    updateMuteBtn();
    loadSfx();
    try {
      await Promise.all([
        loadCutout("assets/char-standing.jpg", document.getElementById("canvas-standing"), 900),
        loadCutout("assets/char-approaching.jpg", document.getElementById("canvas-approaching"), 420),
      ]);
    } catch (err) {
      console.warn("Character load failed", err);
    }
    updateApproachPosition();
    updateHUD();
    requestAnimationFrame(tick);
  }

  init();
})();
