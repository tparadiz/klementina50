(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const ORIGIN = { x: 180, y: 560 };          // kjer so stebla zvezana
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // barve vrtnic: [zunanji list, srednji, notranji, najglobji]
  const PAL = {
    rose:    ['#f6c1d3', '#ee93b4', '#dc5f8e', '#b53767'],
    powder:  ['#f9d9e2', '#f2b8cb', '#e58fab', '#c95f82'],
    peach:   ['#ffe1d2', '#fbc3a9', '#f2a084', '#d9745d'],
    mauve:   ['#ebc6db', '#d9a0c2', '#bd76a3', '#94517f'],
    coral:   ['#f9b7b9', '#f08b94', '#dd5f72', '#b53a55'],
    blush:   ['#fdeef1', '#f8d3dc', '#edafc0', '#d5849e'],
    fuchsia: ['#f3a6c6', '#e56aa0', '#cc3c80', '#9e1f5e'],
  };

  // x, y = sredina cveta, R = velikost, rot = zasuk
  const ROSES = [
    { x: 180, y: 150, R: 46, rot: -6,  pal: 'rose'    },
    { x: 108, y: 207, R: 36, rot: 14,  pal: 'powder'  },
    { x: 254, y: 200, R: 38, rot: -12, pal: 'peach'   },
    { x: 62,  y: 302, R: 30, rot: 20,  pal: 'mauve'   },
    { x: 300, y: 296, R: 31, rot: -18, pal: 'coral'   },
    { x: 135, y: 302, R: 34, rot: 8,   pal: 'blush'   },
    { x: 228, y: 312, R: 33, rot: -4,  pal: 'fuchsia' },
  ];

  const el = (name, attrs = {}, parent) => {
    const n = document.createElementNS(NS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  };
  const jit = (a, b) => Math.sin(a * 12.9898 + b * 78.233);   // deterministično "naključje"

  function drawRose(parent, r) {
    const p = PAL[r.pal];
    const R = r.R;
    // osnova (senca med listi)
    const baseG = el('g', { class: 'layer', style: `--d:${(r.bloom + 1.04).toFixed(2)}s` }, parent);
    el('circle', { r: R * 0.8, fill: p[3], opacity: .3 }, baseG);

    const layers = [
      { n: 6, d: .55, r: .46 },
      { n: 5, d: .38, r: .40 },
      { n: 4, d: .22, r: .32 },
      { n: 3, d: .10, r: .24 },
    ];
    layers.forEach((L, j) => {
      const g = el('g', { class: 'layer', style: `--d:${(r.bloom + .2 + (3 - j) * .28).toFixed(2)}s` }, parent);
      for (let k = 0; k < L.n; k++) {
        const ang = (j * 29 + (k * 360) / L.n) * Math.PI / 180;
        const rad = R * L.r * (1 + .06 * jit(k + 1, j + r.R));
        el('circle', {
          cx: (R * L.d * Math.cos(ang)).toFixed(2),
          cy: (R * L.d * Math.sin(ang)).toFixed(2),
          r: rad.toFixed(2),
          fill: p[j],
          stroke: p[3],
          'stroke-opacity': .35,
          'stroke-width': .8,
        }, g);
      }
      if (j === 3) {                                  // spirala v sredini
        let d = '';
        for (let t = 0; t < 5.5 * Math.PI; t += .35) {
          const rr = R * (.015 + .035 * t / Math.PI);
          d += (d ? 'L' : 'M') + (rr * Math.cos(t)).toFixed(2) + ' ' + (rr * Math.sin(t)).toFixed(2);
        }
        el('path', { d, fill: 'none', stroke: p[3], 'stroke-width': (R * .03).toFixed(2), 'stroke-linecap': 'round', opacity: .7 }, g);
      }
    });
  }

  function build() {
    const tap = document.getElementById('tap');
    tap.textContent = '';
    const stems = el('g', {}, tap);
    const leaves = el('g', {}, tap);
    const bowG = el('g', { transform: `translate(${ORIGIN.x} ${ORIGIN.y})` }, tap);
    const flowers = el('g', {}, tap);

    // odrezani konci stebel pod pentljo
    [[-9, 54], [0, 58], [9, 54]].forEach(([dx, dy]) =>
      el('line', { class: 'stub', x1: ORIGIN.x, y1: ORIGIN.y, x2: ORIGIN.x + dx, y2: ORIGIN.y + dy }, stems));

    ROSES.forEach((r, i) => {
      const sd = .3 + i * .2;                         // začetek rasti stebla
      r.bloom = sd + 1.5;                             // začetek odpiranja cveta

      const cx = ORIGIN.x + (r.x - ORIGIN.x) * .2;
      const cy = ORIGIN.y - (ORIGIN.y - r.y) * .55;
      el('path', {
        class: 'stem', pathLength: 1,
        d: `M${ORIGIN.x} ${ORIGIN.y} Q${cx} ${cy} ${r.x} ${r.y}`,
        style: `--d:${sd.toFixed(2)}s`,
      }, stems);

      // listi ob steblu
      [.42, .66].forEach((t, k) => {
        if (i > 0 && k === 1 && i % 2 === 0) return;   // malo manj listov
        const px = (1 - t) ** 2 * ORIGIN.x + 2 * (1 - t) * t * cx + t * t * r.x;
        const py = (1 - t) ** 2 * ORIGIN.y + 2 * (1 - t) * t * cy + t * t * r.y;
        const tx = 2 * (1 - t) * (cx - ORIGIN.x) + 2 * t * (r.x - cx);
        const ty = 2 * (1 - t) * (cy - ORIGIN.y) + 2 * t * (r.y - cy);
        const side = (i + k) % 2 ? 1 : -1;
        const ang = Math.atan2(ty, tx) * 180 / Math.PI + side * 48;
        const s = .9 + .15 * (jit(i, k) + 1) / 2;
        const outer = el('g', { transform: `translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${s.toFixed(2)})` }, leaves);
        const inner = el('g', { class: 'leaf', style: `--d:${(sd + 2.2 * t + .1).toFixed(2)}s` }, outer);
        el('path', { class: 'leaf-shape', d: 'M0 0C6 -7 20 -8 30 0C20 8 6 7 0 0Z' }, inner);
        el('path', { class: 'leaf-rib', d: 'M2 0L26 0' }, inner);
      });

      // cvet
      const pos = el('g', { transform: `translate(${r.x} ${r.y}) rotate(${r.rot})` }, flowers);
      const fl = el('g', { class: 'flower', style: `--d:${r.bloom.toFixed(2)}s` }, pos);
      drawRose(fl, r);
    });

    // pentlja
    const bow = el('g', { class: 'bow', style: '--d:1.9s' }, bowG);
    el('path', { class: 'ribbon', d: 'M0 0C-14 -26 -42 -22 -38 -2C-35 14 -12 8 0 0Z' }, bow);
    el('path', { class: 'ribbon', d: 'M0 0C14 -26 42 -22 38 -2C35 14 12 8 0 0Z' }, bow);
    el('path', { class: 'ribbon', d: 'M-2 4C-8 24 -18 36 -26 48L-12 44L-6 54C-2 36 0 22 2 6Z' }, bow);
    el('path', { class: 'ribbon', d: 'M2 4C8 24 18 36 26 48L12 44L6 54C2 36 0 22 -2 6Z' }, bow);
    el('ellipse', { class: 'ribbon-knot', rx: 7, ry: 6 }, bow);
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
  let ready = false, idleTimer = null, readyTimer = null;

  function play() {
    ready = false;
    document.body.classList.remove('swaying', 'play');
    document.querySelectorAll('.petal').forEach(p => p.remove());
    build();
    void document.body.offsetWidth;                  // ponovni zagon animacij
    document.body.classList.add('play');
    clearTimeout(readyTimer);
    readyTimer = setTimeout(() => {
      ready = true;
      if (!reduceMotion) document.body.classList.add('swaying');
    }, 6500);
  }

  play();

  clearInterval(idleTimer);
  idleTimer = setInterval(() => {
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
