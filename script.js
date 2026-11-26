(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const O = { x: 180, y: 560 };                       // kjer so stebla zvezana
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SWAY_PAUSE = 2.2;                             // premor po koncu rasti, preden se šopek začne zibati

  // barve: [zunanji list, srednji, notranji, najglobji]
  const PAL = {
    rose:    ['#f6c1d3', '#ee93b4', '#dc5f8e', '#b53767'],
    powder:  ['#f9d9e2', '#f2b8cb', '#e58fab', '#c95f82'],
    peach:   ['#ffe1d2', '#fbc3a9', '#f2a084', '#d9745d'],
    mauve:   ['#ebc6db', '#d9a0c2', '#bd76a3', '#94517f'],
    coral:   ['#f9b7b9', '#f08b94', '#dd5f72', '#b53a55'],
    blush:   ['#fdeef1', '#f8d3dc', '#edafc0', '#d5849e'],
    fuchsia: ['#f3a6c6', '#e56aa0', '#cc3c80', '#9e1f5e'],
  };

  // vrstni red = vrstni red rasti (od sredine navzven)
  const ROSES = [
    { x: 180, y: 132, R: 46, rot: -6,  pal: 'rose'    },
    { x: 180, y: 228, R: 40, rot: 10,  pal: 'fuchsia' },
    { x: 110, y: 178, R: 37, rot: 14,  pal: 'powder'  },
    { x: 252, y: 174, R: 38, rot: -12, pal: 'peach'   },
    { x: 116, y: 272, R: 35, rot: -8,  pal: 'blush'   },
    { x: 246, y: 276, R: 36, rot: 16,  pal: 'coral'   },
    { x: 180, y: 326, R: 33, rot: 4,   pal: 'mauve'   },
    { x: 54,  y: 232, R: 31, rot: 20,  pal: 'mauve'   },
    { x: 308, y: 228, R: 31, rot: -18, pal: 'rose'    },
    { x: 96,  y: 122, R: 27, rot: -14, pal: 'coral'   },
    { x: 264, y: 118, R: 28, rot: 12,  pal: 'blush'   },
    { x: 52,  y: 328, R: 27, rot: 8,   pal: 'peach'   },
    { x: 310, y: 330, R: 27, rot: -6,  pal: 'fuchsia' },
  ];

  const BUDS = [
    { x: 30,  y: 186, s: 10, rot: -30, pal: 'rose'    },
    { x: 333, y: 184, s: 10, rot: 30,  pal: 'powder'  },
    { x: 36,  y: 374, s: 9,  rot: -36, pal: 'coral'   },
    { x: 326, y: 372, s: 9,  rot: 36,  pal: 'fuchsia' },
  ];

  // drobne vejice (kot cigansko cvetje)
  const SPRIGS = [
    [140, 84], [222, 80], [60, 160], [302, 150], [18, 276], [342, 278], [84, 368], [276, 372],
  ];

  // zelenje brez cvetov
  const GREENS = [[70, 350], [292, 352], [150, 384], [210, 386]];

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const jit = (a, b) => Math.sin(a * 12.9898 + b * 78.233);   // deterministično "naključje"
  const f = (n) => n.toFixed(2);

  // ---- steblo kot kvadratna krivulja ----
  function curve(tx, ty) {
    return { cx: O.x + (tx - O.x) * .2, cy: O.y - (O.y - ty) * .55, tx, ty };
  }
  function pt(c, t) {
    const u = 1 - t;
    return {
      x: u * u * O.x + 2 * u * t * c.cx + t * t * c.tx,
      y: u * u * O.y + 2 * u * t * c.cy + t * t * c.ty,
      ang: Math.atan2(2 * u * (c.cy - O.y) + 2 * t * (c.ty - c.cy), 2 * u * (c.cx - O.x) + 2 * t * (c.tx - c.cx)) * 180 / Math.PI,
    };
  }
  function addStem(parent, c, delay, dur, thin) {
    el('path', {
      class: 'stem' + (thin ? ' thin' : ''), pathLength: 1,
      d: `M${O.x} ${O.y} Q${f(c.cx)} ${f(c.cy)} ${c.tx} ${c.ty}`,
      style: `--d:${f(delay)}s;--t:${f(dur)}s`,
    }, parent);
  }
  function addLeaf(parent, c, t, side, scale, delay, alt) {
    const p = pt(c, t);
    const outer = el('g', { transform: `translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.ang + side * 48)}) scale(${f(scale)})` }, parent);
    const inner = el('g', { class: 'leaf', style: `--d:${f(delay)}s` }, outer);
    el('path', { class: 'leaf-shape' + (alt ? ' alt' : ''), d: 'M0 0C6 -7 20 -8 30 0C20 8 6 7 0 0Z' }, inner);
    el('path', { class: 'leaf-rib', d: 'M2 0L26 0' }, inner);
  }

  // ---- vrtnica ----
  function drawRose(parent, r) {
    const p = PAL[r.pal];
    const R = r.R;
    const baseG = el('g', { class: 'layer', style: `--d:${f(r.bloom + 1.04)}s` }, parent);
    el('circle', { r: R * 0.8, fill: p[3], opacity: .3 }, baseG);

    const layers = [
      { n: 6, d: .55, r: .46 },
      { n: 5, d: .38, r: .40 },
      { n: 4, d: .22, r: .32 },
      { n: 3, d: .10, r: .24 },
    ];
    layers.forEach((L, j) => {
      const g = el('g', { class: 'layer', style: `--d:${f(r.bloom + .2 + (3 - j) * .28)}s` }, parent);
      for (let k = 0; k < L.n; k++) {
        const ang = (j * 29 + r.R * 7 + (k * 360) / L.n) * Math.PI / 180;
        const rad = R * L.r * (1 + .06 * jit(k + 1, j + r.R));
        el('circle', {
          cx: f(R * L.d * Math.cos(ang)), cy: f(R * L.d * Math.sin(ang)), r: f(rad),
          fill: p[j], stroke: p[3], 'stroke-opacity': .35, 'stroke-width': .8,
        }, g);
      }
      if (j === 3) {                                   // spirala v sredini
        let d = '';
        for (let t = 0; t < 5.5 * Math.PI; t += .35) {
          const rr = R * (.015 + .035 * t / Math.PI);
          d += (d ? 'L' : 'M') + f(rr * Math.cos(t)) + ' ' + f(rr * Math.sin(t));
        }
        el('path', { d, fill: 'none', stroke: p[3], 'stroke-width': f(R * .03), 'stroke-linecap': 'round', opacity: .7 }, g);
      }
    });
  }

  // ---- popek (zaprta vrtnica); izhodišče = konec stebla ----
  function drawBud(parent, b) {
    const p = PAL[b.pal], s = b.s;
    const g = el('g', { transform: `translate(0 ${f(-.7 * s)})` }, parent);
    el('path', { d: `M0 ${-s * 1.3}C${s} ${-s * .8} ${s} ${s * .5} 0 ${s * .72}C${-s} ${s * .5} ${-s} ${-s * .8} 0 ${-s * 1.3}Z`, fill: p[1], stroke: p[3], 'stroke-opacity': .4, 'stroke-width': .8 }, g);
    el('path', { d: `M${-s * .05} ${-s * 1.25}C${s * .8} ${-s * .6} ${s * .7} ${s * .3} 0 ${s * .65}C${s * .5} ${-s * .1} ${s * .2} ${-s * .7} ${-s * .05} ${-s * 1.25}Z`, fill: p[0], opacity: .85 }, g);
    el('path', { d: `M${-s * .05} ${-s * 1.2}C${-s * .7} ${-s * .4} ${-s * .5} ${s * .3} 0 ${s * .6}`, fill: 'none', stroke: p[3], 'stroke-opacity': .5, 'stroke-width': .8 }, g);
    // zelene čašne listi
    [[-1, 1], [1, 1]].forEach(([sx]) =>
      el('path', { class: 'leaf-shape', d: `M0 ${s * .72}C${sx * s * 1.1} ${s * .6} ${sx * s * 1.0} ${-s * .2} ${sx * s * .45} ${-s * .25}C${sx * s * .4} ${s * .2} ${sx * s * .2} ${s * .5} 0 ${s * .72}Z` }, g));
    el('path', { class: 'leaf-shape', d: `M0 ${s * .72}C${-s * .3} ${s * .3} ${-s * .2} ${-s * .1} 0 ${-s * .3}C${s * .2} ${-s * .1} ${s * .3} ${s * .3} 0 ${s * .72}Z` }, g);
  }

  // ---- drobne vejice ----
  function drawSprig(parent, x, y, k, delay) {
    const g = el('g', { transform: `translate(${x} ${y})` }, parent);
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (-170 + (i * 160) / (n - 1) + 8 * jit(i, k)) * Math.PI / 180;
      const len = 11 + 7 * (jit(k + 3, i) + 1) / 2;
      const ex = len * Math.cos(a), ey = len * Math.sin(a);
      const d = delay + 2.0 + i * .09;
      el('line', { class: 'twig', x1: 0, y1: 0, x2: f(ex), y2: f(ey), style: `--d:${f(d)}s` }, g);
      const dot = el('g', { class: 'dot', style: `--d:${f(d + .15)}s` }, g);
      const pink = (i + k) % 3 === 0;
      el('circle', { cx: f(ex), cy: f(ey), r: f(2.2 + .9 * (jit(i, k) + 1) / 2), fill: pink ? '#f6c1d3' : '#fff', stroke: '#eab3c6', 'stroke-width': .5 }, dot);
      if (i % 2 === 0) el('circle', { cx: f(ex * .55), cy: f(ey * .55), r: 1.7, fill: '#fff', stroke: '#eab3c6', 'stroke-width': .5 }, dot);
    }
  }

  function build() {
    const tap = document.getElementById('tap');
    tap.textContent = '';
    const gGreen  = el('g', {}, tap);
    const gFill   = el('g', {}, tap);
    const gStems  = el('g', {}, tap);
    const gLeaves = el('g', {}, tap);
    const gBow    = el('g', { transform: `translate(${O.x} ${O.y})` }, tap);
    const gFlow   = el('g', {}, tap);
    let maxEnd = 0;
    const flowers = [];

    // odrezani konci stebel pod pentljo
    [[-9, 54], [0, 58], [9, 54]].forEach(([dx, dy]) =>
      el('line', { class: 'stub', x1: O.x, y1: O.y, x2: O.x + dx, y2: O.y + dy }, gStems));

    // zelenje v ozadju
    GREENS.forEach(([x, y], i) => {
      const sd = .5 + i * .25, dur = 2.2, c = curve(x, y);
      addStem(gGreen, c, sd, dur, false);
      [.45, .62, .78].forEach((t, k) => addLeaf(gGreen, c, t, (i + k) % 2 ? 1 : -1, 1.05 + .15 * k, sd + dur * t + .1, k % 2));
      addLeaf(gGreen, c, 1, 0, 1.2, sd + dur, true);
      maxEnd = Math.max(maxEnd, sd + dur + 1);
    });

    // drobne vejice
    SPRIGS.forEach(([x, y], k) => {
      const sd = 1.4 + k * .3, dur = 2.4, c = curve(x, y);
      addStem(gFill, c, sd, dur, true);
      drawSprig(gFill, x, y, k, sd + dur - 1.4);
      maxEnd = Math.max(maxEnd, sd + dur - 1.4 + 2.0 + .6 + 1);
    });

    // vrtnice
    ROSES.forEach((r, i) => {
      const sd = .3 + i * .2, dur = 2.8;
      r.bloom = sd + 1.9;
      const c = curve(r.x, r.y);
      addStem(gStems, c, sd, dur, false);
      if (i % 2 === 1) addLeaf(gLeaves, c, .6, i % 4 === 1 ? 1 : -1, .95, sd + dur * .6 + .1, i % 3 === 0);
      if (i > 5 && i % 2 === 0) addLeaf(gLeaves, c, .5, 1, .9, sd + dur * .5 + .1, true);

      const pos = el('g', { transform: `translate(${r.x} ${r.y}) rotate(${r.rot})` });
      const fl = el('g', { class: 'flower', style: `--d:${f(r.bloom)}s` }, pos);
      drawRose(fl, r);
      flowers.push({ y: r.y, node: pos });
      maxEnd = Math.max(maxEnd, r.bloom + 1.04 + 2.2);
    });

    // popki
    BUDS.forEach((b, k) => {
      const sd = 2.2 + k * .35, dur = 2.4, c = curve(b.x, b.y);
      addStem(gStems, c, sd, dur, false);
      addLeaf(gLeaves, c, .7, k % 2 ? 1 : -1, .8, sd + dur * .7 + .1, false);
      const pos = el('g', { transform: `translate(${b.x} ${b.y}) rotate(${b.rot})` });
      const fl = el('g', { class: 'flower', style: `--d:${f(sd + dur - .5)}s` }, pos);
      drawBud(fl, b);
      flowers.push({ y: b.y, node: pos });
      maxEnd = Math.max(maxEnd, sd + dur + 1.4);
    });

    // spodnje cvetove narišemo čez zgornje
    flowers.sort((a, b) => a.y - b.y).forEach(o => gFlow.appendChild(o.node));

    // pentlja
    const bow = el('g', { class: 'bow', style: '--d:2.4s' }, gBow);
    el('path', { class: 'ribbon', d: 'M0 0C-14 -26 -42 -22 -38 -2C-35 14 -12 8 0 0Z' }, bow);
    el('path', { class: 'ribbon', d: 'M0 0C14 -26 42 -22 38 -2C35 14 12 8 0 0Z' }, bow);
    el('path', { class: 'ribbon', d: 'M-2 4C-8 24 -18 36 -26 48L-12 44L-6 54C-2 36 0 22 2 6Z' }, bow);
    el('path', { class: 'ribbon', d: 'M2 4C8 24 18 36 26 48L12 44L6 54C2 36 0 22 -2 6Z' }, bow);
    el('ellipse', { class: 'ribbon-knot', rx: 7, ry: 6 }, bow);

    return maxEnd;
  }

  // ---- cvetni listi ----
  const petalColors = [['#fbd0dc', '#f09ab8'], ['#f9d9e2', '#e58fab'], ['#ffe1d2', '#f2a084'], ['#f3a6c6', '#dc5f8e']];

  function dropPetal(x, y) {
    if (reduceMotion) return;
    const p = document.createElement('i');
    const [a, b] = petalColors[Math.floor(Math.random() * petalColors.length)];
    const size = 11 + Math.random() * 8;
    p.className = 'petal';
    p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * 1.3}px;background:linear-gradient(135deg,${a},${b})`;
    document.body.appendChild(p);
    const dx = (Math.random() - .5) * 140;
    const fall = innerHeight - y + 40;
    const rot = (Math.random() - .5) * 540;
    const anim = p.animate([
      { transform: 'translate(0,0) rotate(0deg)', opacity: 0 },
      { transform: `translate(${dx * -.3}px,${fall * .25}px) rotate(${rot * .3}deg)`, opacity: .9, offset: .1 },
      { transform: `translate(${dx * .5}px,${fall * .6}px) rotate(${rot * .65}deg)`, opacity: .85, offset: .6 },
      { transform: `translate(${dx}px,${fall}px) rotate(${rot}deg)`, opacity: 0 },
    ], { duration: 5500 + Math.random() * 3000, easing: 'cubic-bezier(.3,.1,.6,1)' });
    anim.onfinish = () => p.remove();
  }

  function petalFromRandomFlower() {
    const fls = document.querySelectorAll('.flower');
    if (!fls.length) return;
    const b = fls[Math.floor(Math.random() * fls.length)].getBoundingClientRect();
    dropPetal(b.left + b.width * (.25 + Math.random() * .5), b.top + b.height * (.4 + Math.random() * .4));
  }

  // ---- potek ----
  let ready = false, readyTimer = null;

  function play() {
    ready = false;
    const body = document.body;
    body.classList.remove('swaying', 'play');
    document.querySelectorAll('.petal').forEach(p => p.remove());
    const end = build();                                 // čas, ko je rast končan
    body.style.setProperty('--note-delay', f(Math.max(end - 2.5, 4)) + 's');
    void body.offsetWidth;                               // ponovni zagon animacij
    body.classList.add('play');
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {                      // premor, potem se šopek počasi začne zibati
      ready = true;
      if (!reduceMotion) body.classList.add('swaying');
    }, (end + SWAY_PAUSE) * 1000);
  }

  play();

  setInterval(() => {
    if (ready && !document.hidden && document.querySelectorAll('.petal').length < 5) petalFromRandomFlower();
  }, 3200);

  // dotik: šopek se zazibá, nekaj listov pade
  document.addEventListener('pointerdown', () => {
    if (!ready || reduceMotion) return;
    const tap = document.getElementById('tap');
    tap.classList.remove('sway');
    void tap.getBoundingClientRect();
    tap.classList.add('sway');
    for (let i = 0; i < 6; i++) setTimeout(petalFromRandomFlower, i * 120);
  });

  // če se vrne po daljšem času, naj roža znova zacveti
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 60000) play();
  });
})();
