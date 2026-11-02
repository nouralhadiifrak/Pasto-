/*
 * Pasto menu. Prices in DH. EMPTY until the owner sends the menu: the order page then shows « La carte arrive
 * bientôt » with the phone and WhatsApp buttons. Never fill it from guesses: only the owner's menu.
 *
 * Category: { id, name: {fr, en}, sub: {fr, en} (optional),
 *             art (drawn placeholder: pasta | pizza | plate | starter | salad | soup | dessert | drink | dish),
 *             image (category photo, optional), options (key of an option group, asked before adding, optional),
 *             items }
 * Item:     { id, name (Italian names are the same in both languages, or {fr, en}), desc: {fr, en} (optional),
 *             price (null = not known yet: shown as "price soon", cannot be ordered),
 *             image (optional: "/assets/photos/<id>.webp", 600 x 600, the owner's photo only),
 *             options (overrides the category's; null = none) }
 *
 * Example (do not keep):
 *   window.OPTION_GROUPS = { shape: { id: "shape", title: { fr: "Quelle pâte ?", en: "Which pasta?" }, required: true,
 *     choices: [{ id: "penne", name: "Penne" }, { id: "spaghetti", name: "Spaghetti", price: 5 }] } };
 *   window.MENU = [{ id: "pasta", name: { fr: "Pâtes", en: "Pasta" }, art: "pasta", options: "shape",
 *     items: [{ id: "arrabbiata", name: "Arrabbiata", price: 70, desc: { fr: "…", en: "…" } }] }];
 */
window.OPTION_GROUPS = {};
window.MENU = [];
