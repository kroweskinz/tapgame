/* Общий конфиг игры / доната / лидерборда */
window.CUM_CONFIG = {
  // HTTPS URL сервера бота (куда крутится `npm start`), без слэша в конце.
  // Пример: "https://your-bot.onrender.com"
  leaderboardApi: "",

  // Донат
  demoMode: true,
  tbankUrl: "https://www.tbank.ru/cf/3ODGuaA7FTn",
  sberUrl: "https://www.sberbank.com/sms/pbpn?requisiteNumber=79961089332",
};

// Совместимость со старым именем
window.CUM_PAYMENT = window.CUM_CONFIG;
