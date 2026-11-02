/*
 * Pasto: the home page's own parts (the hero, the reviews and the info are drawn by js/common.js).
 *  - « Les incontournables »: up to 4 dishes of C.signature, read from js/menu-data.js. Hidden while empty. The cart
 *    button puts the dish straight in the cart (same storage as /commander/); a dish with a choice to make opens
 *    it on the order page instead.
 *  - « Notre histoire »: three facts (hours, place, booking) and the 3 photos of C.homePhotos, in arches
 *    (drawn placeholders that say which photo goes where until the owner sends them).
 *  - Reviews: they slide sideways on phones.
 */
(function () {
  const { C, $, $$, esc, store, t, L, money, toast, roll, burst, emojiFor, hourLabel } = window.PA;
  const MENU = window.MENU || [];
  const find = (id) => {
    for (const cat of MENU) { const item = cat.items.find((i) => i.id === id); if (item) return { item, cat }; }
    return null;
  };
  const CART_KEY = "pasto.cart.v1";
  const plus = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
  const camera = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="12" cy="13.3" r="3.4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>';

  /* ---------- Les incontournables ---------- */
  function renderPicks() {
    const list = $("#sig-list");
    if (!list) return;
    const picks = (C.signature || []).map(find).filter((h) => h && h.item.price != null).slice(0, 4);
    $("#incontournables").hidden = !picks.length;
    if (!picks.length) return;
    list.innerHTML = picks.map(({ item, cat }) => {
      const name = L(item.name);
      const pic = item.image
        ? `<img src="${esc(item.image)}" alt="${esc(name)}" loading="lazy" width="600" height="600">`
        : `${window.ART.svg(cat.art)}<span class="pick__soon">${camera}${esc(t("sig.photoSoon"))}</span>`;
      return `
        <article class="pick">
          <div class="pick__media${item.image ? "" : " is-soon"}">${pic}</div>
          <div class="pick__body">
            <h3 class="pick__name">${esc(name)}</h3>
            ${item.desc ? `<p class="pick__desc">${esc(L(item.desc))}</p>` : ""}
            <div class="pick__foot">
              <span class="pick__price">${money(item.price)}</span>
              <button class="pick__add" type="button" data-sig-add="${esc(item.id)}" aria-label="${esc(t("menu.add", { name }))}">${plus}</button>
            </div>
          </div>
        </article>`;
    }).join("");
    list.addEventListener("click", (e) => {
      const b = e.target.closest("[data-sig-add]");
      if (!b) return;
      const hit = find(b.dataset.sigAdd);
      if (!hit) return;
      const key = hit.item.options !== undefined ? hit.item.options : hit.cat.options;
      if (key) { location.href = window.PA.withLang(`/commander/#dish-${hit.item.id}`); return; }
      const cart = store.get(CART_KEY) || [];
      const line = cart.find((l) => l.key === hit.item.id);
      if (line) line.qty += 1; else cart.push({ key: hit.item.id, id: hit.item.id, choice: null, qty: 1 });
      store.set(CART_KEY, cart);
      const n = cart.reduce((s, l) => s + (l.qty || 0), 0);
      $$(".js-cart-count").forEach((el) => { roll(el, n); el.hidden = !n; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); });
      b.classList.remove("is-added"); void b.offsetWidth; b.classList.add("is-added");
      burst(b, emojiFor(hit.item, hit.cat));
      toast(t("menu.added", { name: L(hit.item.name) }));
    });
  }

  /* ---------- Notre histoire ---------- */
  function renderStory() {
    const facts = $("#story-facts");
    if (facts) {
      facts.innerHTML = [
        [`${hourLabel(C.hours.open)} – ${hourLabel(C.hours.close)}`, t("story.fact.hours")],
        [t("story.fact.where"), t("story.fact.whereSub")],
        [t("story.fact.book"), t("story.fact.bookSub")],
      ].map(([a, b]) => `<li><strong>${esc(a)}</strong><span>${esc(b)}</span></li>`).join("");
    }
    const P = C.homePhotos || {};
    const art = { room: "dish", plate: "pasta", team: "plate" };
    $$("[data-photo]").forEach((fig) => {
      const key = fig.dataset.photo;
      if (P[key]) {
        fig.innerHTML = `<img src="${esc(P[key])}" alt="" loading="lazy">`;
        fig.classList.remove("is-soon");
      } else {
        fig.innerHTML = `<span class="arch__in">${window.ART.svg(art[key] || "dish")}<span class="arch__label">${camera}${esc(t(`ph.${key}`))}</span></span>`;
        fig.classList.add("is-soon");
      }
    });
  }

  renderPicks();
  renderStory();
})();
