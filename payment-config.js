/* Общий конфиг игры / доната / лидерборда */
window.CUM_CONFIG = {
  // Вариант 1: свой сервер бота (npm start)
  leaderboardApi: "",

  // Вариант 2 БЕЗ сервера: JSONBin (https://jsonbin.io)
  // Создай Bin с содержимым: {"players":{}}
  // Вставь Bin ID и Master Key:
  jsonbinId: "",
  jsonbinKey: "",

  // Донат
  demoMode: true,
  tbankUrl: "https://www.tbank.ru/cf/3ODGuaA7FTn",
  sberUrl: "https://www.sberbank.com/sms/pbpn?requisiteNumber=79961089332",
};

// Совместимость со старым именем
window.CUM_PAYMENT = window.CUM_CONFIG;
