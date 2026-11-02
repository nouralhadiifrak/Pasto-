/*
 * Pasto: drawn placeholders, shown wherever there is no photo yet (hero, category tiles, dishes).
 * Line drawings in one colour (currentColor) on a soft disc, plain inline SVG (no file to load).
 * ART.svg(name, extraClass) returns the markup. Names: pasta, pizza, plate, starter, salad, soup, dessert, drink, dish.
 */
(function () {
  const S = 'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';
  const disc = '<circle cx="100" cy="100" r="92" class="art__disc"/>';

  const DRAW = {
    // a bowl of pasta with a fork twirling it
    pasta: () => `
      <path d="M38 104h124c-4 34-30 54-62 54s-58-20-62-54z" ${S}/>
      <path d="M86 158l-4 12h36l-4-12" ${S}/>
      <path d="M52 104c4-14 14-22 26-20 10-12 26-14 38-4 14-4 28 4 32 24" ${S}/>
      <path d="M70 104c2-8 8-12 16-10M98 102c2-8 10-12 18-8M124 104c0-6 4-10 10-10" ${S}/>
      <path d="M128 40l-22 56M120 38l-6 16M128 40l2 0M136 42l-8 18" ${S}/>
      <path d="M100 86c10-6 22-4 26 4s-4 14-16 14-16-8-10-18z" ${S}/>`,
    // a slice of pizza
    pizza: () => `
      <path d="M44 62c36-20 76-20 112 0L100 164z" ${S}/>
      <path d="M44 62c36-12 76-12 112 0" ${S}/>
      <circle cx="82" cy="86" r="8" ${S}/><circle cx="116" cy="84" r="7" ${S}/><circle cx="100" cy="116" r="7" ${S}/>
      <path d="M90 140c2-4 6-4 8 0M120 104c3-2 6-1 7 2" ${S}/>`,
    // a plate with a fork and a knife
    plate: () => `
      <circle cx="100" cy="102" r="46" ${S}/><circle cx="100" cy="102" r="32" ${S} opacity=".55"/>
      <path d="M36 60v26c0 6 4 10 8 10v62M44 60v22M52 60v26c0 6-4 10-8 10" ${S}/>
      <path d="M160 160V60c-10 8-14 24-14 40 0 6 4 10 14 10" ${S}/>`,
    // a bowl of greens
    salad: () => `
      <path d="M36 104h128c-4 32-30 52-64 52s-60-20-64-52z" ${S}/>
      <path d="M58 104c-2-18 8-30 22-32 0 14-8 26-22 32zM88 102c0-22 12-36 28-38 0 20-12 34-28 38zM120 104c4-16 16-24 30-22-4 14-14 22-30 22z" ${S}/>
      <path d="M58 104l18-24M88 102l22-32M120 104l22-16" ${S} opacity=".6"/>`,
    // a small plate of bruschette
    starter: () => `
      <ellipse cx="100" cy="130" rx="66" ry="20" ${S}/>
      <path d="M50 122l26-48 30 10-22 44zM96 126l30-46 30 12-26 40z" ${S}/>
      <circle cx="78" cy="96" r="5" ${S}/><circle cx="124" cy="100" r="5" ${S}/><path d="M86 108c3-3 7-3 9 0" ${S}/>`,
    // a steaming bowl
    soup: () => `
      <path d="M36 100h128c-4 34-30 56-64 56s-60-22-64-56z" ${S}/>
      <path d="M80 82c-8-10 8-16 0-28M100 82c-8-10 8-16 0-28M120 82c-8-10 8-16 0-28" ${S}/>`,
    // a tiramisu glass with a spoon
    dessert: () => `
      <path d="M62 66h76l-10 92H72z" ${S}/>
      <path d="M66 92h68M68 114h64M70 136h60" ${S} opacity=".55"/>
      <path d="M62 66c6-8 14-8 20 0 6-8 14-8 20 0 6-8 14-8 20 0 6-8 12-8 16 0" ${S}/>
      <path d="M148 40l-22 44" ${S}/><ellipse cx="152" cy="34" rx="7" ry="11" transform="rotate(28 152 34)" ${S}/>`,
    // a glass with ice and a slice of lemon
    drink: () => `
      <path d="M66 52h68l-8 112H74z" ${S}/>
      <path d="M70 82h60" ${S} opacity=".55"/>
      <rect x="82" y="96" width="16" height="16" rx="3" ${S}/><rect x="104" y="112" width="14" height="14" rx="3" ${S}/>
      <path d="M118 52l18-26h12" ${S}/><path d="M126 52a14 14 0 0 1 28 0z" ${S}/>`,
    // anything else: a cloche
    dish: () => `
      <path d="M40 136h120M48 136a52 52 0 0 1 104 0" ${S}/>
      <circle cx="100" cy="78" r="6" ${S}/><path d="M34 150h132" ${S}/>`,
  };

  window.ART = {
    names: Object.keys(DRAW),
    svg(name, cls = "") {
      const draw = DRAW[name] || DRAW.dish;
      return `<svg class="art art--${DRAW[name] ? name : "dish"} ${cls}" viewBox="0 0 200 200" aria-hidden="true" focusable="false">${disc}${draw()}</svg>`;
    },
  };
})();
