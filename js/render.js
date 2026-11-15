// Zoo Project — rendu isométrique
(function () {
  const { W, H, EX, EY } = Z;
  const SP = Z.SPECIES, BL = Z.BUILDINGS, idx = Z.idx, fmt = n => Z.fmt(n);
  const HW = 32, HH = 16;                      // demi-largeur et demi-hauteur d'une case à l'écran
  let OX = H * HW, rot = 0; const GW = (W + H) * HW, GH = (W + H) * HH; // décalage et taille de la couche de sol
  // rotation de la caméra par quarts de tour : on fait tourner les coordonnées de case avant projection
  const rx = (x, y) => (rot === 0 ? x : rot === 1 ? y : rot === 2 ? W - x : H - y);
  const ry = (x, y) => (rot === 0 ? y : rot === 1 ? W - x : rot === 2 ? H - y : x);
  const px = (x, y) => (rx(x, y) - ry(x, y)) * HW, py = (x, y) => (rx(x, y) + ry(x, y)) * HH, dep = (x, y) => rx(x, y) + ry(x, y);
  const cam = Z.cam = { x: px(EX, H - 8), y: py(EX, H - 8), z: 1 };
  let cv, ctx, dpr = 1, cw = 0, ch = 0;
  const SS = window.innerWidth < 700 ? 1 : 1.5;
  const ground = document.createElement('canvas'); ground.width = GW * SS; ground.height = (GH + 24) * SS;
  const g = ground.getContext('2d'); Z.groundCanvas = ground; Z.groundSize = { w: GW, h: GH };
  Z.viewRect = () => ({ x: cam.x - cw / 2 / cam.z + OX, y: cam.y - ch / 2 / cam.z, w: cw / cam.z, h: ch / cam.z });
  Z.groundPos = (x, y) => ({ x: px(x, y) + OX, y: py(x, y) });
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
  const emoji = (c, ch, x, y, s) => { c.font = s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(ch, x, y); };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // losange couvrant le rectangle de cases (x, y, w, h), éventuellement surélevé de `up` pixels
  function poly(c, x, y, w, h, up) { up = up || 0; c.beginPath(); c.moveTo(px(x, y), py(x, y) - up); c.lineTo(px(x + w, y), py(x + w, y) - up); c.lineTo(px(x + w, y + h), py(x + w, y + h) - up); c.lineTo(px(x, y + h), py(x, y + h) - up); c.closePath(); }
  function box(c, x, y, w, h, up, top, left, right) {
    const cs = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(q => [px(q[0], q[1]), py(q[0], q[1])]); let si = 0; for (let i = 1; i < 4; i++) if (cs[i][1] > cs[si][1]) si = i;
    const a = cs[(si + 1) % 4], b = cs[(si + 3) % 4], L = a[0] < b[0] ? a : b, Rr = a[0] < b[0] ? b : a;
    const sx = cs[si][0], sy = cs[si][1], wx = L[0], wy = L[1], ex = Rr[0], ey = Rr[1]; box.door = [(wx + sx) / 2, (wy + sy) / 2]; box.win = [(sx + ex) / 2, (sy + ey) / 2];
    c.fillStyle = left; c.beginPath(); c.moveTo(wx, wy); c.lineTo(sx, sy); c.lineTo(sx, sy - up); c.lineTo(wx, wy - up); c.closePath(); c.fill();
    c.fillStyle = right; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(ex, ey - up); c.lineTo(sx, sy - up); c.closePath(); c.fill();
    c.fillStyle = top; poly(c, x, y, w, h, up); c.fill();
  }
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = Math.min(255, (n >> 16) * f) | 0, gg = Math.min(255, ((n >> 8) & 255) * f) | 0, b = Math.min(255, (n & 255) * f) | 0; return 'rgb(' + r + ',' + gg + ',' + b + ')'; };

  Z.iso = { px, py, box, poly, shade, emoji, rr };
  Z.initRender = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize); };
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cw = window.innerWidth; ch = window.innerHeight; cv.width = cw * dpr; cv.height = ch * dpr; clampCam(); }
  function clampCam() { cam.z = Z.clamp(cam.z, .3, 2.6); cam.x = Z.clamp(cam.x, -OX, GW - OX); cam.y = Z.clamp(cam.y, 0, GH); }
  Z.clampCam = clampCam;
  Z.toWorld = (sx, sy) => ({ x: (sx - cw / 2) / cam.z + cam.x, y: (sy - ch / 2) / cam.z + cam.y });
  Z.toTileF = (sx, sy) => { const w = Z.toWorld(sx, sy), u = (w.y / HH + w.x / HW) / 2, v = (w.y / HH - w.x / HW) / 2; return rot === 0 ? { x: u, y: v } : rot === 1 ? { x: W - v, y: u } : rot === 2 ? { x: W - u, y: H - v } : { x: v, y: H - u }; };
  Z.rotate = function (dir) { const c = Z.toTileF(cw / 2, ch / 2); rot = (rot + dir + 4) % 4; OX = (rot % 2 ? W : H) * HW; Z.groundDirty = true; Z.focus(c.x, c.y); };
  Z.toTile = (sx, sy) => { const t = Z.toTileF(sx, sy); return { x: Math.floor(t.x), y: Math.floor(t.y) }; };
  Z.focus = (tx, ty) => { cam.x = px(tx, ty); cam.y = py(tx, ty); clampCam(); };
  Z.camToGround = (gx, gy) => { cam.x = gx - OX; cam.y = gy; clampCam(); };

  const DEFPAL = { g: ['#84c25a', '#8bc960', '#7fbd55'], tuft: '#6fae49', out: '#2f6a30', sky: '#3c7a3a', trees: ['🌳', '🌳', '🌲'] };
  const pal = () => (Z.mapDef ? Z.mapDef().pal : DEFPAL);

  // ----- couche statique : sol, eau, allées, sols d'enclos -----
  const noise = (x, y) => Math.sin(x * .31 + 1.7) * Math.cos(y * .27 + .6) * .55 + Math.sin((x + y) * .13 + 2.1) * .45;
  const line = (c, x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  const rock = (c, x, y, k) => { c.fillStyle = '#8f9296'; c.beginPath(); c.moveTo(x - 6 * k, y); c.lineTo(x - 4 * k, y - 6 * k); c.lineTo(x + 2 * k, y - 8 * k); c.lineTo(x + 7 * k, y - 3 * k); c.lineTo(x + 6 * k, y); c.closePath(); c.fill(); c.fillStyle = '#b4b7ba'; c.beginPath(); c.moveTo(x - 4 * k, y - 6 * k); c.lineTo(x + 2 * k, y - 8 * k); c.lineTo(x, y - 3 * k); c.closePath(); c.fill(); };
  const bush = (c, x, y, k, col) => { [[-5, -4, 5], [4, -4, 5], [0, -8, 6]].forEach((q, i) => { c.fillStyle = shade(col, i === 2 ? 1.12 : 1 - i * .08); c.beginPath(); c.arc(x + q[0] * k, y + q[1] * k, q[2] * k, 0, 7); c.fill(); }); };
  const blades = (c, x, y, k, col, n) => { c.strokeStyle = col; c.lineWidth = 1.3; c.lineCap = 'round'; for (let i = 0; i < n; i++) line(c, x + (i - n / 2) * 2.4 * k, y, x + (i - n / 2) * 3.4 * k, y - (5 + (i % 2) * 3) * k); };
  // décor d'un enclos selon l'habitat : touffes, rochers, buissons, glaçons, fougères
  function deco(c, biome, x, y, v, r) {
    const k = .7 + v * 1.6;
    if (biome === 'savane') { if (r < .75) blades(c, x, y, k, '#b3963f', 5); else rock(c, x, y, k * .8); }
    else if (biome === 'foret') { if (r < .6) bush(c, x, y, k * .8, '#3f8f45'); else if (r < .85) blades(c, x, y, k, '#2f7d3a', 5); else { c.fillStyle = '#f2ede0'; c.fillRect(x - 1, y - 5, 2, 5); c.fillStyle = '#d84a3a'; c.beginPath(); c.arc(x, y - 5, 3.5, Math.PI, 0); c.fill(); } }
    else if (biome === 'montagne') { rock(c, x, y, k * (r < .5 ? 1.2 : .7)); if (r > .7) blades(c, x + 8, y, k * .7, '#6f8f5a', 3); }
    else if (biome === 'aquatique') { if (r < .7) blades(c, x, y, k * 1.2, '#5a9a4a', 4); else rock(c, x, y, k * .7); }
    else if (biome === 'polaire') { c.fillStyle = '#bfe2f2'; c.beginPath(); c.moveTo(x - 6 * k, y); c.lineTo(x - 3 * k, y - 8 * k); c.lineTo(x + 5 * k, y - 6 * k); c.lineTo(x + 7 * k, y); c.closePath(); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - 3 * k, y - 8 * k); c.lineTo(x + 5 * k, y - 6 * k); c.lineTo(x + 1 * k, y - 3 * k); c.closePath(); c.fill(); }
    else if (biome === 'desert') { if (r < .5) tree(c, '🌵', x, y, k * .42, r); else if (r < .8) rock(c, x, y, k * .8); else blades(c, x, y, k, '#a88a4a', 3); }
    else { c.strokeStyle = '#3f8f45'; c.lineWidth = 1.6; c.lineCap = 'round'; for (let i = 0; i < 6; i++) { const a = -Math.PI * (.15 + i * .14); c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a) * 5 * k, y + Math.sin(a) * 9 * k, x + Math.cos(a) * 10 * k, y + Math.sin(a) * 6 * k); c.stroke(); } }
  }
  function pool(c, x0, y0, pw, ph, bank) { c.fillStyle = bank; poly(c, x0 - .16, y0 - .16, pw + .32, ph + .32); c.fill(); c.fillStyle = '#3f9bd0'; poly(c, x0, y0, pw, ph); c.fill(); c.fillStyle = '#62b6e2'; poly(c, x0 + pw * .12, y0 + ph * .12, pw * .76, ph * .76); c.fill(); c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.2; const mx = px(x0 + pw / 2, y0 + ph / 2), my = py(x0 + pw / 2, y0 + ph / 2); line(c, mx - 10, my - 2, mx + 2, my - 2); line(c, mx - 2, my + 4, mx + 9, my + 4); }
  function drawGround() {
    const S = Z.S, P = pal(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ground.width, ground.height); g.setTransform(SS, 0, 0, SS, OX * SS, 0);
    // socle de terre : les deux bords visibles de la carte ont une épaisseur
    { const cs = [[0, 0], [W, 0], [W, H], [0, H]].map(q => [px(q[0], q[1]), py(q[0], q[1])]); let si = 0; for (let i = 1; i < 4; i++) if (cs[i][1] > cs[si][1]) si = i; const a = cs[(si + 1) % 4], b = cs[(si + 3) % 4], f = cs[si], T = 20;
      for (const [q, col] of [[a[0] < b[0] ? a : b, '#7a5a3a'], [a[0] < b[0] ? b : a, '#5f452c']]) { g.fillStyle = col; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(f[0], f[1]); g.lineTo(f[0], f[1] + T); g.lineTo(q[0], q[1] + T); g.closePath(); g.fill(); g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(q[0], q[1] + T * .55); g.lineTo(f[0], f[1] + T * .55); g.lineTo(f[0], f[1] + T); g.lineTo(q[0], q[1] + T); g.closePath(); g.fill(); } }
    const wat = (i, j) => Z.inb(i, j) && S.ground[idx(i, j)] === 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hash(x, y), t = S.ground[idx(x, y)], cx = px(x + .5, y + .5), cy = py(x + .5, y + .5);
      if (t === 2) {
        const shore = !wat(x - 1, y) || !wat(x + 1, y) || !wat(x, y - 1) || !wat(x, y + 1);
        g.fillStyle = shore ? '#63b8e0' : h < .5 ? '#3f97cc' : '#4aa0d2'; poly(g, x - .02, y - .02, 1.04, 1.04); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.75)'; g.lineWidth = 2.2; g.beginPath();
        if (!wat(x, y - 1)) { g.moveTo(px(x, y), py(x, y)); g.lineTo(px(x + 1, y), py(x + 1, y)); } if (!wat(x + 1, y)) { g.moveTo(px(x + 1, y), py(x + 1, y)); g.lineTo(px(x + 1, y + 1), py(x + 1, y + 1)); }
        if (!wat(x, y + 1)) { g.moveTo(px(x + 1, y + 1), py(x + 1, y + 1)); g.lineTo(px(x, y + 1), py(x, y + 1)); } if (!wat(x - 1, y)) { g.moveTo(px(x, y + 1), py(x, y + 1)); g.lineTo(px(x, y), py(x, y)); }
        g.stroke(); continue;
      }
      // herbe : teinte qui varie en douceur d'une zone à l'autre, sans damier
      g.fillStyle = shade(P.g[1], 1 + .075 * noise(x, y) + (h - .5) * .03); poly(g, x - .02, y - .02, 1.04, 1.04); g.fill();
      if (h > .72) blades(g, cx - 8 + h * 14, cy + 2 - h * 4, .7, P.tuft, 3);
      else if (h < .05 && t === 0) { const fx = cx - 6 + h * 200, fc = ['#ffffff', '#ffd84a', '#f48aa8'][Math.floor(h * 60)]; for (let i = 0; i < 3; i++) { g.fillStyle = '#4a8f3f'; g.fillRect(fx + i * 5, cy - 3 + (i % 2) * 2, 1, 4); g.fillStyle = fc; g.beginPath(); g.arc(fx + i * 5 + .5, cy - 4 + (i % 2) * 2, 1.9, 0, 7); g.fill(); } }
      else if (h > .05 && h < .075) { g.fillStyle = 'rgba(120,125,120,.7)'; g.beginPath(); g.ellipse(cx + 5, cy, 3, 1.8, 0, 0, 7); g.fill(); }
    }
    for (const e of S.enclosures) {
      const b = Z.BIOMES[e.biome];
      for (let j = e.y; j < e.y + e.h; j++) for (let i = e.x; i < e.x + e.w; i++) { g.fillStyle = shade(b.color, 1 + .05 * noise(i * 1.7, j * 1.7) + (hash(i + 7, j + 3) - .5) * .04); poly(g, i - .02, j - .02, 1.04, 1.04); g.fill(); }
      g.strokeStyle = 'rgba(0,0,0,.13)'; g.lineWidth = 7; poly(g, e.x + .08, e.y + .08, e.w - .16, e.h - .16); g.stroke();
      if (e.biome === 'aquatique' || e.biome === 'polaire') {
        const aq = e.biome === 'aquatique', pw = e.w * (aq ? .62 : .45), ph = e.h * (aq ? .55 : .45), x0 = e.x + (aq ? (e.w - pw) / 2 : e.w - pw - .3), y0 = e.y + (aq ? (e.h - ph) / 2 : e.h - ph - .3);
        pool(g, x0, y0, pw, ph, aq ? '#c9bd86' : '#d5e8f2');
      }
      if (e.up.bassin && e.biome !== 'aquatique' && e.biome !== 'polaire') pool(g, e.x + e.w * .56, e.y + e.h * .56, e.w * .34, e.h * .34, '#b8ab7a');
      const dens = e.up.veg ? .34 : .14, cells = [];
      for (let j = e.y; j < e.y + e.h; j++) for (let i = e.x; i < e.x + e.w; i++) { const hh = hash(i * 3 + e.id, j * 5); if (hh < dens) cells.push([i + .25 + hash(i, j * 2) * .5, j + .25 + hash(i * 2, j) * .5, hh / dens * .3, hash(j, i)]); }
      cells.sort((p, q) => dep(p[0], p[1]) - dep(q[0], q[1]));
      for (const q of cells) deco(g, e.biome, px(q[0], q[1]), py(q[0], q[1]), q[2], q[3]);
    }
    const pth = (i, j) => Z.inb(i, j) && S.ground[idx(i, j)] === 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (S.ground[idx(x, y)] !== 1) continue;
      const br = S.br && S.br[idx(x, y)], h = hash(x, y);
      g.fillStyle = br ? '#b08a5a' : shade(Z.reach[idx(x, y)] ? '#e6d4aa' : '#cbbf9f', 1 + (h - .5) * .05); poly(g, x - .02, y - .02, 1.04, 1.04); g.fill();
      // joints : planches pour un pont, pavés pour une allée
      g.strokeStyle = br ? '#7d5c36' : 'rgba(150,120,70,.28)'; g.lineWidth = 1;
      for (let k = 1; k < (br ? 4 : 3); k++) { const f = k / (br ? 4 : 3); line(g, px(x + f, y), py(x + f, y), px(x + f, y + 1), py(x + f, y + 1)); if (!br) line(g, px(x, y + f), py(x, y + f), px(x + 1, y + f), py(x + 1, y + f)); }
      g.strokeStyle = br ? '#5f4426' : '#a98f5c'; g.lineWidth = 2.6; g.beginPath();
      if (!pth(x, y - 1)) { g.moveTo(px(x, y), py(x, y)); g.lineTo(px(x + 1, y), py(x + 1, y)); }
      if (!pth(x + 1, y)) { g.moveTo(px(x + 1, y), py(x + 1, y)); g.lineTo(px(x + 1, y + 1), py(x + 1, y + 1)); }
      if (!pth(x, y + 1)) { g.moveTo(px(x + 1, y + 1), py(x + 1, y + 1)); g.lineTo(px(x, y + 1), py(x, y + 1)); }
      if (!pth(x - 1, y)) { g.moveTo(px(x, y + 1), py(x, y + 1)); g.lineTo(px(x, y), py(x, y)); }
      g.stroke();
    }
    Z.groundDirty = false;
  }

  // ----- objets en volume -----
  function drawBld(c, type, x, y, alpha, o) {
    const d = BL[type], s = d.size, cx = px(x + s / 2, y + s / 2), cy = py(x + s / 2, y + s / 2); c.globalAlpha = alpha;
    if (o && o.bt > 0) { box(c, x + .08, y + .08, s - .16, s - .16, 10 + 6 * s, '#c9a46a', '#a8834f', '#8f6d3e'); emoji(c, '🏗️', cx, cy - 16 - 8 * s, 14 + 6 * s); c.globalAlpha = 1; return; }
    if (alpha === 1 && !d.onPath) { c.save(); c.translate(9, 5); c.fillStyle = 'rgba(0,0,0,.17)'; poly(c, x + .06, y + .06, s - .12, s - .12); c.fill(); c.restore(); }
    if (Z.bldSprite(c, type, x, y, o)) { if (o && o.closed && !o.bt) emoji(c, '🚫', cx + 10, cy - 30 - s * 8, 13); c.globalAlpha = 1; return; }
    if (d.cat === 'ride') {
      box(c, x + .06, y + .06, s - .12, s - .12, 7, shade(d.color, 1.25), shade(d.color, .95), shade(d.color, .75));
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(cx, cy - 6, s * 15, s * 6, 0, 0, 7); c.fill();
      emoji(c, d.icon, cx, cy - 8 - s * 13, 16 + s * 17);
    } else if (d.color) {
      const up = 16 + s * 8;
      box(c, x + .1, y + .1, s - .2, s - .2, up, d.color, '#f6efe2', '#ddd3c0');
      c.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < s * 2; i++) { poly(c, x + .1 + (i + .15) * (s - .2) / (s * 2), y + .1, (s - .2) / (s * 4), s - .2, up); c.fill(); }
      c.fillStyle = '#6b4a2f'; const dx = box.door[0], dy = box.door[1]; c.fillRect(dx - 4, dy - up * .45, 9, up * .45);
      emoji(c, d.icon, cx, cy - up - 4 - s * 4, 13 + s * 7);
    } else if (type === 'bench') { box(c, x + .2, y + .4, .6, .22, 5, '#b98248', '#8a5a33', '#6f4626'); box(c, x + .2, y + .34, .6, .07, 12, '#a8703f', '#8a5a33', '#6f4626'); }
    else if (type === 'bin') { box(c, x + .36, y + .36, .28, .28, 10, '#3f6f58', '#4b8068', '#356150'); box(c, x + .34, y + .34, .32, .32, 12, '#6fa58c', 'rgba(0,0,0,0)', 'rgba(0,0,0,0)'); }
    else if (type === 'tree' || type === 'palmier' || type === 'cactus') { c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(cx, cy, 11, 5, 0, 0, 7); c.fill(); tree(c, type === 'tree' ? '🌳' : type === 'palmier' ? '🌴' : '🌵', cx, cy, 1.05, .4); }
    else if (type === 'statue') { box(c, x + .3, y + .3, .4, .4, 9, '#cfd4d8', '#a9b0b6', '#8e959b'); c.fillStyle = '#b9c0c6'; c.beginPath(); c.ellipse(cx, cy - 20, 5, 9, 0, 0, 7); c.fill(); c.beginPath(); c.arc(cx, cy - 32, 4, 0, 7); c.fill(); c.fillStyle = '#d9dee2'; c.beginPath(); c.ellipse(cx - 1.5, cy - 22, 2, 6, 0, 0, 7); c.fill(); }
    else if (type === 'sign') { c.fillStyle = '#5a4030'; c.fillRect(cx - 1.5, cy - 20, 3, 20); c.fillStyle = '#2f8f4e'; rr(c, cx - 9, cy - 31, 18, 13, 2.5); c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 1; c.beginPath(); c.moveTo(cx - 6, cy - 27); c.lineTo(cx + 1, cy - 27); c.lineTo(cx + 1, cy - 22); c.moveTo(cx - 3, cy - 22); c.lineTo(cx + 6, cy - 22); c.stroke(); c.fillStyle = '#e53935'; c.beginPath(); c.arc(cx + 4, cy - 27, 1.6, 0, 7); c.fill(); }
    else if (type === 'lanterne') { c.strokeStyle = '#5a4030'; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx, cy - 24); c.stroke(); c.fillStyle = '#d83a2e'; rr(c, cx - 5, cy - 30, 10, 12, 4); c.fill(); c.fillStyle = '#f7c948'; c.fillRect(cx - 5, cy - 25, 10, 2); }
    else if (type === 'ballons') { [['#e53935', -6, -26], ['#fdd835', 0, -31], ['#1e88e5', 6, -26]].forEach(q => { c.strokeStyle = '#888'; c.lineWidth = .8; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + q[1], cy + q[2] + 5); c.stroke(); c.fillStyle = q[0]; c.beginPath(); c.ellipse(cx + q[1], cy + q[2], 4.5, 5.5, 0, 0, 7); c.fill(); }); }
    else { const sz = type === 'flowers' || type === 'ballons' || type === 'lanterne' ? 20 : 30; c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(cx, cy, 9, 4, 0, 0, 7); c.fill(); emoji(c, d.icon, cx, cy - sz * .42, sz); }
    if (o && o.closed && !o.bt) emoji(c, '🚫', cx + 10, cy - 30 - s * 8, 13);
    c.globalAlpha = 1;
  }
  function fenceSeg(e, x1, y1, x2, y2) {
    const ax = px(x1, y1), ay = py(x1, y1), bx = px(x2, y2), by = py(x2, y2), col = e.fence > 60 ? '#7a5230' : e.fence > 30 ? '#c77b1e' : '#d63a2f';
    if (e.fence <= 30) ctx.setLineDash([4, 3]);
    for (const hgt of [5, 10]) { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(ax, ay - hgt); ctx.lineTo(bx, by - hgt); ctx.stroke(); ctx.strokeStyle = 'rgba(255,235,200,.45)'; ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(ax, ay - hgt - 1); ctx.lineTo(bx, by - hgt - 1); ctx.stroke(); }
    ctx.setLineDash([]);
    for (const [qx, qy] of [[ax, ay], [bx, by]]) { ctx.fillStyle = '#4e3018'; ctx.fillRect(qx - 2, qy - 13, 4, 13); ctx.fillStyle = '#8a6238'; ctx.fillRect(qx - 2, qy - 13, 1.5, 13); ctx.fillStyle = '#a57a48'; ctx.fillRect(qx - 2.5, qy - 14.5, 5, 2); }
  }
  // personnage : jambes qui marchent, buste, bras, tête et cheveux (ou couvre-chef pour le personnel)
  const HAIR = ['#2b1b0e', '#5a3a1a', '#c9a227', '#15151a', '#8a4a2a', '#b9b9b9'];
  function person(c, x, y, k, shirt, skin, id, walking, hat) {
    const sw = walking ? Math.sin(performance.now() / 110 + id) * 2.2 * k : 0;
    c.fillStyle = 'rgba(0,0,0,.22)'; c.beginPath(); c.ellipse(x, y, 5.2 * k, 2.4 * k, 0, 0, 7); c.fill();
    c.strokeStyle = '#3b3f55'; c.lineWidth = 2.3 * k; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 1.6 * k, y - 6 * k); c.lineTo(x - 1.6 * k + sw, y - .6 * k); c.moveTo(x + 1.6 * k, y - 6 * k); c.lineTo(x + 1.6 * k - sw, y - .6 * k); c.stroke();
    c.strokeStyle = skin; c.lineWidth = 1.7 * k; c.beginPath(); c.moveTo(x - 3.6 * k, y - 11.5 * k); c.lineTo(x - 4.4 * k - sw * .5, y - 6.5 * k); c.moveTo(x + 3.6 * k, y - 11.5 * k); c.lineTo(x + 4.4 * k + sw * .5, y - 6.5 * k); c.stroke();
    c.fillStyle = shirt; rr(c, x - 3.6 * k, y - 13 * k, 7.2 * k, 8 * k, 2.4 * k); c.fill();
    c.fillStyle = skin; c.beginPath(); c.arc(x, y - 15.6 * k, 3.3 * k, 0, 7); c.fill();
    c.fillStyle = hat || HAIR[id % HAIR.length]; c.beginPath(); c.arc(x, y - 16.4 * k, 3.4 * k, Math.PI * 1.05, Math.PI * 1.95); c.closePath(); c.fill();
    if (hat) c.fillRect(x - 4.4 * k, y - 16.6 * k, 8.8 * k, 1.3 * k);
  }
  // arbres dessinés (plus d'émojis) : feuillu, sapin, palmier, cactus, cerisier
  function tree(c, kind, x, y, k, h) {
    const snow = (Z.mapDef && Z.mapDef().snow) || Z.seasonIdx() === 3;
    if (kind === '🌲') { c.fillStyle = '#6b4a2f'; c.fillRect(x - 2 * k, y - 8 * k, 4 * k, 8 * k); for (let i = 0; i < 3; i++) { const w = (13 - i * 3) * k, b = y - (6 + i * 9) * k; c.fillStyle = i % 2 ? '#2f7d46' : '#27703d'; c.beginPath(); c.moveTo(x - w, b); c.lineTo(x + w, b); c.lineTo(x, b - 15 * k); c.closePath(); c.fill(); if (snow) { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(x - w * .45, b - 8 * k); c.lineTo(x + w * .45, b - 8 * k); c.lineTo(x, b - 15 * k); c.closePath(); c.fill(); } } }
    else if (kind === '🌴') { c.strokeStyle = '#8a6a3a'; c.lineWidth = 3.5 * k; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 5 * k, y - 16 * k, x + 2 * k, y - 30 * k); c.stroke(); c.strokeStyle = '#3f9a4a'; c.lineWidth = 3 * k; for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283 + h; c.beginPath(); c.moveTo(x + 2 * k, y - 30 * k); c.quadraticCurveTo(x + 2 * k + Math.cos(a) * 9 * k, y - 36 * k + Math.sin(a) * 3 * k, x + 2 * k + Math.cos(a) * 15 * k, y - 27 * k + Math.sin(a) * 6 * k); c.stroke(); } }
    else if (kind === '🌵') { c.fillStyle = '#4f9a55'; rr(c, x - 3.5 * k, y - 26 * k, 7 * k, 26 * k, 3.5 * k); c.fill(); rr(c, x - 11 * k, y - 18 * k, 5 * k, 10 * k, 2.5 * k); c.fill(); c.fillRect(x - 9 * k, y - 11 * k, 7 * k, 3.5 * k); rr(c, x + 6 * k, y - 22 * k, 5 * k, 11 * k, 2.5 * k); c.fill(); c.fillRect(x + 2 * k, y - 14 * k, 7 * k, 3.5 * k); }
    else { const pink = kind === '🌸', sn = Z.seasonIdx(), cols = sn === 3 ? ['#b9c7c0', '#cfdad4', '#a9b8b0'] : sn === 2 ? ['#d98a2b', '#c9652a', '#e0a83a'] : pink && sn === 0 ? ['#f4a9c4', '#f7bdd2', '#ee93b5'] : ['#3f8f45', '#4da455', '#35803c']; c.fillStyle = '#6b4a2f'; c.fillRect(x - 2.2 * k, y - 12 * k, 4.4 * k, 12 * k); [[-7, -17, 9], [7, -18, 9], [0, -26, 10], [0, -16, 9]].forEach((q, i) => { c.fillStyle = cols[i % 3]; c.beginPath(); c.arc(x + q[0] * k, y + q[1] * k, q[2] * k, 0, 7); c.fill(); }); c.fillStyle = 'rgba(255,255,255,.16)'; c.beginPath(); c.arc(x - 4 * k, y - 27 * k, 5 * k, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,.1)'; c.beginPath(); c.arc(x + 5 * k, y - 13 * k, 6 * k, 0, 7); c.fill(); }
  }
  const UNI = { keeper: ['#3f9d4a', '#d9c08a'], maint: ['#e8862a', '#f2c230'], vet: ['#f4f6f8', '#7fb7d9'] };
  const label = (text, x, y, bg, size) => { const k = 1 / Z.clamp(cam.z, .5, 1.7); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = 'bold ' + (size || 13) + 'px sans-serif'; const tw = ctx.measureText(text).width + 18; ctx.fillStyle = bg; rr(ctx, -tw / 2, -12, tw, 24, 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1); ctx.restore(); };

  // ----- image -----
  const items = [];
  Z.draw = function () {
    const S = Z.S, ui = Z.ui || {}, P = pal(); if (Z.groundDirty) drawGround();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = P.sky; ctx.fillRect(0, 0, cw, ch);
    const z = cam.z; ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw / 2 - cam.x * z), dpr * (ch / 2 - cam.y * z));
    ctx.drawImage(ground, -OX, 0, GW, GH + 24);
    const vx0 = cam.x - cw / 2 / z - 70, vx1 = cam.x + cw / 2 / z + 70, vy0 = cam.y - ch / 2 / z - 40, vy1 = cam.y + ch / 2 / z + 90;
    const vis = (x, y) => { const sx = px(x, y), sy = py(x, y); return sx > vx0 && sx < vx1 && sy > vy0 && sy < vy1; };
    // déchets
    for (let i = 0; i < W * H; i++) if (S.litter[i] > 0) { const x = i % W, y = (i / W) | 0; for (let k = 0; k < S.litter[i]; k++) emoji(ctx, k % 2 ? '🥤' : '🧻', px(x + .5, y + .5) + hash(i, k) * 20 - 10, py(x + .5, y + .5) + hash(k, i) * 8 - 4, 8); }
    // chantiers d'enclos, terrains non acquis, vues
    for (const e of S.enclosures) if (e.bt > 0) { ctx.fillStyle = 'rgba(120,90,40,.55)'; poly(ctx, e.x, e.y, e.w, e.h); ctx.fill(); ctx.strokeStyle = 'rgba(240,200,40,.85)'; ctx.lineWidth = 3; ctx.setLineDash([10, 8]); ctx.stroke(); ctx.setLineDash([]); }
    for (const p of Z.PARCELS) { if (S.land[p.id]) continue; const ok = p.lvl <= S.level && Z.adjacentOwned(p); ctx.fillStyle = ok ? 'rgba(20,30,10,.35)' : 'rgba(10,15,5,.55)'; poly(ctx, p.x, p.y, p.w, p.h); ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke(); ctx.setLineDash([]); }
    if (ui.view) {
      const col = v => 'hsla(' + Math.round(Z.clamp(v, 0, 100) * 1.2) + ',85%,45%,.55)';
      if (ui.view === 'crowd') { const cnt = {}; for (const v of S.visitors) { const t = idx(Math.floor(v.x), Math.floor(v.y)); cnt[t] = (cnt[t] || 0) + 1; } for (const t in cnt) { ctx.fillStyle = 'rgba(220,30,30,' + Math.min(.8, cnt[t] / 8) + ')'; poly(ctx, t % W, (t / W) | 0, 1, 1); ctx.fill(); } }
      else {
        if (ui.view === 'clean') for (let i = 0; i < W * H; i++) if (S.litter[i] > 0) { ctx.fillStyle = 'rgba(220,30,30,.6)'; poly(ctx, i % W, (i / W) | 0, 1, 1); ctx.fill(); }
        for (const e of S.enclosures) if (e.animals.length) { ctx.fillStyle = col(ui.view === 'happy' ? Z.avg(e, 'happy') : e.clean); poly(ctx, e.x, e.y, e.w, e.h); ctx.fill(); }
      }
    }
    if (ui.sel && (ui.sel.kind === 'encl' || ui.sel.kind === 'bld')) { const [w, h] = Z.sizeOf(ui.sel); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 4]); poly(ctx, ui.sel.x - .08, ui.sel.y - .08, w + .16, h + .16); ctx.stroke(); ctx.setLineDash([]); }
    // objets triés en profondeur
    items.length = 0; const night = Z.isNight();
    const tw = performance.now() / 900; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = S.ground[idx(x, y)]; if (t < 2 || !vis(x, y)) continue;
      if (t === 3) { items.push({ d: dep(x + .5, y + .5), k: 0, x, y }); continue; }
      const h = hash(x, y); if (h < .45) continue; const cx = px(x + .5, y + .5), cy = py(x + .5, y + .5), ph = Math.sin(tw + h * 40);
      ctx.globalAlpha = .18 + .3 * (ph * .5 + .5); ctx.beginPath(); ctx.moveTo(cx - 9 + ph * 3, cy - 2 + h * 5); ctx.lineTo(cx + 1 + ph * 3, cy - 2 + h * 5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const b of S.buildings) if (vis(b.x, b.y)) items.push({ d: dep(b.x + BL[b.type].size / 2, b.y + BL[b.type].size / 2) + (BL[b.type].onPath ? -.3 : 0), k: 1, o: b });
    for (const e of S.enclosures) {
      for (let i = e.x; i < e.x + e.w; i++) { items.push({ d: dep(i + .5, e.y) - .2, k: 2, e, a: [i, e.y, i + 1, e.y] }); items.push({ d: dep(i + .5, e.y + e.h) - .2, k: 2, e, a: [i, e.y + e.h, i + 1, e.y + e.h] }); }
      for (let j = e.y; j < e.y + e.h; j++) { items.push({ d: dep(e.x, j + .5) - .2, k: 2, e, a: [e.x, j, e.x, j + 1] }); items.push({ d: dep(e.x + e.w, j + .5) - .2, k: 2, e, a: [e.x + e.w, j, e.x + e.w, j + 1] }); }
      if (e.up.abri) items.push({ d: dep(e.x + .7, e.y + .7), k: 6, x: e.x + .7, y: e.y + .7, ic: '🛖', s: 30 });
      if (e.up.jeux) items.push({ d: dep(e.x + e.w - .8, e.y + .8), k: 6, x: e.x + e.w - .8, y: e.y + .8, ic: '🪵', s: 22 });
      for (const a of e.animals) if (vis(a.x, a.y)) items.push({ d: dep(a.x, a.y), k: 3, o: a });
    }
    for (const v of S.visitors) if (vis(v.x, v.y)) items.push({ d: dep(v.x + v.ox, v.y + v.oy), k: 4, o: v });
    for (const s of S.staff) if (!Z.STAFF[s.type].desk) items.push({ d: dep(s.x, s.y) + .05, k: 5, o: s });
    items.push({ d: dep(EX + .5, EY + .85), k: 7 });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.k === 0) {
        const cx = px(it.x + .5, it.y + .5), cy = py(it.x + .5, it.y + .5), h = hash(it.x * 7, it.y * 3), sz = 30 + h * 12;
        ctx.globalAlpha = Z.owned(it.x, it.y) ? 1 : .55; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx, cy, 11, 5, 0, 0, 7); ctx.fill();
        tree(ctx, P.trees[Math.floor(h * P.trees.length)], cx + h * 6 - 3, cy, sz / 36, h); ctx.globalAlpha = 1;
      } else if (it.k === 1) drawBld(ctx, it.o.type, it.o.x, it.o.y, 1, it.o);
      else if (it.k === 2) fenceSeg(it.e, it.a[0], it.a[1], it.a[2], it.a[3]);
      else if (it.k === 3) {
        const a = it.o, ax = px(a.x, a.y), ay = py(a.x, a.y), dx = px(a.tx, a.ty) - ax; if (!(a.wait > 0) && Math.abs(dx) > 1) a._r = dx > 0;
        if (ui.sel === a) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.ellipse(ax, ay, 16, 7, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); }
        const hgt = Z.drawAnimal(ctx, a, ax, ay, a._r !== false, night);
        const st = a.sick ? '🤒' : a.hunger < 20 ? '🍖' : night ? '💤' : a.preg ? '🤰' : '';
        if (st) emoji(ctx, st, ax + 8, ay - hgt - 4, 11);
      } else if (it.k === 4) {
        const v = it.o, x = px(v.x + v.ox, v.y + v.oy), y = py(v.x + v.ox, v.y + v.oy);
        person(ctx, x, y, v.kid ? .72 : 1, v.col, v.skin, v.id, v.st === 'walk' && S.speed > 0);
        if (ui.sel === v) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 8, 14, 0, 7); ctx.stroke(); }
      } else if (it.k === 5) {
        const s = it.o, d = Z.STAFF[s.type], x = px(s.x + s.ox, s.y + s.oy), y = py(s.x + s.ox, s.y + s.oy), u = UNI[s.type] || UNI.keeper;
        ctx.strokeStyle = ui.sel === s ? '#fff' : d.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, y, 9, 4.2, 0, 0, 7); ctx.stroke();
        person(ctx, x, y, 1.18, u[0], '#e8b88f', s.id, s.st === 'walk' && S.speed > 0, u[1]);
        if (s.type === 'vet') { ctx.fillStyle = '#d9534f'; ctx.fillRect(x - 1, y - 12.5, 2.4, 5); ctx.fillRect(x - 2.4, y - 11.2, 5.2, 2.4); }
        if (s.st === 'work') { ctx.fillStyle = '#333'; ctx.fillRect(x - 10, y - 30, 20, 4); ctx.fillStyle = d.color; ctx.fillRect(x - 10, y - 30, 20 * (1 - Z.clamp(s.t / s.task.dur, 0, 1)), 4); }
      } else if (it.k === 6) {
        const x = px(it.x, it.y), y = py(it.x, it.y);
        if (it.ic === '🛖') { box(ctx, it.x - .34, it.y - .34, .68, .68, 11, '#b08a5a', '#c9a46a', '#a8834f'); ctx.fillStyle = '#3a2a18'; ctx.fillRect(box.door[0] - 3, box.door[1] - 8, 6, 8); ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.moveTo(x - 20, y - 11); ctx.lineTo(x, y - 34); ctx.lineTo(x + 20, y - 11); ctx.lineTo(x, y - 1); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#a5824a'; ctx.beginPath(); ctx.moveTo(x - 20, y - 11); ctx.lineTo(x, y - 34); ctx.lineTo(x, y - 1); ctx.closePath(); ctx.fill(); }
        else { for (const [dx, dy, w] of [[-7, 0, 15], [3, -4, 13], [-2, -8, 12]]) { ctx.fillStyle = '#7a5230'; rr(ctx, x + dx - w / 2, y + dy - 5, w, 6, 3); ctx.fill(); ctx.fillStyle = '#c9a46a'; ctx.beginPath(); ctx.ellipse(x + dx + w / 2 - 1.5, y + dy - 2, 2, 3, 0, 0, 7); ctx.fill(); } ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x + 14, y - 2); ctx.lineTo(x + 14, y - 22); ctx.lineTo(x + 26, y - 22); ctx.lineTo(x + 26, y - 2); ctx.stroke(); ctx.strokeStyle = '#222'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.arc(x + 20, y - 9, 4, 0, 7); ctx.stroke(); ctx.lineWidth = .8; ctx.beginPath(); ctx.moveTo(x + 20, y - 22); ctx.lineTo(x + 20, y - 13); ctx.stroke(); }
      }
      else {
        if (S.entryMap) { const mx = px(EX + 1.7, EY + .3), my = py(EX + 1.7, EY + .3); ctx.fillStyle = '#5a4030'; ctx.fillRect(mx - 9, my - 22, 2.5, 22); ctx.fillRect(mx + 6.5, my - 22, 2.5, 22); ctx.fillStyle = '#f6efe2'; rr(ctx, mx - 12, my - 36, 24, 18, 2); ctx.fill(); ctx.strokeStyle = '#2f8f4e'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx - 8, my - 31); ctx.lineTo(mx, my - 31); ctx.lineTo(mx, my - 24); ctx.lineTo(mx + 8, my - 24); ctx.stroke(); ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.arc(mx - 6, my - 24, 1.8, 0, 7); ctx.fill(); }
        box(ctx, EX - .25, EY + .7, .25, .25, 44, '#8a5a33', '#7a4b2a', '#633b20'); box(ctx, EX + 1, EY + .7, .25, .25, 44, '#8a5a33', '#7a4b2a', '#633b20');
        let ax = px(EX - .1, EY + .95), ay = py(EX - .1, EY + .95) - 44, bx = px(EX + 1.1, EY + .95), by = py(EX + 1.1, EY + .95) - 44; if (bx < ax) { [ax, bx] = [bx, ax]; [ay, by] = [by, ay]; }
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - 15); ctx.lineTo(ax, ay - 15); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate((ax + bx) / 2, (ay + by) / 2 - 7.5); ctx.transform(1, (by - ay) / (bx - ax), 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ZOO', 0, 0); ctx.restore();
      }
    }
    // ombres de nuages qui glissent sur le parc
    if (S.weather !== 'rain' && !night) { const t = performance.now() / 1000 * (S.speed ? 1 : 0) + S.day * 97; ctx.fillStyle = S.weather === 'cloud' ? 'rgba(10,20,40,.085)' : 'rgba(10,20,40,.05)'; for (let i = 0; i < 4; i++) { const x = ((t * 9 + i * 1100) % (GW + 900)) - OX - 450, y = GH * (.12 + .23 * i) + Math.sin(i * 2.4) * 80; ctx.beginPath(); ctx.ellipse(x, y, 300 + i * 40, 120 + i * 14, .12, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(x + 190, y + 50, 190, 80, 0, 0, 7); ctx.fill(); } }
    // cœurs et pièces qui s'envolent
    { const now = performance.now(); Z.fx = Z.fx.filter(f => now - f.t < 1300); ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; for (const f of Z.fx) { const a = (now - f.t) / 1300, x = px(f.x, f.y), y = py(f.x, f.y) - 22 - a * 30; ctx.globalAlpha = 1 - a * a; ctx.strokeStyle = '#fff'; ctx.strokeText(f.txt, x, y); ctx.fillStyle = f.col; ctx.fillText(f.txt, x, y); } ctx.globalAlpha = 1; }
    // étiquettes
    for (const e of S.enclosures) {
      const cx = px(e.x + e.w / 2, e.y + e.h / 2), cy = py(e.x + e.w / 2, e.y + e.h / 2);
      if (e.bt > 0) { emoji(ctx, '🏗️', cx, cy - 14, 26); const tot = Z.enclBuildHours(e.w, e.h); ctx.fillStyle = '#333'; ctx.fillRect(cx - 30, cy + 6, 60, 5); ctx.fillStyle = '#f0c030'; ctx.fillRect(cx - 30, cy + 6, 60 * (1 - e.bt / tot), 5); }
      else if (ui.view && ui.view !== 'crowd' && e.animals.length) label(Math.round(ui.view === 'happy' ? Z.avg(e, 'happy') : e.clean) + ' %', cx, cy, 'rgba(0,0,0,.65)', 14);
      if (e.animals.length && !e.bt) { const st = Z.crowdStage(e), o = Z.occupancy(e), ty = Math.min(py(e.x, e.y), py(e.x + e.w, e.y), py(e.x + e.w, e.y + e.h), py(e.x, e.y + e.h)); label((st === 3 ? '⚔️ ' : st === 2 ? '🍽️ ' : '') + e.animals.length + ' / ' + Z.enclMax(e) + ' · ' + Z.enclStars(e) + '★', cx, ty - 20, o >= 1.05 - 1e-9 ? 'rgba(200,50,40,.92)' : o >= .95 - 1e-9 ? 'rgba(210,140,20,.92)' : 'rgba(40,110,60,.85)', 12); }
      if (e.bt > 0 || (ui.view && ui.view !== 'crowd' && e.animals.length)) { } else if (e.animals.length) { let ic = ''; if (e.food <= 0) ic += '🍽️'; if (e.clean < 30) ic += '💩'; if (e.fence < 30) ic += '🔧'; if (!e.vp.length) ic += '🚫'; if (ic) { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, cx - 10 - ic.length * 3.2, cy - 52, 20 + ic.length * 6.4, 20, 10); ctx.fill(); emoji(ctx, ic, cx, cy - 41, 12); } }
      else if (!e.vp.length) emoji(ctx, '🚫', cx, cy - 6, 18);
    }
    for (const b of S.buildings) { const q = Z.queueLen(b); if (q >= 3) { const s = BL[b.type].size; label('👥 ' + q, px(b.x + s / 2, b.y + s / 2), py(b.x + s / 2, b.y + s / 2) - 44 - s * 10, q > 12 ? 'rgba(200,50,30,.9)' : 'rgba(60,60,60,.8)', 11); } }
    for (const p of Z.PARCELS) { if (S.land[p.id]) continue; const ok = p.lvl <= S.level && Z.adjacentOwned(p); label(ok ? '🗺️ À vendre · ' + fmt(p.price) : '🔒 Niveau ' + p.lvl, px(p.x + p.w / 2, p.y + p.h / 2), py(p.x + p.w / 2, p.y + p.h / 2), ok ? 'rgba(47,143,78,.92)' : 'rgba(30,30,30,.7)'); }
    // plan de construction et aperçu
    for (const it of (Z.plan || [])) {
      ctx.fillStyle = 'rgba(70,150,255,.4)'; poly(ctx, it.x, it.y, it.w, it.h); ctx.fill(); ctx.strokeStyle = '#1565c0'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.stroke(); ctx.setLineDash([]);
      if (it.k === 'bld') drawBld(ctx, it.type, it.x, it.y, .7);
    }
    const gh = ui.ghost;
    if (gh) {
      ctx.fillStyle = gh.ok ? 'rgba(80,220,120,.42)' : 'rgba(230,60,50,.45)'; poly(ctx, gh.x, gh.y, gh.w, gh.h); ctx.fill(); ctx.strokeStyle = gh.ok ? '#1e9c4a' : '#b3261e'; ctx.lineWidth = 2; ctx.stroke();
      if (gh.type) drawBld(ctx, gh.type, gh.x, gh.y, .75);
    }
    // nuit et intempéries
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hr = S.minute / 60, ls = Z.lateShift(), dark = hr < 5 ? .42 : hr < 7 ? .42 * (7 - hr) / 2 : hr > 21.5 + ls ? .42 : hr > 19 + ls ? .42 * (hr - 19 - ls) / 2.5 : 0;
    const tint = Z.season().tint; if (tint) { ctx.fillStyle = tint; ctx.fillRect(0, 0, cw, ch); }
    const warm = hr > 17 + ls && hr < 20.5 + ls ? Math.sin((hr - 17 - ls) / 3.5 * Math.PI) * .16 : hr > 5.5 && hr < 8 ? Math.sin((hr - 5.5) / 2.5 * Math.PI) * .1 : 0;
    if (warm > 0) { ctx.fillStyle = 'rgba(255,140,50,' + warm + ')'; ctx.fillRect(0, 0, cw, ch); }
    if (dark > 0) {
      ctx.fillStyle = 'rgba(15,25,70,' + dark + ')'; ctx.fillRect(0, 0, cw, ch);
      // la nuit, les bâtiments et l'entrée éclairent leurs abords
      ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw / 2 - cam.x * z), dpr * (ch / 2 - cam.y * z)); ctx.globalCompositeOperation = 'lighter';
      const glow = (x, y, r) => { const gr = ctx.createRadialGradient(x, y, 2, x, y, r); gr.addColorStop(0, 'rgba(255,205,120,' + (dark * 1.1) + ')'); gr.addColorStop(1, 'rgba(255,205,120,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); };
      for (const b of S.buildings) { const d = BL[b.type]; if (b.bt || (!d.color && b.type !== 'lanterne' && b.type !== 'fountain') || !vis(b.x, b.y)) continue; glow(px(b.x + d.size / 2, b.y + d.size / 2), py(b.x + d.size / 2, b.y + d.size / 2) - 10, 34 + d.size * 22); }
      glow(px(EX + .5, EY + .9), py(EX + .5, EY + .9) - 20, 70);
      ctx.globalCompositeOperation = 'source-over'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    if (S.weather === 'rain') {
      const t = performance.now() / 4, snow = (Z.mapDef && Z.mapDef().snow) || Z.seasonIdx() === 3;
      if (snow) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 140; i++) { const x = (hash(i, 1) * (cw + 200) + Math.sin(t / 40 + i) * 20) % (cw + 200) - 100, y = (hash(2, i) * ch + t * (.25 + hash(i, i) * .25)) % ch; ctx.fillRect(x, y, 2.5, 2.5); } }
      else { ctx.strokeStyle = 'rgba(190,215,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 120; i++) { const x = (hash(i, 1) * (cw + 200) + t * .3) % (cw + 200) - 100, y = (hash(2, i) * ch + t * (1 + hash(i, i))) % ch; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,80,110,.12)'; ctx.fillRect(0, 0, cw, ch);
    }
    // vignette : bords de l'écran légèrement assombris
    const vg = ctx.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * .45, cw / 2, ch / 2, Math.max(cw, ch) * .78); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,10,0,.3)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, cw, ch);
  };
})();
