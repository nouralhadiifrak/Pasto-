#!/usr/bin/env node
/*
 * Pasto: draws the app icons, the favicon, the logo PNG (for Google) and the share image (assets/share.jpg,
 * 1200 x 630, shown when the site is shared on WhatsApp, Facebook…) from assets/brand/*.svg.
 * Needs Playwright and Chromium:  node tools/make-images.js   (then python3 tools/make-favicon.py for favicon.ico)
 * Redo it after a logo change; the share image can use a real dish photo once the owner sends one.
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const root = path.join(__dirname, "..");
const f = (p) => "file://" + path.join(root, p);
const GREEN = "#144a3d", CREAM = "#fbf3dc";
const fonts = `
@font-face { font-family: F; src: url("${f("assets/fonts/fraunces-normal-latin.woff2")}"); font-weight: 100 900; }
@font-face { font-family: F; font-style: italic; src: url("${f("assets/fonts/fraunces-italic-latin.woff2")}"); font-weight: 100 900; }
@font-face { font-family: "Manrope"; src: url("${f("assets/fonts/manrope-normal-latin.woff2")}"); font-weight: 200 800; }
html, body { margin: 0; }`;
const svg = (name) => fs.readFileSync(path.join(root, "assets/brand", name), "utf8").replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%"');

// size, logo width as a share of the icon, background, logo file, extra label
const ICONS = [
  ["icons/icon-192.png", 192, 0.8, GREEN, "logo-cream.svg"],
  ["icons/icon-512.png", 512, 0.8, GREEN, "logo-cream.svg"],
  ["icons/maskable-512.png", 512, 0.62, GREEN, "logo-cream.svg"],
  ["icons/apple-touch-icon.png", 180, 0.78, GREEN, "logo-cream.svg"],
  ["icons/favicon-32.png", 32, 0.9, GREEN, null],
  ["icons/favicon-48.png", 48, 0.9, GREEN, null],
  // the staff app: cream with a green logo and « Commandes », so the two icons are told apart on the phone
  ["icons/staff-192.png", 192, 0.76, CREAM, "logo-green.svg", "COMMANDES"],
  ["icons/staff-512.png", 512, 0.76, CREAM, "logo-green.svg", "COMMANDES"],
  ["icons/staff-maskable-512.png", 512, 0.6, CREAM, "logo-green.svg", "COMMANDES"],
  ["icons/staff-apple-touch-icon.png", 180, 0.74, CREAM, "logo-green.svg", "COMMANDES"],
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  const shoot = async (html, w, h, out, type = "png") => {
    await p.setViewportSize({ width: w, height: h });
    // from a file, so the page may load the fonts from the disk
    const tmp = path.join(require("os").tmpdir(), "pasto-image.html");
    fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}</style></head><body>${html}</body></html>`);
    await p.goto("file://" + tmp, { waitUntil: "load" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(root, "assets", out), type, ...(type === "jpeg" ? { quality: 88 } : { omitBackground: false }) });
  };
  for (const [out, size, share, bg, logo, label] of ICONS) {
    const inner = logo
      ? `<div style="width:${size * share}px">${svg(logo)}</div>${label ? `<div style="margin-top:${size * 0.05}px;padding:${size * 0.018}px ${size * 0.05}px;border-radius:999px;background:${GREEN};color:${CREAM};font:800 ${size * 0.075}px Manrope;letter-spacing:.12em">${label}</div>` : ""}`
      : `<div style="font:700 ${size * 0.82}px/1 F;color:${CREAM};margin-top:-${size * 0.06}px">P</div>`;
    await shoot(`<div style="width:${size}px;height:${size}px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center">${inner}</div>`, size, size, out);
  }
  // logo on a light background, for Google (schema.org « logo »)
  await shoot(`<div style="width:1200px;height:1200px;background:${GREEN};display:flex;align-items:center;justify-content:center"><div style="width:900px">${svg("logo-cream.svg")}</div></div>`, 1200, 1200, "brand/logo-1200.png");
  // share image
  await shoot(`<div style="position:relative;width:1200px;height:630px;background:radial-gradient(circle at 50% 40%, #1d5c4c, ${GREEN} 55%, #0e3329);color:${CREAM};overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">
    <svg style="position:absolute;left:50%;top:50%;transform:translate(-50%,-46%)" width="560" height="600" viewBox="0 0 560 600"><path d="M20 600V280a260 260 0 0 1 520 0v320" fill="none" stroke="${CREAM}" stroke-opacity=".22" stroke-width="2"/><path d="M44 600V284a236 236 0 0 1 472 0v316" fill="none" stroke="${CREAM}" stroke-opacity=".12" stroke-width="2"/></svg>
    <div style="position:relative;width:640px">${svg("logo-cream.svg")}</div>
    <div style="position:relative;margin-top:26px;font:italic 400 40px F">La cuisine italienne, au cœur de Casablanca</div>
    <div style="position:relative;margin-top:16px;font:700 21px Manrope;letter-spacing:.16em;color:#f0c8a8">BOULEVARD AL QODS · RÉSERVATION &amp; COMMANDE EN LIGNE</div>
  </div>`, 1200, 630, "share.jpg", "jpeg");
  await b.close();
  console.log("images written");
})();
