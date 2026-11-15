// Zoo Project — besoins par espèce, note des enclos, nouveautés, collections, paliers, exigence du public
(function () {
  const SP = Z.SPECIES, BIO = Z.BIOMES, fmt = Z.fmt, clamp = Z.clamp;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;

  // ================= Besoins propres à chaque espèce =================
  Z.UPGRADES.bassin = { name: 'Bassin', icon: '💧', cost: e => 2500, desc: 'Point d’eau pour se baigner' };
  Z.UPGRADES.abri.desc = 'Refuge pour se cacher et dormir'; Z.UPGRADES.jeux.desc = 'Jeux et objets à explorer'; Z.UPGRADES.veg.desc = 'Arbres, buissons et hautes herbes';
  const NEEDS = {
    kangourou: ['abri'], girafe: ['veg'], lion: ['abri', 'jeux'], rhino: ['bassin'], elephant: ['bassin', 'jeux'], singe: ['veg', 'jeux'], paon: ['veg'], tigre: ['veg', 'bassin'],
    gorille: ['veg', 'jeux', 'abri'], panda: ['veg', 'abri'], chevre: ['jeux'], lama: ['abri'], loup: ['abri', 'veg'], ours: ['abri', 'bassin'], loutre: ['jeux'], croco: ['abri'], hippo: ['abri'],
    manchot: ['abri'], phoque: ['jeux'], ourspol: ['abri', 'jeux'], buffle: ['bassin'], leopard: ['veg', 'abri'], cerf: ['veg'], raton: ['veg', 'abri'], perroquet: ['veg', 'jeux'], aigle: ['abri'],
    paresseux: ['veg'], koala: ['veg'], orang: ['veg', 'jeux', 'abri'], chameau: ['abri'], varan: ['abri'], serpent: ['abri', 'veg'], scorpion: ['abri'], castor: ['jeux'], tortue: ['abri'], diplo: ['veg', 'bassin'], trex: ['jeux', 'abri'],
  };
  const ALL = ['abri', 'jeux', 'veg', 'bassin'];
  Z.needsOf = sp => NEEDS[sp] || [];
  const has = (e, k) => !!e.up[k] || (k === 'bassin' && (e.biome === 'aquatique' || e.biome === 'polaire'));
  const spOf = e => (e.animals.length ? e.animals[0].sp : e.pending && e.pending.length ? e.pending[0].sp : null);
  Z.needsMissing = e => { const sp = spOf(e); return sp ? Z.needsOf(sp).filter(k => !has(e, k)) : []; };
  // un besoin comblé rend l'animal plus heureux, un besoin ignoré le rend malheureux ; le superflu compte peu
  Z.needsBonus = function (e, sp) { let h = 0; const nd = Z.needsOf(sp); for (const k of ALL) { if (nd.includes(k)) h += has(e, k) ? 6 : -9; else if (e.up[k]) h += 2; } return h; };
  Z.upgHint = function (e, k) { const sp = spOf(e); if (k === 'bassin' && (e.biome === 'aquatique' || e.biome === 'polaire')) return 'déjà présent dans cet habitat'; return sp && Z.needsOf(sp).includes(k) ? '⭐ indispensable aux ' + SP[sp].pl : Z.UPGRADES[k].desc + (sp ? ' (facultatif)' : ''); };

  // ================= Note de l'enclos, de 1 à 5 étoiles =================
  Z.enclScore = function (e) {
    if (!e.animals.length) return 0; const nd = Z.needsOf(e.animals[0].sp), o = Z.occupancy(e);
    const met = nd.length ? 1 - Z.needsMissing(e).length / nd.length : 1, space = o <= .8 ? 1 : o >= 1.05 ? 0 : (1.05 - o) / .25;
    return .35 * met + .2 * space + .3 * Z.avg(e, 'happy') / 100 + .15 * e.clean / 100;
  };
  Z.enclStars = e => { const s = Z.enclScore(e); return s >= .9 ? 5 : clamp(Math.floor(s * 5 + .35), 1, 4); };
  const oldAppeal = Z.enclAppeal; Z.enclAppeal = e => oldAppeal(e) * (e.animals.length ? .5 + .12 * Z.enclStars(e) : 1);

  // ================= Effets visuels : cœurs et pièces qui s'envolent =================
  Z.fx = [];
  Z.fxAdd = function (x, y, txt, col) { if (Z.silentLevel || document.hidden) return; if (Z.fx.length > 70) Z.fx.shift(); Z.fx.push({ x, y, txt, col, t: performance.now() }); };

  // ================= Nouveautés, collections, paliers =================
  Z.SETS = [
    { k: 'safari', n: 'Safari africain', sp: ['zebre', 'girafe', 'lion', 'elephant', 'rhino'], r: 8000 },
    { k: 'big5', n: 'Les cinq grands', sp: ['lion', 'elephant', 'rhino', 'buffle', 'leopard'], r: 15000 },
    { k: 'canopee', n: 'Canopée', sp: ['singe', 'paon', 'tigre', 'gorille', 'panda'], r: 12000 },
    { k: 'sommets', n: 'Sommets', sp: ['chevre', 'lama', 'loup', 'ours', 'aigle', 'bison'], r: 10000 },
    { k: 'rives', n: 'Rives et marais', sp: ['flamant', 'loutre', 'croco', 'hippo', 'cygne', 'castor', 'tortue'], r: 12000 },
    { k: 'banquise', n: 'Banquise', sp: ['manchot', 'phoque', 'ourspol'], r: 10000 },
    { k: 'caravane', n: 'Caravane du désert', sp: ['chameau', 'varan', 'serpent', 'scorpion'], r: 10000 },
    { k: 'cousins', n: 'Nos cousins', sp: ['singe', 'gorille', 'orang', 'paresseux'], r: 10000 },
    { k: 'perdu', n: 'Monde perdu', sp: ['diplo', 'trex'], r: 30000 },
    { k: 'arche', n: 'L’arche complète', sp: Object.keys(SP), r: 100000 },
  ];
  const MILES = [3, 5, 8, 12, 16, 20, 25, 30];
  Z.presentSp = () => new Set(Z.S.enclosures.filter(e => e.animals.length && e.vp.length).map(e => e.animals[0].sp));
  Z.buzzMod = () => 1 + .12 * Math.min(3, Z.S.buzz.length);
  Z.setsMod = () => 1 + .03 * Object.keys(Z.S.sets).length;
  const oldDemand = Z.demand; Z.demand = () => oldDemand() * Z.buzzMod() * Z.setsMod();
  const oldFactors = Z.demandFactors;
  Z.demandFactors = () => oldFactors().concat([['Nouveautés', Z.S.buzz.length ? Z.S.buzz.map(b => SP[b.sp].e).join(' ') + ' encore ' + Math.max(...Z.S.buzz.map(b => b.left)) + ' j' : 'aucune', Z.buzzMod()], ['Collections terminées', Object.keys(Z.S.sets).length + ' / ' + Z.SETS.length, Z.setsMod()]]);
  const popup = (title, html) => { if (Z.modal && !Z.silentLevel) Z.modal(title, html, [['Super !']]); if (Z.audio && !Z.silentLevel) Z.audio.play('level'); };

  const oldMig = Z.progressMigrate;
  Z.progressMigrate = function (S) { oldMig(S); if (!S.buzzed) { S.buzzed = Object.assign({}, S.seenSp); S.buzz = []; } S.buzz = S.buzz || []; S.sets = S.sets || {}; S.mile = S.mile || 0; };
  const oldH = Z.onHourly;
  Z.onHourly = function () {
    if (oldH) oldH(); const S = Z.S, here = Z.presentSp();
    for (const k of here) if (!S.buzzed[k]) { // une espèce jamais vue : le public accourt quelques jours
      S.buzzed[k] = 1; S.buzz.push({ sp: k, left: 4 }); const e = S.enclosures.find(e => e.animals.length && e.animals[0].sp === k), sp = SP[k];
      popup('🎉 Nouvelle espèce : ' + sp.n, `<img class="portrait" src="${Z.animalPortrait(e.animals[0])}" alt=""><p>Les ${sp.pl} font leur entrée au zoo. La nouvelle se répand : <b>+12 % de visiteurs pendant 4 jours</b>.</p><p class="muted">Espèces présentées : ${here.size} sur ${Object.keys(SP).length}.</p>`);
    }
    for (const s of Z.SETS) if (!S.sets[s.k] && s.sp.every(k => here.has(k))) {
      S.sets[s.k] = 1; Z.earn('rewards', s.r); Z.xp(150); S.ratings.push(5, 5, 5);
      Z.notify('📔 Collection terminée : ' + s.n + ' (+' + fmt(s.r) + ')', 'good');
      popup('📔 Collection terminée : ' + s.n, `<p style="font-size:26px;text-align:center">${s.sp.slice(0, 12).map(k => SP[k].e).join(' ')}</p><p>Récompense : <b>+${fmt(s.r)}</b>, réputation en hausse et <b>+3 % de visiteurs en permanence</b>.</p>`);
    }
    const n = S.enclosures.filter(e => e.animals.length && e.vp.length).length;
    while (S.mile < MILES.length && n >= MILES[S.mile]) { const m = MILES[S.mile++], r = 400 * m; Z.earn('rewards', r); Z.xp(6 * m); Z.notify('🏗️ Cap des ' + m + ' enclos franchi ! Prime de ' + fmt(r), 'good'); }
    for (const e of S.enclosures) if (!e.gold && e.animals.length && e.animals.length >= SP[e.animals[0].sp].grp && Z.enclStars(e) === 5) {
      e.gold = 1; Z.earn('rewards', 800); Z.xp(15); Z.notify('🏅 Enclos modèle : ' + e.name + ' atteint 5 étoiles (+800 €)', 'good', e); if (Z.audio && !Z.silentLevel) Z.audio.play('good');
    }
  };
  const oldD = Z.onDaily;
  Z.onDaily = function () { if (oldD) oldD(); const S = Z.S; for (const b of S.buzz) b.left--; S.buzz = S.buzz.filter(b => b.left > 0); };

  // ================= Exigence du public : un grand zoo est jugé plus sévèrement =================
  Z.expect = () => (Z.S.level - 1) * .5;
  const oldSpawn = Z.onSpawn; Z.onSpawn = function (v) { v.happy -= Z.expect(); oldSpawn(v); };

  // ================= Interface =================
  Z.html.quality = function (e) {
    const sp = spOf(e); if (!sp) return ''; const nd = Z.needsOf(sp), st = e.animals.length ? Z.enclStars(e) : 0;
    let h = `<div class="card"><div class="ctitle"><b>Note de l’enclos</b><b class="stars" style="font-size:17px">${st ? '★'.repeat(st) + '☆'.repeat(5 - st) : '—'}</b></div>`;
    h += `<p class="muted">Besoins des ${SP[sp].pl} :</p>` + (nd.length ? nd.map(k => `<div class="row"><span>${Z.UPGRADES[k].icon} ${Z.UPGRADES[k].name}</span><b class="${has(e, k) ? 'good' : 'bad'}">${has(e, k) ? '✓ comblé' : '✗ manquant'}</b></div>`).join('') : '<p>Aucun aménagement particulier : de l’espace et de la propreté suffisent.</p>');
    return h + `<p class="muted">La note dépend des besoins comblés, de l’espace, du bonheur et de la propreté. Elle fait varier l’attrait de l’enclos de −38 % (1 ★) à +10 % (5 ★). 5 ★ : prime « enclos modèle ».</p></div>`;
  };
  const oldStock = Z.html.stock;
  Z.html.stock = function () {
    const S = Z.S, here = Z.presentSp();
    let h = `<h3>📔 Collections <small>(${here.size} espèces sur ${Object.keys(SP).length})</small></h3><p class="muted">Réunissez toutes les espèces d’une collection : prime, réputation et +3 % de visiteurs en permanence.</p>`;
    h += Z.SETS.map(s => { const got = s.sp.filter(k => here.has(k)).length, done = S.sets[s.k]; return `<div class="card ${done ? 'done' : ''}"><div class="ctitle"><b>${done ? '✅ ' : ''}${s.n}</b><b>${done ? 'terminée' : got + ' / ' + s.sp.length + ' · ' + fmt(s.r)}</b></div>${s.sp.length <= 8 ? `<p style="font-size:20px;margin:4px 0">${s.sp.map(k => `<span title="${SP[k].n}" style="opacity:${here.has(k) ? 1 : .25}">${SP[k].e}</span>`).join(' ')}</p>` : ''}</div>`; }).join('');
    return h + oldStock();
  };
  const oldVis = Z.html.visitors;
  Z.html.visitors = () => row('Exigence du public (niveau ' + Z.S.level + ')', Z.expect() > 0 ? '<span class="bad">−' + Z.expect().toFixed(1).replace('.', ',') + ' de satisfaction à l’arrivée</span>' : 'aucune') + oldVis();
})();
