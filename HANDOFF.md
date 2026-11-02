# Handoff: Pasto website

Paste this into a new Claude Code session, or tell it: "Read HANDOFF.md first."

Project: website and online ordering for Pasto | Cuisine Italienne, one restaurant on Bd Al Qods, Casablanca.
Repo: nouralhadiifrak/Pasto-. Open a PR for every change; merge only when I say "merge" or "ok merge it".
Reference: nouralhadiifrak/cibo-napoli (closest) and nouralhadiifrak/chicken-amine work the same way, but do NOT copy
their look, logos, photos, texts or colours.
Write to me in simple, short English. Ask before guessing anything about the restaurant. Never invent menu, prices,
reviews or legal numbers.

Stack: plain HTML/CSS/JS, no build. Demo on Vercel now, Cloudflare Pages later (`_headers` ready). Supabase later
(EU region, free plan); until then orders and bookings run in demo mode (localStorage, see README).
Languages: French by default, English at ?lang=en.
Tests: `node tests/site.test.js` (390 px and 1280 px, FR and EN); check the screenshots before every PR.
After any CSS/JS change raise the ?v= numbers (and VERSION in sw.js).
Old phones: no aspect-ratio or :has() (the tests check it); a still image if video autoplay is blocked.
Never commit secrets. Never use stock or internet photos: only the owner's; otherwise a drawn placeholder.

## Facts we have (from the Instagram profile @pastoitaliana and the Google link)

- Name on Google: « Pasto | Cuisine Italienne ». Pin 33.5351709, -7.6106616. Place ID ChIJbR_p--czpg0RPIMNJOJR7DU.
  Maps: https://maps.app.goo.gl/47nf6ioEUwAWqBL57
- Address (Instagram): GH 6, 19 Bd Al Qods, Casablanca 20470.
- Hours (Instagram): 12h – 00h00.
- « Info & Resa »: 07 74 74 74 80.
- Logo: « PASTO / CUCINA ITALIANA », cream on deep green. The site uses a drawn stand-in until the real file comes.

## Still open (ask the owner)

- The real logo file (SVG or large PNG).
- The full menu with prices and options (the Instagram highlight « Nouvelle carte »). Until then `js/menu-data.js`
  is empty and the order page says « La carte arrive bientôt ».
- Dish photos, a hero photo, and the 3 story photos (room, a dish, the team). The story text is a short neutral
  text: replace it with the owner's own story.
- Google reviews to show (none on the site yet; only the « Laisser un avis » and « Lire les avis » buttons).
- Is WhatsApp on 07 74 74 74 80? (Set so for now.) A test phone for orders?
- Address exactly as on Google; open every day, or a closed day?
- Delivery: yes or no, zone and fees (`delivery: null` = pickup only, and the database refuses delivery).
- Payment methods (nothing is promised on the site until then).
- Booking rules (assumed 12:00 – 23:00, up to 20 people, up to 60 days ahead).
- Legal: the business's legal name and e-mail, CNDP number (blank spaces left). No RC/ICE/IF.
- Domain; Supabase project, the two accounts (staff, owner), push keys; then Cloudflare Pages.
- Vercel Hobby plan is non-commercial: demo only.
