// Zoo Project — dessins des animaux et des bâtiments (plus d'émojis sur la carte)
(function () {
  const SP = Z.SPECIES, BL = Z.BUILDINGS, I = Z.iso;
  const el = (c, x, y, rx, ry, col) => { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, 7); c.fill(); };
  const ln = (c, p, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.stroke(); };
  const tri = (c, p, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]); c.closePath(); c.fill(); };
  const sh = (hex, f) => I.shade(hex, f);
  const hs = (i, j) => (((i * 73856093) ^ (j * 19349663)) >>> 0) % 1000 / 1000;

  // t = silhouette · c = robe · c2 = ventre · L/H = corps · leg/neck/hd = pattes, cou, tête · pat = motif
  const D = {
    zebre: { c: '#f4f4f4', pat: 'stripes', pc: '#222', leg: 9, neck: 4, mane2: '#333', sn: .6 },
    kangourou: { t: 'kang', c: '#b98a5a', c2: '#e6cfae' },
    girafe: { c: '#ecc15a', pat: 'spots', pc: '#a8682a', leg: 14, neck: 17, L: 15, H: 8, hd: 3.6, horn: 'ossi', nw: 3.4, tuft: '#5a3a1a' },
    lion: { c: '#d9a441', c2: '#ecd09a', mane: '#8a5a1e', tuft: '#6b4a1e', leg: 7, L: 17, ear: 1.4 },
    rhino: { c: '#8f9296', L: 19, H: 11, leg: 6, lw: 3.6, hd: 5.4, horn: 'rhino', tail: 4, sn: .8 },
    elephant: { c: '#8f929a', L: 19, H: 13, leg: 8, lw: 4.2, hd: 6.2, trunk: 1, bigEar: 1, tail: 5, sn: .3 },
    singe: { t: 'primate', c: '#7a5230', face: '#e6c29a', tail: 1 },
    paon: { t: 'bird', b: 'peacock', c: '#1f6fb5', fc: '#8a6a4a' },
    tigre: { c: '#e8862a', c2: '#f6ead8', pat: 'stripes', pc: '#2a1a10', leg: 7, L: 18, ear: 1.3 },
    gorille: { t: 'primate', c: '#34343a', face: '#55555c', big: 1, silver: '#9a9aa2' },
    panda: { c: '#f6f6f2', lc: '#222', H: 11, L: 15, leg: 6, lw: 3.4, hd: 5.4, ec: '#222', ear: 1.9, patch: 1, tail: 0 },
    chevre: { c: '#a8845a', c2: '#d9c3a0', horn: 'goat', leg: 7, L: 13, beard: 1, tail: 3 },
    lama: { c: '#f0e6d2', leg: 9, neck: 8, L: 13, H: 9, wool: 1, hd: 3.6, nw: 3.6, tail: 3, ear: 1.2 },
    loup: { c: '#8a8f96', c2: '#c9ccd0', leg: 7, L: 15, ear: 1.5, earP: 1, tw: 3, tail: 7, sn: .7 },
    ours: { c: '#6b4423', L: 17, H: 12, leg: 6, lw: 3.6, hd: 5.2, ear: 1.6, tail: 0, sc: '#9a7a52' },
    flamant: { t: 'bird', b: 'tall', c: '#f48aa8', bk: '#222' },
    loutre: { c: '#6b4a32', c2: '#b89a78', L: 17, H: 6, leg: 3, hd: 3.6, tw: 3, tail: 9 },
    croco: { t: 'rept', c: '#5a7a3a', c2: '#9ab06a', L: 24 },
    hippo: { c: '#8a707c', L: 19, H: 12, leg: 5, lw: 4, hd: 6.4, sn: .9, tail: 3, ear: 1 },
    manchot: { t: 'bird', b: 'peng', c: '#22252b' },
    phoque: { t: 'seal', c: '#8d949c', c2: '#c3c8ce' },
    ourspol: { c: '#f4f2ea', L: 18, H: 12, leg: 6, lw: 3.6, hd: 5, ear: 1.2, tail: 0, sn: .75 },
    buffle: { c: '#3d2f2a', L: 18, H: 11, leg: 6, lw: 3.4, hd: 5, horn: 'bull', tail: 6 },
    leopard: { c: '#e2b343', c2: '#f3e3b8', pat: 'spots', pc: '#3a2a10', leg: 7, L: 17, tail: 9 },
    cerf: { c: '#a8683a', c2: '#dcc09a', horn: 'antler', leg: 10, neck: 5, L: 14, hd: 3.8, tail: 2, babySpots: 1 },
    raton: { c: '#8a8a8a', L: 12, H: 7, leg: 4, hd: 3.8, mask: 1, tw: 3.2, tail: 7, tc: '#444' },
    perroquet: { t: 'bird', b: 'small', c: '#d8342c', wc: '#2a62c9', bk: '#333', tailc: '#f1c40f' },
    aigle: { t: 'bird', b: 'small', c: '#5a3d24', wc: '#3d2a18', hc: '#f4f2ea', bk: '#e8b020', big: 1 },
    bison: { c: '#5a3d28', L: 19, H: 11, leg: 6, lw: 3.4, hd: 5.4, hump: 1, horn: 'bull', beard: 1, tail: 5 },
    paresseux: { t: 'primate', c: '#a89878', face: '#e0d2b4', slow: 1 },
    koala: { t: 'primate', c: '#9a9da2', face: '#b8bbc0', koala: 1 },
    orang: { t: 'primate', c: '#c8641e', face: '#8a5a3a', big: .6, flange: 1 },
    chameau: { c: '#c9a063', leg: 11, neck: 9, L: 16, H: 9, hump: 1, hd: 3.8, nw: 3.4, tail: 4 },
    varan: { t: 'rept', c: '#6a7a4a', c2: '#b0b890', L: 18 },
    serpent: { t: 'snake', c: '#7a8a3a', pc: '#4a5520' },
    scorpion: { t: 'bug', c: '#5a3a1a' },
    cygne: { t: 'bird', b: 'swan', c: '#fafafa', bk: '#e8762a' },
    castor: { c: '#6b4a2a', L: 13, H: 8, leg: 3, hd: 4, flat: 1, tail: 0 },
    tortue: { t: 'turtle', c: '#6a7a3a', c2: '#8a9a5a' },
    diplo: { c: '#6a9a6e', c2: '#a9cfa0', L: 24, H: 12, leg: 9, lw: 4.4, neck: 22, hd: 3.6, nw: 4.2, tail: 20, tw: 4.5, tc: '#6a9a6e', ear: 0 },
    trex: { t: 'trex', c: '#7a6a3a', c2: '#b7a56a' },
  };

  function quad(c, o, ph, m, baby, lie, a) {
    const L = o.L || 16, Hb = o.H || 9, leg = (o.leg || 8) * (baby ? .85 : 1) * (lie ? .12 : 1), nk = (o.neck || 2) * (baby ? .8 : 1), hd = (o.hd || 4.6) * (baby ? 1.18 : 1);
    const c1 = o.c, dk = sh(c1, .74), lc = o.lc || c1, lw = o.lw || 2.6, by = -(leg + Hb / 2), sw = lie ? 0 : Math.sin(ph) * 2.4;
    ln(c, [-L * .3 + 1.6, by + 1, -L * .3 + 1.6 - sw, 0], sh(lc, .7), lw); ln(c, [L * .3 + 1.6, by + 1, L * .3 + 1.6 + sw, 0], sh(lc, .7), lw);
    if (o.tail !== 0) { const tl = o.tail || 6, tx = -L / 2 - tl * .7, ty = by + tl * .45; ln(c, [-L / 2 + 1.5, by - 1, tx, ty], o.tc || dk, o.tw || 1.5); if (o.tuft) el(c, tx, ty, 1.9, 1.9, o.tuft); }
    if (o.flat) el(c, -L / 2 - 3, by + 2, 4.5, 1.8, '#3d2a18');
    el(c, 0, by, L / 2, Hb / 2, c1);
    if (o.hump) el(c, -1, by - Hb * .42, L * .24, Hb * .34, c1);
    if (o.wool) for (let i = -2; i <= 2; i++) el(c, i * L * .17, by - Hb * .38, L * .13, Hb * .22, c1);
    c.save(); c.beginPath(); c.ellipse(0, by, L / 2, Hb / 2, 0, 0, 7); c.clip();
    if (o.c2) { c.fillStyle = o.c2; c.fillRect(-L, by + Hb * .18, L * 2, Hb); }
    if (o.pat === 'stripes') for (let i = -3; i <= 3; i++) ln(c, [i * L * .13, by - Hb, i * L * .13 - 1.2, by + Hb], o.pc, 1.1);
    if (o.pat === 'spots' || (baby && o.babySpots)) for (let i = 0; i < 11; i++) el(c, (hs(i, 3) - .5) * L * .9, by + (hs(3, i) - .5) * Hb * .8, 1.2, 1, o.pc || '#fff');
    c.restore();
    ln(c, [-L * .3, by + 1, -L * .3 + sw, 0], lc, lw); ln(c, [L * .3, by + 1, L * .3 - sw, 0], lc, lw);
    const hx = L / 2 + nk * .42 + hd * .45, hy = by - Hb * .22 - nk;
    ln(c, [L / 2 - 2.6, by - Hb * .12, hx - hd * .35, hy + hd * .3], c1, o.nw || Hb * .52);
    if (o.pat === 'spots' && nk > 8) for (let i = 1; i < 5; i++) el(c, L / 2 - 2 + (hx - L / 2) * i / 5, by - Hb * .1 + (hy - by) * i / 5, 1, 1, o.pc);
    if (o.mane2) ln(c, [L / 2 - 3, by - Hb * .4, hx - hd * .6, hy - hd * .5], o.mane2, 1.6);
    if (m && !baby && o.mane) el(c, hx - hd * .55, hy + .6, hd * 1.55, hd * 1.5, o.mane);
    if (o.bigEar) el(c, hx - hd * .7, hy + hd * .1, hd * .85, hd * 1.05, sh(c1, .86));
    el(c, hx, hy, hd, hd * .82, c1);
    if (o.patch) el(c, hx + hd * .3, hy - hd * .1, hd * .34, hd * .42, '#222');
    if (o.mask) el(c, hx + hd * .25, hy - hd * .1, hd * .5, hd * .3, '#333');
    if (!o.trunk) el(c, hx + hd * .75, hy + hd * .25, hd * (o.sn || .55), hd * .42, o.sc || (o.c2 || c1));
    if (o.ear !== 0) { const e = o.ear || 1.5; if (o.earP) tri(c, [hx - hd * .7, hy - hd * .5, hx - hd * .3, hy - hd * 1.5, hx, hy - hd * .6], o.ec || dk); else el(c, hx - hd * .45, hy - hd * .78, e, e * 1.2, o.ec || dk); }
    el(c, hx + hd * .3, hy - hd * .12, .85, .85, '#111');
    if (o.beard) ln(c, [hx + hd * .5, hy + hd * .6, hx + hd * .4, hy + hd * 1.3], dk, 1.4);
    if (o.trunk) { ln(c, [hx + hd * .7, hy + hd * .1, hx + hd * 1.3, hy + hd * 1.2, hx + hd * 1.1, hy + hd * 2.3 + (lie ? -3 : 0)], c1, hd * .42); if (!baby) ln(c, [hx + hd * .6, hy + hd * .55, hx + hd * (m ? 1.9 : 1.4), hy + hd * .9], '#fbf6e6', 1.5); }
    if (baby) return;
    const hh = m ? 1 : .55;
    if (o.horn === 'rhino') { tri(c, [hx + hd * .9, hy + hd * .1, hx + hd * 1.5, hy - hd * (.9 * hh + .3), hx + hd * 1.25, hy + hd * .3], '#e9e2d0'); }
    else if (o.horn === 'goat') { c.strokeStyle = '#5a4a3a'; c.lineWidth = 1.7; c.beginPath(); c.arc(hx - hd * .9, hy - hd * .9, hd * (.7 + .7 * hh), -1.2, .4); c.stroke(); }
    else if (o.horn === 'bull') { c.strokeStyle = '#e9e2d0'; c.lineWidth = 1.7; c.beginPath(); c.arc(hx - hd * .1, hy - hd * 1.1, hd * (.5 + .4 * hh), .3, 2.6); c.stroke(); }
    else if (o.horn === 'ossi') { ln(c, [hx - hd * .1, hy - hd * .7, hx - hd * .1, hy - hd * 1.5], '#7a5a2a', 1.3); ln(c, [hx + hd * .3, hy - hd * .7, hx + hd * .3, hy - hd * 1.4], '#7a5a2a', 1.3); }
    else if (o.horn === 'antler' && m) { const ax = hx - hd * .2, ay = hy - hd * .7; ln(c, [ax, ay, ax - 2, ay - 7, ax - 5, ay - 9], '#6b4a2a', 1.4); ln(c, [ax - 1.2, ay - 4, ax + 3, ay - 8], '#6b4a2a', 1.3); ln(c, [ax - 2, ay - 7, ax + 1, ay - 11], '#6b4a2a', 1.2); }
  }
  function bird(c, o, ph, m, baby, lie) {
    const b = o.b, c1 = !m && o.fc ? o.fc : o.c;
    if (b === 'peng') { el(c, 0, -8, 5.2, 8, c1); el(c, 1, -7, 3.4, 6, '#fff'); el(c, 0, -15.5, 3.6, 3.4, c1); tri(c, [3, -16, 6.5, -15, 3, -14.3], '#f2a020'); el(c, 1.6, -16, .7, .7, '#fff'); ln(c, [-2, 0, 1, 0], '#f2a020', 2); ln(c, [2, 0, 5, 0], '#f2a020', 2); ln(c, [-4.5, -10, -6 - Math.sin(ph) * 1.5, -4], c1, 2.2); return; }
    const leg = b === 'tall' ? 13 : b === 'swan' ? 2 : 5, L = b === 'small' ? 9 : 12, Hh = b === 'small' ? 7 : 8, by = -(lie ? 2 : leg) - Hh / 2, sw = lie ? 0 : Math.sin(ph) * 2;
    if (!lie && b !== 'swan') { ln(c, [-1, by + 2, -1 + sw, 0], b === 'tall' ? '#d9607e' : '#c9952a', 1.2); ln(c, [2, by + 2, 2 - sw, 0], b === 'tall' ? '#d9607e' : '#c9952a', 1.2); }
    if (b === 'peacock' && m && !baby) { for (let i = 0; i < 11; i++) { const an = -Math.PI * (.12 + i * .076), r = 17; ln(c, [-3, by, -3 + Math.cos(an) * r * -1, by + Math.sin(an) * r], '#2e9d6a', 2.4); el(c, -3 - Math.cos(an) * r, by + Math.sin(an) * r, 2, 2, '#1b4fa8'); el(c, -3 - Math.cos(an) * r, by + Math.sin(an) * r, .9, .9, '#f2c230'); } }
    else if (b !== 'small') tri(c, [-L / 2 + 1, by - 2, -L / 2 - 6, by + (b === 'peacock' ? 5 : 1), -L / 2 + 2, by + 3], sh(c1.length === 7 ? c1 : '#888888', .8));
    if (o.tailc) tri(c, [-L / 2 + 1, by, -L / 2 - 7, by + 6, -L / 2 + 2, by + 3], o.tailc);
    el(c, 0, by, L / 2, Hh / 2, c1); el(c, -1, by - .5, L * .32, Hh * .3, o.wc || sh(c1, .86));
    const nk = b === 'tall' ? 12 : b === 'swan' ? 9 : b === 'peacock' ? 6 : 2, hx = L / 2 + (b === 'small' ? 0 : 2), hy = by - Hh * .3 - nk;
    if (nk > 3) { c.strokeStyle = c1; c.lineWidth = 2.1; c.lineCap = 'round'; c.beginPath(); c.moveTo(L / 2 - 2, by - 1); c.quadraticCurveTo(L / 2 + 5, by - nk * .5, hx, hy + 1); c.stroke(); }
    el(c, hx, hy, b === 'small' ? 3.2 : 2.5, b === 'small' ? 3 : 2.3, o.hc || c1); el(c, hx + .9, hy - .4, .7, .7, '#111');
    tri(c, [hx + 2, hy - 1, hx + (b === 'tall' ? 6 : 5), hy + (b === 'tall' || o.big ? 2.2 : .3), hx + 2, hy + 1.4], o.bk || '#e8b020');
    if (b === 'peacock') ln(c, [hx, hy - 2, hx - 1, hy - 5], c1, .9);
  }
  function primate(c, o, ph, m, baby, lie) {
    const g = 1 + (o.big || 0) * .45, c1 = o.c, dk = sh(c1, .75), sw = lie || o.slow ? 0 : Math.sin(ph) * 2;
    if (o.tail) { c.strokeStyle = dk; c.lineWidth = 1.4; c.beginPath(); c.moveTo(-5, -7); c.quadraticCurveTo(-13, -10, -10, -17); c.stroke(); }
    ln(c, [-3 * g, -5 * g, -4 * g - sw, 0], dk, 2.6 * g); ln(c, [3.5 * g, -6 * g, 5 * g + sw, 0], dk, 2.4 * g);
    el(c, 0, -8 * g, 6.2 * g, 6.6 * g, c1);
    if (m && !baby && o.silver) el(c, -2.2 * g, -9.5 * g, 3.4 * g, 3.6 * g, o.silver);
    ln(c, [-2 * g, -5 * g, -3 * g + sw, 0], c1, 2.6 * g); ln(c, [4.5 * g, -8 * g, 6.5 * g - sw, -1], c1, 2.3 * g);
    const hx = 3.5 * g, hy = -15.5 * g, hr = (baby ? 4.6 : 4) * g;
    if (o.koala) { el(c, hx - hr * .9, hy - hr * .6, hr * .6, hr * .6, c1); el(c, hx + hr * .9, hy - hr * .6, hr * .6, hr * .6, c1); } else { el(c, hx - hr * .95, hy, hr * .32, hr * .4, o.face); }
    if (m && !baby && o.flange) el(c, hx, hy + .5, hr * 1.35, hr * 1.05, sh(o.face, .8));
    el(c, hx, hy, hr, hr * .95, c1); el(c, hx + hr * .2, hy + hr * .15, hr * .68, hr * .66, o.face);
    el(c, hx + hr * .05, hy - hr * .05, .75, .75, '#111'); el(c, hx + hr * .5, hy - hr * .05, .75, .75, '#111');
    if (o.koala) el(c, hx + hr * .3, hy + hr * .3, hr * .22, hr * .3, '#222');
  }
  function rept(c, o, ph, m, baby, lie) {
    const L = o.L, c1 = o.c, sw = lie ? 0 : Math.sin(ph) * 1.6;
    tri(c, [-L * .22, -5, -L * .22, -1.5, -L * .72, -2], c1);
    ln(c, [-L * .16, -2.5, -L * .2 - sw, 0], sh(c1, .75), 2); ln(c, [L * .14, -2.5, L * .18 + sw, 0], sh(c1, .75), 2);
    el(c, 0, -3.6, L * .27, 3.3, c1); c.fillStyle = o.c2; c.fillRect(-L * .24, -2.4, L * .48, 1.3);
    for (let i = -3; i <= 3; i++) tri(c, [i * L * .06 - 1, -6.4, i * L * .06, -8, i * L * .06 + 1, -6.4], sh(c1, .8));
    el(c, L * .33, -3.6, L * .15, 2.5, c1); el(c, L * .45, -3.2, L * .1, 1.7, c1); el(c, L * .3, -5, .8, .8, '#f2d020'); el(c, L * .3, -5, .4, .4, '#111');
    ln(c, [-L * .1, -2.5, -L * .12 + sw, 0], c1, 2); ln(c, [L * .2, -2.5, L * .23 - sw, 0], c1, 2);
  }
  const OTHER = {
    snake(c, o, ph) { c.strokeStyle = o.c; c.lineWidth = 3.4; c.lineCap = 'round'; c.beginPath(); for (let i = 0; i <= 20; i++) { const x = -11 + i * 1.1, y = -2.5 + Math.sin(i * .7 + ph * .5) * 2.2; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.strokeStyle = o.pc; c.lineWidth = 1; c.setLineDash([1.5, 2.5]); c.stroke(); c.setLineDash([]); el(c, 12, -3 + Math.sin(14 + ph * .5) * 2.2, 2.6, 2, o.c); el(c, 13, -3.6 + Math.sin(14 + ph * .5) * 2.2, .6, .6, '#111'); },
    bug(c, o, ph) { for (let i = 0; i < 4; i++) { ln(c, [i * 2 - 3, -2.5, i * 2 - 4, 0], sh(o.c, .8), .9); ln(c, [i * 2 - 3, -2.5, i * 2 - 2, 0], sh(o.c, .8), .9); } el(c, 0, -3, 5, 2.6, o.c); c.strokeStyle = o.c; c.lineWidth = 1.8; c.beginPath(); c.arc(-6, -7, 4.5, 1.2, 4.6); c.stroke(); tri(c, [-4, -11.5, -1.5, -11, -4, -9.8], '#2a1a08'); ln(c, [4.5, -3.5, 8, -5 + Math.sin(ph) * .8], o.c, 1.5); el(c, 8.6, -5, 1.6, 1.1, o.c); },
    seal(c, o, ph) { tri(c, [-8, -3.5, -14, -6, -13, -1], sh(o.c, .8)); el(c, 0, -4.5, 10, 4.6, o.c); el(c, 1, -3, 7, 2.6, o.c2); el(c, 8.5, -7.5, 4, 3.6, o.c); el(c, 10, -8, .8, .8, '#111'); el(c, 12, -6.6, .9, .7, '#333'); ln(c, [3, -2.5, 5 + Math.sin(ph) * 1.5, 0], sh(o.c, .75), 2.4); },
    turtle(c, o, ph) { const sw = Math.sin(ph); ln(c, [-5, -2.5, -6 - sw, 0], o.c2, 2.4); ln(c, [5, -2.5, 6 + sw, 0], o.c2, 2.4); el(c, 9.5, -5, 3, 2.4, o.c2); el(c, 10.6, -5.5, .6, .6, '#111'); c.fillStyle = o.c; c.beginPath(); c.ellipse(0, -3, 8.5, 7.5, 0, Math.PI, 0); c.closePath(); c.fill(); c.strokeStyle = sh(o.c, .7); c.lineWidth = .9; c.beginPath(); c.moveTo(-4, -3); c.lineTo(-2, -9.6); c.moveTo(4, -3); c.lineTo(2, -9.6); c.moveTo(-7.5, -6); c.lineTo(7.5, -6); c.stroke(); },
    kang(c, o, ph, m, baby, lie) { const hop = lie ? 0 : -Math.abs(Math.sin(ph * .6)) * 3; c.save(); c.translate(0, hop); ln(c, [-4, -6, -13, -1], o.c, 3.2); ln(c, [-1, -6, 3, -1, 7, 0], sh(o.c, .8), 3); c.save(); c.translate(0, -9); c.rotate(-.5); el(c, 0, 0, 7.5, 4.8, o.c); el(c, 1, 1.5, 5, 2.4, o.c2); c.restore(); ln(c, [4, -12, 7, -9], sh(o.c, .8), 1.5); el(c, 7.5, -16, 3.4, 2.8, o.c); el(c, 10, -15.3, 1.8, 1.4, o.c); el(c, 6.5, -20, 1, 2.6, o.c); el(c, 8.2, -19.6, 1, 2.4, sh(o.c, .85)); el(c, 8.6, -16.6, .7, .7, '#111'); if (!m && !baby) el(c, 2.5, -7, 1.6, 1.6, sh(o.c, 1.15)); c.restore(); },
    trex(c, o, ph, m, baby, lie) { const sw = lie ? 0 : Math.sin(ph) * 3; tri(c, [-5, -15, -5, -9, -22, -11], o.c); ln(c, [-1, -9, -2 - sw, 0], sh(o.c, .72), 3.6); c.save(); c.translate(1, -13); c.rotate(-.28); el(c, 0, 0, 9.5, 6, o.c); el(c, 1, 2.2, 7, 2.6, o.c2); c.restore(); ln(c, [2, -9, 3 + sw, 0], o.c, 3.8); ln(c, [7, -13, 10, -10], sh(o.c, .8), 1.4); ln(c, [6, -17, 10, -21], o.c, 4.4); el(c, 12.5, -22, 5.4, 3.8, o.c); c.fillStyle = o.c; c.fillRect(11, -21, 7.5, 2.6); c.fillStyle = sh(o.c, .8); c.fillRect(11, -18.6, 6.5, 1.8); for (let i = 0; i < 4; i++) tri(c, [12 + i * 1.6, -18.6, 12.8 + i * 1.6, -17.2, 13.6 + i * 1.6, -18.6], '#fff'); el(c, 12, -23.2, .9, .9, '#f2d020'); el(c, 12.2, -23.2, .45, .45, '#111'); },
  };
  // Dessine un animal : pieds en (x, y). Renvoie sa hauteur à l'écran (pour placer l'icône d'état).
  Z.animalScale = function (a) { const sp = SP[a.sp]; return sp.size / 24 * (a.age >= sp.mat ? 1 : .42 + .58 * a.age / sp.mat) * (a.sex === 'M' ? 1.06 : .95); };
  Z.drawAnimal = function (c, a, x, y, right, night) {
    const o = D[a.sp]; if (!o) return 0;
    const sp = SP[a.sp], baby = a.age < sp.mat * .5, m = a.sex === 'M', k = Z.animalScale(a), lie = night || a.health < 25, ph = lie || a.wait > 0 ? 0 : (a.x + a.y) * 16;
    c.fillStyle = 'rgba(0,0,0,.2)'; c.beginPath(); c.ellipse(x, y, 10 * k, 3.6 * k, 0, 0, 7); c.fill();
    c.save(); c.translate(x, y); c.scale(right ? k : -k, k);
    const oo = m && !baby ? o : Object.assign({}, o, { c: sh(o.c, baby ? 1.07 : 1.03) });
    const t = o.t || 'quad'; if (t === 'quad') quad(c, oo, ph, m, baby, lie, a); else if (t === 'bird') bird(c, oo, ph, m, baby, lie); else if (t === 'primate') primate(c, oo, ph, m, baby, lie); else if (t === 'rept') rept(c, oo, ph, m, baby, lie); else OTHER[t](c, oo, ph, m, baby, lie);
    c.restore();
    return k * (t === 'quad' ? (o.leg || 8) + (o.H || 9) + (o.neck || 2) + 6 : t === 'trex' ? 27 : t === 'kang' || t === 'primate' ? 22 : t === 'bird' ? (o.b === 'tall' ? 30 : 20) : 10);
  };
  // Portrait pour la fiche de l'animal
  const pcache = new Map();
  Z.animalPortrait = function (a) { const key = a.id + ':' + Math.floor(a.age * 4); if (pcache.has(key)) return pcache.get(key); if (pcache.size > 60) pcache.clear(); const url = portrait(a); pcache.set(key, url); return url; };
  function portrait(a) { const cv = document.createElement('canvas'); cv.width = 220; cv.height = 150; const c = cv.getContext('2d'); c.fillStyle = Z.BIOMES[SP[a.sp].b].color; c.fillRect(0, 0, 220, 150); c.save(); c.translate(110, 128); const k = Math.min(3.4, 78 / (SP[a.sp].size * 1.25)); c.scale(k, k); Z.drawAnimal(c, Object.assign({}, a, { wait: 1, x: 0, y: 0 }), 0, 0, true, false); c.restore(); return cv.toDataURL(); }

  // ================= Bâtiments =================
  function house(c, x, y, s, up, rh, wall, roof, sign) {
    const m = .1, x0 = x + m, y0 = y + m, w = s - 2 * m, P = (a, b, h) => [I.px(a, b), I.py(a, b) - h];
    I.box(c, x0, y0, w, w, up, roof, wall, sh(wall, .86)); const door = I.box.door, win = I.box.win;
    const c0 = P(x0, y0, up), c1 = P(x0 + w, y0, up), c2 = P(x0 + w, y0 + w, up), c3 = P(x0, y0 + w, up), mA = P(x0, y0 + w / 2, up + rh), mB = P(x0 + w, y0 + w / 2, up + rh);
    const flat = q => [].concat(...q);
    tri(c, flat([c0, c3, mA]), sh(wall, .93)); tri(c, flat([c1, c2, mB]), sh(wall, .93));
    const A = [c0, c1, mB, mA], B = [c3, c2, mB, mA], ya = c0[1] + c1[1], yb = c3[1] + c2[1];
    tri(c, flat(ya < yb ? A : B), sh(roof, .82)); tri(c, flat(ya < yb ? B : A), roof);
    c.fillStyle = '#6b4a2f'; c.fillRect(door[0] - 3.5, door[1] - up * .55, 7, up * .55);
    c.fillStyle = '#bfe3f2'; c.fillRect(win[0] - 4, win[1] - up * .72, 8, up * .34); c.strokeStyle = '#fff'; c.lineWidth = 1; c.strokeRect(win[0] - 4, win[1] - up * .72, 8, up * .34);
    if (sign) { const sx = (mA[0] + mB[0]) / 2, sy = (mA[1] + mB[1]) / 2 - 7; c.fillStyle = '#fff'; c.beginPath(); c.arc(sx, sy, 8.5, 0, 7); c.fill(); c.strokeStyle = roof; c.lineWidth = 2; c.stroke(); I.emoji(c, sign, sx, sy + .5, 11); }
  }
  const circ = (c, cx, cy, r, n, f) => { for (let i = 0; i < n; i++) { const an = i / n * 6.283; f(I.px(cx + Math.cos(an) * r, cy + Math.sin(an) * r), I.py(cx + Math.cos(an) * r, cy + Math.sin(an) * r), an, i); } };
  const RIDES = {
    roue(c, x, y, s, cx, cy, t) { I.box(c, x + .3, y + .3, s - .6, s - .6, 5, '#b0bec5', '#90a4ae', '#78909c'); const hy = cy - 46, R = 36; ln(c, [cx - 16, cy - 5, cx, hy, cx + 16, cy - 5], '#546e7a', 3); c.strokeStyle = '#0277bd'; c.lineWidth = 2.6; c.beginPath(); c.arc(cx, hy, R, 0, 7); c.stroke(); c.lineWidth = 1; for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + t * .5; c.beginPath(); c.moveTo(cx, hy); c.lineTo(cx + Math.cos(an) * R, hy + Math.sin(an) * R); c.stroke(); } for (let i = 0; i < 8; i++) { const an = i / 8 * 6.283 + t * .5; I.rr(c, cx + Math.cos(an) * R - 4, hy + Math.sin(an) * R - 1, 8, 7, 2); c.fillStyle = ['#e53935', '#fdd835', '#43a047', '#1e88e5'][i % 4]; c.fill(); } el(c, cx, hy, 3.5, 3.5, '#263238'); },
    train(c, x, y, s, cx, cy, t) { c.fillStyle = '#b5d98a'; I.poly(c, x + .1, y + .1, s - .2, s - .2); c.fill(); const tx = x + s / 2, ty = y + s / 2, r = s * .36; c.strokeStyle = '#6b4a2f'; c.lineWidth = 3; c.setLineDash([2, 3]); c.beginPath(); circ(c, tx, ty, r, 28, (a, b, an, i) => i ? c.lineTo(a, b) : c.moveTo(a, b)); c.closePath(); c.stroke(); c.setLineDash([]); house(c, x + s * .32, y + s * .32, s * .36, 9, 5, '#f6efe2', '#d84315'); [[.9, '#1e88e5'], [.45, '#fdd835'], [0, '#c62828']].forEach((q, i) => { const an = t * .6 - q[0], ax = tx + Math.cos(an) * r, ay = ty + Math.sin(an) * r; I.box(c, ax - .13, ay - .13, .26, .26, i === 2 ? 9 : 6, sh(q[1], 1.15), q[1], sh(q[1], .8)); if (i === 2) { c.fillStyle = '#263238'; c.fillRect(I.px(ax, ay) - 1.5, I.py(ax, ay) - 15, 3, 6); } }); },
    coaster(c, x, y, s, cx, cy, t) { I.box(c, x + .15, y + .15, s - .3, s - .3, 4, '#cfd8dc', '#b0bec5', '#90a4ae'); const hgt = u => 12 + 34 * Math.pow(Math.abs(Math.sin(u * Math.PI * 1.5)), 1.3), pt = (u, side) => [I.px(x + .5 + u * (s - 1), y + (side ? s - .7 : .7)), I.py(x + .5 + u * (s - 1), y + (side ? s - .7 : .7)) - hgt(u)]; for (const side of [0, 1]) { c.strokeStyle = '#78909c'; c.lineWidth = 1.2; for (let i = 0; i <= 8; i++) { const p = pt(i / 8, side); c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[0], p[1] + hgt(i / 8) - 4); c.stroke(); } c.strokeStyle = side ? '#c62828' : '#8e1c1c'; c.lineWidth = 3; c.beginPath(); for (let i = 0; i <= 40; i++) { const p = pt(i / 40, side); i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]); } c.stroke(); } const a0 = pt(0, 0), a1 = pt(0, 1), b0 = pt(1, 0), b1 = pt(1, 1); ln(c, [a0[0], a0[1], a1[0], a1[1]], '#c62828', 3); ln(c, [b0[0], b0[1], b1[0], b1[1]], '#c62828', 3); const u = (t * .25) % 1; for (let i = 0; i < 3; i++) { const p = pt(Math.max(0, u - i * .035), 1); I.rr(c, p[0] - 4, p[1] - 7, 8, 6, 2); c.fillStyle = '#fdd835'; c.fill(); } },
    ferme(c, x, y, s) { house(c, x, y, s, 20, 13, '#b5432f', '#5d4037', '🐑'); },
    cinema(c, x, y, s) { house(c, x, y, s, 24, 5, '#455a64', '#263238', '🎬'); const d = I.box.door; c.fillStyle = '#fdd835'; c.fillRect(d[0] - 9, d[1] - 20, 18, 4); },
    vivarium(c, x, y, s) { house(c, x, y, s, 14, 13, '#7cb342', '#a5e0e8', '🦎'); },
    aqua(c, x, y, s, cx, cy, t) { I.box(c, x + .15, y + .15, s - .3, s - .3, 9, '#b0bec5', '#78909c', '#607d8b'); const g = c.createRadialGradient(cx - 10, cy - 34, 4, cx, cy - 14, 46); g.addColorStop(0, 'rgba(210,245,255,.95)'); g.addColorStop(1, 'rgba(20,130,180,.9)'); c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy - 9, 40, 34, 0, Math.PI, 0); c.ellipse(cx, cy - 9, 40, 20, 0, 0, Math.PI); c.fill(); for (let i = 0; i < 4; i++) { const fx = cx - 22 + ((t * 6 + i * 17) % 44), fy = cy - 16 - i * 5; el(c, fx, fy, 3, 1.6, ['#ff7043', '#fdd835', '#ab47bc', '#ff7043'][i]); tri(c, [fx - 2.5, fy, fx - 5.5, fy - 2, fx - 5.5, fy + 2], '#ff7043'); } c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.5; c.beginPath(); c.arc(cx, cy - 9, 30, 3.5, 4.4); c.stroke(); },
    show(c, x, y, s, cx, cy) { I.box(c, x + .1, y + .1, s - .2, s - .2, 4, '#d7ccc8', '#bcaaa4', '#a1887f'); for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? '#c9b49a' : '#b89f84'; c.beginPath(); circ(c, x + s / 2, y + s / 2, s * (.47 - i * .085), 26, (a, b, an, k) => k ? c.lineTo(a, b - 4 - (3 - i) * 5) : c.moveTo(a, b - 4 - (3 - i) * 5)); c.closePath(); c.fill(); } c.fillStyle = '#4aa8d8'; c.beginPath(); circ(c, x + s / 2, y + s / 2, s * .17, 20, (a, b, an, k) => k ? c.lineTo(a, b - 5) : c.moveTo(a, b - 5)); c.closePath(); c.fill(); I.emoji(c, '🎭', cx, cy - 34, 15); },
  };
  const ROOF = { food: 20, drink: 13, gift: 22, toilet: 16, ice: 13, resto: 26 };
  Z.bldSprite = function (c, type, x, y, o) {
    const d = BL[type], s = d.size, cx = I.px(x + s / 2, y + s / 2), cy = I.py(x + s / 2, y + s / 2), t = performance.now() / 1000 * (Z.S.speed ? 1 : 0);
    if (RIDES[type]) { RIDES[type](c, x, y, s, cx, cy, o && o.closed ? 0 : t); return true; }
    if (ROOF[type]) { house(c, x, y, s, ROOF[type], 6 + s * 4, type === 'toilet' ? '#e8eef0' : '#f6efe2', d.color, d.icon); return true; }
    if (type === 'depot') { I.box(c, x + .1, y + .1, s - .2, s - .2, 20, '#a1887f', '#bcaaa4', '#8d6e63'); const dr = I.box.door; c.fillStyle = '#5d4037'; c.fillRect(dr[0] - 9, dr[1] - 13, 18, 13); I.emoji(c, '📦', cx, cy - 26, 13); return true; }
    if (type === 'fountain') { el(c, cx, cy - 2, 13, 6.5, '#b0bec5'); el(c, cx, cy - 3, 10.5, 5, '#4aa8d8'); c.fillStyle = '#90a4ae'; c.fillRect(cx - 1.5, cy - 15, 3, 12); el(c, cx, cy - 15, 5, 2.4, '#b0bec5'); c.strokeStyle = 'rgba(190,230,255,.9)'; c.lineWidth = 1.3; for (const dx of [-7, 7]) { c.beginPath(); c.moveTo(cx, cy - 17); c.quadraticCurveTo(cx + dx * .6, cy - 22 - Math.sin(t * 3) * 1.5, cx + dx, cy - 5); c.stroke(); } return true; }
    if (type === 'flowers') { for (let i = 0; i < 7; i++) { const fx = cx + (hs(i, x) - .5) * 22, fy = cy + (hs(y, i) - .5) * 10; ln(c, [fx, fy, fx, fy - 6], '#3f8f45', 1.2); el(c, fx, fy - 7, 2.4, 2.4, ['#e84a6a', '#f2c230', '#ffffff', '#b05cc9'][i % 4]); el(c, fx, fy - 7, .9, .9, '#f2a020'); } return true; }
    return false;
  };
})();
