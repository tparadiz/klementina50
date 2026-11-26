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
    { x: 180, y: 130, R: 50, rot: -6,  pal: 'rose'    },
    { x: 108, y: 190, R: 42, rot: 14,  pal: 'powder'  },
    { x: 254, y: 186, R: 43, rot: -12, pal: 'peach'   },
    { x: 180, y: 244, R: 44, rot: 8,   pal: 'fuchsia' },
    { x: 58,  y: 268, R: 34, rot: 20,  pal: 'mauve'   },
    { x: 304, y: 268, R: 34, rot: -18, pal: 'coral'   },
    { x: 118, y: 322, R: 35, rot: -8,  pal: 'blush'   },
    { x: 244, y: 324, R: 36, rot: 16,  pal: 'rose'    },
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
  // ---- rast: steblo se riše, glava (popek) potuje po njegovem koncu ----
  const ease = (u) => .65 * u + .35 * (1 - Math.cos(Math.PI * u)) / 2;   // skoraj enakomerna rast z rahlim mehkim začetkom/koncem
  const easeInv = (v) => {                                       // obratna funkcija (bisekcija)
    let lo = 0, hi = 1;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; ease(m) < v ? lo = m : hi = m; }
    return (lo + hi) / 2;
  };
  const growTime = (sd, dur, t) => sd + dur * easeInv(t);        // kdaj konica stebla doseže točko t
  const SAMPLES = 28;

  function headTransform(c, t) {
    const p = pt(c, t);
    return `translate(${f(p.x)} ${f(p.y)}) rotate(${f((p.ang + 90) * .7)})`;
  }
  const headCss = (c, t) => {                                    // CSS zapis (z enotami) za animacije
    const p = pt(c, t);
    return `translate(${f(p.x)}px, ${f(p.y)}px) rotate(${f((p.ang + 90) * .7)}deg)`;
  };
  function animateHead(node, c, delay, dur) {                    // glava potuje po koncu stebla, enako kot se steblo riše
    if (reduceMotion) return;
    const kf = [];
    for (let i = 0; i <= SAMPLES; i++) kf.push({ transform: headCss(c, ease(i / SAMPLES)), offset: i / SAMPLES });
    node.animate(kf, { duration: dur * 1000, delay: delay * 1000, easing: 'linear', fill: 'backwards' });
  }
  // zvezna rast: fn(p, q) vrne CSS lastnosti; p = pot stebla (0..1), q = zadnja četrtina po prihodu na vrh (0..1)
  // vzorčimo gosto (vsak ~1/48 poti), brskalnik vmes linearno interpolira, zato ni vidnih skokov
  function growFrames(fn, dur, tail) {
    const N = 48, M = 10, total = dur + tail, kf = [];
    for (let i = 0; i <= N; i++) {
      const p = i / N;
      kf.push({ offset: i === 0 ? 0 : Math.min(1, easeInv(p) * dur / total), ...fn(p, 0) });
    }
    for (let j = 1; j <= M; j++) {
      const q = j / M;
      kf.push({ offset: j === M ? 1 : Math.min(1, (dur + tail * q) / total), ...fn(1, 1 - Math.pow(1 - q, 2)) });
    }
    return kf;
  }
  const clamp01 = (x) => Math.max(0, Math.min(1, x));

  function animateStem(node, delay, dur) {
    if (reduceMotion) return;
    const kf = [];
    for (let i = 0; i <= SAMPLES; i++) kf.push({ strokeDashoffset: 1 - ease(i / SAMPLES), offset: i / SAMPLES });
    node.animate(kf, { duration: dur * 1000, delay: delay * 1000, easing: 'linear', fill: 'backwards' });
  }
  function addStem(parent, c, delay, dur, thin) {
    const n = el('path', {
      class: 'stem' + (thin ? ' thin' : ''), pathLength: 1,
      d: `M${O.x} ${O.y} Q${f(c.cx)} ${f(c.cy)} ${c.tx} ${c.ty}`,
    }, parent);
    animateStem(n, delay, dur);
    return n;
  }
  function addLeaf(parent, c, t, side, scale, delay, alt) {
    const p = pt(c, t);
    const outer = el('g', { transform: `translate(${f(p.x)} ${f(p.y)}) rotate(${f(p.ang + side * 48)}) scale(${f(scale)})` }, parent);
    const inner = el('g', { class: 'leaf', style: `--d:${f(delay)}s` }, outer);
    el('path', { class: 'leaf-shape' + (alt ? ' alt' : ''), d: 'M0 0C6 -7 20 -8 30 0C20 8 6 7 0 0Z' }, inner);
    el('path', { class: 'leaf-rib', d: 'M2 0L26 0' }, inner);
  }

  // ---- vrtnica ----
  const mix = (hex, t, to = 255) => '#' + [1, 3, 5].map(i =>
    Math.round(parseInt(hex.substr(i, 2), 16) * (1 - t) + to * t).toString(16).padStart(2, '0')).join('');

  // preliv za vsak list: temno ob dnu, svetlo na robu
  function addGradients(defs) {
    for (const name in PAL) {
      const p = PAL[name];
      for (let j = 0; j < 4; j++) {
        const g = el('linearGradient', { id: `g-${name}-${j}`, x1: 0, y1: 1, x2: 0, y2: 0 }, defs);
        el('stop', { offset: 0,   'stop-color': p[Math.min(j + 1, 3)] }, g);
        el('stop', { offset: .5,  'stop-color': p[j] }, g);
        el('stop', { offset: 1,   'stop-color': mix(p[j], j === 0 ? .35 : .22) }, g);
      }
    }
  }

  // cvetni list, obrnjen navzgor, dolžine h in širine w; zgornji rob je rahlo zavihan
  function petal(parent, name, j, w, h, off, ang, shade) {
    const p = PAL[name];
    const g = el('g', { transform: `rotate(${f(ang)}) translate(0 ${f(-off)})` }, parent);
    el('path', {
      d: `M0 0C${f(-.8 * w)} ${f(-.15 * h)} ${f(-1.05 * w)} ${f(-.7 * h)} ${f(-.6 * w)} ${f(-.96 * h)}` +
         `Q${f(-.2 * w)} ${f(-1.1 * h)} 0 ${f(-1.04 * h)}Q${f(.25 * w)} ${f(-1.12 * h)} ${f(.6 * w)} ${f(-.96 * h)}` +
         `C${f(1.05 * w)} ${f(-.7 * h)} ${f(.8 * w)} ${f(-.15 * h)} 0 0Z`,
      fill: `url(#g-${name}-${j})`, stroke: p[3], 'stroke-opacity': .4, 'stroke-width': .7, 'stroke-linejoin': 'round',
    }, g);
    // svetel zavihan rob
    el('path', {
      d: `M${f(-.6 * w)} ${f(-.96 * h)}Q${f(-.2 * w)} ${f(-1.1 * h)} 0 ${f(-1.04 * h)}Q${f(.25 * w)} ${f(-1.12 * h)} ${f(.6 * w)} ${f(-.96 * h)}`,
      fill: 'none', stroke: '#fff', 'stroke-opacity': .5, 'stroke-width': f(Math.max(.9, h * .035)), 'stroke-linecap': 'round',
    }, g);
    // fine žilice
    el('path', {
      d: `M0 ${f(-.12 * h)}L${f(-.18 * w)} ${f(-.75 * h)}M0 ${f(-.12 * h)}L${f(.2 * w)} ${f(-.78 * h)}`,
      fill: 'none', stroke: p[3], 'stroke-opacity': .16, 'stroke-width': .6, 'stroke-linecap': 'round',
    }, g);
    // senca, ki jo meče zgornji sloj
    if (shade) el('ellipse', { cx: 0, cy: f(-.12 * h), rx: f(.55 * w), ry: f(.22 * h), fill: p[3], opacity: .18 }, g);
  }

  function drawRose(parent, r) {
    const p = PAL[r.pal];
    const R = r.R;
    const sh = el('g', { class: 'layer', style: `--d:${f(r.bloom + .05 + 4 * .1)}s` }, parent);
    el('ellipse', { cx: 0, cy: f(R * .05), rx: f(R * .78), ry: f(R * .74), fill: p[3], opacity: .28 }, sh);

    // zunaj široki, odprti listi; proti sredini vse bolj zaprti in visoki (kot pravi cvet vrtnice)
    const layers = [
      { n: 5, h: .98, w: .50, off: .05, a0: 0,  sc: 1 },
      { n: 5, h: .80, w: .44, off: .07, a0: 36, sc: 1 },
      { n: 4, h: .62, w: .38, off: .08, a0: 14, sc: .9 },
      { n: 3, h: .46, w: .32, off: .08, a0: 50, sc: .85 },
      { n: 3, h: .30, w: .24, off: .05, a0: 80, sc: .8 },
    ];
    layers.forEach((L, j) => {
      const g = el('g', { class: 'layer', style: `--d:${f(r.bloom + .05 + (4 - j) * .1)}s` }, parent);
      const base = L.a0 + r.R * 11;
      const gi = Math.min(j, 3);
      for (let k = 0; k < L.n; k++) {
        const ang = base + (k * 360) / L.n + 8 * jit(k + 2, j + r.R);
        const s = 1 + .07 * jit(k + 5, j + r.R);
        petal(g, r.pal, gi, R * L.w * s, R * L.h * s, R * L.off, ang, j > 0);
      }
      if (j === 4) {                                   // tesno zvit sredinski popek
        const cr = R * .13;
        el('circle', { r: f(cr), fill: p[3] }, g);
        el('path', { d: `M${f(-cr)} 0A${f(cr)} ${f(cr)} 0 0 1 ${f(cr)} 0`, fill: p[2], opacity: .95 }, g);
        el('path', { d: `M${f(-cr * .9)} ${f(cr * .15)}Q0 ${f(-cr * 1.2)} ${f(cr * .9)} ${f(cr * .15)}`, fill: 'none', stroke: mix(p[0], .35), 'stroke-width': f(R * .03), 'stroke-linecap': 'round', opacity: .85 }, g);
        el('path', { d: `M${f(-cr * .5)} ${f(cr * .4)}Q0 ${f(-cr * .3)} ${f(cr * .5)} ${f(cr * .4)}`, fill: 'none', stroke: p[3], 'stroke-width': f(R * .025), 'stroke-linecap': 'round', opacity: .8 }, g);
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
    addGradients(el('defs', {}, tap));
    const gGreen  = el('g', {}, tap);
    const gFill   = el('g', {}, tap);
    const gStems  = el('g', {}, tap);
    const gLeaves = el('g', {}, tap);
    const gBow    = el('g', { transform: `translate(${O.x} ${O.y})` }, tap);
    const gFlow   = el('g', {}, tap);
    let maxEnd = 0;

    // odrezani konci stebel pod pentljo
    [[-9, 54], [0, 58], [9, 54]].forEach(([dx, dy]) =>
      el('line', { class: 'stub', x1: O.x, y1: O.y, x2: O.x + dx, y2: O.y + dy }, gStems));

    // glave rož: spodnje narišemo čez zgornje (vrstni red v DOM-u je enak že od začetka)
    const posOf = new Map();
    [...ROSES, ...BUDS].sort((p, q) => p.y - q.y).forEach(o => posOf.set(o, el('g', {}, gFlow)));

    // zelenje v ozadju
    GREENS.forEach(([x, y], i) => {
      const sd = .5 + i * .25, dur = 2.8, c = curve(x, y);
      addStem(gGreen, c, sd, dur, false);
      [.45, .62, .78].forEach((t, k) => addLeaf(gGreen, c, t, (i + k) % 2 ? 1 : -1, 1.05 + .15 * k, growTime(sd, dur, t) + .1, k % 2));
      addLeaf(gGreen, c, 1, 0, 1.2, sd + dur, true);
      maxEnd = Math.max(maxEnd, sd + dur + 1);
    });

    // drobne vejice
    SPRIGS.forEach(([x, y], k) => {
      const sd = 1.4 + k * .3, dur = 3.0, c = curve(x, y);
      addStem(gFill, c, sd, dur, true);
      drawSprig(gFill, x, y, k, sd + dur - 2.0);
      maxEnd = Math.max(maxEnd, sd + dur + .6 + 1);
    });

    // rast po poti stebla v 8 korakih (τk = čas, ko konica stebla doseže k/8 poti):
    // 1/8 samo steblo · 2/8 droben popek · 3/8 in 4/8 popek se poveča · 5/8 namesto popka majhen cvet ·
    // 6/8 in 7/8 cvet zraste · 8/8 cvet na 3/4 · na vrhu še zadnja 1/4
    const TAIL = 1.3;                                          // zadnja četrtina rasti po prihodu na vrh
    const tau = (dur, k) => dur * easeInv(k / 8);

    ROSES.forEach((r, i) => {
      const sd = .3 + i * .35, dur = 5.6;
      const T = (k) => tau(dur, k);
      r.bloom = sd + T(3.36);                                  // cvet nastane ob ~42 % poti
      const c = curve(r.x, r.y);
      addStem(gStems, c, sd, dur, false);
      if (i % 2 === 1) addLeaf(gLeaves, c, .6, i % 4 === 1 ? 1 : -1, .95, growTime(sd, dur, .6) + .1, i % 3 === 0);
      if (i > 5 && i % 2 === 0) addLeaf(gLeaves, c, .5, 1, .9, growTime(sd, dur, .5) + .1, true);

      const pos = posOf.get(r);
      pos.setAttribute('transform', headTransform(c, 1));      // končni položaj (tudi brez animacij)
      animateHead(pos, c, sd, dur);
      const bud = el('g', { opacity: 0 }, pos);                // popek je ob cvetu, da ne podeduje njegove velikosti
      drawBud(bud, { s: r.R * .2, pal: r.pal });
      const fl = el('g', { class: 'flower', style: 'animation:none' }, pos);
      if (!reduceMotion) {
        // popek: vznikne ob 1/8 poti, zvezno raste, ob ~45 % poti se prelije v cvet
        bud.animate(growFrames((p) => ({
          opacity: clamp01((p - .125) / .06) * (1 - clamp01((p - .42) / .09)),
          transform: `scale(${p < .125 ? 0 : (.3 + .8 * clamp01((p - .125) / .36)).toFixed(3)})`,
        }), dur, 0.01), { duration: dur * 1000, delay: sd * 1000, fill: 'both' });
        // cvet: majhen nastane ob ~42 % poti, zvezno raste do 3/4 ob prihodu na vrh, nato še zadnja četrtina
        fl.animate(growFrames((p, q) => {
          const x = clamp01((p - .42) / .58);
          const v = p < .42 ? .05 : .12 + .63 * Math.pow(x, .85);
          return { transform: `scale(${(v + (1 - v) * q).toFixed(3)})` };
        }, dur, TAIL), { duration: (dur + TAIL) * 1000, delay: sd * 1000, fill: 'backwards' });
      }
      drawRose(fl, r);
      maxEnd = Math.max(maxEnd, sd + dur + TAIL + .4);
    });

    // stranski popki: ista pot, popek le postopno raste
    BUDS.forEach((b, k) => {
      const sd = 1.8 + k * .4, dur = 5.0, c = curve(b.x, b.y);
      const T = (n) => tau(dur, n);
      addStem(gStems, c, sd, dur, false);
      addLeaf(gLeaves, c, .7, k % 2 ? 1 : -1, .8, growTime(sd, dur, .7) + .1, false);
      const pos = posOf.get(b);
      pos.setAttribute('transform', headTransform(c, 1));
      animateHead(pos, c, sd, dur);
      const fl = el('g', { class: 'flower', style: 'animation:none' }, pos);
      drawBud(fl, b);
      if (!reduceMotion) fl.animate(growFrames((p) => ({
        opacity: clamp01((p - .125) / .06),
        transform: `scale(${p < .125 ? 0 : (.25 + .75 * Math.pow((p - .125) / .875, .9)).toFixed(3)})`,
      }), dur, 0.01), { duration: dur * 1000, delay: sd * 1000, fill: 'backwards' });
      maxEnd = Math.max(maxEnd, sd + dur + 1);
    });

    // pentlja
    const bow = el('g', { class: 'bow', style: '--d:1.6s' }, gBow);
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
    if (reduceMotion || document.querySelectorAll('.petal').length >= 8) return;
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

  // ---- dotik: šopek na hitro zdrhti (desno, levo, desno, levo) in se ustavi; nato pade nekaj listov ----
  // gre za hitro, dobro dušeno vzmet: vsak dotik doda le sunek, zato ni skokov, tudi če klikaš hitro
  const tapEl = document.getElementById('tap');
  const K = 1900, C = 13, MAX_ANGLE = 3.2, KICK = 125, MAX_SPEED = 170;   // ~7 nihajev/s, umiri se v ~0,5 s
  const spring = { a: 0, v: 0, on: false, t: 0 };

  function springStep(now) {
    const dt = Math.min((now - spring.t) / 1000, .05);
    spring.t = now;
    const n = 4, h = dt / n;                             // podkoraki za stabilnost
    for (let i = 0; i < n; i++) {
      spring.v += (-K * spring.a - C * spring.v) * h;
      spring.a += spring.v * h;
    }
    spring.a = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, spring.a));
    if (Math.abs(spring.a) < .02 && Math.abs(spring.v) < 1) {
      spring.a = spring.v = 0; spring.on = false;
      tapEl.style.transform = '';
      return;
    }
    tapEl.style.transform = `rotate(${spring.a.toFixed(3)}deg)`;
    requestAnimationFrame(springStep);
  }
  function shake() {
    spring.v = Math.min(MAX_SPEED, spring.v + KICK);     // vedno najprej desno
    if (!spring.on) { spring.on = true; spring.t = performance.now(); requestAnimationFrame(springStep); }
  }

  let lastTapAt = 0;
  document.addEventListener('pointerdown', () => {
    if (!ready || reduceMotion) return;
    shake();
    const now = performance.now();
    if (now - lastTapAt < 500) return;                   // listi le občasno, ne ob vsakem hitrem kliku
    lastTapAt = now;
    for (let i = 0; i < 4; i++) setTimeout(petalFromRandomFlower, 120 + i * 170);
  });

  // če se vrne po daljšem času, naj roža znova zacveti
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 60000) play();
  });
})();
