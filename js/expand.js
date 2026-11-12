// Zoo Project — extension : recherche, nouvelles espèces, attractions, décors à thème, simulateur
(function () {
  const SP = Z.SPECIES, BL = Z.BUILDINGS, BIO = Z.BIOMES, fmt = Z.fmt;

  // ---------- Nouveaux habitats (débloqués par la recherche) ----------
  BIO.desert = { name: 'Désert', icon: '🏜️', cost: 75, color: '#e8c98a', res: 'desert' };
  BIO.prehist = { name: 'Préhistorique', icon: '🌋', cost: 160, color: '#7f9a58', res: 'prehist' };

  // ---------- Nouvelles espèces (toutes débloquées par la recherche) ----------
  const A = (n, pl, e, b, price, space, app, food, grp, life, mat, gest, fert, size, spd, res) => ({ n, pl, e, b, price, space, app, food, grp, life, mat, gest, fert, rep: 0, size, spd, res, lvl: 99 });
  Object.assign(SP, {
    buffle:    A('Buffle', 'buffles', '🐃', 'savane', 5200, 10, 20, 30, 3, 22, 3, 9, .08, 28, .03, 'afrique'),
    leopard:   A('Léopard', 'léopards', '🐆', 'savane', 9500, 12, 36, 45, 1, 17, 3, 5, .06, 26, .05, 'afrique'),
    cerf:      A('Cerf', 'cerfs', '🦌', 'foret', 2600, 6, 14, 14, 3, 18, 2, 7, .10, 24, .05, 'forets'),
    raton:     A('Raton laveur', 'ratons laveurs', '🦝', 'foret', 1800, 4, 13, 8, 2, 12, 1, 3, .12, 20, .06, 'forets'),
    perroquet: A('Ara', 'aras', '🦜', 'foret', 2200, 3, 16, 7, 2, 40, 3, 3, .07, 20, .03, 'forets'),
    aigle:     A('Aigle royal', 'aigles', '🦅', 'montagne', 4500, 8, 22, 18, 1, 28, 4, 4, .05, 24, .03, 'rapaces'),
    bison:     A('Bison', 'bisons', '🦬', 'montagne', 5500, 10, 22, 32, 3, 20, 3, 9, .08, 30, .03, 'rapaces'),
    paresseux: A('Paresseux', 'paresseux', '🦥', 'foret', 6000, 5, 26, 12, 1, 25, 3, 6, .05, 22, .01, 'primates'),
    koala:     A('Koala', 'koalas', '🐨', 'foret', 9000, 5, 34, 25, 2, 16, 3, 2, .05, 22, .01, 'primates'),
    orang:     A('Orang-outan', 'orangs-outans', '🦧', 'foret', 12000, 12, 38, 35, 2, 40, 8, 8, .03, 28, .03, 'primates'),
    chameau:   A('Dromadaire', 'dromadaires', '🐫', 'desert', 6000, 10, 24, 28, 2, 35, 4, 13, .05, 30, .03, 'desert'),
    varan:     A('Varan', 'varans', '🦎', 'desert', 4500, 6, 20, 14, 1, 25, 4, 6, .05, 24, .03, 'desert'),
    serpent:   A('Python', 'pythons', '🐍', 'desert', 3500, 4, 20, 9, 1, 25, 3, 3, .05, 22, .02, 'desert'),
    scorpion:  A('Scorpion', 'scorpions', '🦂', 'desert', 1500, 2, 10, 3, 2, 8, 1, 6, .10, 16, .02, 'desert'),
    cygne:     A('Cygne', 'cygnes', '🦢', 'aquatique', 1800, 4, 12, 7, 2, 20, 3, 1, .10, 22, .03, 'humides'),
    castor:    A('Castor', 'castors', '🦫', 'aquatique', 3000, 5, 17, 9, 2, 14, 2, 3, .10, 20, .04, 'humides'),
    tortue:    A('Tortue géante', 'tortues géantes', '🐢', 'aquatique', 3800, 5, 18, 8, 1, 100, 15, 5, .03, 24, .01, 'humides'),
    diplo:     A('Diplodocus', 'diplodocus', '🦕', 'prehist', 45000, 36, 75, 120, 2, 80, 10, 20, .02, 44, .02, 'prehist'),
    trex:      A('Tyrannosaure', 'tyrannosaures', '🦖', 'prehist', 60000, 30, 90, 150, 1, 30, 6, 12, .02, 42, .04, 'prehist'),
  });

  // ---------- Attractions ----------
  const R = (name, icon, size, cost, price, goods, fun, app, upkeep, dur, color, res, desc) => ({ name, icon, size, cost, price, goods, fun, app, upkeep, dur, color, res, desc, cat: 'ride' });
  Object.assign(BL, {
    ferme:   R('Mini-ferme', '🐑', 2, 7000, 3, .5, 9, 10, 60, 20, '#9ccc65', 'famille', 'Les enfants caressent chèvres et moutons.'),
    train:   R('Petit train', '🚂', 2, 9000, 4, .8, 8, 12, 80, 20, '#d84315', 'famille', 'Une balade reposante autour du zoo.'),
    vivarium: R('Vivarium', '🦎', 2, 16000, 4, .8, 10, 18, 110, 20, '#558b2f', 'desert', 'Reptiles et insectes derrière les vitres.'),
    show:    R('Amphithéâtre', '🎭', 3, 22000, 5, 1, 14, 25, 160, 30, '#6a1b9a', 'spectacles', 'Spectacles d’otaries et de rapaces en vol libre.'),
    roue:    R('Grande roue', '🎡', 3, 28000, 6, 1, 12, 30, 200, 15, '#0277bd', 'grandes', 'Vue imprenable sur tout le parc.'),
    aqua:    R('Aquarium', '🐠', 3, 35000, 7, 1.5, 15, 40, 260, 30, '#00838f', 'aquario', 'Tunnel sous-marin, requins et récifs.'),
    cinema:  R('Cinéma 4D', '🎬', 2, 20000, 5, 1, 10, 15, 120, 20, '#37474f', 'theme', 'Un film animalier en relief.'),
    coaster: R('Montagnes russes', '🎢', 4, 60000, 9, 1.5, 18, 60, 450, 12, '#c62828', 'theme', 'L’attraction phare d’un vrai parc à thème.'),
  });
  // Décors à thème
  const D = (name, icon, cost, beauty, desc) => ({ name, icon, size: 1, cost, upkeep: 0, cat: 'decor', beauty, res: 'decors', desc });
  Object.assign(BL, {
    palmier: D('Palmier', '🌴', 350, 2, 'Ambiance tropicale.'), cactus: D('Cactus géant', '🌵', 300, 2, 'Ambiance désert.'),
    lanterne: D('Lanterne asiatique', '🏮', 500, 3, 'Ambiance Asie.'), torii: D('Portique torii', '⛩️', 2200, 6, 'Ambiance Asie.'),
    fossile: D('Fossile', '🦴', 1500, 4, 'Ambiance préhistoire.'), volcan: D('Volcan miniature', '🌋', 4500, 9, 'Ambiance préhistoire.'),
    chapiteau: D('Chapiteau', '🎪', 3000, 7, 'Ambiance fête foraine.'), ballons: D('Arche de ballons', '🎈', 400, 2, 'Ambiance fête foraine.'),
  });
  Object.assign(Z.OSLOTS, { ferme: 1, train: 1, vivarium: 1, show: 2, roue: 1, aqua: 2, cinema: 1, coaster: 2 });

  // ---------- Recherche ----------
  // cost = points de recherche ; lvl = niveau du zoo requis ; req = projet préalable
  Z.RESEARCH = {
    afrique:  { name: 'Faune africaine', icon: '🐆', cat: 'Animaux', cost: 60, lvl: 2, desc: 'Buffle et léopard.' },
    forets:   { name: 'Forêts du monde', icon: '🦌', cat: 'Animaux', cost: 80, lvl: 3, desc: 'Cerf, raton laveur et ara.' },
    rapaces:  { name: 'Faune des sommets', icon: '🦅', cat: 'Animaux', cost: 120, lvl: 4, desc: 'Aigle royal et bison.' },
    humides:  { name: 'Zones humides', icon: '🦢', cat: 'Animaux', cost: 160, lvl: 6, desc: 'Cygne, castor et tortue géante.' },
    desert:   { name: 'Expédition désert', icon: '🏜️', cat: 'Animaux', cost: 220, lvl: 6, desc: 'Habitat désert, dromadaire, varan, python, scorpion, et le vivarium.' },
    primates: { name: 'Primates et marsupiaux', icon: '🦧', cat: 'Animaux', cost: 300, lvl: 8, desc: 'Paresseux, koala et orang-outan.' },
    prehist:  { name: 'Génétique préhistorique', icon: '🦖', cat: 'Animaux', cost: 900, lvl: 12, req: 'theme', desc: 'Habitat préhistorique, diplodocus et tyrannosaure.' },
    famille:  { name: 'Attractions familiales', icon: '🚂', cat: 'Attractions', cost: 70, lvl: 2, desc: 'Mini-ferme et petit train.' },
    decors:   { name: 'Décors à thème', icon: '🏮', cat: 'Attractions', cost: 90, lvl: 3, desc: 'Palmiers, lanternes, torii, fossiles, volcan, chapiteau…' },
    spectacles: { name: 'Spectacles vivants', icon: '🎭', cat: 'Attractions', cost: 200, lvl: 5, req: 'famille', desc: 'Amphithéâtre.' },
    grandes:  { name: 'Grandes attractions', icon: '🎡', cat: 'Attractions', cost: 280, lvl: 7, req: 'famille', desc: 'Grande roue.' },
    aquario:  { name: 'Aquariologie', icon: '🐠', cat: 'Attractions', cost: 380, lvl: 8, req: 'spectacles', desc: 'Aquarium géant.' },
    theme:    { name: 'Parc à thème', icon: '🎢', cat: 'Attractions', cost: 600, lvl: 10, req: 'grandes', desc: 'Montagnes russes et cinéma 4D.' },
    nutrition: { name: 'Nutrition animale', icon: '🥕', cat: 'Gestion', cost: 100, lvl: 2, desc: 'Nourriture des animaux 20 % moins chère.' },
    clotures: { name: 'Clôtures renforcées', icon: '🚧', cat: 'Gestion', cost: 120, lvl: 3, desc: 'Les clôtures s’usent deux fois moins vite.' },
    medecine: { name: 'Médecine préventive', icon: '💉', cat: 'Gestion', cost: 180, lvl: 4, desc: 'Deux fois moins de maladies.' },
    guichets: { name: 'Bornes automatiques', icon: '🎟️', cat: 'Gestion', cost: 200, lvl: 5, desc: '+40 entrées par heure sans caissier supplémentaire.' },
    elevage:  { name: 'Programme d’élevage', icon: '🍼', cat: 'Gestion', cost: 260, lvl: 6, desc: 'Fertilité des animaux +50 %.' },
    numerique: { name: 'Marketing numérique', icon: '📱', cat: 'Gestion', cost: 320, lvl: 7, desc: 'Affluence permanente +12 %.' },
  };
  const MODS = { food: ['nutrition', .8], fence: ['clotures', .5], disease: ['medecine', .5], fert: ['elevage', 1.5], demand: ['numerique', 1.12] };
  Z.rmod = k => Z.S.research.done[MODS[k][0]] ? MODS[k][1] : 1;
  Z.resDone = k => !!Z.S.research.done[k];
  Z.researchRate = () => Z.staffCount('scientist') * 12 + Z.S.research.budget / 50; // points par jour
  Z.researchState = function (k) {
    const S = Z.S, p = Z.RESEARCH[k];
    if (S.research.done[k]) return 'done'; if (S.research.cur === k) return 'cur';
    if (p.lvl > S.level) return 'lvl'; if (p.req && !S.research.done[p.req]) return 'req'; return 'ok';
  };
  Z.startResearch = function (k) {
    const S = Z.S; if (Z.researchState(k) !== 'ok') return;
    S.research.cur = k; S.research.prog = S.research.cur === k ? S.research.prog : 0; S.research.prog = 0;
    Z.notify('🔬 Recherche lancée : ' + Z.RESEARCH[k].name, 'info');
    if (Z.researchRate() <= 0) Z.notify('Aucun chercheur ni budget : la recherche n’avancera pas', 'warn');
  };
  Z.researchUnlocks = function (k) {
    const r = [];
    for (const b in BIO) if (BIO[b].res === k) r.push(BIO[b].icon + ' Habitat ' + BIO[b].name.toLowerCase());
    for (const s in SP) if (SP[s].res === k) r.push(SP[s].e + ' ' + SP[s].n);
    for (const b in BL) if (BL[b].res === k) r.push(BL[b].icon + ' ' + BL[b].name);
    return r;
  };
  function finishResearch() {
    const S = Z.S, k = S.research.cur, p = Z.RESEARCH[k]; S.research.done[k] = 1; S.research.cur = null; S.research.prog = 0; Z.xp(60);
    const u = Z.researchUnlocks(k);
    Z.notify('🔬 Recherche terminée : ' + p.name, 'good');
    if (Z.modal && !Z.silentLevel) Z.modal('🔬 ' + p.name, `<p>Recherche terminée ! ${p.desc}</p>${u.length ? '<ul>' + u.map(x => '<li>' + x + '</li>').join('') + '</ul>' : ''}`, [['Choisir la suite', () => Z.openPanel('research')], ['Fermer']]);
  }

  // Déblocages : niveau du zoo OU recherche
  const oldSp = Z.speciesUnlocked, oldBl = Z.bldUnlocked, oldBio = Z.biomeUnlocked, oldCap = Z.entryCap;
  Z.speciesUnlocked = k => SP[k].res ? Z.resDone(SP[k].res) || !!Z.S.unlocked[k] : oldSp(k);
  Z.bldUnlocked = k => BL[k].res ? Z.resDone(BL[k].res) : oldBl(k);
  Z.biomeUnlocked = k => BIO[k].res ? Z.resDone(BIO[k].res) : oldBio(k);
  Z.entryCap = () => oldCap() + (Z.resDone('guichets') ? 40 : 0);
  Z.lockLabel = o => o.res ? '🔬 ' + Z.RESEARCH[o.res].name : 'Niveau ' + o.lvl;
  Z.rideAppeal = function () { let a = 0; for (const b of Z.S.buildings) if (BL[b.type].cat === 'ride' && !b.bt && !b.closed && b.acc.length) a += BL[b.type].app; return a; };

  // ---------- Simulateur de prix ----------
  Z.simulate = function () {
    const S = Z.S, keep = S.ticket, fair = Z.fairPrice(), hist = S.fin.history.slice(-3); let net = 0, vis = 0;
    for (const h of hist) { net += (h.cats.shops || 0) + (h.cats.goods || 0); vis += h.vis; }
    const perVis = vis > 20 ? net / vis : 2, cap = Z.entryCap(), out = [];
    const prices = [...new Set([0, .5, .75, 1, 1.25, 1.5, 2].map(f => Math.round(fair * f)).concat([keep]))].sort((a, b) => a - b);
    for (const p of prices) { S.ticket = p; const dm = Z.demand(), v = Math.round(Math.min(dm, cap) * 8.5); out.push({ p, v, lost: Math.round(Math.max(0, dm - cap) * 8.5), tickets: v * p, total: v * (p + perVis), cur: p === keep }); }
    S.ticket = keep; const best = out.reduce((a, b) => b.total > a.total ? b : a); best.best = true; return out;
  };

  // ---------- Crochets ----------
  const oldMig = Z.progressMigrate;
  Z.progressMigrate = function (S) { oldMig(S); S.research = S.research || { cur: null, prog: 0, done: {}, budget: 0 }; };
  const oldH = Z.onHourly, oldD = Z.onDaily;
  Z.onHourly = function () {
    const S = Z.S; if (oldH) oldH();
    if (S.research.cur) { S.research.prog += Z.researchRate() / 24; if (S.research.prog >= Z.RESEARCH[S.research.cur].cost) finishResearch(); }
  };
  Z.onDaily = function () { const S = Z.S; if (S.research.budget > 0 && S.research.cur) Z.spend('research', S.research.budget); if (oldD) oldD(); };
})();
