// Zoo Project — cartes du monde : régions, relief, climat, une sauvegarde par carte
(function () {
  const { W, H, EX } = Z, idx = Z.idx, BL = Z.BUILDINGS;
  const BASE = 'zoo-project-save-v1', CUR = 'zoo-project-current-v1', PROFILE = 'zoo-project-profile-v1';
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };

  // weather = probabilités [soleil, nuages, pluie] · bm = multiplicateur du prix des habitats · lakes = [cx, cy, rx, ry]
  Z.WORLD = [
    { id: 'france', name: 'Val de Loire', country: 'France', icon: '🏰', req: 0, money: 35000, demand: 1, wealth: 1, weather: [.5, .3, .2], trees: .07, seed: 11, lakes: [[8, 7, 6, 4]],
      bm: { foret: .8, polaire: 1.2 }, desc: 'Climat tempéré, public fidèle. La carte idéale pour débuter.',
      pal: { g: ['#84c25a', '#8bc960', '#7fbd55'], tuft: '#6fae49', sky: '#3c7a3a', trees: ['🌳', '🌳', '🌲'] } },
    { id: 'kenya', name: 'Savane du Masaï Mara', country: 'Kenya', icon: '🦁', req: 4, money: 35000, demand: .85, wealth: .8, weather: [.75, .15, .1], trees: .03, seed: 23, lakes: [[46, 20, 4, 3]],
      bm: { savane: .6, desert: .8, aquatique: 1.3, polaire: 1.8, montagne: 1.3 }, desc: 'Soleil presque permanent. Les enclos de savane coûtent peu, le froid polaire est hors de prix. Visiteurs moins fortunés.',
      pal: { g: ['#c9c36a', '#d1c972', '#c2bb62'], tuft: '#a89f4e', sky: '#8a8438', trees: ['🌳', '🌴', '🌳'] } },
    { id: 'canada', name: 'Rocheuses', country: 'Canada', icon: '🏔️', req: 6, money: 38000, demand: .9, wealth: 1.2, weather: [.35, .3, .35], trees: .16, seed: 37, lakes: [[44, 8, 8, 5], [7, 31, 4, 4]], snow: true,
      bm: { montagne: .6, polaire: .7, foret: .8, savane: 1.5, desert: 1.6 }, desc: 'Neige fréquente, forêts de sapins à défricher, grands lacs. Montagne et banquise à prix réduit.',
      pal: { g: ['#dcebe2', '#e6f2ea', '#d0e3d8'], tuft: '#b0cabb', sky: '#5f7f86', trees: ['🌲', '🌲', '🌲'] } },
    { id: 'bresil', name: 'Amazonie', country: 'Brésil', icon: '🌴', req: 8, money: 40000, demand: .9, wealth: .8, weather: [.4, .2, .4], trees: .24, seed: 41, lakes: [[10, 18, 6, 5], [47, 32, 5, 4]], river: 39,
      bm: { foret: .6, aquatique: .7, polaire: 2, desert: 1.5, montagne: 1.3 }, desc: 'Jungle dense à défricher, et un fleuve à franchir par des ponts. Pluies abondantes. Forêt et zones humides bon marché.',
      pal: { g: ['#4f9e4a', '#58a852', '#479443'], tuft: '#377a36', sky: '#1f5a2c', trees: ['🌴', '🌳', '🌴'] } },
    { id: 'australie', name: 'Outback', country: 'Australie', icon: '🪃', req: 10, money: 40000, demand: 1, wealth: 1.1, weather: [.82, .13, .05], trees: .02, seed: 53, lakes: [],
      bm: { desert: .6, savane: .8, aquatique: 1.5, polaire: 1.8, foret: 1.2 }, desc: 'Terre rouge, ciel sans nuages et presque pas d’eau. Désert et savane à bas prix.',
      pal: { g: ['#d99a5b', '#e0a465', '#d19152'], tuft: '#b97d42', sky: '#8a4f2a', trees: ['🌵', '🌴', '🌵'] } },
    { id: 'japon', name: 'Baie de Tokyo', country: 'Japon', icon: '🗼', req: 12, money: 50000, demand: 1.5, wealth: 1.4, weather: [.5, .3, .2], trees: .05, seed: 67, lakes: [[28, -1, 34, 8]],
      bm: { savane: 1.3, foret: 1.3, montagne: 1.3, aquatique: 1.3, polaire: 1.3, desert: 1.3, prehist: 1.3 }, desc: 'Foule immense et visiteurs aisés, mais terrain rare : la baie occupe le nord et tout coûte 30 % plus cher.',
      pal: { g: ['#8fcf7a', '#97d683', '#86c771'], tuft: '#72b560', sky: '#3f7f55', trees: ['🌸', '🌳', '🌸'] } },
  ];
  const SCN_MAP = { s2: 'kenya', s4: 'bresil', s5: 'japon' };
  const def = id => Z.WORLD.find(m => m.id === id) || Z.WORLD[0];
  Z.mapDef = () => def(Z.S && Z.S.map);
  Z.mapMod = k => Z.mapDef()[k] || 1;
  Z.biomeMult = b => Z.mapDef().bm[b] || 1;
  Z.climateBonus = b => { const m = Z.biomeMult(b); return m < 1 ? 4 : m >= 1.5 ? -6 : 0; };
  Z.rollWeather = () => { const w = Z.mapDef().weather, r = Math.random(); return r < w[0] ? 'sun' : r < w[0] + w[1] ? 'cloud' : 'rain'; };

  // ---------- Relief : lacs et arbres, toujours identiques pour une même carte ----------
  Z.genTerrain = function (S) {
    const m = def(S.map); let seed = m.seed * 7919;
    const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const t = idx(x, y), n = r(); let v = 0;
      for (const L of m.lakes) { const dx = (x - L[0]) / L[2], dy = (y - L[1]) / L[3]; if (dx * dx + dy * dy + n * .25 < 1) v = 2; }
      if (!v) {
        const start = x >= 20 && x < 36 && y >= 26, cluster = 1 + Math.sin(x * .37 + m.seed) * Math.cos(y * .31 + m.seed * 2);
        if (r() < m.trees * cluster * (start ? .35 : 1)) v = 3;
      }
      if (m.river != null) { const rx = m.river + Math.round(2 * Math.sin(y * .3)); if (x === rx || x === rx + 1) v = 2; }
      if (Math.abs(x - EX) <= 1 && y >= H - 9) v = 0;
      S.ground[t] = v;
    }
  };

  // ---------- Profil et emplacements de sauvegarde ----------
  Z.slot = ls.get(CUR) || 'france';
  Z.slotKey = s => (s === 'france' ? BASE : BASE + ':' + s);
  const setSlot = Z.setSlot = s => { Z.slot = s; ls.set(CUR, s); if (s !== 'scn') ls.set(CUR + ':free', s); };
  Z.profile = function () { try { return JSON.parse(ls.get(PROFILE)) || { best: {} }; } catch (e) { return { best: {} }; } };
  Z.bestLevel = function () { const b = Z.profile().best; let m = Z.S && !Z.S.scn && !Z.S.sandbox && Z.slot !== 'import' ? Z.S.level : 1; for (const k in b) m = Math.max(m, b[k]); return m; };
  Z.mapUnlocked = m => Z.bestLevel() >= m.req;
  Z.slotInfo = function (id) {
    if (Z.slot === id && Z.S) return { day: Z.S.day, level: Z.S.level, money: Z.S.money, animals: Z.animalCount() };
    try { const s = JSON.parse(ls.get(Z.slotKey(id))); return s ? { day: s.day, level: s.level || 1, money: s.money, animals: s.enclosures.reduce((n, e) => n + e.animals.length, 0) } : null; } catch (e) { return null; }
  };
  const oldSave = Z.save;
  Z.save = function () {
    const S = Z.S; if (S && !S.scn && !S.sandbox && Z.WORLD.some(m => m.id === Z.slot)) { const p = Z.profile(); if (!(p.best[S.map] >= S.level)) { p.best[S.map] = S.level; ls.set(PROFILE, JSON.stringify(p)); } }
    return oldSave();
  };
  Z.playMap = function (id, fresh) {
    const m = def(id); if (!Z.mapUnlocked(m)) return Z.notify('Région disponible quand un de vos zoos atteint le niveau ' + m.req, 'bad');
    if (Z.S) Z.save(); setSlot(m.id); if (fresh) Z.wipe();
    if (!Z.load()) Z.newGame(null, m.id);
    Z.save(); if (Z.onRestart) Z.onRestart(); Z.notify(m.icon + ' Bienvenue : ' + m.name + ', ' + m.country, 'good');
  };
  Z.restart = function (id) {
    if (id) { if (Z.S && Z.slot !== 'scn') Z.save(); setSlot('scn'); Z.wipe(); Z.newGame(id, SCN_MAP[id] || 'france'); }
    else { if (Z.slot === 'scn') setSlot(ls.get(CUR + ':free') || 'france'); Z.wipe(); Z.newGame(null, Z.slot); }
    Z.save(); if (Z.onRestart) Z.onRestart();
  };

  // ---------- Mobilier posé sur les allées ----------
  BL.bench.onPath = true; BL.bin.onPath = true;
  BL.bench.desc = 'À poser sur une allée : les visiteurs fatigués s’y reposent.'; BL.bin.desc = 'À poser sur une allée : évite les déchets dans un rayon de 5 cases.';
})();
