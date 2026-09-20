/* Конфиг клиента. На Railway monolith leaderboardApi можно оставить пустым —
   игра сама найдёт /api на том же домене. */
window.CUM_CONFIG = {
  // Если фронт отдельно от API — укажи публичный URL Railway:
  // leaderboardApi: "https://your-app.up.railway.app",
  leaderboardApi: "",

  // Fallback без Postgres (не нужен, если деплой на Railway)
  jsonbinId: "6ab05115ac6210605ae3c496",
  jsonbinKey: "$2a$10$qIjzAIiUSjPcfmrUM8Ku3e7L5tmh65XgxlgPqAFGrMxKGH4M3Kxt.",

  demoMode: true,
  tbankUrl: "https://www.tbank.ru/cf/3ODGuaA7FTn",
  sberUrl: "https://www.sberbank.com/sms/pbpn?requisiteNumber=79961089332",
};

window.CUM_PAYMENT = window.CUM_CONFIG;
