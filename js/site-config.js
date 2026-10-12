/* Contact details. The only place these are set.
   Every mailto, WhatsApp and booking link on the contact page
   reads them via [data-site-link]. */
(function () {
  var EMAIL = "nicole@kneecoal.com";
  var WHATSAPP_NUMBER = "+61402765878";
  var BOOKING_URL = "https://calendar.app.google/VhKn1WLoZNS8Aq899";

  var hrefs = {
    email: "mailto:" + EMAIL,
    whatsapp: "https://wa.me/" + WHATSAPP_NUMBER,
    booking: BOOKING_URL
  };

  window.SITE = {
    EMAIL: EMAIL,
    WHATSAPP_NUMBER: WHATSAPP_NUMBER,
    BOOKING_URL: BOOKING_URL
  };

  document.querySelectorAll("[data-site-link]").forEach(function (el) {
    var key = el.getAttribute("data-site-link");
    var href = hrefs[key];
    if (!href) return;
    el.setAttribute("href", href);
    if (key === "whatsapp" || key === "booking") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
})();
