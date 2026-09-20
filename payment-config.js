/* Настрой ссылки эквайринга. Пока пусто — pay.html работает в тестовом режиме. */
window.CUM_PAYMENT = {
  // true = кнопка «Я оплатил» на pay.html (для проверки). На проде поставь false и укажи URL банков.
  demoMode: true,
  // Шаблоны URL. Плейсхолдеры: {amount} {orderId} {cum} {returnUrl}
  tbankUrl: "",
  sberUrl: "",
};
