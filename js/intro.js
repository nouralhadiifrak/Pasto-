/*
 * Pasto: the opening animation (about 3 s).
 * The logo appears on the green, an arch draws itself around it with « Benvenuti » under it, then the logo glides
 * into its place in the header while the green clears. A tap on it, « Passer », Esc or Enter skips it.
 * It plays each time the home page is opened, but not when coming back to it from another page of the site, nor
 * with the back button, nor at ?intro=0 (tests). Kept on its own so it can be reworked without touching the rest.
 */
(function () {
  const intro = document.getElementById("intro");
  if (!intro) return;
  const html = document.documentElement;
  const params = new URLSearchParams(location.search);
  let fromSite = false;
  try { fromSite = !!document.referrer && new URL(document.referrer).origin === location.origin && new URL(document.referrer).pathname !== location.pathname; } catch (e) { /* no referrer */ }
  let backForward = false;
  try { const nav = performance.getEntriesByType("navigation")[0]; backForward = !!nav && nav.type === "back_forward"; } catch (e) { /* old browser */ }
  const done = () => {
    html.classList.remove("intro-on");
    html.classList.add("intro-done");
    intro.remove();
  };
  if (params.get("intro") === "0" || fromSite || backForward) { done(); return; }

  const logo = intro.querySelector(".intro__logo");
  let finished = false;
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));

  const finish = () => {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    // show the header logo at once, so the logo never blinks out while the intro fades
    html.classList.remove("intro-on");
    html.classList.add("intro-done");
    intro.classList.add("is-leaving");
    setTimeout(done, 380);
  };

  // FLIP: move the big logo onto the header logo.
  const fly = () => {
    const target = document.querySelector(".brand__logo");
    if (finished || !target || !logo) return finish();
    const a = logo.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    if (!a.width || !b.width) return finish();
    const s = b.width / a.width;
    const dx = b.left + b.width / 2 - (a.left + a.width / 2);
    const dy = b.top + b.height / 2 - (a.top + a.height / 2);
    intro.classList.add("is-flying");
    logo.style.transform = `translate(${dx}px, ${dy}px) scale(${s})`;
    later(finish, 720);
  };

  intro.classList.add("is-playing");
  later(fly, 2250);
  later(finish, 3400);
  intro.addEventListener("click", finish);
  window.addEventListener("keydown", (e) => { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") finish(); });
})();
