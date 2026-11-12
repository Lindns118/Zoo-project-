// Zoo Project — progression : niveaux, terrains, chantiers, livraisons
(function () {
  const { W, H } = Z, SP = Z.SPECIES, BL = Z.BUILDINGS, BIO = Z.BIOMES, fmt = Z.fmt;

  // ---------- Niveaux ----------
  // XP cumulée nécessaire pour atteindre chaque niveau (index = niveau)
  Z.XP_LEVELS = [0, 0, 150, 450, 900, 1500, 2300, 3300, 4500, 6000, 7800, 9800, 12000, 14500, 17300, 20500];
  Z.MAX_LEVEL = Z.XP_LEVELS.length - 1;
  Z.LEVEL_TITLES = ['', 'Ferme pédagogique', 'Mini-zoo', 'Parc animalier', 'Zoo municipal', 'Zoo régional', 'Parc zoologique', 'Zoo réputé', 'Grand parc', 'Zoo national', 'Réserve d’exception', 'Zoo de prestige', 'Sanctuaire', 'Zoo international', 'Référence mondiale', 'Légende des zoos'];
  const SP_LVL = { zebre: 1, kangourou: 1, singe: 2, paon: 2, girafe: 3, chevre: 4, lama: 4, lion: 5, flamant: 6, loutre: 6, loup: 7, croco: 7, tigre: 8, ours: 8, manchot: 9, hippo: 9, phoque: 10, rhino: 10, gorille: 11, elephant: 11, ourspol: 12, panda: 13 };
  for (const k in SP_LVL) SP[k].lvl = SP_LVL[k];
  const BIO_LVL = { savane: 1, foret: 2, montagne: 4, aquatique: 6, polaire: 9 };
  for (const k in BIO_LVL) BIO[k].lvl = BIO_LVL[k];
  const BL_LVL = { food: 1, drink: 1, toilet: 1, bench: 1, bin: 1, tree: 1, flowers: 1, gift: 3, fountain: 4, ice: 5, play: 6, resto: 8, statue: 10 };
  for (const k in BL_LVL) BL[k].lvl = BL_LVL[k];
  const ST_LVL = { keeper: 1, maint: 2, vet: 3 };
  for (const k in ST_LVL) Z.STAFF[k].lvl = ST_LVL[k];

  Z.level = () => Z.S.level;
  Z.speciesUnlocked = k => SP[k].lvl <= Z.S.level || !!Z.S.unlocked[k];
  Z.biomeUnlocked = k => BIO[k].lvl <= Z.S.level;
  Z.bldUnlocked = k => (BL[k].lvl || 1) <= Z.S.level;
  Z.staffUnlocked = k => Z.STAFF[k].lvl <= Z.S.level;
  Z.xpInfo = function () {
    const S = Z.S, L = S.level; if (L >= Z.MAX_LEVEL) return { cur: 1, need: 1, pct: 100, max: true };
    const a = Z.XP_LEVELS[L], b = Z.XP_LEVELS[L + 1]; return { cur: S.xp - a, need: b - a, pct: Math.min(100, (S.xp - a) / (b - a) * 100), left: b - S.xp };
  };
  Z.xp = function (n) {
    const S = Z.S; if (!S || n <= 0) return; S.xp += n;
    while (S.level < Z.MAX_LEVEL && S.xp >= Z.XP_LEVELS[S.level + 1]) levelUp();
  };
  Z.unlocksAt = function (L) {
    const r = [];
    for (const k in BIO) if (BIO[k].lvl === L && L > 1) r.push(BIO[k].icon + ' Habitat ' + BIO[k].name.toLowerCase());
    for (const k in SP) if (SP[k].lvl === L) r.push(SP[k].e + ' ' + SP[k].n);
    for (const k in BL) if (BL[k].lvl === L && L > 1) r.push(BL[k].icon + ' ' + BL[k].name);
    for (const k in Z.STAFF) if (Z.STAFF[k].lvl === L && L > 1) r.push(Z.STAFF[k].icon + ' ' + Z.STAFF[k].name);
    for (const p of Z.PARCELS) if (p.lvl === L && L > 1) r.push('🗺️ Terrain « ' + p.n + ' »');
    return r;
  };
  Z.levelBonus = L => 1500 * L;
  function levelUp() {
    const S = Z.S; S.level++; const L = S.level, list = Z.unlocksAt(L), bonus = Z.levelBonus(L);
    Z.earn('rewards', bonus); S.ratings.push(4, 4);
    Z.notify(`⭐ Niveau ${L} atteint : ${Z.LEVEL_TITLES[L]} ! (+${fmt(bonus)})`, 'good');
    if (Z.modal && !Z.silentLevel) Z.modal(`⭐ Niveau ${L} — ${Z.LEVEL_TITLES[L]}`, `<p>Votre zoo grandit ! Prime de la ville : <b>+${fmt(bonus)}</b></p>${list.length ? '<p><b>Nouveautés débloquées :</b></p><ul>' + list.map(x => '<li>' + x + '</li>').join('') + '</ul>' : ''}`, [['Super !']]);
  }

  // ---------- Terrains ----------
  // Le terrain est découpé en parcelles. Seule la parcelle de départ est possédée au début.
  const COLS = [0, 10, 20, 36, 46, 56], ROWS = [0, 13, 26, 40];
  const PDEF = [ // [colonne, rangée, nom, niveau, prix]
    [2, 2, 'Terrain de départ', 1, 0],
    [1, 2, 'Prairie ouest', 2, 6000], [3, 2, 'Prairie est', 3, 8000], [2, 1, 'Colline centrale', 4, 12000],
    [1, 1, 'Bosquet ouest', 5, 15000], [3, 1, 'Bosquet est', 6, 18000],
    [0, 2, 'Vallon ouest', 7, 22000], [4, 2, 'Vallon est', 8, 26000],
    [0, 1, 'Forêt ouest', 9, 30000], [4, 1, 'Forêt est', 10, 34000],
    [2, 0, 'Plateau nord', 11, 40000], [1, 0, 'Crête nord-ouest', 12, 45000], [3, 0, 'Crête nord-est', 12, 45000],
    [0, 0, 'Pic nord-ouest', 13, 55000], [4, 0, 'Pic nord-est', 14, 60000],
  ];
  Z.PARCELS = PDEF.map((d, i) => ({ id: i, x: COLS[d[0]], y: ROWS[d[1]], w: COLS[d[0] + 1] - COLS[d[0]], h: ROWS[d[1] + 1] - ROWS[d[1]], n: d[2], lvl: d[3], price: d[4] }));
  const pAt = new Int8Array(W * H);
  for (const p of Z.PARCELS) for (let y = p.y; y < p.y + p.h; y++) for (let x = p.x; x < p.x + p.w; x++) pAt[y * W + x] = p.id;
  Z.parcelAt = (x, y) => Z.PARCELS[pAt[y * W + x]];
  Z.owned = (x, y) => Z.inb(x, y) && !!Z.S.land[pAt[y * W + x]];
  Z.adjacentOwned = p => Z.PARCELS.some(q => Z.S.land[q.id] && ((q.x === p.x + p.w || q.x + q.w === p.x) && q.y < p.y + p.h && p.y < q.y + q.h || (q.y === p.y + p.h || q.y + q.h === p.y) && q.x < p.x + p.w && p.x < q.x + q.w));
  Z.buyParcel = function (id) {
    const S = Z.S, p = Z.PARCELS[id]; if (!p || S.land[id]) return;
    if (p.lvl > S.level) return Z.notify('Terrain disponible au niveau ' + p.lvl, 'bad');
    if (!Z.adjacentOwned(p)) return Z.notify('Ce terrain doit toucher un terrain que vous possédez', 'bad');
    if (!Z.pay('build', p.price)) return;
    S.land[id] = 1; Z.notify('🗺️ Terrain acquis : ' + p.n, 'good'); Z.xp(40); Z.groundDirty = true;
  };

  // ---------- Chantiers et livraisons ----------
  Z.enclBuildHours = (w, h) => Math.round(6 + w * h * .3);
  Z.bldBuildHours = t => BL[t].size === 1 ? (BL[t].cat === 'decor' ? 2 : 5) : 12;
  Z.DELIVERY_HOURS = 14;
  Z.progressHourly = function () {
    const S = Z.S;
    for (const e of S.enclosures) {
      if (e.bt > 0 && --e.bt <= 0) { e.bt = 0; Z.notify('🏗️ Chantier terminé : ' + e.name + ' est prêt à accueillir des animaux', 'good', e); Z.groundDirty = true; }
      if (e.pending && e.pending.length) for (const d of e.pending.slice()) if (--d.eta <= 0) {
        e.pending.splice(e.pending.indexOf(d), 1); const a = Z.makeAnimal(e, d.sp, d.sex, d.age); a.tx = a.x; a.ty = a.y; e.animals.push(a);
        Z.notify('🚚 Livraison : ' + a.name + ' (' + SP[a.sp].n.toLowerCase() + ') est arrivé(e) dans ' + e.name, 'good', e);
      }
    }
    for (const b of S.buildings) if (b.bt > 0 && --b.bt <= 0) { b.bt = 0; Z.notify('🏗️ ' + BL[b.type].name + ' ouvert au public', 'good'); Z.groundDirty = true; }
    const set = new Set(S.enclosures.filter(e => e.animals.length && e.vp.length).map(e => e.animals[0].sp));
    for (const k of set) if (!S.seenSp[k]) { S.seenSp[k] = 1; Z.xp(40); Z.notify('🆕 Première présentation : ' + SP[k].e + ' ' + SP[k].pl + ' (+40 XP)', 'good'); }
  };

  // ---------- Sauvegardes et scénarios ----------
  Z.progressMigrate = function (S) {
    if (S.level == null) {
      S.level = 1; S.xp = 0; S.land = {}; S.land[0] = 1;
      const used = new Set(); for (let i = 0; i < W * H; i++) if (S.ground[i] === 1) used.add(pAt[i]);
      for (const o of S.enclosures.concat(S.buildings)) used.add(pAt[o.y * W + o.x]);
      for (const id of used) S.land[id] = 1;
      Z.silentLevel = true; Z.xp(S.stats.visitors * .4 + S.stats.births * 30); Z.silentLevel = false;
    }
    S.seenSp = S.seenSp || {};
  };
  Z.progressScenario = function (S, lvl) {
    S.level = lvl; S.xp = Z.XP_LEVELS[lvl];
    for (const p of Z.PARCELS) if (p.lvl <= lvl) S.land[p.id] = 1;
  };
})();
