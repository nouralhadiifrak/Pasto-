# PASTO

Website and online ordering for Pasto | Cuisine Italienne, an Italian restaurant on Boulevard Al Qods in Casablanca.
Plain HTML, CSS and JavaScript, no framework and no build step.

> **Status: demo.** Hosted on Vercel for now (to show the owner), then Cloudflare Pages before real use.
> Orders and bookings run in **demo mode**: they stay in the browser (see "Online orders"). Supabase comes later.
> **The menu is not online yet**: the order page says « La carte arrive bientôt » until the owner sends it.

Three pages: **home** `/`, **order** `/commander/`, **book a table** `/reserver/` (plus privacy and terms), and the
staff app `/commandes/`.

- French by default, English at `?lang=en` (FR / EN in the header on PC, in the ☰ menu on phones)
- Header: ☰ menu on phones, titles in the middle on PC, a dark mode button (remembered on the phone; the first time
  it follows the phone's setting), and « Installer » with the app icon when the phone can install the app
- Intro on the home page (about 3 s, `js/intro.js`): the logo on green, an arch draws itself around it with
  « Benvenuti », then the logo glides into the header. A tap, « Passer », Esc or Enter skips it. Not when coming back
  from another page of the site, nor with the back button
- Home: title, La carte + Réserver side by side and Itinéraire under them, a dish photo in an arch (a drawn plate
  until the owner's photo arrives), « Les incontournables » (dishes of `signature`, hidden while empty),
  « Notre histoire » (3 photos in arches), Google reviews, info and the map
- Order page: category tiles, a sticky category bar, dishes 2 per row on phones with description and price in DH.
  Options are asked before adding (a choice can cost more). Long press (phone) or click (PC) shows the photo big
- Cart: pickup, or delivery once the owner gives the zone (map, GPS or tap, the drawn zone, fee), clear total
- « Commander » sends the order to the staff screen, then a live tracking panel; WhatsApp only as the way out
- Booking page: day, half-hour time, people, children, name, phone, note
- Floating Instagram button on every page; installable app (PWA); schema.org data, sitemap, share image

## Look

Pasto's own colours, taken from its logo: deep green `#144a3d` and cream `#fbf3dc`, with terracotta `#b9532c` for the
actions and saffron `#d29a3c` for the stars. Arches frame every picture; the story band and the footer have a
scalloped edge. Fonts: Fraunces (titles) and Manrope (text), served from `assets/fonts/` (no Google Fonts call).

**The logo is a stand-in** drawn from the Instagram profile picture (`tools/make-logo.py`, from the site's own
fonts) until the owner sends the real file. Then: put it in `assets/brand/` (cream and green versions, SVG best),
run `node tools/make-images.js` and `python3 tools/make-favicon.py` (icons, favicon, share image).

## Photos

Only the owner's photos are used, never stock or internet photos. Until then each place shows a clean drawing
(`js/art.js`) with « Photo à venir ».

- A dish: `assets/photos/<dish id>.webp` (square, about 600 × 600), then `image: "/assets/photos/<dish id>.webp"` on
  the dish in `js/menu-data.js`.
- The hero: `heroMedia` in `js/config.js` (a tall photo, about 960 px wide; a video works too, with a still image
  that stays if the phone blocks autoplay).
- « Notre histoire »: `homePhotos` in `js/config.js` (room, plate, team).

## Online orders

**Customer:** « Commander » saves the order (`js/orders.js`) and shows a live panel: received → accepted (with a
time) → ready / on the way → done, or refused / cancelled with the reason. The customer can cancel while the order
waits. WhatsApp (with the order already written) appears only if sending fails, or after
`orders.callAfterMinutes` (5) minutes without an answer. When the order is done: « Grazie mille ! » and a Google
review button.

**Staff screen `/commandes/`**, installable as its own app (cream icon « Commandes »). « Démarrer le service » lets
the page ring and keeps the screen awake. Each new order rings and fills the screen until it is accepted (with a
time) or refused (with a reason). Then: Prête (pickup) or En route + « Envoyer au livreur » (WhatsApp with client,
phone, address, map link and amount; the staff pick the driver's contact), then Terminée.
« Réservations »: 📞 Appeler, Confirmer, Confirmer + WhatsApp (message already written), Refuser.
« Statistiques »: day, week, month. The **owner's account** opens on the statistics and is read-only.

### Demo mode (now)

`orders.supabaseUrl` is empty in `js/config.js`, so orders and bookings are kept in the browser's localStorage, with
the same rules as the database (5 per phone in 10 min, details erased after 24 h). To show it:

1. Open the site and `/commandes/` **in two tabs of the same browser** (on a phone: two tabs in Chrome).
2. In `/commandes/` choose « Entrer comme l'équipe », then « Démarrer le service ».
3. Order on the site (once the menu is in): the staff tab rings; accept it and watch the customer's panel change.
4. ☰ → « Remplir avec des exemples » fills the statistics with example orders (named « Exemple », demo only).

### Going live with Supabase (later)

1. Create a Supabase project, **EU region** (e.g. Paris), free plan.
2. Run `supabase/schema.sql` (tables, RLS, column grants, `x-order-token`, anti-spam, zone check, pickup-only
   check, 24 h erase, 2-year delete, realtime, push). Run the **security advisors** and fix anything they report.
3. Authentication → Sign In / Providers: turn **off** « Allow new users to sign up ».
4. Authentication → Users → Add user: one staff account and one owner account; then in SQL:
   `insert into public.staff (user_id, role, location) values ('<id>', 'staff', 'bd-al-qods');`
   `insert into public.staff (user_id, role) values ('<id>', 'owner');`
5. Push: generate VAPID keys (`npx web-push generate-vapid-keys`), deploy `supabase/functions/push`
   (verify_jwt off: it checks a secret shared with the database), and insert the keys **by hand** in
   `push_config` (see the comment in the schema). Never commit the private key.
6. Fill `orders.supabaseUrl`, `orders.publishableKey` and `orders.vapidPublicKey` in `js/config.js` (all public),
   raise the `?v=` numbers, run the tests.

### Delivery (off for now)

`delivery: null` in `js/config.js` = pickup only: the « Livraison » choice is hidden, and the database refuses a
delivery order (`locations.delivery = false`). Once the owner draws the zone and gives the fee: set
`delivery: { maxKm, fee, zone: [[lat, lng], …] }` in `js/config.js`, the same values in the `locations` row, update
the terms page (« Retrait et livraison »), and run `node tools/build-seo.js`.

## Hosting

**Now (demo): Vercel.** Import the repo, framework « Other », no build command, output directory `.` (root).
`vercel.json` holds the security headers and caching rules. The Vercel Hobby plan is not for commercial use, so it
is for the demo only.

**Later: Cloudflare Pages** (free, commercial use allowed), auto-deployed from `main`: no framework, no build
command, output directory `/`. `_headers` holds the same headers. Once the domain is bought: add it in Pages, make
it the only address (www and `*.pages.dev` redirect to it), set `siteUrl` in `js/config.js` and run
`node tools/build-seo.js`.

Security headers (both hosts): `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
`frame-ancestors 'self'`, `Referrer-Policy`, `Permissions-Policy` (geolocation for the site itself only), HSTS.

## Where to edit things

| What | File |
| --- | --- |
| Restaurant details (phone, WhatsApp, Instagram, address, map pin), hours, delivery, bookings, payment, hero photo, site address, Supabase | `js/config.js` |
| Menu: categories, dishes, descriptions, prices, options | `js/menu-data.js` |
| Reviews shown on the site (only ones the owner picks, word for word) | `js/reviews.js` |
| Interface text (French / English) | `js/i18n.js` |
| Shared page logic (header, dark mode, install, maps, tracker, hero, reviews, info) | `js/common.js` |
| Home page (dish picks, story) | `js/home.js` |
| Order page (menu, cart, delivery map, order) | `js/order.js` + `commander/index.html` |
| Booking page | `js/reserve.js` + `reserver/index.html` |
| Where orders go (demo / Supabase) | `js/orders.js` |
| Intro animation | `js/intro.js` + « Intro » in `css/style.css` |
| Drawn placeholders | `js/art.js` |
| Colours, fonts, layout | `css/style.css` (tokens at the top, Pasto's look at the bottom) |
| Staff screen | `commandes/` |
| Privacy and terms of sale | `confidentialite/`, `conditions/` |
| Database | `supabase/schema.sql`, `supabase/functions/push/` |

Supabase JS and Leaflet are in `vendor/`, with their version in the file name.

## After changing things

- Code (CSS or JS): raise the `?v=` number on its link in the HTML pages (and in `CORE` in `sw.js`), and
  `VERSION` in `sw.js`.
- Details, menu or domain: `node tools/build-seo.js` (schema.org data, canonical links, sitemap, robots.txt).
- Logo: `python3 tools/make-logo.py` (stand-in only), `node tools/make-images.js`, `python3 tools/make-favicon.py`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Tests

Playwright, at 390 px and 1280 px, in French and English. The real menu is empty, so the order flow runs with a
TEST menu and a TEST delivery zone given to the test browser only (nothing on disk or on the server changes).

```sh
npm install playwright   # once
node tests/site.test.js
SHOTS=tests/screenshots node tests/site.test.js   # also saves screenshots
BASE=https://<domain> node tests/site.test.js      # against the live site (also checks the security headers)
```
