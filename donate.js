(() => {
  "use strict";

  const ORDER_PREFIX = "cum-donate-order:";
  const CLAIMED_KEY = "cum-donate-claimed";

  const PACKS = [
    { id: "p100k", cum: 100000, price: 49, label: "100 000 CUM" },
    { id: "p1m", cum: 1000000, price: 99, label: "1 000 000 CUM" },
    { id: "p10m", cum: 10000000, price: 149, label: "10 000 000 CUM" },
  ];

  const BANKS = [
    {
      id: "tbank",
      name: "Т‑Банк",
      icon: `<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#ffdd2d"/><text x="24" y="31" text-anchor="middle" font-size="16" font-weight="900" font-family="Arial,sans-serif" fill="#1a1a1a">TB</text></svg>`,
    },
    {
      id: "sber",
      name: "Сбер",
      icon: `<svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true"><rect width="48" height="48" rx="12" fill="#21a038"/><path fill="#fff" d="M14 30c6-8 14-12 20-13-2 6-7 13-14 18-3 0-6-2-6-5z"/><circle cx="33" cy="15" r="4" fill="#fff"/></svg>`,
    },
  ];

  let onGrant = null;
  let selectedPack = null;
  let selectedBank = null;
  let step = "packs"; // packs | banks

  function uid() {
    return "ord_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
  }

  function getClaimed() {
    try {
      return JSON.parse(localStorage.getItem(CLAIMED_KEY) || "[]");
    } catch (_) {
      return [];
    }
  }

  function markClaimed(orderId) {
    const list = getClaimed();
    if (!list.includes(orderId)) {
      list.push(orderId);
      if (list.length > 80) list.splice(0, list.length - 80);
      localStorage.setItem(CLAIMED_KEY, JSON.stringify(list));
    }
  }

  function openModal() {
    const modal = document.getElementById("donate-modal");
    if (!modal) return;
    selectedPack = null;
    selectedBank = null;
    step = "packs";
    modal.hidden = false;
    renderModal();
  }

  function closeModal() {
    const modal = document.getElementById("donate-modal");
    if (modal) modal.hidden = true;
  }

  function renderModal() {
    const body = document.getElementById("donate-body");
    const title = document.getElementById("donate-title");
    if (!body || !title) return;

    if (step === "packs") {
      title.textContent = "Донат";
      body.innerHTML = `
        <p class="donate-lead">Выбери пакет CUM</p>
        <div class="donate-packs">
          ${PACKS.map(
            (p) => `
            <button type="button" class="donate-pack" data-pack="${p.id}">
              <span class="donate-pack-cum">${p.label}</span>
              <span class="donate-pack-price">${p.price} ₽</span>
            </button>`
          ).join("")}
        </div>
      `;
      body.querySelectorAll("[data-pack]").forEach((btn) => {
        btn.addEventListener("click", () => {
          selectedPack = PACKS.find((p) => p.id === btn.getAttribute("data-pack"));
          step = "banks";
          renderModal();
        });
      });
      return;
    }

    title.textContent = selectedPack ? selectedPack.label : "Оплата";
    body.innerHTML = `
      <p class="donate-lead">${selectedPack.price} ₽ — выбери банк</p>
      <div class="donate-banks">
        ${BANKS.map(
          (b) => `
          <button type="button" class="donate-bank" data-bank="${b.id}">
            ${b.icon}
            <span>${b.name}</span>
          </button>`
        ).join("")}
      </div>
      <button type="button" class="donate-back" id="donate-back-packs">← Другой пакет</button>
    `;
    body.querySelector("#donate-back-packs").addEventListener("click", () => {
      step = "packs";
      selectedBank = null;
      renderModal();
    });
    body.querySelectorAll("[data-bank]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedBank = btn.getAttribute("data-bank");
        startPayment();
      });
    });
  }

  function startPayment() {
    if (!selectedPack || !selectedBank) return;
    const order = {
      id: uid(),
      packId: selectedPack.id,
      cum: selectedPack.cum,
      price: selectedPack.price,
      bank: selectedBank,
      status: "pending",
      createdAt: Date.now(),
    };
    sessionStorage.setItem(ORDER_PREFIX + order.id, JSON.stringify(order));

    const payUrl = new URL("pay.html", location.href);
    payUrl.searchParams.set("order", order.id);

    closeModal();

    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.openLink && /telegram/i.test(navigator.userAgent)) {
      // Inside TG keep webview; open pay page in same mini app via navigate
      location.href = payUrl.href;
    } else {
      location.href = payUrl.href;
    }
  }

  function claimReturningDonate() {
    const params = new URLSearchParams(location.search);
    if (params.get("donate") !== "success") return false;
    const orderId = params.get("order");
    if (!orderId) return false;

    // Clean URL so refresh doesn't re-trigger UI noise
    try {
      const clean = new URL(location.href);
      clean.searchParams.delete("donate");
      clean.searchParams.delete("order");
      history.replaceState(null, "", clean.pathname + clean.search + clean.hash);
    } catch (_) {
      /* ignore */
    }

    if (getClaimed().includes(orderId)) return false;

    const raw = sessionStorage.getItem(ORDER_PREFIX + orderId);
    if (!raw) return false;

    let order;
    try {
      order = JSON.parse(raw);
    } catch (_) {
      return false;
    }

    if (!order || order.id !== orderId || !order.cum) return false;
    // Accept paid or redirected+success return (bank return URL)
    if (order.status !== "paid" && order.status !== "redirected" && order.status !== "pending") {
      /* pending + success return from demo sets paid; bank return may keep redirected */
    }

    markClaimed(orderId);
    sessionStorage.removeItem(ORDER_PREFIX + orderId);

    if (typeof onGrant === "function") {
      onGrant(order.cum, order);
    }
    return true;
  }

  function bindUi() {
    const openBtn = document.getElementById("donate-open");
    const closeBtn = document.getElementById("donate-close");
    const modal = document.getElementById("donate-modal");
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
  }

  window.CumDonate = {
    packs: PACKS,
    init(opts = {}) {
      onGrant = opts.onGrant || null;
      bindUi();
      claimReturningDonate();
    },
    open: openModal,
  };
})();
