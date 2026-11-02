/*
 * Pasto: end-to-end checks in headless Chromium (Playwright).
 *   node tests/site.test.js                                   (serves this folder on a local port)
 *   BASE=https://<domain> node tests/site.test.js             (checks the live site, with its security headers)
 *   SHOTS=tests/screenshots node tests/site.test.js           (also saves screenshots to look at)
 * Phone (390 px) and desktop (1280 px), in French and English.
 *
 * The real menu is not online yet (js/menu-data.js is empty), so:
 *   1. the site as it is: the intro, the header, dark mode, the home page, « La carte arrive bientôt », pickup only;
 *   2. with a TEST menu (and a TEST delivery zone) given to the test browser only (nothing is changed on disk or on
 *      the server): options before adding, the big photo, the cart, the delivery zone with GPS, ordering and live
 *      tracking with the staff screen (demo mode: same browser), cancelling, WhatsApp as the way out, anti-spam,
 *      closed hours. The TEST dishes and prices are made up: they are never shown to customers.
 * Then the booking page, the staff screen (owner's view and statistics), legal pages, PWA files, SEO.
 * With a real Supabase project, the order flow creates real orders: it only runs there with ORDER_TESTS=1.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.join(__dirname, "..");
const SHOTS = process.env.SHOTS || "";
const TYPES = { ".woff2": "font/woff2", ".webp": "image/webp", ".jpg": "image/jpeg", ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".png": "image/png", ".ico": "image/x-icon", ".xml": "application/xml", ".webmanifest": "application/manifest+json", ".txt": "text/plain", ".svg": "image/svg+xml" };
const TEST_PHONE = "0634235350"; // the customer's phone in the tests
const SHOP_WA = "212774747480";  // the restaurant's WhatsApp (js/config.js)
// Casablanca is UTC+1 (UTC+0 during Ramadan): 19:00 UTC is open either way, 03:00 UTC is closed.
const OPEN_TIME = new Date("2026-11-02T19:00:00Z");
const CLOSED_TIME = new Date("2026-11-02T03:00:00Z");
// the restaurant's pin: 33.5351709, -7.6106616. The TEST zone: a box 1.3 km north/south, 2.3 km east/west, max 3 km.
const NEAR = { latitude: 33.5400, longitude: -7.6050 };    // about 0.8 km: inside
const NORTH = { latitude: 33.5550, longitude: -7.6106 };   // 2.2 km north: within 3 km but outside the drawn zone
const FAR = { latitude: 33.5890, longitude: -7.6030 };     // 6 km: refused

// ---------- TEST data, given to the test browser only ----------
const TEST_MENU = `
window.OPTION_GROUPS = { shape: { id: "shape", title: { fr: "Quelle pâte ?", en: "Which pasta?" }, required: true,
  choices: [{ id: "penne", name: "Penne" }, { id: "spaghetti", name: "Spaghetti", price: 5 }] } };
window.MENU = [
  { id: "t-pasta", name: { fr: "TEST Pâtes", en: "TEST Pasta" }, art: "pasta", options: "shape", items: [
    { id: "t-arrabbiata", name: "TEST Arrabbiata", price: 70, desc: { fr: "Sauce tomate pimentée", en: "Spicy tomato sauce" } },
    { id: "t-carbonara", name: "TEST Carbonara", price: 80, image: "/assets/icons/icon-512.png", desc: { fr: "Crème, parmesan", en: "Cream, parmesan" } },
    { id: "t-gnocchi", name: "TEST Gnocchi", price: 75 } ] },
  { id: "t-dolci", name: { fr: "TEST Desserts", en: "TEST Desserts" }, art: "dessert", items: [
    { id: "t-tiramisu", name: "TEST Tiramisu", price: 35, options: null },
    { id: "t-panna", name: "TEST Panna cotta", price: 30 } ] },
  { id: "t-bevande", name: { fr: "TEST Boissons", en: "TEST Drinks" }, art: "drink", items: [
    { id: "t-eau", name: "TEST Eau", price: null } ] },
];`;
const TEST_CONFIG = `
window.CONFIG.signature = ["t-arrabbiata", "t-tiramisu", "t-panna"];
window.CONFIG.delivery = { maxKm: 3, fee: 10, zone: [[33.5235, -7.6356], [33.5235, -7.5856], [33.5469, -7.5856], [33.5469, -7.6356]] };
window.CONFIG.payment = { pickup: ["cash", "card"], delivery: ["cash"] };`;

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { "Content-Type": "text/html" });
        return fs.createReadStream(path.join(ROOT, "404.html")).pipe(res);
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => resolve(srv));
  });
}

let failures = 0;
const check = (cond, msg) => { if (cond) console.log("  ✓ " + msg); else { failures++; console.log("  ✗ " + msg); } };
const section = (s) => console.log("\n" + s);

async function newContext(browser, { width, height = 844, time = OPEN_TIME, reducedMotion = "no-preference", geo, testData = false, colorScheme = "light" } = {}) {
  const context = await browser.newContext({
    viewport: { width, height }, reducedMotion, serviceWorkers: "block", locale: "fr-FR", colorScheme,
    geolocation: geo, permissions: geo ? ["geolocation"] : [],
  });
  await context.clock.install({ time });
  // no map tiles from the internet during the tests
  await context.route(/tile\.openstreetmap\.org/, (r) => r.fulfill({ status: 204, body: "" }));
  if (testData) {
    await context.route(/\/js\/menu-data\.js/, (r) => r.fulfill({ status: 200, contentType: "text/javascript", body: TEST_MENU }));
    await context.route(/\/js\/config\.js/, async (r) => {
      const real = await r.fetch();
      r.fulfill({ response: real, body: (await real.text()) + TEST_CONFIG });
    });
  }
  return context;
}
async function open(context, url) {
  const page = await context.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) page.errors.push(m.text()); });
  page.on("dialog", (d) => d.accept());
  await page.goto(url);
  return page;
}
const shot = async (page, name, full = false) => { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: full }); } };
const count = (page) => page.$eval(".js-cart-count", (e) => (e.hidden ? 0 : Number(e.textContent)));
const noSideScroll = (page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);

async function run() {
  const srv = process.env.BASE ? null : await serve();
  const BASE = (process.env.BASE || `http://127.0.0.1:${srv.address().port}`).replace(/\/$/, "");
  const LIVE = !!process.env.BASE;
  const browser = await chromium.launch();
  console.log(`Testing ${BASE}`);

  for (const lang of ["fr", "en"]) {
    for (const width of [390, 1280]) {
      const tag = `${lang}-${width}`;
      const q = lang === "en" ? "?lang=en" : "?";
      const amp = q === "?" ? "" : "&";
      const T = lang === "en"
        ? { title: "Italian cooking, in the heart of Casablanca", pasta: "Which pasta?", added: "added", accepted: "Accepted", done: "Buon appetito!", cancelled: "Order cancelled", outZone: "outside our delivery area", closed: "Closed", review: "Write a Google review", buttons: ["The menu", "Book a table", "Directions"], soon: "The menu is coming online soon", sent: "Request sent!", light: "Light mode", dark: "Dark mode", delivery: "Delivery", takeaway: "Takeaway", yes: "Yes", picks: "Our favourites", reviews: "What you say" }
        : { title: "La cuisine italienne, au cœur de Casablanca", pasta: "Quelle pâte ?", added: "ajouté", accepted: "Acceptée", done: "Bon appétit !", cancelled: "Commande annulée", outZone: "hors de notre zone", closed: "Fermé", review: "Laisser un avis Google", buttons: ["La carte", "Réserver", "Itinéraire"], soon: "La carte arrive bientôt en ligne", sent: "Demande envoyée !", light: "Mode clair", dark: "Mode sombre", delivery: "Livraison", takeaway: "À emporter", yes: "Oui", picks: "Les incontournables", reviews: "Ce que vous en dites" };

      section(`[${tag}] intro`);
      {
        const ctx = await newContext(browser, { width });
        const page = await open(ctx, `${BASE}/${q}`);
        check(await page.isVisible(".intro .intro__logo"), "the intro opens with the logo");
        await page.clock.runFor(1500);
        await page.waitForTimeout(100);
        check(await page.isVisible(".intro"), "still there at 1.5 s");
        if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `${tag}-intro.png`) });
        await page.clock.runFor(900);
        await page.waitForTimeout(100);
        check(await page.$eval(".intro", (e) => e.classList.contains("is-flying")), "at 2.4 s the logo glides to the header");
        await page.clock.runFor(1200);
        await page.waitForTimeout(500);
        check(!(await page.$(".intro")), "the intro is gone after about 3 s");
        check(await page.$eval(".brand__logo", (e) => getComputedStyle(e).opacity === "1"), "the logo is in the header");
        await ctx.close();
        const ctx2 = await newContext(browser, { width });
        const p2 = await open(ctx2, `${BASE}/${q}`);
        await p2.mouse.click(10, 300);
        await p2.waitForTimeout(500);
        check(!(await p2.$(".intro")), "a tap skips the intro");
        await ctx2.close();
        const ctx4 = await newContext(browser, { width });
        const p4 = await open(ctx4, `${BASE}/${q}`);
        await p4.mouse.wheel(0, 300);
        await p4.waitForTimeout(300);
        check(!!(await p4.$(".intro")), "scrolling does not skip it");
        await p4.goto(`${BASE}/reserver/${q}`);
        await p4.click(".brand");
        await p4.waitForLoadState("load");
        check(!(await p4.$(".intro")), "no intro when coming back from another page of the site");
        await ctx4.close();
      }

      section(`[${tag}] home page, header, dark mode (the site as it is)`);
      {
        const c = await newContext(browser, { width });
        const h = await open(c, `${BASE}/${q}${amp}intro=0`);
        check(await h.getAttribute("html", "lang") === lang, `html lang is ${lang}`);
        check((await h.textContent(".hero__title")).replace(/\s+/g, " ").trim() === T.title, "hero title");
        const btns = await h.$$eval(".hero__cta .btn", (b) => b.map((x) => ({ t: x.textContent.trim(), top: Math.round(x.getBoundingClientRect().top), href: x.getAttribute("href") })));
        check(btns.length === 3 && btns.map((b) => b.t).join("|") === T.buttons.join("|"), "3 hero buttons: menu, book, directions");
        check(btns[0].top === btns[1].top && btns[2].top > btns[0].top, "two side by side, « Itinéraire » under them");
        check(btns[0].href.startsWith("/commander/") && btns[1].href.startsWith("/reserver/") && btns[2].href === "https://maps.app.goo.gl/47nf6ioEUwAWqBL57", "they open the menu, the booking page and Google Maps");
        check(await h.$eval(".hero__arch", (e) => e.classList.contains("is-soon")) && !(await h.$(".hero__arch img")), "no photo yet: a drawn plate (no stock photo)");
        check(await h.$$eval("main > section:not([hidden])", (s) => s.map((x) => x.id || x.classList[0]).join(",")) === "hero,histoire,avis,infos", "hero, our story, reviews, info (no dish picks while the menu is empty)");
        check(await h.$$eval(".story__aura i", (l) => l.length === 4 && l.every((x) => getComputedStyle(x).mixBlendMode === "screen" && getComputedStyle(x).pointerEvents === "none")) && await h.$eval(".story__aura", (e) => e.getAttribute("aria-hidden") === "true" && getComputedStyle(e).backgroundColor === "rgba(0, 0, 0, 0)"), "our story: 4 aurora glows blended (screen) onto the band, no background of their own");
        await h.$eval("#story-title", (e) => e.scrollIntoView({ block: "center", behavior: "instant" }));
        check(await h.$eval("#story-title", (t) => { const r = t.getBoundingClientRect(); const e = document.elementFromPoint(r.left + 10, r.top + r.height / 2); return !!e && t.contains(e) && getComputedStyle(t.closest(".wrap")).zIndex === "1"; }), "…under the story's text, not over it");
        check(await h.$$eval(".story__photos .arch.is-soon", (p) => p.map((x) => x.dataset.photo).join(",")) === "room,plate,team", "our story: 3 photo placeholders (room, dish, team)");
        check((await h.textContent("#reviews-title")).trim() === T.reviews && await h.isVisible("#reviews-empty") && !(await h.$(".review")), "reviews: no made-up reviews, an invitation instead");
        check((await h.getAttribute("[data-review-link]", "href")) === "https://search.google.com/local/writereview?placeid=ChIJbR_p--czpg0RPIMNJOJR7DU", "the Google review button opens Pasto's review form");
        check((await h.textContent("#info-address")).includes("19 Bd Al Qods") && (await h.textContent("#info-address")).includes("Casablanca"), "the address");
        check((await h.textContent('#infos [data-phone="text"]')).trim() === "07 74 74 74 80", "the phone number");
        check(!(await h.isVisible("#info-payment-row")), "no payment line until the owner says");
        check(/Pasto/.test(await h.title()), "page title");
        check(await h.$eval('link[rel="canonical"]', (l) => /^https:\/\//.test(l.href)), "canonical link");
        check(await h.$$eval('script[type="application/ld+json"]', (s) => s.some((x) => /"Restaurant"/.test(x.textContent) && /Bd Al Qods/.test(x.textContent))), "schema.org Restaurant data");
        check(await h.$eval(".status", (e) => e.classList.contains("is-open")), "open at 20:00");
        check(await h.isVisible(".ig-fab") && /instagram\.com\/pastoitaliana/.test(await h.getAttribute(".ig-fab", "href")), "floating Instagram button");
        await h.$eval("#info-map", (e) => e.scrollIntoView());
        await h.waitForSelector("#info-map.leaflet-container", { timeout: 6000 }).catch(() => {});
        check(await h.$eval("#info-map", (e) => e.classList.contains("leaflet-container") && !!e.querySelector(".map-pin--shop")), "the map with the restaurant's pin");
        if (width === 390) {
          check(await h.isVisible(".burger") && !(await h.isVisible(".topnav")), "phones: ☰ button instead of the titles");
          await h.click(".burger");
          await h.waitForSelector("#nav-panel.is-open");
          check(await h.$$eval("#nav-panel .navpanel__links a", (a) => a.map((x) => x.pathname + x.hash).join(" ")) === "/ /commander/ /reserver/ /#histoire /#avis /#infos", "the ☰ menu: every title");
          check(await h.isVisible("#nav-panel [data-install]") && await h.isVisible("#nav-panel .lang"), "the ☰ menu holds the language and « Installer »");
          await shot(h, `${tag}-nav`);
          await h.click("#nav-panel .layer__x");
          await h.waitForTimeout(300);
        } else {
          check(!(await h.isVisible(".burger")) && await h.isVisible(".topnav"), "PC: the titles in the header");
          const nav = await h.$eval(".topnav", (n) => { const r = n.getBoundingClientRect(); return Math.abs(r.left + r.width / 2 - innerWidth / 2); });
          check(nav < 4, "PC: the titles in the middle of the header");
          check(await h.isVisible(".topbar .lang"), "PC: the language choice in the header");
        }
        // install: Android's prompt shows the header button with the app icon
        check(!(await h.isVisible(".topbar [data-install]")), "no « Installer » in the header while the phone can't install");
        // dark mode
        check(await h.isVisible(".topbar [data-theme-toggle]"), "a dark mode button in the header");
        await h.click(".topbar [data-theme-toggle]");
        check(await h.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark" && localStorage.getItem("pasto.theme") === '"dark"'), "dark mode on, and remembered");
        check((await h.getAttribute(".topbar [data-theme-toggle]", "aria-label")) === T.light, "the button now offers light mode");
        await shot(h, `${tag}-home-dark`, true);
        await h.reload();
        check(await h.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"), "still dark after a reload");
        await h.click(".topbar [data-theme-toggle]");
        check(!(await h.evaluate(() => document.documentElement.getAttribute("data-theme"))), "back to light");
        check(await noSideScroll(h), "no sideways scrolling");
        await shot(h, `${tag}-home`, true);
        check(h.errors.length === 0, "no JavaScript errors on the home page" + (h.errors.length ? ": " + h.errors.join(" | ") : ""));
        // the phone's own setting the first time
        const cd = await newContext(browser, { width, colorScheme: "dark" });
        const hd = await open(cd, `${BASE}/${q}${amp}intro=0`);
        check(await hd.evaluate(() => document.documentElement.getAttribute("data-theme") === "dark"), "the first time, it follows the phone's dark setting");
        await cd.close();

        // the order page while the menu is empty
        const o = await open(c, `${BASE}/commander/${q}`);
        check(await o.isVisible("#menu-soon") && (await o.textContent("#menu-soon h2")).trim() === T.soon, "the order page says the menu is coming, with no made-up dishes");
        check(await o.$eval('#menu-soon [data-wa]', (a) => a.href.startsWith(`https://wa.me/${"212774747480"}`)) && await o.$eval("#menu-soon [data-phone]", (a) => a.href === "tel:+212774747480"), "…with the call and WhatsApp buttons");
        check(!(await o.$(".dish")) && !(await o.isVisible(".chips-bar")), "no dishes, no category bar");
        check(await o.$eval('link[rel="canonical"]', (l) => /\/commander\/$/.test(l.href)), "its own canonical address");
        check(await o.$eval('.topnav a[href^="/commander/"]', (a) => a.getAttribute("aria-current") === "page"), "the header marks the page");
        await shot(o, `${tag}-menu-soon`, true);
        check(o.errors.length === 0, "no JavaScript errors on the order page" + (o.errors.length ? ": " + o.errors.join(" | ") : ""));
        await c.close();
      }

      section(`[${tag}] order page with a TEST menu: menu and cart (pickup only, as configured)`);
      {
        const c = await newContext(browser, { width, testData: true });
        // the real config has no delivery: drop the TEST zone for this part
        await c.route(/\/js\/config\.js/, async (r) => { const real = await r.fetch(); r.fulfill({ response: real, body: (await real.text()).replace(/window\.CONFIG\.delivery = .*\n/, "") + 'window.CONFIG.signature = ["t-arrabbiata", "t-tiramisu", "t-panna"];' }); });
        const p = await open(c, `${BASE}/commander/${q}`);
        await p.waitForSelector(".dish");
        await p.click('[data-add="t-tiramisu"]');
        await p.click(".cart-btn");
        await p.waitForSelector("#cart.is-open");
        check(!(await p.isVisible(".seg--mode")) && await p.isVisible("#pickup-hint"), "no « Livraison » choice: pickup only until the owner gives the zone");
        check((await p.textContent("#pay-note")).trim() === "", "no payment promise until the owner says");
        check(!(await p.isVisible("#sum-fee-row")), "no delivery fee line");
        await c.close();
        // the home page with TEST picks
        const c2 = await newContext(browser, { width, testData: true });
        const h = await open(c2, `${BASE}/${q}${amp}intro=0`);
        check(await h.isVisible("#incontournables") && (await h.textContent("#picks-title")).trim() === T.picks && await h.$$eval(".pick", (x) => x.length) === 3, "the home page shows the dishes of C.signature");
        await h.click('[data-sig-add="t-tiramisu"]');
        check(await h.evaluate(() => JSON.parse(localStorage.getItem("pasto.cart.v1")).some((l) => l.id === "t-tiramisu" && l.qty === 1)) && (await h.textContent(".topbar .js-cart-count")).trim() === "1", "the + button puts the dish in the cart");
        await h.click('[data-sig-add="t-arrabbiata"]');
        await h.waitForURL(/\/commander\//);
        check(true, "a dish with a choice to make opens the order page");
        await c2.close();
      }

      section(`[${tag}] order page with a TEST menu and a TEST delivery zone`);
      const ctx = await newContext(browser, { width, geo: NEAR, testData: true });
      const page = await open(ctx, `${BASE}/commander/${q}`);
      await page.waitForSelector(".dish");
      check(await page.$$eval(".cat-tile", (t) => t.length) === 3 && await page.$$eval(".dish", (d) => d.length) === 6, "category tiles and dishes from the menu file");
      check(await page.$$eval(".dish", (d) => d.every((x) => x.querySelector(".dish__price"))), "every dish has a price (or « price soon »)");
      check(await page.$eval('[data-add="t-eau"]', (b) => b.disabled), "a dish without a price cannot be ordered");
      if (width === 390) {
        const r = await page.$$eval("#cat-t-pasta .dish", (d) => d.slice(0, 3).map((x) => Math.round(x.getBoundingClientRect().top)));
        check(r[0] === r[1] && r[2] > r[0], "phones: 2 dishes per row");
      }
      check(await noSideScroll(page), "no sideways scrolling");
      await shot(page, `${tag}-menu`, true);

      await page.click('.cat-tile[data-cat="t-dolci"]');
      const scrolled = await page.waitForFunction(() => Math.abs(document.querySelector("#cat-t-dolci").getBoundingClientRect().top) < 260, null, { timeout: 4000 }).catch(() => null);
      check(!!scrolled, "a tile scrolls to its category");
      // the big photo: click on PC, long press on phones
      await page.$eval("#dish-t-carbonara", (e) => e.scrollIntoView());
      await page.click("#dish-t-carbonara .dish__media");
      await page.waitForSelector("#lightbox.is-open", { timeout: 2000 }).catch(() => {});
      check(await page.isVisible("#lightbox.is-open"), "a dish photo opens big");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      await page.click('[data-add="t-tiramisu"]');
      check(await count(page) === 1, "a dessert goes straight into the cart");
      check((await page.textContent("#toast")).toLowerCase().includes(T.added), "a message says it was added");
      await page.click('[data-add="t-arrabbiata"]');
      await page.waitForSelector("#options.is-open");
      check((await page.textContent(".sheet__group-title")).trim() === T.pasta, "the options are asked before adding");
      await page.click(".sheet__add");
      check(await count(page) === 1 && await page.isVisible("#options"), "a required option must be chosen first");
      await page.click('.choice:has-text("Spaghetti")');
      check((await page.textContent(".sheet__add")).includes("75 DH"), "an option that costs more shows the new price");
      await shot(page, `${tag}-options`);
      await page.click(".sheet__add");
      await page.waitForTimeout(300);
      check(await count(page) === 2, "added with its option");

      await page.click(".cart-btn");
      await page.waitForSelector("#cart.is-open");
      check(await page.$$eval(".line", (l) => l.length) === 2, "two lines in the cart");
      check((await page.textContent(".line:nth-child(2) .line__choice")).includes("Spaghetti"), "the line shows the option");
      check((await page.textContent("#sum-total")).trim() === "110 DH", "total 35 + 75 = 110 DH");
      await page.click('.line:first-child [data-step="1"]');
      check((await page.textContent("#sum-total")).trim() === "145 DH", "+1 tiramisu: 145 DH");
      await page.click('.line:first-child [data-step="-1"]');

      // delivery: the zone and the fee
      await page.click(`.seg label:has-text("${T.delivery}")`);
      await page.waitForSelector("#delivery-map.leaflet-container", { timeout: 5000 }).catch(() => {});
      check(await page.$eval("#delivery-map", (e) => e.classList.contains("leaflet-container")), "the delivery map loads");
      check(await page.$eval("#delivery-map", (e) => !!e.querySelector("path.leaflet-interactive")), "the drawn delivery zone is on the map");
      await ctx.setGeolocation(FAR);
      await page.click("#gps-btn");
      await page.waitForSelector("#zone-msg.is-bad", { timeout: 4000 }).catch(() => null);
      check((await page.textContent("#zone-msg")).includes(T.outZone), "an address 6 km away is refused");
      await ctx.setGeolocation(NORTH);
      await page.click("#gps-btn");
      await page.waitForFunction(() => document.querySelector("#zone-msg").classList.contains("is-bad"), null, { timeout: 4000 }).catch(() => null);
      check(await page.$eval("#zone-msg", (e) => e.classList.contains("is-bad")), "close enough but outside the drawn zone: refused");
      await ctx.setGeolocation(NEAR);
      await page.click("#gps-btn");
      const ok = await page.waitForSelector("#zone-msg.is-ok", { timeout: 4000 }).catch(() => null);
      check(!!ok, "an address 0.8 km away, inside the zone, is accepted");
      check((await page.textContent("#sum-fee")).trim() === "10 DH" && (await page.textContent("#sum-total")).trim() === "120 DH", "delivery fee added to the total");
      await page.fill('[name="name"]', "Test");
      await page.fill('[name="phone"]', "12345");
      await page.click("#order-btn");
      check((await page.textContent("#order-err")).length > 0, "a wrong phone number is refused");
      await page.fill('[name="phone"]', TEST_PHONE);
      await page.click("#order-btn");
      check((await page.textContent("#order-err")).length > 0, "a delivery needs an address");
      await page.fill('[name="address"]', "Rue de test, immeuble 1");
      await shot(page, `${tag}-cart`);

      const demo = await page.evaluate(() => window.ORDERS.demo);
      if (!demo && !process.env.ORDER_TESTS) {
        console.log("  · real Supabase project: order flow skipped (set ORDER_TESTS=1 to run it)");
      } else {
        section(`[${tag}] order, tracking and the staff screen`);
        await page.click("#order-btn");
        await page.waitForSelector("#tracker.is-open .tracker__card");
        check(await count(page) === 0, "the cart is emptied after ordering");
        check(/(N°|No\.) [0-9A-F]{4}/.test(await page.textContent(".tracker__num")), "the tracker shows the order number");
        check(await page.isVisible("[data-track-cancel]"), "the order can be cancelled while it waits");
        await shot(page, `${tag}-tracker-new`);

        const staff = await open(ctx, `${BASE}/commandes/`);
        await staff.click('[data-demo-role="staff"]');
        await staff.click("#start-btn");
        await staff.waitForSelector("#alert:not([hidden])");
        const body = await staff.textContent("#alert-body");
        check(body.includes("TEST Arrabbiata") && body.includes("Spaghetti"), "the staff screen shows the new order with its options");
        check(body.includes("Rue de test"), "…and the delivery address");
        await shot(staff, `${tag}-staff-alert`);
        await staff.click('[data-eta="20"]');
        await page.waitForFunction((txt) => document.querySelector(".tracker__head").textContent.includes(txt), T.accepted);
        check(true, "the customer sees « accepted » live");
        check(!(await page.isVisible("[data-track-cancel]")), "no cancelling once accepted");
        check(await staff.isVisible('[data-do="driver"]'), "« Envoyer au livreur » for a delivery");
        await staff.click('[data-do="on_the_way"]');
        await staff.click('[data-do="done"]');
        await page.waitForFunction((txt) => document.querySelector(".tracker__head").textContent.includes(txt), T.done);
        check((await page.textContent(".btn--review")).includes(T.review), "a Google review button at the end");
        check((await page.getAttribute(".btn--review", "href")).includes("placeid=ChIJbR_p--czpg0RPIMNJOJR7DU"), "it opens Pasto's review form");
        await shot(page, `${tag}-tracker-done`);
        await shot(staff, `${tag}-staff-board`, true);

        // cancelling while it waits
        await page.click("[data-track-close]");
        await page.click('[data-add="t-tiramisu"]');
        await page.click(".cart-btn");
        await page.click(`.seg label:has-text("${T.takeaway}")`);
        await page.click("#order-btn");
        await page.waitForSelector("[data-track-cancel]");
        await page.click("[data-track-cancel]");
        await page.waitForFunction((txt) => document.querySelector(".tracker__head").textContent.includes(txt), T.cancelled);
        check(true, "the customer can cancel a waiting order");
        await staff.waitForTimeout(300);
        check((await staff.textContent("#list-done")).includes("client"), "the staff screen shows it cancelled by the customer");

        // no answer after 5 minutes: WhatsApp and call
        await page.click("[data-track-close]");
        await page.click('[data-add="t-tiramisu"]');
        await page.click(".cart-btn");
        await page.click("#order-btn");
        await page.waitForSelector("#tracker .tracker--new");
        check(!(await page.$("#tracker .btn--wa")), "no WhatsApp button at first");
        await page.clock.runFor(5 * 60e3 + 31e3);
        await page.waitForTimeout(200);
        const wa = await page.getAttribute("#tracker .btn--wa", "href").catch(() => null);
        check(wa && wa.startsWith(`https://wa.me/${SHOP_WA}?text=`), "after 5 min without answer: WhatsApp with the order written");
        check(wa && decodeURIComponent(wa).includes("TEST Tiramisu"), "…containing the dishes");
        await staff.close();

        // anti-spam: at most 5 orders per phone in 10 minutes (3 sent already)
        await page.click("[data-track-cancel]");
        await page.click("[data-track-close]");
        await page.evaluate((ph) => { for (let i = 0; i < 2; i++) window.ORDERS.DemoStore.insert({ id: window.ORDERS.uuid(), token: "x", location: "bd-al-qods", mode: "pickup", customer_name: "T", customer_phone: ph, items: [], subtotal: 1, delivery_fee: 0, total: 1 }); }, TEST_PHONE);
        await page.click('[data-add="t-tiramisu"]');
        await page.click(".cart-btn");
        await page.click("#order-btn");
        await page.waitForTimeout(300);
        check((await page.textContent("#order-err")).length > 5, "a 6th order from the same phone within 10 minutes is refused");

        // sending fails: WhatsApp is the way out
        await page.evaluate(() => { window.ORDERS.DemoStore.write([]); window.ORDERS.create = () => Promise.reject(new Error("offline")); });
        await page.click("#order-btn");
        await page.waitForSelector("#tracker .tracker--failed");
        check((await page.getAttribute("#tracker .btn--wa", "href")).startsWith(`https://wa.me/${SHOP_WA}`), "if sending fails, the order goes on WhatsApp");
        await shot(page, `${tag}-tracker-failed`);
      }
      check(page.errors.length === 0, "no JavaScript errors" + (page.errors.length ? ": " + page.errors.join(" | ") : ""));
      await ctx.close();

      section(`[${tag}] table booking`);
      {
        const c = await newContext(browser, { width });
        const b = await open(c, `${BASE}/reserver/${q}`);
        check(await b.$$eval("#book-days .day", (d) => d.length) === 14, "the next 14 days");
        check(await noSideScroll(b), "no sideways scrolling");
        await b.click("#book-btn");
        check((await b.textContent("#book-err")).length > 0, "a day must be chosen");
        await b.click("#book-days .day:nth-child(2)");
        check(await b.$$eval("#book-slots .slot", (s) => s.length) === 23, "half-hour times from 12:00 to 23:00");
        await b.click('#book-slots [data-time="20:30"]');
        for (let i = 0; i < 2; i++) await b.click("#people-more");
        check((await b.textContent("#people-n")).trim() === "4", "4 people");
        await b.click(`.seg label:has-text("${T.yes}")`);
        check(await b.isVisible("#kids-box"), "children: how many");
        await b.click("#kids-more");
        check((await b.textContent("#kids-n")).trim() === "2", "2 children");
        await b.fill('[name="name"]', "Test");
        await b.fill('[name="phone"]', TEST_PHONE);
        await b.fill('[name="notes"]', "Anniversaire");
        await shot(b, `${tag}-book`, true);
        await b.click("#book-btn");
        await b.waitForSelector("#book-done:not([hidden])");
        check((await b.textContent("#book-done-title")).includes(T.sent), "the request is sent");
        check((await b.textContent("#book-summary")).includes("20:30"), "with a summary");
        await shot(b, `${tag}-book-done`);
        check(b.errors.length === 0, "no JavaScript errors on the booking page" + (b.errors.length ? ": " + b.errors.join(" | ") : ""));
        if (await b.evaluate(() => window.ORDERS.demo)) {
          const st = await open(c, `${BASE}/commandes/`);
          await st.click('[data-demo-role="staff"]');
          await st.click("#start-btn");
          await st.click('[data-tab="book"]');
          await st.waitForSelector("#list-bnew .bk");
          const card = await st.textContent("#list-bnew .bk");
          check(card.includes("20:30") && card.includes("4 personnes") && card.includes("dont 2 enfants") && card.includes("Anniversaire"), "the staff screen shows the request (time, people, children, note)");
          check((await st.textContent("#count-book")).trim() === "1", "a badge counts the requests to confirm");
          check(await st.$eval('#list-bnew a[href^="tel:"]', (a, ph) => a.getAttribute("href") === "tel:" + ph, TEST_PHONE), "a call button");
          await st.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(u); return null; }; });
          await st.click('[data-bk="confirm-wa"]');
          const waUrl = decodeURIComponent((await st.evaluate(() => window.__opened[0])) || "");
          check(/wa\.me\/212634235350/.test(waUrl) && waUrl.includes("20:30") && waUrl.includes("Pasto"), "« Confirmer + WhatsApp » writes the confirmation to the customer");
          await st.waitForSelector("#list-bok .bk");
          check(true, "the booking moves to « Confirmées »");
          await shot(st, `${tag}-staff-bookings`, true);
          check(st.errors.length === 0, "no JavaScript errors on the staff screen" + (st.errors.length ? ": " + st.errors.join(" | ") : ""));
        }
        await c.close();
      }

      section(`[${tag}] closed hours, reduced motion`);
      {
        const c = await newContext(browser, { width, time: CLOSED_TIME, reducedMotion: "reduce", testData: true });
        const home = await open(c, `${BASE}/${q}`);
        check(await home.$(".intro"), "the intro plays even with « reduce motion » (battery savers turn it on)");
        await home.click(".intro");
        await home.waitForTimeout(500);
        check(await home.$eval(".status", (e) => e.classList.contains("is-closed")) && (await home.textContent(".status")).includes(T.closed), "closed at 04:00");
        const p = await open(c, `${BASE}/commander/${q}`);
        await p.click('[data-add="t-tiramisu"]');
        await p.click(".cart-btn");
        check(await p.$eval("#order-btn", (b) => b.disabled), "ordering is off while closed");
        await c.close();
      }
    }
  }

  section("[staff] owner's view and statistics");
  {
    const c = await newContext(browser, { width: 1280 });
    const p = await open(c, `${BASE}/commandes/`);
    check(/Pasto/.test(await p.title()), "staff app title");
    if (await p.evaluate(() => window.ORDERS.demo)) {
      await p.click('[data-demo-role="owner"]');
      await p.waitForSelector("#tab-stats:not([hidden])");
      check(true, "the owner opens on the statistics");
      await p.click("#menu-btn");
      await p.click('[data-act="seed"]');
      await p.click('[data-p="month"]');
      await p.waitForTimeout(300);
      check(/\d/.test(await p.textContent("#stats-tiles")) && await p.$$eval("#stats-best li", (l) => l.length) > 3, "orders, revenue and best sellers for the month");
      check((await p.textContent("#stats-best")).includes("Exemple"), "the example orders are marked as examples");
      await p.click('[data-p="week"]');
      check(await p.$$eval(".bars__col", (b) => b.length) >= 1, "revenue by day for the week");
      await p.click('[data-p="today"]');
      check(await p.$$eval(".bars__col", (b) => b.length) >= 1, "orders by hour for the day");
      await shot(p, "staff-owner-stats", true);
      await p.click('[data-tab="orders"]');
      check(!(await p.$("#tab-orders [data-do]")), "the owner has no order buttons (read-only)");
      check(await p.$eval('[data-act="push"]', (b) => getComputedStyle(b).display === "none"), "…and no notifications menu");
      check(p.errors.length === 0, "no JavaScript errors on the staff screen" + (p.errors.length ? ": " + p.errors.join(" | ") : ""));
    } else {
      check(await p.isVisible("#login-form"), "the staff screen asks to sign in");
    }
    const p390 = await open(await newContext(browser, { width: 390 }), `${BASE}/commandes/`);
    await shot(p390, "staff-login-390");
  }

  section("[pages] legal pages, files, SEO, headers");
  {
    const c = await newContext(browser, { width: 390 });
    for (const lang of ["fr", "en"]) {
      for (const pth of ["/", "/commander/", "/reserver/", "/confidentialite/", "/conditions/"]) {
        const p = await open(c, `${BASE}${pth}${lang === "en" ? "?lang=en&intro=0" : "?intro=0"}`);
        const links = await p.$$eval(".footer a", (a) => a.map((x) => x.getAttribute("href")));
        check(links.some((h) => h.startsWith("/confidentialite/")) && links.some((h) => h.startsWith("/conditions/")), `${pth} (${lang}): footer links to privacy and terms`);
        if (pth === "/confidentialite/" || pth === "/conditions/") {
          check(await p.$eval(`article[lang="${lang}"]`, (a) => a.offsetHeight > 0) && await p.$eval(`article[lang="${lang === "en" ? "fr" : "en"}"]`, (a) => a.offsetHeight === 0), `${pth} (${lang}): shown in ${lang}`);
          await shot(p, `page-${pth.replace(/\//g, "")}-${lang}`, true);
        }
        check(await noSideScroll(p), `${pth} (${lang}): no sideways scrolling`);
        check(p.errors.length === 0, `${pth} (${lang}): no JavaScript errors`);
        await p.close();
      }
    }
    const priv = await (await c.request.get(`${BASE}/confidentialite/`)).text();
    check(/24 heures/.test(priv) && /Supabase/.test(priv) && /CNDP/.test(priv) && /09-08/.test(priv) && /class="todo"/.test(priv), "privacy page: 24 h, hosting, CNDP (number left blank), law 09-08");
    const cgv = await (await c.request.get(`${BASE}/conditions/`)).text();
    check(/31-08/.test(cgv) && /Réservations/.test(cgv) && /Bd Al Qods/.test(cgv), "terms page: law 31-08, bookings, the restaurant's address");
    check(!/\b(RC|ICE|IF)\s*[:n°]/.test(priv + cgv), "no RC, ICE or IF numbers");
    check(!/conforme|compliant/i.test(priv + cgv), "no claim of being « compliant »");
    check(!/Cibo|Napoli|Mansouria/i.test(priv + cgv), "nothing left from another restaurant");
    for (const f of ["/site.webmanifest", "/sw.js", "/commandes/staff.webmanifest", "/commandes/sw.js", "/robots.txt", "/sitemap.xml", "/assets/share.jpg", "/favicon.ico", "/avis/", "/commander/", "/reserver/", "/assets/brand/logo-cream.svg", "/assets/brand/logo-1200.png", "/assets/icons/icon-512.png", "/assets/icons/staff-512.png"]) {
      check((await c.request.get(BASE + f)).ok(), `${f} is served`);
    }
    const man = await (await c.request.get(`${BASE}/site.webmanifest`)).json();
    check(man.icons.some((i) => i.purpose === "maskable") && man.display === "standalone" && man.short_name === "Pasto", "manifest: Pasto, standalone, maskable icon");
    const sman = await (await c.request.get(`${BASE}/commandes/staff.webmanifest`)).json();
    check(sman.scope === "/commandes/" && sman.icons.some((i) => /staff/.test(i.src)), "the staff app has its own scope and icon");
    const avis = await (await c.request.get(`${BASE}/avis/`)).text();
    check(/writereview\?placeid=ChIJbR_p--czpg0RPIMNJOJR7DU/.test(avis), "/avis/ leads to Pasto's Google review form");
    const sm = await (await c.request.get(`${BASE}/sitemap.xml`)).text();
    check(sm.includes("<loc>") && !/vercel\.app.*vercel\.app/.test(sm.split("\n")[3] || ""), "sitemap lists pages");
    const pages = ["/", "/commander/", "/reserver/"];
    const canon = [];
    for (const pth of pages) canon.push(((await (await c.request.get(BASE + pth)).text()).match(/rel="canonical" href="([^"]+)"/) || [])[1]);
    check(canon.every((u) => u && new URL(u).origin === new URL(canon[0]).origin), "one canonical domain on every page");
    if (LIVE) {
      const h = (await c.request.get(`${BASE}/`)).headers();
      check(h["x-content-type-options"] === "nosniff", "header: nosniff");
      check(/SAMEORIGIN/i.test(h["x-frame-options"] || ""), "header: X-Frame-Options");
      check(/frame-ancestors/.test(h["content-security-policy"] || ""), "header: frame-ancestors");
      check(!!h["referrer-policy"], "header: Referrer-Policy");
      check(/geolocation=\(self\)/.test(h["permissions-policy"] || ""), "header: Permissions-Policy (geolocation for the site only)");
      check(/max-age=\d+/.test(h["strict-transport-security"] || ""), "header: HSTS");
    } else {
      const hdr = fs.readFileSync(path.join(ROOT, "_headers"), "utf8");
      check(["nosniff", "X-Frame-Options", "frame-ancestors", "Referrer-Policy", "geolocation=(self)", "Strict-Transport-Security"].every((x) => hdr.includes(x)), "_headers has the security headers");
      const vj = fs.readFileSync(path.join(ROOT, "vercel.json"), "utf8");
      check(["nosniff", "X-Frame-Options", "frame-ancestors", "Referrer-Policy", "geolocation=(self)", "Strict-Transport-Security"].every((x) => vj.includes(x)), "vercel.json has the same headers");
      // no secrets, nothing left from another restaurant, old-phone rules
      const cfg = fs.readFileSync(path.join(ROOT, "js/config.js"), "utf8");
      check(!/service_role|vapid_private|sb_secret_/i.test(cfg), "no secret keys in js/config.js");
      const css = ["css/style.css", "css/page.css", "commandes/commandes.css"].map((f) => fs.readFileSync(path.join(ROOT, f), "utf8")).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
      check(!/aspect-ratio|:has\(/.test(css), "no aspect-ratio or :has() in the styles (old phones)");
      const files = ["index.html", "commander/index.html", "reserver/index.html", "commandes/index.html", "js/i18n.js", "js/config.js", "js/common.js", "js/order.js", "commandes/commandes.js", "site.webmanifest"];
      check(files.every((f) => !/Cibo|Napoli|Mansouria/i.test(fs.readFileSync(path.join(ROOT, f), "utf8"))), "no text, name or address from another restaurant");
    }
    await c.close();
  }

  await browser.close();
  if (srv) srv.close();
  console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
  process.exit(failures ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
