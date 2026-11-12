// Zoo Project — gestion avancée : banque, prévisions, marketing, modifications, missions, campagne
(function () {
  const { W, H } = Z, SP = Z.SPECIES, BL = Z.BUILDINGS, fmt = Z.fmt, idx = Z.idx, pick = Z.pick;
  const CAMP_KEY = 'zoo-project-campaign-v1';
  Z.WF = { sun: 1.15, cloud: 1, rain: .55 };
  Z.rollWeather = () => { const r = Math.random(); return r < .5 ? 'sun' : r < .8 ? 'cloud' : 'rain'; };
  Z.migrate = function (S) {
    S.loans = S.loans || []; if (S.loan > 0) S.loans.push({ n: 'Prêt initial', left: S.loan, pay: S.loan / 30, rate: .004 }); S.loan = 0;
    if (!S.forecast || S.forecast.length !== 3) S.forecast = [Z.rollWeather(), Z.rollWeather(), Z.rollWeather()];
    S.ads = S.ads || null; S.missions = S.missions || []; S.nextMission = S.nextMission || 3; S.redDays = S.redDays || 0;
    S.stats.bestDay = S.stats.bestDay || 0; S.stats.peak = S.stats.peak || 0; S.stats.missions = S.stats.missions || 0;
    S.rules = S.rules || {}; S.scn = S.scn || null;
    Z.progressMigrate(S);
  };
  Z.bldUnlocked = k => BL[k].need == null || !!Z.S.scn || Z.S.goal > BL[k].need;

  // ---------- Patrimoine et banque ----------
  Z.assets = function () {
    let v = 0; for (const e of Z.S.enclosures) { v += Z.enclCost(e.w, e.h, e.biome) * .6; for (const a of e.animals) v += Z.animalValue(a); }
    for (const b of Z.S.buildings) v += BL[b.type].cost * .6; return v + Z.pathCount * 6;
  };
  Z.debt = () => Z.S.loans.reduce((s, l) => s + l.left, 0);
  Z.zooValue = () => Z.assets() + Z.S.money - Z.debt();
  Z.LOANS = {
    court: { n: 'Prêt court terme', amt: 10000, days: 10, rate: .008, ok: () => true, req: 'Sans condition' },
    moyen: { n: 'Prêt d’investissement', amt: 30000, days: 30, rate: .005, ok: () => Z.rep() >= 3, req: 'Réputation 3 ★' },
    long: { n: 'Prêt immobilier', amt: 80000, days: 60, rate: .0035, ok: () => Z.assets() >= 120000, req: 'Patrimoine de 120 000 €' },
  };
  Z.takeLoan = function (k) {
    const d = Z.LOANS[k], S = Z.S;
    if (S.loans.length >= 3) return Z.notify('La banque refuse : 3 prêts en cours au maximum', 'bad');
    if (!d.ok()) return Z.notify('Condition non remplie : ' + d.req, 'bad');
    S.loans.push({ n: d.n, left: d.amt, pay: d.amt / d.days, rate: d.rate }); S.money += d.amt;
    Z.notify('🏦 ' + d.n + ' accordé : +' + fmt(d.amt), 'good');
  };
  Z.repayLoan = function (i) {
    const S = Z.S, l = S.loans[i]; if (!l) return;
    if (S.money < l.left) return Z.notify('Trésorerie insuffisante pour solder ce prêt', 'bad');
    S.money -= l.left; S.loans.splice(i, 1); Z.notify('🏦 Prêt soldé par anticipation', 'good');
  };
  Z.bankDaily = function () {
    const S = Z.S;
    for (const l of S.loans.slice()) {
      Z.spend('interest', l.left * l.rate); const p = Math.min(l.pay, l.left); S.money -= p; l.left -= p;
      if (l.left < 1) { S.loans.splice(S.loans.indexOf(l), 1); Z.notify('🏦 ' + l.n + ' entièrement remboursé', 'good'); }
    }
  };

  // ---------- Prévisions ----------
  Z.dailyCosts = function () {
    const S = Z.S, c = { salaries: 0, upkeep: 0, food: 0, interest: 0, repay: 0 };
    for (const s of S.staff) c.salaries += Z.STAFF[s.type].salary;
    for (const b of S.buildings) c.upkeep += BL[b.type].upkeep || 0;
    for (const e of S.enclosures) c.upkeep += e.w * e.h * .8;
    for (const e of S.enclosures) for (const a of e.animals) c.food += SP[a.sp].food * (a.age < 1 ? .5 : 1);
    for (const l of S.loans) { c.interest += l.left * l.rate; c.repay += Math.min(l.pay, l.left); }
    c.total = c.salaries + c.upkeep + c.food + c.interest; return c;
  };
  Z.forecast = function () {
    const S = Z.S, hist = S.fin.history.slice(-3); let net = 0, vis = 0;
    for (const h of hist) { net += (h.cats.shops || 0) + (h.cats.goods || 0); vis += h.vis; }
    const perVis = vis > 20 ? net / vis : (S.buildings.some(b => BL[b.type].price) ? 2.5 : 0);
    const base = Z.demand() / Z.WF[S.weather] / (S.ads ? S.ads.f : 1), c = Z.dailyCosts(), out = [];
    for (let i = 0; i < 3; i++) {
      const w = S.forecast[i], ad = S.ads && S.ads.d > i + 1 ? S.ads.f : 1, v = Math.round(base * Z.WF[w] * ad * 8.5);
      out.push({ d: S.day + i + 1, w, vis: v, tickets: v * S.ticket, shops: v * perVis, costs: c.total, repay: c.repay, net: v * (S.ticket + perVis) - c.total });
    }
    return out;
  };

  // ---------- Marketing ----------
  Z.ADS = {
    flyers: { n: 'Distribution de tracts', icon: '📄', cost: 1500, d: 3, f: 1.2, desc: '+20 % de visiteurs pendant 3 jours' },
    radio: { n: 'Campagne radio', icon: '📻', cost: 4000, d: 5, f: 1.4, desc: '+40 % de visiteurs pendant 5 jours' },
    tv: { n: 'Spot télévisé', icon: '📺', cost: 12000, d: 7, f: 1.8, desc: '+80 % de visiteurs pendant 7 jours' },
  };
  Z.buyAds = function (k) {
    const S = Z.S, a = Z.ADS[k]; if (S.ads) return Z.notify('Une campagne est déjà en cours', 'bad');
    if (!Z.pay('misc', a.cost)) return; S.ads = { k, d: a.d, f: a.f }; Z.notify('📣 ' + a.n + ' lancée !', 'good');
  };

  // ---------- Déplacer, redimensionner, transférer ----------
  const sizeOf = o => o.kind === 'encl' ? [o.w, o.h] : [BL[o.type].size, BL[o.type].size];
  Z.sizeOf = sizeOf;
  function rectFree(o, x, y, w, h) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (!Z.inb(i, j)) return false; const t = idx(i, j), oc = Z.occ[t];
      if (Z.S.ground[t] !== 0 || (oc && oc !== o) || !Z.owned(i, j)) return false;
    }
    return true;
  }
  Z.canMove = (o, x, y) => { if (o.kind === 'bld' && Z.S.ground[idx(o.x, o.y)] === 1) return Z.inb(x, y) && Z.S.ground[idx(x, y)] === 1 && (!Z.occ[idx(x, y)] || Z.occ[idx(x, y)] === o) && Z.owned(x, y); const [w, h] = sizeOf(o); return rectFree(o, x, y, w, h); };
  Z.moveCost = o => Math.round((o.kind === 'encl' ? Z.enclCost(o.w, o.h, o.biome) : BL[o.type].cost) * .1);
  Z.moveObj = function (o, x, y) {
    if (x === o.x && y === o.y) return false;
    if (!Z.canMove(o, x, y)) { Z.notify('Impossible de déplacer ici : emplacement occupé', 'bad'); return false; }
    if (!Z.pay('build', Z.moveCost(o))) return false;
    const dx = x - o.x, dy = y - o.y; o.x = x; o.y = y;
    if (o.kind === 'encl') for (const a of o.animals) { a.x += dx; a.y += dy; a.tx += dx; a.ty += dy; }
    Z.rebuild(true); return true;
  };
  Z.resizeInfo = function (e, side, d) {
    let { x, y, w, h } = e;
    if (side === 'n') { y -= d; h += d; } else if (side === 's') h += d; else if (side === 'w') { x -= d; w += d; } else w += d;
    if (w < 2 || h < 2 || w * h < 6 || !rectFree(e, x, y, w, h)) return null;
    return { x, y, w, h, cost: d > 0 ? Z.enclCost(w, h, e.biome) - Z.enclCost(e.w, e.h, e.biome) + (e.up.veg ? (w * h - e.w * e.h) * 20 : 0) : 0 };
  };
  Z.resizeEncl = function (e, side, d) {
    const r = Z.resizeInfo(e, side, d); if (!r) return Z.notify('Impossible : espace occupé ou enclos trop petit', 'bad');
    if (r.cost && !Z.pay('build', r.cost)) return;
    e.x = r.x; e.y = r.y; e.w = r.w; e.h = r.h;
    for (const a of e.animals) { a.x = Z.clamp(a.x, e.x + .6, e.x + e.w - .6); a.y = Z.clamp(a.y, e.y + .7, e.y + e.h - .5); a.tx = a.x; a.ty = a.y; }
    Z.rebuild(true);
  };
  Z.transferTargets = (e, a) => Z.S.enclosures.filter(t => t !== e && t.biome === e.biome && (!t.animals.length || t.animals[0].sp === a.sp));
  Z.transfer = function (e, a, t) {
    if (!t || e.animals.indexOf(a) < 0 || !Z.pay('misc', 100)) return;
    e.animals.splice(e.animals.indexOf(a), 1); a.x = a.tx = Z.rnd(t.x + .6, t.x + t.w - .6); a.y = a.ty = Z.rnd(t.y + .7, t.y + t.h - .5); t.animals.push(a);
    Z.notify('🚚 ' + a.name + ' a été transféré(e) vers ' + t.name, 'info');
  };

  // ---------- Missions ----------
  const present = () => new Set(Z.S.enclosures.filter(e => e.animals.length).map(e => e.animals[0].sp));
  const allAnimals = () => [].concat(...Z.S.enclosures.map(e => e.animals));
  const litterCount = () => Z.S.litter.reduce((n, v) => n + (v > 0 ? 1 : 0), 0);
  const MT = {
    school: {
      gen: S => { const n = Math.max(60, Math.round((S.stats.bestDay || 40) * 1.15 / 10) * 10); return { t: '🚌 Sorties scolaires', d: `Accueillez ${n} visiteurs en une seule journée.`, n, days: 8, money: 1500 + n * 8 }; },
      ok: (S, m) => S.fin.vis >= m.n, prog: (S, m) => S.fin.vis + ' / ' + m.n + ' aujourd’hui',
    },
    breed: {
      can: S => S.enclosures.some(e => e.animals.some(a => a.sex === 'M') && e.animals.some(a => a.sex === 'F')),
      gen: S => ({ t: '🧬 Programme de conservation', d: 'Obtenez une naissance dans votre zoo.', base: S.stats.births, days: 25, money: 4000, rep: 1 }),
      ok: (S, m) => S.stats.births > m.base,
    },
    inspect: {
      can: S => Z.animalCount() >= 4,
      gen: S => ({ t: '🕵️ Inspection sanitaire', d: 'Le jour de l’échéance : tous les enclos propres (60 % min.), clôtures en bon état (60 % min.) et moins de 6 cases souillées.', days: 6, money: 3000, rep: 1, atEnd: 1 }),
      ok: S => S.enclosures.every(e => !e.animals.length || (e.clean >= 60 && e.fence >= 60)) && litterCount() < 6,
    },
    species: {
      can: S => Object.keys(SP).some(k => Z.speciesUnlocked(k) && !present().has(k)),
      gen: S => { const k = pick(Object.keys(SP).filter(k => Z.speciesUnlocked(k) && !present().has(k))); return { t: '📣 Le public réclame : ' + SP[k].e + ' ' + SP[k].n, d: 'Présentez des ' + SP[k].pl + ' dans un enclos relié à l’entrée.', sp: k, days: 15, money: Math.round(SP[k].price * .6 + 1500) }; },
      ok: (S, m) => S.enclosures.some(e => e.vp.length && e.animals.length && e.animals[0].sp === m.sp),
    },
    welfare: {
      can: S => Z.animalCount() >= 6,
      gen: S => ({ t: '💚 Label bien-être animal', d: 'Atteignez 84 % de bonheur moyen pour l’ensemble de vos animaux.', days: 12, money: 3500, rep: 1 }),
      ok: S => { const a = allAnimals(); return a.length >= 6 && a.reduce((s, x) => s + x.happy, 0) / a.length >= 84; },
      prog: S => { const a = allAnimals(); return 'Actuellement ' + Math.round(a.reduce((s, x) => s + x.happy, 0) / Math.max(1, a.length)) + ' %'; },
    },
    gift: {
      can: S => S.level >= 3 && Object.keys(SP).some(k => !Z.speciesUnlocked(k) && Z.biomeUnlocked(SP[k].b)),
      gen: S => { const k = Object.keys(SP).filter(k => !Z.speciesUnlocked(k) && Z.biomeUnlocked(SP[k].b)).sort((a, b) => SP[a].lvl - SP[b].lvl)[0], s = SP[k]; return { t: '🎁 Don d’un zoo partenaire : ' + s.e + ' ' + s.n, d: `Préparez un enclos « ${Z.BIOMES[s.b].name} » vide d’au moins ${s.space * Math.max(2, s.grp)} cases, relié à l’entrée. Vous recevrez un couple et l’espèce sera débloquée.`, sp: k, days: 12, money: 0, giftSp: k }; },
      ok: (S, m) => !!giftEncl(m),
    },
    profit: {
      can: S => S.fin.history.length >= 3,
      gen: S => { const best = Math.max(500, ...S.fin.history.slice(-5).map(h => h.inc - h.exp)), n = Math.round(best * 1.25 / 100) * 100; return { t: '💼 Défi des investisseurs', d: `Réalisez ${fmt(n)} de bénéfice en une journée.`, n, days: 10, money: Math.round(n * .8) }; },
      ok: (S, m) => { const h = S.fin.history[S.fin.history.length - 1]; return h && h.d >= m.from && h.inc - h.exp >= m.n; },
    },
  };
  function giftEncl(m) { const s = SP[m.sp]; return Z.S.enclosures.find(e => e.biome === s.b && !e.animals.length && !e.bt && !(e.pending && e.pending.length) && e.vp.length && e.w * e.h >= s.space * Math.max(2, s.grp)); }
  Z.missionProg = m => MT[m.k].prog ? MT[m.k].prog(Z.S, m) : '';
  function genMission() {
    const S = Z.S, used = new Set(S.missions.map(m => m.k)), ks = Object.keys(MT).filter(k => !used.has(k) && k !== S.lastMission && (!MT[k].can || MT[k].can(S)));
    if (!ks.length) return; const k = pick(ks), m = MT[k].gen(S);
    m.k = k; m.id = S.nextId++; m.st = 'offer'; m.exp = S.day + 4; S.lastMission = k; S.missions.push(m);
    Z.notify('📜 Nouvelle mission proposée : ' + m.t, 'info');
  }
  Z.acceptMission = function (id) { const S = Z.S, m = S.missions.find(m => m.id === id); if (!m || m.st !== 'offer') return; m.st = 'active'; m.end = S.day + m.days; m.from = S.day; };
  Z.declineMission = function (id) { const S = Z.S; S.missions = S.missions.filter(m => m.id !== id); };
  function rewardMission(m) {
    const S = Z.S; S.missions.splice(S.missions.indexOf(m), 1); S.stats.missions++; Z.xp(m.xp || 120);
    let txt = '';
    if (m.money) { Z.earn('rewards', m.money); txt += ' +' + fmt(m.money); }
    if (m.rep) { S.ratings.push(5, 5, 5, 5); txt += ' · réputation en hausse'; }
    if (m.giftSp) {
      const e = giftEncl(m), k = m.giftSp; S.unlocked[k] = 1; S.money += SP[k].price * 2;
      Z.buyAnimal(e, k, 'M', true); Z.buyAnimal(e, k, 'F', true); S.fin.today.animals = (S.fin.today.animals || 0) + SP[k].price * 2;
      txt += ' · un couple de ' + SP[k].pl + ' rejoint votre zoo';
    }
    Z.notify('🏅 Mission réussie : ' + m.t + txt, 'good');
  }
  function checkMissions(endOfDay) {
    const S = Z.S;
    for (const m of S.missions.slice()) {
      if (m.st === 'offer') { if (endOfDay && S.day > m.exp) S.missions.splice(S.missions.indexOf(m), 1); continue; }
      const due = S.day >= m.end;
      if (m.atEnd) { if (endOfDay && due) { if (MT[m.k].ok(S, m)) rewardMission(m); else fail(m); } }
      else if (MT[m.k].ok(S, m)) rewardMission(m);
      else if (endOfDay && S.day > m.end) fail(m);
    }
    function fail(m) { S.missions.splice(S.missions.indexOf(m), 1); Z.notify('❌ Mission échouée : ' + m.t, 'bad'); }
  }

  // ---------- Campagne ----------
  const best = S => Math.max(S.stats.bestDay, S.fin.vis);
  const g = (t, c, p) => ({ t, c, p });
  Z.SCENARIOS = [
    {
      id: 's1', name: 'Premiers pas', icon: '🌱', money: 30000, days: 30, lvl: 2,
      desc: 'La mairie vous confie un terrain vide. Prouvez qu’un zoo peut y vivre.',
      goals: [g('Présenter 3 espèces', S => Z.speciesCount() >= 3, S => Z.speciesCount() + ' / 3'), g('120 visiteurs en une journée', S => best(S) >= 120, S => best(S) + ' / 120'), g('Réputation de 3,3 ★', S => Z.rep() >= 3.3, S => Z.rep().toFixed(1))],
    },
    {
      id: 's2', name: 'Safari doré', icon: '🦒', money: 55000, days: 45, lvl: 5, rules: { biomes: ['savane'] },
      desc: 'Un mécène finance un parc 100 % savane. Aucun autre habitat n’est autorisé.',
      goals: [g('Présenter 4 espèces de savane', S => Z.speciesCount() >= 4, S => Z.speciesCount() + ' / 4'), g('250 visiteurs en une journée', S => best(S) >= 250, S => best(S) + ' / 250'), g('Réputation de 3,8 ★', S => Z.rep() >= 3.8, S => Z.rep().toFixed(1))],
    },
    {
      id: 's3', name: 'Zoo à l’abandon', icon: '🏚️', money: 15000, days: 50, lvl: 6, setup: 'ruin',
      desc: 'Vous reprenez un zoo délabré, endetté et à la réputation désastreuse. Redressez-le.',
      goals: [g('Réputation de 3,5 ★', S => Z.rep() >= 3.5, S => Z.rep().toFixed(1)), g('Rembourser toutes les dettes', S => !S.loans.length, S => fmt(Z.debt()) + ' restants'), g('20 000 € de trésorerie', S => S.money >= 20000, S => fmt(S.money))],
    },
    {
      id: 's4', name: 'La nurserie', icon: '🍼', money: 70000, days: 60, lvl: 6,
      desc: 'Un programme européen de reproduction compte sur vous.',
      goals: [g('8 naissances', S => S.stats.births >= 8, S => S.stats.births + ' / 8'), g('Présenter 6 espèces', S => Z.speciesCount() >= 6, S => Z.speciesCount() + ' / 6'), g('Bonheur animal moyen de 80 %', S => { const a = allAnimals(); return a.length >= 12 && a.reduce((s, x) => s + x.happy, 0) / a.length >= 80; }, S => { const a = allAnimals(); return Math.round(a.reduce((s, x) => s + x.happy, 0) / Math.max(1, a.length)) + ' % (12 animaux min.)'; })],
    },
    {
      id: 's5', name: 'Le grand zoo', icon: '🏆', money: 50000, days: 120, lvl: 1,
      desc: 'Bâtissez un parc zoologique de renommée nationale.',
      goals: [g('Présenter 12 espèces', S => Z.speciesCount() >= 12, S => Z.speciesCount() + ' / 12'), g('400 visiteurs en une journée', S => best(S) >= 400, S => best(S) + ' / 400'), g('Réputation de 4,2 ★', S => Z.rep() >= 4.2, S => Z.rep().toFixed(1)), g('Valeur du zoo de 300 000 €', S => Z.zooValue() >= 300000, S => fmt(Z.zooValue()))],
    },
  ];
  Z.scenario = () => Z.SCENARIOS.find(s => s.id === Z.S.scn);
  Z.campaign = function () { try { return JSON.parse(localStorage.getItem(CAMP_KEY)) || {}; } catch (e) { return {}; } };
  const saveCamp = c => { try { localStorage.setItem(CAMP_KEY, JSON.stringify(c)); } catch (e) { } };
  Z.campaignBonus = () => Object.keys(Z.campaign()).length * 5000;
  Z.scnUnlocked = i => i === 0 || !!Z.campaign()[Z.SCENARIOS[i - 1].id];
  Z.applyScenario = function (id) {
    const S = Z.S, sc = Z.SCENARIOS.find(s => s.id === id); if (!sc) return;
    S.scn = id; S.rules = sc.rules || {}; S.money = 1e6; Z.progressScenario(S, sc.lvl || 1);
    if (sc.setup === 'ruin') {
      for (let y = 18; y < 35; y++) for (let x = 14; x < 45; x++) if (S.ground[idx(x, y)] > 1) S.ground[idx(x, y)] = 0;
      for (let y = 26; y < H - 6; y++) Z.buildPath(28, y); for (let x = 16; x < 42; x++) Z.buildPath(x, 26);
      const mk = (x, y, w, h, b, sp, n) => { const e = Z.buildEncl(x, y, w, h, b); for (let i = 0; i < n; i++) Z.buyAnimal(e, sp, i % 2 ? 'M' : 'F', true); e.bt = 0; e.clean = 15; e.fence = 32; e.food = 45; for (const a of e.animals) { a.happy = 35; a.health = 70; a.hunger = 50; } e.animals[0].sick = 1; };
      mk(17, 20, 6, 6, 'savane', 'zebre', 5); mk(25, 21, 5, 5, 'foret', 'singe', 6); mk(32, 20, 7, 6, 'aquatique', 'flamant', 5);
      Z.place('food', 30, 27); Z.place('toilet', 24, 27); for (const b of S.buildings) b.bt = 0;
      for (let i = 0; i < W * H; i++) if (S.ground[i] === 1 && Math.random() < .5) S.litter[i] = 2;
      for (let i = 0; i < 20; i++) S.ratings.push(1.5);
      S.loans.push({ n: 'Dette héritée', left: 30000, pay: 30000 / 60, rate: .004 });
    }
    S.money = sc.money; S.fin.today = {}; S.log = [];
    Z.rebuild(true);
  };
  function checkScenario() {
    const S = Z.S, sc = Z.scenario(); if (!sc || S.scnEnd) return;
    if (sc.goals.every(x => x.c(S))) {
      const medal = S.day <= sc.days * .6 ? 'or' : S.day <= sc.days * .8 ? 'argent' : 'bronze', c = Z.campaign(), rank = { bronze: 1, argent: 2, or: 3 };
      if (!c[sc.id] || rank[medal] > rank[c[sc.id]]) { c[sc.id] = medal; saveCamp(c); }
      S.scnEnd = 'win'; S.speed = 0; Z.save();
      if (Z.modal) Z.modal('🏆 Scénario réussi !', `<p><b>${sc.icon} ${sc.name}</b> terminé au jour ${S.day} sur ${sc.days}.</p><p style="font-size:40px;margin:6px 0;text-align:center">${{ or: '🥇', argent: '🥈', bronze: '🥉' }[medal]}</p><p>Médaille ${medal === 'bronze' ? 'de bronze' : 'd’' + medal}. Récompense : +5 000 € de capital de départ en mode libre, et le scénario suivant est débloqué.</p>`, [['Continuer à jouer', () => { S.speed = 1; }], ['Voir la campagne', () => Z.openPanel('goals', null, 'camp')]]);
    } else if (S.day > sc.days) lose('Le délai de ' + sc.days + ' jours est écoulé.');
  }
  function lose(why) {
    const S = Z.S, id = S.scn; S.scnEnd = 'lose'; S.speed = 0;
    if (Z.modal) Z.modal(id ? '⏳ Scénario échoué' : '💸 Faillite', `<p>${why}</p>`, id ? [['Continuer en mode libre', () => { S.scn = null; S.scnEnd = null; S.redDays = 0; S.speed = 1; }], ['Réessayer', () => Z.restart(id)]] : [['Continuer malgré tout', () => { S.scnEnd = null; S.redDays = 0; S.speed = 1; }], ['Nouvelle partie', () => Z.restart(null)]]);
  }
  Z.restart = function (id) { Z.wipe(); Z.newGame(id); Z.save(); if (Z.onRestart) Z.onRestart(); };

  // ---------- Crochets ----------
  Z.onHourly = function () { checkMissions(false); checkScenario(); };
  Z.onDaily = function () {
    const S = Z.S;
    if (S.ads && --S.ads.d <= 0) { S.ads = null; Z.notify('📣 Votre campagne publicitaire est terminée', 'info'); }
    checkMissions(true);
    if (S.day >= S.nextMission && S.missions.length < 3 && Z.animalCount() > 0) { genMission(); S.nextMission = S.day + 2 + Math.floor(Math.random() * 3); }
    if (S.money < 0) {
      S.redDays++;
      if (S.redDays >= 7 && !S.scnEnd) lose('Votre trésorerie est restée négative 7 jours de suite. La banque saisit le zoo.');
      else Z.notify(`⚠️ Trésorerie négative depuis ${S.redDays} jour(s) : faillite au bout de 7 jours !`, 'bad');
    } else S.redDays = 0;
  };
})();
