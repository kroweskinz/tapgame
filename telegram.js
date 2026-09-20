/**
 * Telegram Mini App bridge.
 * Works in Telegram; outside Telegram stays no-op so local play still works.
 */
(function (global) {
  "use strict";

  const tg = global.Telegram && global.Telegram.WebApp ? global.Telegram.WebApp : null;
  const isTelegram = !!(tg && tg.initData !== undefined);

  function init() {
    if (!tg) return { tg: null, isTelegram: false, user: null };

    const inTelegram = Boolean(
      (tg.initData && tg.initData.length > 0) ||
        (tg.platform && tg.platform !== "unknown")
    );

    if (!inTelegram) {
      return { tg, isTelegram: false, user: null };
    }

    try {
      tg.ready();
      tg.expand();
      if (typeof tg.requestFullscreen === "function") {
        try {
          tg.requestFullscreen();
        } catch (_) {
          /* optional */
        }
      }

      if (typeof tg.setHeaderColor === "function") {
        tg.setHeaderColor("#0f2418");
      }
      if (typeof tg.setBackgroundColor === "function") {
        tg.setBackgroundColor("#0c1f14");
      }
      if (typeof tg.disableVerticalSwipes === "function") {
        tg.disableVerticalSwipes();
      }

      document.documentElement.classList.add("tg-mini-app");
      document.body.classList.add("tg-mini-app");

      applyTheme(tg.themeParams || {});
      if (typeof tg.onEvent === "function") {
        tg.onEvent("themeChanged", () => applyTheme(tg.themeParams || {}));
        tg.onEvent("viewportChanged", syncViewport);
        tg.onEvent("safeAreaChanged", syncViewport);
        tg.onEvent("contentSafeAreaChanged", syncViewport);
      }
      syncViewport();
    } catch (err) {
      console.warn("Telegram WebApp init failed", err);
    }

    const user = tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
    return { tg, isTelegram: true, user };
  }

  function applyTheme(params) {
    const root = document.documentElement;
    if (params.bg_color) root.style.setProperty("--tg-bg", params.bg_color);
    if (params.text_color) root.style.setProperty("--tg-text", params.text_color);
    if (params.button_color) root.style.setProperty("--tg-button", params.button_color);
    if (params.hint_color) root.style.setProperty("--tg-hint", params.hint_color);
  }

  function syncViewport() {
    if (!tg) return;
    const h = tg.viewportStableHeight || tg.viewportHeight;
    if (h) {
      document.documentElement.style.setProperty("--tg-viewport-stable-height", `${h}px`);
    }

    const safe = tg.safeAreaInset || {};
    const content = tg.contentSafeAreaInset || {};
    const top = (safe.top || 0) + (content.top || 0);
    const bottom = (safe.bottom || 0) + (content.bottom || 0);
    if (top) document.documentElement.style.setProperty("--safe-top", `${top}px`);
    if (bottom) document.documentElement.style.setProperty("--safe-bottom", `${bottom}px`);
  }

  function haptic(type) {
    if (!tg || !tg.HapticFeedback) return;
    try {
      if (type === "meet") {
        tg.HapticFeedback.notificationOccurred("success");
      } else if (type === "heavy") {
        tg.HapticFeedback.impactOccurred("heavy");
      } else if (type === "medium") {
        tg.HapticFeedback.impactOccurred("medium");
      } else {
        tg.HapticFeedback.impactOccurred("light");
      }
    } catch (_) {
      /* older clients */
    }
  }

  function userName() {
    const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
    if (!u) return "";
    return u.first_name || u.username || "";
  }

  global.TapTelegram = { init, haptic, userName, get tg() { return tg; }, get isTelegram() { return isTelegram; } };
})(window);
