/* Pasto: restaurant details used across the site and the staff app. Only facts given by the owner go here. */
window.CONFIG = {
  name: "Pasto",
  tagline: "Cucina italiana",
  // Public address of the site (canonical links, sitemap, share previews). Demo address until the domain is bought.
  siteUrl: "https://pasto.vercel.app",
  // The restaurants. With one, there is no restaurant picker.
  locations: [
    {
      id: "bd-al-qods",
      // Name as on the Google Business Profile.
      googleName: "Pasto | Cuisine Italienne",
      name: { fr: "Pasto", en: "Pasto" },
      short: { fr: "Bd Al Qods", en: "Bd Al Qods" },
      // « Info & Resa » number from the Instagram profile.
      phone: "0774747480",
      phoneIntl: "+212774747480",
      // WhatsApp in international format, digits only. TO CONFIRM: is WhatsApp on the same number?
      whatsapp: "212774747480",
      instagram: "https://www.instagram.com/pastoitaliana/",
      instagramHandle: "@pastoitaliana",
      googleMapsUrl: "https://maps.app.goo.gl/47nf6ioEUwAWqBL57",
      // Google Place ID, used for the review link.
      placeId: "ChIJbR_p--czpg0RPIMNJOJR7DU",
      // Address as written on the Instagram profile. TO CONFIRM against Google.
      address: { fr: "Casablanca", en: "Casablanca" },
      streetAddress: "GH 6, 19 Bd Al Qods",
      locality: "Casablanca",
      postalCode: "20470",
      // The pin of the Google listing: the map (and the delivery distance, once delivery is on) start here.
      location: { lat: 33.5351709, lng: -7.6106616 },
    },
  ],
  // 24 h format, Casablanca time. "00:00" as closing time means midnight. From Instagram: « 12h | 00h00 ».
  // TO CONFIRM: every day, no closed day?
  hours: { open: "12:00", close: "00:00" },
  timeZone: "Africa/Casablanca",
  currency: "DH",
  // Delivery: null = pickup only (the owner has not given the zone and fee yet).
  // To turn it on: { maxKm: 5, fee: 10, zone: [[lat, lng], …] } (the zone drawn by the owner; the same list goes
  // in the `zone` column of the `locations` table, see supabase/schema.sql).
  delivery: null,
  // Table bookings (/reserver/): half-hour slots from first to last, up to maxPeople, up to maxDays ahead.
  // TO CONFIRM with the owner (set from the opening hours for now).
  booking: { first: "12:00", last: "23:00", maxPeople: 20, maxDays: 60 },
  // How the customer pays, e.g. { delivery: ["cash"], pickup: ["cash", "card"] }. null = not said on the site yet.
  payment: null,
  // Hero picture: a real dish photo from the owner, e.g. { image: "/assets/hero/plat.webp", small: "/assets/hero/plat-480.webp" }.
  // A video also works: { video: "/assets/hero/hero.mp4", poster: "/assets/hero/hero.webp" }.
  // null = a drawn plate, with « Photo à venir ».
  heroMedia: null,
  // Home page, « Les incontournables »: up to 4 dish ids from js/menu-data.js. Empty = the section is hidden.
  signature: [],
  // Home page, « Notre histoire »: the 3 photos (e.g. "/assets/home/salle.webp", about 1200 px wide, WebP).
  // Empty = a drawn placeholder that says which photo goes there.
  homePhotos: { room: "", plate: "", team: "" },
  // Online orders.
  //  - supabaseUrl empty = DEMO MODE: orders and bookings stay in this browser (localStorage). Open /commandes/
  //    in another tab of the same browser to play the restaurant. Nothing leaves the phone.
  //  - with supabaseUrl and publishableKey (public by design; row level security decides what it can do, see
  //    supabase/schema.sql), orders go to the real staff screen.
  orders: {
    supabaseUrl: "",
    publishableKey: "",
    // After this many minutes without an answer, the customer is offered WhatsApp.
    callAfterMinutes: 5,
    // Public half of the push notification keys (the private half stays in the database, never in this repo).
    vapidPublicKey: "",
  },
  // Share preview (WhatsApp, Facebook), 1200 x 630.
  shareImage: "/assets/share.jpg",
};
