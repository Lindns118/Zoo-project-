// Zoo Project — rendu isométrique
(function () {
  const { W, H, EX, EY } = Z;
  const SP = Z.SPECIES, BL = Z.BUILDINGS, idx = Z.idx, fmt = n => Z.fmt(n);
  const HW = 32, HH = 16;                      // demi-largeur et demi-hauteur d'une case à l'écran
  const OX = H * HW, GW = (W + H) * HW, GH = (W + H) * HH; // décalage et taille de la couche de sol
  const px = (x, y) => (x - y) * HW, py = (x, y) => (x + y) * HH;
  const cam = Z.cam = { x: px(EX, H - 8), y: py(EX, H - 8), z: 1 };
  let cv, ctx, dpr = 1, cw = 0, ch = 0;
  const SS = window.innerWidth < 700 ? 1 : 1.5;
  const ground = document.createElement('canvas'); ground.width = GW * SS; ground.height = GH * SS;
  const g = ground.getContext('2d'); Z.groundCanvas = ground; Z.groundSize = { w: GW, h: GH };
  Z.viewRect = () => ({ x: cam.x - cw / 2 / cam.z + OX, y: cam.y - ch / 2 / cam.z, w: cw / cam.z, h: ch / cam.z });
  Z.groundPos = (x, y) => ({ x: px(x, y) + OX, y: py(x, y) });
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
  const emoji = (c, ch, x, y, s) => { c.font = s + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(ch, x, y); };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  // losange couvrant le rectangle de cases (x, y, w, h), éventuellement surélevé de `up` pixels
  function poly(c, x, y, w, h, up) { up = up || 0; c.beginPath(); c.moveTo(px(x, y), py(x, y) - up); c.lineTo(px(x + w, y), py(x + w, y) - up); c.lineTo(px(x + w, y + h), py(x + w, y + h) - up); c.lineTo(px(x, y + h), py(x, y + h) - up); c.closePath(); }
  function box(c, x, y, w, h, up, top, left, right) {
    const sx = px(x + w, y + h), sy = py(x + w, y + h), wx = px(x, y + h), wy = py(x, y + h), ex = px(x + w, y), ey = py(x + w, y);
    c.fillStyle = left; c.beginPath(); c.moveTo(wx, wy); c.lineTo(sx, sy); c.lineTo(sx, sy - up); c.lineTo(wx, wy - up); c.closePath(); c.fill();
    c.fillStyle = right; c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(ex, ey - up); c.lineTo(sx, sy - up); c.closePath(); c.fill();
    c.fillStyle = top; poly(c, x, y, w, h, up); c.fill();
  }
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16), r = Math.min(255, (n >> 16) * f) | 0, gg = Math.min(255, ((n >> 8) & 255) * f) | 0, b = Math.min(255, (n & 255) * f) | 0; return 'rgb(' + r + ',' + gg + ',' + b + ')'; };

  Z.initRender = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize); };
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cw = window.innerWidth; ch = window.innerHeight; cv.width = cw * dpr; cv.height = ch * dpr; clampCam(); }
  function clampCam() { cam.z = Z.clamp(cam.z, .3, 2.6); cam.x = Z.clamp(cam.x, -OX, W * HW); cam.y = Z.clamp(cam.y, 0, GH); }
  Z.clampCam = clampCam;
  Z.toWorld = (sx, sy) => ({ x: (sx - cw / 2) / cam.z + cam.x, y: (sy - ch / 2) / cam.z + cam.y });
  Z.toTileF = (sx, sy) => { const w = Z.toWorld(sx, sy); return { x: (w.y / HH + w.x / HW) / 2, y: (w.y / HH - w.x / HW) / 2 }; };
  Z.toTile = (sx, sy) => { const t = Z.toTileF(sx, sy); return { x: Math.floor(t.x), y: Math.floor(t.y) }; };
  Z.focus = (tx, ty) => { cam.x = px(tx, ty); cam.y = py(tx, ty); clampCam(); };
  Z.camToGround = (gx, gy) => { cam.x = gx - OX; cam.y = gy; clampCam(); };

  const DEFPAL = { g: ['#84c25a', '#8bc960', '#7fbd55'], tuft: '#6fae49', out: '#2f6a30', sky: '#3c7a3a', trees: ['🌳', '🌳', '🌲'] };
  const pal = () => (Z.mapDef ? Z.mapDef().pal : DEFPAL);

  // ----- couche statique : sol, eau, allées, sols d'enclos -----
  const DECO = { desert: ['🌵', '🪨', '🌵'], prehist: ['🌴', '🌿', '🦴'], savane: ['🌾', '🌾', '🪨'], foret: ['🌿', '🍄', '🌿'], montagne: ['🪨', '🪨', '⛰️'], aquatique: ['🪷', '🌾', '🪨'], polaire: ['🧊', '🧊', '🪨'] };
  function drawGround() {
    const S = Z.S, P = pal(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, ground.width, ground.height); g.setTransform(SS, 0, 0, SS, OX * SS, 0);
    g.fillStyle = shade(P.g[0], .55); poly(g, -.4, -.4, W + .8, H + .8); g.fill();
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hash(x, y), t = S.ground[idx(x, y)], cx = px(x + .5, y + .5), cy = py(x + .5, y + .5);
      if (t === 2) { g.fillStyle = h < .5 ? '#4aa3d6' : '#52abdc'; poly(g, x - .02, y - .02, 1.04, 1.04); g.fill(); if (h > .7) { g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - 8, cy); g.lineTo(cx + 4, cy); g.stroke(); } continue; }
      g.fillStyle = P.g[h < .33 ? 0 : h < .66 ? 1 : 2]; poly(g, x - .02, y - .02, 1.04, 1.04); g.fill();
      if (h > .86) { g.fillStyle = P.tuft; g.fillRect(cx - 6 + h * 8, cy - 2, 2, 5); g.fillRect(cx - 2 + h * 8, cy, 2, 4); }
      else if (h < .035 && t === 0) emoji(g, '🌼', cx, cy, 8);
    }
    for (const e of S.enclosures) {
      const b = Z.BIOMES[e.biome];
      g.fillStyle = b.color; poly(g, e.x, e.y, e.w, e.h); g.fill();
      for (let j = e.y; j < e.y + e.h; j++) for (let i = e.x; i < e.x + e.w; i++) if (hash(i + 7, j + 3) < .5) { g.fillStyle = 'rgba(0,0,0,.04)'; poly(g, i, j, 1, 1); g.fill(); }
      if (e.biome === 'aquatique' || e.biome === 'polaire') {
        const aq = e.biome === 'aquatique', pw = e.w * (aq ? .62 : .45), ph = e.h * (aq ? .55 : .45), x0 = e.x + (aq ? (e.w - pw) / 2 : e.w - pw - .3), y0 = e.y + (aq ? (e.h - ph) / 2 : e.h - ph - .3);
        g.fillStyle = aq ? '#c9bd86' : '#d5e8f2'; poly(g, x0 - .15, y0 - .15, pw + .3, ph + .3); g.fill();
        g.fillStyle = aq ? '#4aa8d8' : '#6fbfe6'; poly(g, x0, y0, pw, ph); g.fill();
      }
      const deco = DECO[e.biome], dens = e.up.veg ? .3 : .12;
      for (let j = e.y; j < e.y + e.h; j++) for (let i = e.x; i < e.x + e.w; i++) { const hh = hash(i * 3 + e.id, j * 5); if (hh < dens) emoji(g, deco[Math.floor(hash(j, i) * deco.length)], px(i + .5, j + .5) + hash(i, j * 2) * 10 - 5, py(i + .5, j + .5) - 3, 11 + hh * 26); }
    }
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (S.ground[idx(x, y)] !== 1) continue;
      g.fillStyle = Z.reach[idx(x, y)] ? '#e9d7ad' : '#cfc3a3'; poly(g, x - .02, y - .02, 1.04, 1.04); g.fill();
      const h = hash(x, y), cx = px(x + .5, y + .5), cy = py(x + .5, y + .5);
      g.fillStyle = 'rgba(120,95,50,.18)'; g.fillRect(cx - 10 + h * 18, cy - 4 + h * 6, 3, 2); g.fillRect(cx + 6 - h * 14, cy + 2 - h * 5, 2, 2);
      const p = (i, j) => Z.inb(i, j) && S.ground[idx(i, j)] === 1; g.strokeStyle = '#b39a66'; g.lineWidth = 2; g.beginPath();
      if (!p(x, y - 1)) { g.moveTo(px(x, y), py(x, y)); g.lineTo(px(x + 1, y), py(x + 1, y)); }
      if (!p(x + 1, y)) { g.moveTo(px(x + 1, y), py(x + 1, y)); g.lineTo(px(x + 1, y + 1), py(x + 1, y + 1)); }
      if (!p(x, y + 1)) { g.moveTo(px(x + 1, y + 1), py(x + 1, y + 1)); g.lineTo(px(x, y + 1), py(x, y + 1)); }
      if (!p(x - 1, y)) { g.moveTo(px(x, y + 1), py(x, y + 1)); g.lineTo(px(x, y), py(x, y)); }
      g.stroke();
    }
    Z.groundDirty = false;
  }

  // ----- objets en volume -----
  function drawBld(c, type, x, y, alpha, o) {
    const d = BL[type], s = d.size, cx = px(x + s / 2, y + s / 2), cy = py(x + s / 2, y + s / 2); c.globalAlpha = alpha;
    if (o && o.bt > 0) { box(c, x + .08, y + .08, s - .16, s - .16, 10 + 6 * s, '#c9a46a', '#a8834f', '#8f6d3e'); emoji(c, '🏗️', cx, cy - 16 - 8 * s, 14 + 6 * s); c.globalAlpha = 1; return; }
    if (d.cat === 'ride') {
      box(c, x + .06, y + .06, s - .12, s - .12, 7, shade(d.color, 1.25), shade(d.color, .95), shade(d.color, .75));
      c.fillStyle = 'rgba(0,0,0,.18)'; c.beginPath(); c.ellipse(cx, cy - 6, s * 15, s * 6, 0, 0, 7); c.fill();
      emoji(c, d.icon, cx, cy - 8 - s * 13, 16 + s * 17);
    } else if (d.color) {
      const up = 16 + s * 8;
      box(c, x + .1, y + .1, s - .2, s - .2, up, d.color, '#f6efe2', '#ddd3c0');
      c.fillStyle = 'rgba(255,255,255,.45)'; for (let i = 0; i < s * 2; i++) { poly(c, x + .1 + (i + .15) * (s - .2) / (s * 2), y + .1, (s - .2) / (s * 4), s - .2, up); c.fill(); }
      c.fillStyle = '#6b4a2f'; const dx = px(x + s / 2, y + s - .1), dy = py(x + s / 2, y + s - .1); c.fillRect(dx - 12, dy - 6 - up * .45, 9, up * .45);
      emoji(c, d.icon, cx, cy - up - 4 - s * 4, 13 + s * 7);
    } else if (type === 'bench') { box(c, x + .22, y + .38, .56, .24, 6, '#a8703f', '#8a5a33', '#6f4626'); }
    else if (type === 'bin') { box(c, x + .36, y + .36, .28, .28, 11, '#5f7d6b', '#4b6657', '#3c5246'); }
    else { const sz = type === 'flowers' || type === 'ballons' || type === 'lanterne' ? 20 : 30; c.fillStyle = 'rgba(0,0,0,.16)'; c.beginPath(); c.ellipse(cx, cy, 9, 4, 0, 0, 7); c.fill(); emoji(c, d.icon, cx, cy - sz * .42, sz); }
    if (o && o.closed && !o.bt) emoji(c, '🚫', cx + 10, cy - 30 - s * 8, 13);
    c.globalAlpha = 1;
  }
  function fenceSeg(e, x1, y1, x2, y2) {
    const ax = px(x1, y1), ay = py(x1, y1), bx = px(x2, y2), by = py(x2, y2);
    ctx.strokeStyle = e.fence > 60 ? '#6b4423' : e.fence > 30 ? '#c77b1e' : '#d63a2f'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(ax, ay - 5); ctx.lineTo(bx, by - 5); ctx.moveTo(ax, ay - 10); ctx.lineTo(bx, by - 10); if (e.fence <= 30) ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = '#4e3018'; ctx.fillRect(ax - 1.5, ay - 12, 3, 12); ctx.fillRect(bx - 1.5, by - 12, 3, 12);
  }
  const label = (text, x, y, bg, size) => { const k = 1 / Z.clamp(cam.z, .5, 1); ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.font = 'bold ' + (size || 13) + 'px sans-serif'; const tw = ctx.measureText(text).width + 18; ctx.fillStyle = bg; rr(ctx, -tw / 2, -12, tw, 24, 12); ctx.fill(); ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 0, 1); ctx.restore(); };

  // ----- image -----
  const items = [];
  Z.draw = function () {
    const S = Z.S, ui = Z.ui || {}, P = pal(); if (Z.groundDirty) drawGround();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = P.sky; ctx.fillRect(0, 0, cw, ch);
    const z = cam.z; ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw / 2 - cam.x * z), dpr * (ch / 2 - cam.y * z));
    ctx.drawImage(ground, -OX, 0, GW, GH);
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
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (S.ground[idx(x, y)] === 3 && vis(x, y)) items.push({ d: x + y + 1, k: 0, x, y });
    for (const b of S.buildings) if (vis(b.x, b.y)) items.push({ d: b.x + b.y + BL[b.type].size + (BL[b.type].onPath ? -.3 : 0), k: 1, o: b });
    for (const e of S.enclosures) {
      for (let i = e.x; i < e.x + e.w; i++) { items.push({ d: i + e.y - .01, k: 2, e, a: [i, e.y, i + 1, e.y] }); items.push({ d: i + e.y + e.h + .3, k: 2, e, a: [i, e.y + e.h, i + 1, e.y + e.h] }); }
      for (let j = e.y; j < e.y + e.h; j++) { items.push({ d: e.x + j - .01, k: 2, e, a: [e.x, j, e.x, j + 1] }); items.push({ d: e.x + e.w + j + .3, k: 2, e, a: [e.x + e.w, j, e.x + e.w, j + 1] }); }
      if (e.up.abri) items.push({ d: e.x + e.y + 1.4, k: 6, x: e.x + .7, y: e.y + .7, ic: '🛖', s: 30 });
      if (e.up.jeux) items.push({ d: e.x + e.w + e.y + .4, k: 6, x: e.x + e.w - .8, y: e.y + .8, ic: '🪵', s: 22 });
      for (const a of e.animals) if (vis(a.x, a.y)) items.push({ d: a.x + a.y, k: 3, o: a });
    }
    for (const v of S.visitors) if (vis(v.x, v.y)) items.push({ d: v.x + v.oy + v.y + v.ox, k: 4, o: v });
    for (const s of S.staff) if (!Z.STAFF[s.type].desk) items.push({ d: s.x + s.y + .05, k: 5, o: s });
    items.push({ d: EX + EY + 1.2, k: 7 });
    items.sort((a, b) => a.d - b.d);
    for (const it of items) {
      if (it.k === 0) {
        const cx = px(it.x + .5, it.y + .5), cy = py(it.x + .5, it.y + .5), h = hash(it.x * 7, it.y * 3), sz = 30 + h * 12;
        ctx.globalAlpha = Z.owned(it.x, it.y) ? 1 : .55; ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(cx, cy, 11, 5, 0, 0, 7); ctx.fill();
        emoji(ctx, P.trees[Math.floor(h * P.trees.length)], cx + h * 6 - 3, cy - sz * .42, sz); ctx.globalAlpha = 1;
      } else if (it.k === 1) drawBld(ctx, it.o.type, it.o.x, it.o.y, 1, it.o);
      else if (it.k === 2) fenceSeg(it.e, it.a[0], it.a[1], it.a[2], it.a[3]);
      else if (it.k === 3) {
        const a = it.o, sp = SP[a.sp], ax = px(a.x, a.y), ay = py(a.x, a.y), size = sp.size * (a.age < 1 ? .6 : a.age < sp.mat ? .8 : 1);
        ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(ax, ay, size * .4, size * .16, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(ax, ay - size * .4); if (a.dir > 0) ctx.scale(-1, 1); emoji(ctx, sp.e, 0, 0, size); ctx.restore();
        const st = a.sick ? '🤒' : a.hunger < 20 ? '🍖' : night ? '💤' : a.preg ? '🤰' : '';
        if (st) emoji(ctx, st, ax + size * .45, ay - size * .95, 11);
      } else if (it.k === 4) {
        const v = it.o, x = px(v.x + v.ox, v.y + v.oy), y = py(v.x + v.ox, v.y + v.oy), k = v.kid ? .72 : 1;
        ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(x, y, 5 * k, 2.4 * k, 0, 0, 7); ctx.fill();
        ctx.fillStyle = v.col; rr(ctx, x - 4 * k, y - 11 * k, 8 * k, 10 * k, 3 * k); ctx.fill();
        ctx.fillStyle = v.skin; ctx.beginPath(); ctx.arc(x, y - 14 * k, 3.6 * k, 0, 7); ctx.fill();
        if (ui.sel === v) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 8, 13, 0, 7); ctx.stroke(); }
      } else if (it.k === 5) {
        const s = it.o, d = Z.STAFF[s.type], x = px(s.x + s.ox, s.y + s.oy), y = py(s.x + s.ox, s.y + s.oy) - 12;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 10.5, 0, 7); ctx.fill(); ctx.strokeStyle = ui.sel === s ? '#000' : d.color; ctx.lineWidth = 2.5; ctx.stroke();
        emoji(ctx, d.icon, x, y + .5, 14);
        if (s.st === 'work') { ctx.fillStyle = '#333'; ctx.fillRect(x - 10, y - 17, 20, 4); ctx.fillStyle = d.color; ctx.fillRect(x - 10, y - 17, 20 * (1 - Z.clamp(s.t / s.task.dur, 0, 1)), 4); }
      } else if (it.k === 6) { emoji(ctx, it.ic, px(it.x, it.y), py(it.x, it.y) - it.s * .4, it.s); }
      else {
        box(ctx, EX - .25, EY + .7, .25, .25, 44, '#8a5a33', '#7a4b2a', '#633b20'); box(ctx, EX + 1, EY + .7, .25, .25, 44, '#8a5a33', '#7a4b2a', '#633b20');
        const ax = px(EX - .1, EY + .95), ay = py(EX - .1, EY + .95) - 44, bx = px(EX + 1.1, EY + .95), by = py(EX + 1.1, EY + .95) - 44;
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx, by - 15); ctx.lineTo(ax, ay - 15); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate((ax + bx) / 2, (ay + by) / 2 - 7.5); ctx.transform(1, .5, 0, 1, 0, 0); ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('ZOO', 0, 0); ctx.restore();
      }
    }
    // étiquettes
    for (const e of S.enclosures) {
      const cx = px(e.x + e.w / 2, e.y + e.h / 2), cy = py(e.x + e.w / 2, e.y + e.h / 2);
      if (e.bt > 0) { emoji(ctx, '🏗️', cx, cy - 14, 26); const tot = Z.enclBuildHours(e.w, e.h); ctx.fillStyle = '#333'; ctx.fillRect(cx - 30, cy + 6, 60, 5); ctx.fillStyle = '#f0c030'; ctx.fillRect(cx - 30, cy + 6, 60 * (1 - e.bt / tot), 5); }
      else if (ui.view && ui.view !== 'crowd' && e.animals.length) label(Math.round(ui.view === 'happy' ? Z.avg(e, 'happy') : e.clean) + ' %', cx, cy, 'rgba(0,0,0,.65)', 14);
      else if (e.animals.length) { let ic = ''; if (e.food <= 0) ic += '🍽️'; if (e.clean < 30) ic += '💩'; if (e.fence < 30) ic += '🔧'; if (!e.vp.length) ic += '🚫'; if (ic) { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, cx - 10 - ic.length * 3.2, cy - 52, 20 + ic.length * 6.4, 20, 10); ctx.fill(); emoji(ctx, ic, cx, cy - 41, 12); } }
      else if (!e.vp.length) emoji(ctx, '🚫', cx, cy - 6, 18);
    }
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
    const hr = S.minute / 60, dark = hr < 5 ? .42 : hr < 7 ? .42 * (7 - hr) / 2 : hr > 21.5 ? .42 : hr > 19 ? .42 * (hr - 19) / 2.5 : 0;
    if (dark > 0) { ctx.fillStyle = 'rgba(15,25,70,' + dark + ')'; ctx.fillRect(0, 0, cw, ch); }
    if (S.weather === 'rain') {
      const t = performance.now() / 4, snow = Z.mapDef && Z.mapDef().snow;
      if (snow) { ctx.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 140; i++) { const x = (hash(i, 1) * (cw + 200) + Math.sin(t / 40 + i) * 20) % (cw + 200) - 100, y = (hash(2, i) * ch + t * (.25 + hash(i, i) * .25)) % ch; ctx.fillRect(x, y, 2.5, 2.5); } }
      else { ctx.strokeStyle = 'rgba(190,215,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 120; i++) { const x = (hash(i, 1) * (cw + 200) + t * .3) % (cw + 200) - 100, y = (hash(2, i) * ch + t * (1 + hash(i, i))) % ch; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); } ctx.stroke(); }
      ctx.fillStyle = 'rgba(60,80,110,.12)'; ctx.fillRect(0, 0, cw, ch);
    }
  };
})();
