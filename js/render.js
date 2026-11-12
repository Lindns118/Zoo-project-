// Zoo Project — rendu
(function () {
  const { W, H, EX, EY, TILE: T } = Z;
  const SP = Z.SPECIES, BL = Z.BUILDINGS, idx = Z.idx, fmt = n => Z.fmt(n);
  const cam = Z.cam = { x: (EX + .5) * T, y: (H - 9) * T, z: 1 };
  let cv, ctx, dpr = 1, cw = 0, ch = 0;
  const SS = 1.5; // résolution de la couche statique
  const ground = document.createElement('canvas'); ground.width = W * T * SS; ground.height = H * T * SS;
  const g = ground.getContext('2d'); Z.groundCanvas = ground;
  Z.viewRect = () => ({ x: cam.x - cw / 2 / cam.z, y: cam.y - ch / 2 / cam.z, w: cw / cam.z, h: ch / cam.z });
  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000 / 1000;
  const emoji = (c, ch, x, y, px) => { c.font = px + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(ch, x, y); };
  function rr(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  Z.initRender = function (canvas) { cv = canvas; ctx = cv.getContext('2d'); resize(); window.addEventListener('resize', resize); };
  function resize() { dpr = Math.min(2, window.devicePixelRatio || 1); cw = window.innerWidth; ch = window.innerHeight; cv.width = cw * dpr; cv.height = ch * dpr; clampCam(); }
  function clampCam() { cam.z = Z.clamp(cam.z, .35, 2.6); cam.x = Z.clamp(cam.x, 0, W * T); cam.y = Z.clamp(cam.y, 0, H * T); }
  Z.clampCam = clampCam;
  Z.toWorld = (sx, sy) => ({ x: (sx - cw / 2) / cam.z + cam.x, y: (sy - ch / 2) / cam.z + cam.y });
  Z.toTile = (sx, sy) => { const w = Z.toWorld(sx, sy); return { x: Math.floor(w.x / T), y: Math.floor(w.y / T) }; };
  Z.focus = (tx, ty) => { cam.x = tx * T; cam.y = ty * T; clampCam(); };

  // ----- couche statique : sol, allées, enclos, bâtiments -----
  const DECO = { desert: ['🌵', '🪨', '🌵', '🏜️'], prehist: ['🌴', '🌿', '🦴', '🌋'], savane: ['🌾', '🌾', '🪨', '🌴'], foret: ['🌿', '🌳', '🌲', '🍄'], montagne: ['🪨', '🪨', '⛰️', '🌲'], aquatique: ['🪷', '🌾', '🪨'], polaire: ['🧊', '🧊', '🪨'] };
  function drawGround() {
    const S = Z.S; g.setTransform(SS, 0, 0, SS, 0, 0);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const h = hash(x, y); g.fillStyle = h < .33 ? '#84c25a' : h < .66 ? '#8bc960' : '#7fbd55'; g.fillRect(x * T, y * T, T, T);
      if (h > .86) { g.fillStyle = '#6fae49'; g.fillRect(x * T + h * 20, y * T + 10, 2, 5); g.fillRect(x * T + h * 20 + 4, y * T + 12, 2, 4); }
      else if (h < .04) emoji(g, '🌼', x * T + 16, y * T + 16, 9);
    }
    // enclos
    for (const e of S.enclosures) {
      const b = Z.BIOMES[e.biome], x = e.x * T, y = e.y * T, w = e.w * T, h = e.h * T;
      g.fillStyle = b.color; g.fillRect(x, y, w, h);
      for (let j = e.y; j < e.y + e.h; j++) for (let i = e.x; i < e.x + e.w; i++) { const hh = hash(i + 7, j + 3); if (hh < .5) { g.fillStyle = 'rgba(0,0,0,.035)'; g.fillRect(i * T, j * T, T, T); } }
      if (e.biome === 'aquatique' || e.biome === 'polaire') {
        const aq = e.biome === 'aquatique', pw = w * (aq ? .62 : .45), ph = h * (aq ? .55 : .45), px = x + (aq ? (w - pw) / 2 : w - pw - 8), py = y + (aq ? (h - ph) / 2 : h - ph - 8);
        g.fillStyle = aq ? '#c9bd86' : '#d5e8f2'; rr(g, px - 4, py - 4, pw + 8, ph + 8, 18); g.fill();
        g.fillStyle = aq ? '#4aa8d8' : '#6fbfe6'; rr(g, px, py, pw, ph, 15); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.45)'; g.lineWidth = 1.5;
        for (let k = 0; k < Math.max(2, pw / 40); k++) { const wx = px + 12 + hash(e.id, k) * (pw - 30), wy = py + 8 + hash(k, e.id) * (ph - 16); g.beginPath(); g.moveTo(wx, wy); g.lineTo(wx + 10, wy); g.stroke(); }
      }
      const deco = DECO[e.biome], dens = e.up.veg ? .3 : .12;
      for (let j = e.y; j < e.y + e.h; j++) for (let i = e.x; i < e.x + e.w; i++) { const hh = hash(i * 3 + e.id, j * 5); if (hh < dens) emoji(g, deco[Math.floor(hash(j, i) * deco.length)], i * T + 8 + hash(i, j * 2) * 16, j * T + 8 + hash(i * 2, j) * 16, 13 + hh * 30); }
      if (e.up.abri) emoji(g, '🛖', x + 18, y + 18, 26);
      if (e.up.jeux) emoji(g, '🪵', x + w - 18, y + 18, 20);
    }
    // allées
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (S.ground[idx(x, y)] !== 1) continue;
      g.fillStyle = Z.reach[idx(x, y)] ? '#e9d7ad' : '#cfc3a3'; g.fillRect(x * T, y * T, T, T);
      g.fillStyle = 'rgba(120,95,50,.16)'; const h = hash(x, y); g.fillRect(x * T + h * 24, y * T + (1 - h) * 24, 3, 3); g.fillRect(x * T + (1 - h) * 22, y * T + h * 20, 2, 2);
      g.fillStyle = '#b89f6b';
      const p = (i, j) => Z.inb(i, j) && S.ground[idx(i, j)] === 1;
      if (!p(x, y - 1)) g.fillRect(x * T, y * T, T, 2); if (!p(x, y + 1)) g.fillRect(x * T, y * T + T - 2, T, 2);
      if (!p(x - 1, y)) g.fillRect(x * T, y * T, 2, T); if (!p(x + 1, y)) g.fillRect(x * T + T - 2, y * T, 2, T);
    }
    // bâtiments
    for (const b of S.buildings) drawBuilding(g, b.type, b.x * T, b.y * T, 1);
    // entrée
    const ex = EX * T, ey = EY * T;
    g.fillStyle = '#7a4b2a'; g.fillRect(ex - 14, ey - 8, 8, 40); g.fillRect(ex + T + 6, ey - 8, 8, 40);
    g.fillStyle = '#c0392b'; rr(g, ex - 22, ey - 22, T + 44, 18, 6); g.fill();
    g.fillStyle = '#fff'; g.font = 'bold 12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('ZOO PROJECT', ex + 16, ey - 12.5);
    Z.groundDirty = false;
  }
  function drawBuilding(c, type, x, y, alpha) {
    const d = BL[type], s = d.size * T; c.globalAlpha = alpha;
    if (d.color) {
      c.fillStyle = 'rgba(0,0,0,.18)'; rr(c, x + 4, y + 6, s - 6, s - 6, 6); c.fill();
      c.fillStyle = '#f6efe2'; rr(c, x + 3, y + 3, s - 6, s - 6, 6); c.fill();
      c.fillStyle = d.color; rr(c, x + 3, y + 3, s - 6, s * .38, 6); c.fill();
      c.fillStyle = 'rgba(255,255,255,.5)'; for (let i = 0; i < d.size * 2; i++) c.fillRect(x + 7 + i * 14, y + 3, 6, s * .38);
      emoji(c, d.icon, x + s / 2, y + s * .64, s * .42);
    } else if (type === 'bench') {
      c.fillStyle = '#8a5a33'; rr(c, x + 4, y + 12, 24, 8, 2); c.fill(); c.fillStyle = '#a8703f'; rr(c, x + 4, y + 8, 24, 5, 2); c.fill();
      c.fillStyle = '#5c3a1e'; c.fillRect(x + 6, y + 20, 3, 5); c.fillRect(x + 23, y + 20, 3, 5);
    } else emoji(c, d.icon, x + 16, y + 16, type === 'bin' ? 18 : 26);
    c.globalAlpha = 1;
  }

  // ----- image -----
  Z.draw = function () {
    const S = Z.S, ui = Z.ui || {}; if (Z.groundDirty) drawGround();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = '#3c7a3a'; ctx.fillRect(0, 0, cw, ch);
    const z = cam.z; ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * (cw / 2 - cam.x * z), dpr * (ch / 2 - cam.y * z));
    ctx.fillStyle = '#2f6a30'; ctx.fillRect(-10, -10, W * T + 20, H * T + 20);
    ctx.drawImage(ground, 0, 0, W * T, H * T);
    const vx0 = cam.x - cw / 2 / z - 40, vx1 = cam.x + cw / 2 / z + 40, vy0 = cam.y - ch / 2 / z - 40, vy1 = cam.y + ch / 2 / z + 40;
    const vis = (x, y) => x > vx0 && x < vx1 && y > vy0 && y < vy1;
    // déchets
    for (let i = 0; i < W * H; i++) if (S.litter[i] > 0) { const x = (i % W) * T, y = ((i / W) | 0) * T; for (let k = 0; k < S.litter[i]; k++) emoji(ctx, k % 2 ? '🥤' : '🧻', x + 8 + hash(i, k) * 16, y + 8 + hash(k, i) * 16, 9); }
    // enclos : clôtures + animaux
    const night = Z.isNight();
    for (const e of S.enclosures) {
      const x = e.x * T, y = e.y * T, w = e.w * T, h = e.h * T;
      ctx.lineWidth = 3; ctx.strokeStyle = e.fence > 60 ? '#6b4423' : e.fence > 30 ? '#c77b1e' : '#d63a2f';
      ctx.setLineDash(e.fence > 30 ? [] : [8, 5]); ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3); ctx.setLineDash([]);
      ctx.fillStyle = '#4e3018'; for (let i = 0; i <= e.w; i++) { ctx.fillRect(x + i * T - 2 - (i === e.w ? 1 : -1), y - 1, 4, 5); ctx.fillRect(x + i * T - 2 - (i === e.w ? 1 : -1), y + h - 4, 4, 5); }
      if (ui.sel === e) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(x - 3, y - 3, w + 6, h + 6); ctx.setLineDash([]); }
      const list = e.animals.slice().sort((a, b) => a.y - b.y);
      for (const a of list) {
        const sp = SP[a.sp], ax = a.x * T, ay = a.y * T; if (!vis(ax, ay)) continue;
        const size = sp.size * (a.age < 1 ? .6 : a.age < sp.mat ? .8 : 1);
        ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.beginPath(); ctx.ellipse(ax, ay + size * .42, size * .4, size * .14, 0, 0, 7); ctx.fill();
        ctx.save(); ctx.translate(ax, ay); if (a.dir > 0) ctx.scale(-1, 1); emoji(ctx, sp.e, 0, 0, size); ctx.restore();
        const st = a.sick ? '🤒' : a.hunger < 20 ? '🍖' : night ? '💤' : a.preg ? '🤰' : '';
        if (st) emoji(ctx, st, ax + size * .45, ay - size * .5, 11);
      }
      if (e.animals.length) {
        let ic = ''; if (e.food <= 0) ic += '🍽️'; if (e.clean < 30) ic += '💩'; if (e.fence < 30) ic += '🔧'; if (!e.vp.length) ic += '🚫';
        if (ic) { ctx.fillStyle = 'rgba(255,255,255,.92)'; rr(ctx, x + w / 2 - 10 - ic.length * 3.2, y - 22, 20 + ic.length * 6.4, 20, 10); ctx.fill(); emoji(ctx, ic, x + w / 2, y - 11, 12); }
      } else if (!e.vp.length) emoji(ctx, '🚫', x + w / 2, y + h / 2, 18);
    }
    // chantiers
    for (const o of S.enclosures.concat(S.buildings)) {
      if (!(o.bt > 0)) continue; const [w, h] = Z.sizeOf(o), x = o.x * T, y = o.y * T, tot = o.kind === 'encl' ? Z.enclBuildHours(o.w, o.h) : Z.bldBuildHours(o.type);
      ctx.fillStyle = 'rgba(120,90,40,.55)'; ctx.fillRect(x, y, w * T, h * T);
      ctx.strokeStyle = 'rgba(240,200,40,.8)'; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.strokeRect(x + 2, y + 2, w * T - 4, h * T - 4); ctx.setLineDash([]);
      emoji(ctx, '🏗️', x + w * T / 2, y + h * T / 2 - 6, Math.min(28, w * T * .6));
      const bw = Math.min(w * T - 8, 60); ctx.fillStyle = '#333'; ctx.fillRect(x + w * T / 2 - bw / 2, y + h * T / 2 + 12, bw, 5); ctx.fillStyle = '#f0c030'; ctx.fillRect(x + w * T / 2 - bw / 2, y + h * T / 2 + 12, bw * (1 - o.bt / tot), 5);
    }
    // terrains non acquis
    for (const p of Z.PARCELS) {
      if (S.land[p.id]) continue; const x = p.x * T, y = p.y * T, w = p.w * T, h = p.h * T, ok = p.lvl <= S.level && Z.adjacentOwned(p);
      ctx.fillStyle = ok ? 'rgba(20,30,10,.35)' : 'rgba(10,15,5,.55)'; ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); ctx.setLineDash([]);
      const cx = x + w / 2, cy = y + h / 2, label = ok ? '🗺️ À vendre · ' + fmt(p.price) : '🔒 Niveau ' + p.lvl;
      ctx.font = 'bold 14px sans-serif'; const tw = ctx.measureText(label).width + 20;
      ctx.fillStyle = ok ? 'rgba(47,143,78,.92)' : 'rgba(30,30,30,.7)'; rr(ctx, cx - tw / 2, cy - 14, tw, 28, 14); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, cx, cy + 1);
    }
    // vues en surimpression
    if (ui.view) {
      const col = v => 'hsla(' + Math.round(Z.clamp(v, 0, 100) * 1.2) + ',85%,45%,.55)';
      if (ui.view === 'crowd') {
        const cnt = {}; for (const v of S.visitors) { const t = Z.idx(Math.floor(v.x), Math.floor(v.y)); cnt[t] = (cnt[t] || 0) + 1; }
        for (const t in cnt) { ctx.fillStyle = 'rgba(220,30,30,' + Math.min(.8, cnt[t] / 8) + ')'; ctx.fillRect((t % W) * T, ((t / W) | 0) * T, T, T); }
      } else {
        if (ui.view === 'clean') for (let i = 0; i < W * H; i++) if (S.litter[i] > 0) { ctx.fillStyle = 'rgba(220,30,30,.6)'; ctx.fillRect((i % W) * T, ((i / W) | 0) * T, T, T); }
        for (const e of S.enclosures) {
          if (!e.animals.length) continue; const v = ui.view === 'happy' ? Z.avg(e, 'happy') : e.clean;
          ctx.fillStyle = col(v); ctx.fillRect(e.x * T, e.y * T, e.w * T, e.h * T);
          ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.6)'; ctx.fillStyle = '#fff';
          const tx = (e.x + e.w / 2) * T, ty = (e.y + e.h / 2) * T; ctx.strokeText(Math.round(v) + ' %', tx, ty); ctx.fillText(Math.round(v) + ' %', tx, ty);
        }
      }
    }
    // sélection bâtiment
    if (ui.sel && ui.sel.kind === 'bld') { const s = BL[ui.sel.type].size * T; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(ui.sel.x * T - 2, ui.sel.y * T - 2, s + 4, s + 4); ctx.setLineDash([]); }
    // visiteurs
    for (const v of S.visitors) {
      const x = (v.x + v.ox) * T, y = (v.y + v.oy) * T; if (!vis(x, y)) continue; const k = v.kid ? .72 : 1;
      ctx.fillStyle = 'rgba(0,0,0,.2)'; ctx.beginPath(); ctx.ellipse(x, y + 5 * k, 5 * k, 2.2 * k, 0, 0, 7); ctx.fill();
      ctx.fillStyle = v.col; rr(ctx, x - 4 * k, y - 4 * k, 8 * k, 9 * k, 3 * k); ctx.fill();
      ctx.fillStyle = v.skin; ctx.beginPath(); ctx.arc(x, y - 7 * k, 3.6 * k, 0, 7); ctx.fill();
      if (ui.sel === v) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y - 2, 12, 0, 7); ctx.stroke(); }
    }
    // personnel
    for (const s of S.staff) {
      if (Z.STAFF[s.type].desk) continue;
      const d = Z.STAFF[s.type], x = (s.x + s.ox) * T, y = (s.y + s.oy) * T;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y - 4, 10.5, 0, 7); ctx.fill();
      ctx.strokeStyle = ui.sel === s ? '#000' : d.color; ctx.lineWidth = 2.5; ctx.stroke();
      emoji(ctx, d.icon, x, y - 3.5, 14);
      if (s.st === 'work') { ctx.fillStyle = '#333'; ctx.fillRect(x - 10, y - 20, 20, 4); ctx.fillStyle = d.color; ctx.fillRect(x - 10, y - 20, 20 * (1 - Z.clamp(s.t / s.task.dur, 0, 1)), 4); }
    }
    // aperçu de construction
    const gh = ui.ghost;
    if (gh) {
      ctx.fillStyle = gh.ok ? 'rgba(80,220,120,.38)' : 'rgba(230,60,50,.42)'; ctx.fillRect(gh.x * T, gh.y * T, gh.w * T, gh.h * T);
      ctx.strokeStyle = gh.ok ? '#1e9c4a' : '#b3261e'; ctx.lineWidth = 2; ctx.strokeRect(gh.x * T, gh.y * T, gh.w * T, gh.h * T);
      if (gh.type) drawBuilding(ctx, gh.type, gh.x * T, gh.y * T, .75);
    }
    // nuit et pluie
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const hr = S.minute / 60, dark = hr < 5 ? .42 : hr < 7 ? .42 * (7 - hr) / 2 : hr > 21.5 ? .42 : hr > 19 ? .42 * (hr - 19) / 2.5 : 0;
    if (dark > 0) { ctx.fillStyle = 'rgba(15,25,70,' + dark + ')'; ctx.fillRect(0, 0, cw, ch); }
    if (S.weather === 'rain') {
      ctx.strokeStyle = 'rgba(190,215,255,.5)'; ctx.lineWidth = 1; ctx.beginPath(); const t = performance.now() / 4;
      for (let i = 0; i < 120; i++) { const x = (hash(i, 1) * (cw + 200) + t * .3) % (cw + 200) - 100, y = (hash(2, i) * ch + t * (1 + hash(i, i))) % ch; ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 12); }
      ctx.stroke(); ctx.fillStyle = 'rgba(60,80,110,.12)'; ctx.fillRect(0, 0, cw, ch);
    }
  };
})();
