/* Hero video — pause when the user prefers reduced motion.
   Autoplay is muted + playsinline so iOS will run it; this
   file only opts out. Vanilla only. */
(function () {
  var video = document.querySelector(".hero__video");
  if (!video) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  function apply() {
    if (reduce.matches) {
      video.pause();
      video.removeAttribute("autoplay");
      return;
    }
    var play = video.play();
    if (play && typeof play.catch === "function") play.catch(function () {});
  }

  apply();
  if (typeof reduce.addEventListener === "function") {
    reduce.addEventListener("change", apply);
  }
})();
