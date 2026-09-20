const crypto = require("crypto");

/**
 * Validate Telegram Mini App initData (HMAC-SHA256).
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
function validateInitData(initData, botToken, maxAgeSec = 86400) {
  if (!initData || !botToken) return { ok: false, error: "missing_data" };

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { ok: false, error: "missing_hash" };

  params.delete("hash");
  const entries = [...params.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (calculated !== hash) return { ok: false, error: "bad_hash" };

  const authDate = Number(params.get("auth_date") || 0);
  if (authDate && maxAgeSec > 0) {
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (age > maxAgeSec) return { ok: false, error: "expired" };
  }

  let user = null;
  try {
    user = JSON.parse(params.get("user") || "null");
  } catch (_) {
    return { ok: false, error: "bad_user" };
  }
  if (!user || !user.id) return { ok: false, error: "no_user" };

  return { ok: true, user };
}

module.exports = { validateInitData };
