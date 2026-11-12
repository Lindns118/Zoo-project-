// Zoo Project — état du jeu et simulation
(function () {
  const { W, H, EX, EY } = Z;
  const SP = Z.SPECIES, BL = Z.BUILDINGS;
  const idx = (x, y) => y * W + x;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const ri = (a, b) => Math.floor(rnd(a, b + 1));
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  Object.assign(Z, { idx, inb, rnd, pick, clamp });
  const SAVE_KEY = 'zoo-project-save-v1';
  const MIN_PER_SEC = 6.67; // minutes de jeu par seconde réelle (vitesse x1)

  // ---------- Partie ----------
  Z.newGame = function (scn, map) {
    const S = {
      v: 1, money: 25000, day: 1, minute: 8 * 60, lastHour: 8, speed: 1, ticket: 8,
      ground: new Array(W * H).fill(0), litter: new Array(W * H).fill(0),
      enclosures: [], buildings: [], staff: [], visitors: [], nextId: 1,
      ratings: [], fin: { today: {}, vis: 0, history: [] }, loan: 0, weather: 'sun',
      goal: 0, unlocked: {}, stats: { visitors: 0, births: 0, deaths: 0 }, log: [],
    };
    S.map = map || 'france'; Z.genTerrain(S);
    for (let y = H - 6; y < H; y++) S.ground[idx(EX, y)] = 1;
    Z.S = S; Z.claims = {}; Z.thoughts = []; Z.migrate(S); S.money = Z.mapDef().money; if (!scn) S.money += Z.campaignBonus();
    Z.rebuild(true); if (scn) Z.applyScenario(scn); checkUnlocks(true);
  };

  Z.save = function () {
    try {
      const skip = { vp: 1, acc: 1, path: 1, task: 1 };
      const json = JSON.stringify(Z.S, (k, v) => k === 'visitors' ? [] : skip[k] ? undefined : v);
      localStorage.setItem(Z.slotKey(Z.slot), json); return true;
    } catch (e) { return false; }
  };
  Z.load = function () {
    try {
      const raw = localStorage.getItem(Z.slotKey(Z.slot)); if (!raw) return false;
      const S = JSON.parse(raw); if (!S || S.v !== 1) return false;
      S.visitors = []; S.map = S.map || 'france';
      for (const s of S.staff) { s.st = 'idle'; s.cool = 1; s.task = null; s.path = null; }
      Z.S = S; Z.claims = {}; Z.thoughts = []; Z.migrate(S);
      Z.rebuild(true); return true;
    } catch (e) { return false; }
  };
  Z.wipe = function () { try { localStorage.removeItem(Z.slotKey(Z.slot)); } catch (e) { } };

  // ---------- Carte dérivée ----------
  function adjacent(x, y, w, h) {
    const r = [], S = Z.S;
    const t = (i, j) => { if (inb(i, j) && Z.reach[idx(i, j)]) r.push(idx(i, j)); };
    for (let i = x; i < x + w; i++) { t(i, y - 1); t(i, y + h); }
    for (let j = y; j < y + h; j++) { t(x - 1, j); t(x + w, j); }
    return r;
  }
  Z.rebuild = function (removed) {
    const S = Z.S, occ = Z.occ = new Array(W * H).fill(null);
    for (const e of S.enclosures) for (let y = e.y; y < e.y + e.h; y++) for (let x = e.x; x < e.x + e.w; x++) occ[idx(x, y)] = e;
    for (const b of S.buildings) { const s = BL[b.type].size; for (let y = b.y; y < b.y + s; y++) for (let x = b.x; x < b.x + s; x++) occ[idx(x, y)] = b; }
    const reach = Z.reach = new Uint8Array(W * H), q = [idx(EX, EY)]; reach[q[0]] = 1;
    while (q.length) {
      const c = q.pop(), cx = c % W, cy = (c / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy; if (!inb(nx, ny)) continue;
        const n = idx(nx, ny); if (S.ground[n] === 1 && !reach[n]) { reach[n] = 1; q.push(n); }
      }
    }
    for (const e of S.enclosures) e.vp = adjacent(e.x, e.y, e.w, e.h);
    const cover = Z.binCover = new Uint8Array(W * H); let beauty = 0, paths = 0;
    for (const b of S.buildings) {
      const d = BL[b.type]; b.acc = S.ground[idx(b.x, b.y)] === 1 ? (reach[idx(b.x, b.y)] ? [idx(b.x, b.y)] : []) : adjacent(b.x, b.y, d.size, d.size); beauty += d.beauty || 0;
      if (b.type === 'bin') for (let y = b.y - 5; y <= b.y + 5; y++) for (let x = b.x - 5; x <= b.x + 5; x++) if (inb(x, y)) cover[idx(x, y)] = 1;
    }
    for (let i = 0; i < W * H; i++) { if (S.ground[i] === 1) paths++; else { S.litter[i] = 0; if (S.ground[i] > 1 && Z.owned(i % W, (i / W) | 0)) beauty += .1; } }
    Z.pathCount = paths; Z.beauty = clamp(beauty / Math.max(4, paths / 10), 0, 1);
    if (removed) {
      for (const a of S.visitors.concat(S.staff)) {
        a.path = null; if (a.st === 'walk') { a.st = 'idle'; a.goal = null; }
        if (a.task) { a.task = null; a.st = 'idle'; a.cool = 1; }
        const t = idx(Math.floor(a.x), Math.floor(a.y));
        if (!reach[t]) { a.x = EX + .5; a.y = EY + .5; }
      }
      Z.claims = {};
    }
    Z.groundDirty = true;
  };

  // ---------- Recherche de chemin (BFS sur les allées) ----------
  const prev = new Int32Array(W * H), seen = new Int32Array(W * H), goalMark = new Int32Array(W * H), queue = new Int32Array(W * H);
  let stamp = 0;
  Z.findPath = function (start, goals) {
    if (!goals || !goals.length) return null;
    stamp++; for (const g of goals) goalMark[g] = stamp;
    const ground = Z.S.ground; let qh = 0, qt = 0;
    queue[qt++] = start; seen[start] = stamp; prev[start] = -1;
    while (qh < qt) {
      const c = queue[qh++];
      if (goalMark[c] === stamp) { const p = []; let k = c; while (k !== start) { p.push(k); k = prev[k]; } return p.reverse(); }
      const cx = c % W, cy = (c / W) | 0;
      if (cx + 1 < W) { const n = c + 1; if (ground[n] === 1 && seen[n] !== stamp) { seen[n] = stamp; prev[n] = c; queue[qt++] = n; } }
      if (cx > 0) { const n = c - 1; if (ground[n] === 1 && seen[n] !== stamp) { seen[n] = stamp; prev[n] = c; queue[qt++] = n; } }
      if (cy + 1 < H) { const n = c + W; if (ground[n] === 1 && seen[n] !== stamp) { seen[n] = stamp; prev[n] = c; queue[qt++] = n; } }
      if (cy > 0) { const n = c - W; if (ground[n] === 1 && seen[n] !== stamp) { seen[n] = stamp; prev[n] = c; queue[qt++] = n; } }
    }
    return null;
  };
  const tileOf = a => idx(clamp(Math.floor(a.x), 0, W - 1), clamp(Math.floor(a.y), 0, H - 1));
  function moveAlong(a, dt, speed) {
    let d = speed * dt;
    while (d > 0 && a.path && a.path.length) {
      const t = a.path[0], tx = t % W + .5, ty = ((t / W) | 0) + .5, dx = tx - a.x, dy = ty - a.y, L = Math.hypot(dx, dy);
      if (L <= d) { a.x = tx; a.y = ty; d -= L; a.path.shift(); }
      else { a.x += dx / L * d; a.y += dy / L * d; d = 0; }
    }
    return !a.path || !a.path.length;
  }

  // ---------- Finances ----------
  Z.earn = function (cat, amt) { const S = Z.S; S.money += amt; S.fin.today[cat] = (S.fin.today[cat] || 0) + amt; };
  Z.spend = function (cat, amt) { Z.earn(cat, -amt); };
  Z.pay = function (cat, amt) {
    if (Z.S.money < amt) { Z.notify('Fonds insuffisants (' + Z.fmt(amt) + ' nécessaires)', 'bad'); return false; }
    Z.spend(cat, amt); return true;
  };
  Z.fmt = n => Math.round(n).toLocaleString('fr-FR') + ' €';
  Z.borrow = function (amt) {
    const S = Z.S;
    if (amt > 0) { if (S.loan + amt > 50000) return Z.notify('Plafond d’emprunt atteint (50 000 €)', 'bad'); S.loan += amt; S.money += amt; }
    else { const r = Math.min(-amt, S.loan, Math.max(0, S.money)); if (r <= 0) return; S.loan -= r; S.money -= r; }
  };

  // ---------- Journal ----------
  Z.notify = function (text, type, pos) {
    const S = Z.S; S.log.unshift({ d: S.day, t: text, k: type || 'info' }); if (S.log.length > 40) S.log.pop();
    if (Z.onNotify) Z.onNotify(text, type || 'info', pos);
  };

  // ---------- Indicateurs ----------
  Z.animalCount = () => Z.S.enclosures.reduce((n, e) => n + e.animals.length, 0);
  Z.speciesCount = () => new Set(Z.S.enclosures.filter(e => e.animals.length).map(e => e.animals[0].sp)).size;
  Z.rep = function () { const r = Z.S.ratings; let s = 2.5 * 8; for (const v of r) s += v; return s / (r.length + 8); };
  Z.avg = (e, k) => e.animals.length ? e.animals.reduce((s, a) => s + a[k], 0) / e.animals.length : 0;
  Z.enclAppeal = function (e) {
    const n = e.animals.length; if (!n) return 0;
    const sp = SP[e.animals[0].sp], babies = e.animals.some(a => a.age < 1);
    return sp.app * (1 + .4 * Math.log(n)) * (.3 + .7 * Z.avg(e, 'happy') / 100) * (e.up.veg ? 1.1 : 1) * (babies ? 1.15 : 1);
  };
  Z.attract = function () {
    let a = 0; const set = new Set();
    for (const e of Z.S.enclosures) if (e.animals.length && e.vp.length) { a += Z.enclAppeal(e); set.add(e.animals[0].sp); }
    return a + set.size * 4 + Z.rideAppeal();
  };
  Z.fairPrice = () => 2 + 1.1 * Math.sqrt(Z.attract());
  Z.weatherF = () => ({ sun: 1.15, cloud: 1, rain: .55 })[Z.S.weather];
  Z.demand = function () { // visiteurs par heure
    const S = Z.S, at = Z.attract(); if (at <= 0) return 0;
    const pf = clamp(1.6 - S.ticket / Z.fairPrice() * .8, 0, 1.5);
    return (2 + 1.6 * Math.sqrt(at) + at * .06) * (.4 + Z.rep() / 5 * 1.2) * pf * Z.weatherF() * (S.ads ? S.ads.f : 1) * Z.rmod('demand') * Z.mapMod('demand') * Z.evMod('demand');
  };
  Z.isOpen = () => { const h = Z.S.minute / 60; return h >= 9 && h < 19; };
  Z.isNight = () => { const h = Z.S.minute / 60; return h >= 21 || h < 6; };
  Z.happyTarget = function (e, a) {
    const sp = SP[a.sp], n = e.animals.length; let h = 76 + Z.climateBonus(e.biome);
    const ratio = e.w * e.h / (n * sp.space);
    if (ratio < 1) h -= (1 - ratio) * 70; else if (ratio >= 1.5) h += 4;
    if (n < sp.grp) h -= 18;
    if (a.hunger < 40) h -= (40 - a.hunger) * .9;
    if (e.clean < 50) h -= (50 - e.clean) * .6;
    if (a.sick) h -= 25;
    if (e.up.abri) h += 7; if (e.up.jeux) h += 8; if (e.up.veg) h += 5;
    return clamp(h, 0, 100);
  };
  Z.enclIssues = function (e) {
    const r = [], n = e.animals.length;
    if (!e.vp.length) r.push('Aucune allée ne relie cet enclos à l’entrée');
    if (n) {
      const sp = SP[e.animals[0].sp];
      if (e.w * e.h < n * sp.space) r.push('Trop à l’étroit : ' + (n * sp.space) + ' cases nécessaires (' + (e.w * e.h) + ' disponibles)');
      if (n < sp.grp) r.push('Groupe trop petit : les ' + sp.pl + ' vivent à ' + sp.grp + ' minimum');
      if (e.food <= 0) r.push('Mangeoire vide !'); else if (e.food < 25) r.push('Mangeoire presque vide');
      if (e.clean < 40) r.push('Enclos sale');
      if (e.animals.some(a => a.sick)) r.push('Animal malade : il faut un vétérinaire');
    }
    if (e.fence < 40) r.push('Clôture abîmée : risque d’évasion');
    return r;
  };

  // ---------- Construction ----------
  const freeTile = (x, y) => inb(x, y) && Z.S.ground[idx(x, y)] === 0 && !Z.occ[idx(x, y)] && Z.owned(x, y);
  Z.freeRect = function (x, y, w, h) { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (!freeTile(i, j)) return false; return true; };
  Z.pathOk = (x, y) => freeTile(x, y) || (inb(x, y) && Z.S.ground[idx(x, y)] === 2 && Z.owned(x, y) && !Z.occ[idx(x, y)]);
  Z.pathCost = (x, y) => (inb(x, y) && Z.S.ground[idx(x, y)] === 2 ? 60 : 12);
  Z.buildPath = function (x, y) {
    const S = Z.S; if (!Z.pathOk(x, y)) return false; const t = idx(x, y), water = S.ground[t] === 2;
    if (!Z.pay('build', water ? 60 : 12)) return false;
    S.ground[t] = 1; if (water) (S.br = S.br || {})[t] = 1; Z.rebuild(false); return true;
  };
  // Terrassement : creuser un bassin, remblayer l'eau, planter un arbre
  Z.TERRA = { dig: { name: 'Creuser un bassin', icon: '💧', cost: 150, from: 0, to: 2 }, fill: { name: 'Remblayer', icon: '🟫', cost: 250, from: 2, to: 0 }, plant: { name: 'Planter un arbre', icon: '🌳', cost: 80, from: 0, to: 3 } };
  Z.terraOk = (k, x, y) => inb(x, y) && Z.owned(x, y) && !Z.occ[idx(x, y)] && Z.S.ground[idx(x, y)] === Z.TERRA[k].from && !(Math.abs(x - EX) <= 0 && y >= H - 6);
  Z.terra = function (k, x, y) { if (!Z.terraOk(k, x, y) || !Z.pay('build', Z.TERRA[k].cost)) return false; Z.S.ground[idx(x, y)] = Z.TERRA[k].to; Z.rebuild(true); return true; };
  Z.enclCost = (w, h, biome) => w * h * Math.round(Z.BIOMES[biome].cost * Z.biomeMult(biome)) + 2 * (w + h) * 25;
  Z.buildEncl = function (x, y, w, h, biome) {
    if (w < 2 || h < 2 || w * h < 6) { Z.notify('Enclos trop petit (6 cases minimum)', 'bad'); return null; }
    if (Z.S.rules.biomes && !Z.S.rules.biomes.includes(biome)) { Z.notify('Cet habitat n’est pas autorisé dans ce scénario', 'bad'); return null; }
    if (!Z.biomeUnlocked(biome)) { Z.notify('Habitat disponible au niveau ' + Z.BIOMES[biome].lvl, 'bad'); return null; }
    if (!Z.freeRect(x, y, w, h)) { Z.notify('Emplacement occupé ou terrain non acheté', 'bad'); return null; }
    if (!Z.pay('build', Z.enclCost(w, h, biome))) return null;
    const S = Z.S, e = { id: S.nextId++, kind: 'encl', x, y, w, h, biome, name: 'Enclos ' + Z.BIOMES[biome].name.toLowerCase() + ' n°' + (S.enclosures.length + 1), animals: [], food: 100, clean: 100, fence: 100, up: {}, vp: [], bt: Z.enclBuildHours(w, h), pending: [] };
    S.enclosures.push(e); Z.rebuild(false); return e;
  };
  Z.place = function (type, x, y) {
    const d = BL[type];
    if (!Z.bldUnlocked(type)) { Z.notify('Bâtiment pas encore débloqué', 'bad'); return null; }
    if (d.onPath) { if (!(inb(x, y) && Z.S.ground[idx(x, y)] === 1 && !Z.occ[idx(x, y)] && Z.owned(x, y) && !(x === EX && y >= H - 2))) { Z.notify('À poser sur une allée libre', 'bad'); return null; } }
    else if (!Z.freeRect(x, y, d.size, d.size)) { Z.notify('Emplacement occupé', 'bad'); return null; }
    if (!Z.pay('build', d.cost)) return null;
    const S = Z.S, b = { id: S.nextId++, kind: 'bld', type, x, y, sold: 0, acc: [], bt: Z.bldBuildHours(type) }; if (d.price) b.price = d.price;
    S.buildings.push(b); Z.rebuild(false); return b;
  };
  Z.demolish = function (x, y) {
    if (!inb(x, y)) return false; const S = Z.S, t = idx(x, y), o = Z.occ[t];
    if (o && o.kind === 'encl') {
      if (o.animals.length || (o.pending && o.pending.length)) { Z.notify('Vendez ou déplacez d’abord les animaux de cet enclos', 'bad'); return false; }
      S.enclosures.splice(S.enclosures.indexOf(o), 1); S.money += Z.enclCost(o.w, o.h, o.biome) * .3;
    } else if (o) { S.buildings.splice(S.buildings.indexOf(o), 1); S.money += BL[o.type].cost * .3; }
    else if (S.ground[t] === 1) { if (x === EX && y >= H - 2) return false; S.ground[t] = S.br && S.br[t] ? 2 : 0; if (S.br) delete S.br[t]; }
    else if (S.ground[t] === 3) { if (!Z.owned(x, y)) { Z.notify('Ce terrain ne vous appartient pas', 'bad'); return false; } if (!Z.pay('build', 120)) return false; S.ground[t] = 0; }
    else return false;
    Z.rebuild(true); return true;
  };
  Z.upgrade = function (e, key) {
    if (e.up[key]) return; if (!Z.pay('build', Z.UPGRADES[key].cost(e))) return;
    e.up[key] = 1; Z.groundDirty = true;
  };

  // ---------- Animaux ----------
  function makeAnimal(e, spk, sex, age) {
    const sp = SP[spk];
    return { id: Z.S.nextId++, sp: spk, name: pick(Z.ANIMAL_NAMES), sex, age, hunger: 90, health: 100, happy: 70, sick: 0, preg: 0, x: rnd(e.x + .6, e.x + e.w - .6), y: rnd(e.y + .6, e.y + e.h - .6), tx: 0, ty: 0, wait: rnd(0, 30), dir: 1 };
  }
  Z.speciesUnlocked = k => SP[k].rep <= 0 || !!Z.S.unlocked[k];
  Z.makeAnimal = makeAnimal;
  Z.buyAnimal = function (e, spk, sex, instant) {
    if (e.bt > 0 && !instant) return Z.notify('L’enclos est encore en chantier', 'bad');
    const sp = SP[spk];
    if (sp.b !== e.biome) return Z.notify('Le ' + sp.n.toLowerCase() + ' a besoin d’un habitat « ' + Z.BIOMES[sp.b].name + ' »', 'bad');
    if (e.animals.length && e.animals[0].sp !== spk) return Z.notify('Une seule espèce par enclos', 'bad');
    if (!Z.speciesUnlocked(spk)) return Z.notify('Espèce pas encore disponible', 'bad');
    if (!Z.pay('animals', sp.price)) return;
    const age = sp.mat + rnd(0, 3);
    if (!instant) { (e.pending = e.pending || []).push({ sp: spk, sex, age, eta: Z.DELIVERY_HOURS }); Z.notify('📦 ' + sp.n + ' commandé(e) : livraison dans ' + Z.DELIVERY_HOURS + ' h', 'info'); return true; }
    const a = makeAnimal(e, spk, sex, age); a.tx = a.x; a.ty = a.y; e.animals.push(a); return a;
  };
  Z.animalValue = a => SP[a.sp].price * (a.age < SP[a.sp].mat ? .3 : a.age > SP[a.sp].life * .8 ? .2 : .5) * (a.sick ? .5 : 1);
  Z.sellAnimal = function (e, a) {
    const i = e.animals.indexOf(a); if (i < 0) return;
    e.animals.splice(i, 1); Z.earn('sales', Z.animalValue(a));
  };
  Z.emergencyVet = function (e, a) {
    if (!a.sick || !Z.pay('vet', 500)) return; a.sick = 0; a.health = Math.min(100, a.health + 30);
    Z.notify(a.name + ' a été soigné(e) par un vétérinaire externe', 'good');
  };
  function die(e, a, why, neglect) {
    const S = Z.S; e.animals.splice(e.animals.indexOf(a), 1); S.stats.deaths++;
    Z.notify('✝️ ' + a.name + ' (' + SP[a.sp].n.toLowerCase() + ') est mort ' + why, 'bad', e);
    if (neglect) S.ratings.push(1, 1);
  }
  function animalsMove(dt) {
    const night = Z.isNight();
    for (const e of Z.S.enclosures) for (const a of e.animals) {
      if (night || a.health < 25) continue;
      if (a.wait > 0) { a.wait -= dt; continue; }
      const dx = a.tx - a.x, dy = a.ty - a.y, L = Math.hypot(dx, dy), d = SP[a.sp].spd * dt * (a.sick ? .5 : 1);
      if (L <= d || L < .05) {
        a.wait = rnd(5, 60);
        a.tx = rnd(e.x + .6, e.x + e.w - .6); a.ty = rnd(e.y + .7, e.y + e.h - .5);
      } else { a.x += dx / L * d; a.y += dy / L * d; if (Math.abs(dx) > .01) a.dir = dx > 0 ? 1 : -1; }
    }
  }
  function animalsHourly() {
    const S = Z.S;
    for (const e of S.enclosures) {
      e.fence = Math.max(0, e.fence - .08 * Z.rmod('fence'));
      const n = e.animals.length; if (!n) continue;
      const sp = SP[e.animals[0].sp];
      e.food = Math.max(0, e.food - 100 / 24);
      e.clean = Math.max(0, e.clean - (.9 + .22 * n));
      e.fence = Math.max(0, e.fence - sp.space * .012 * Z.rmod('fence'));
      const anySick = e.animals.some(a => a.sick);
      for (const a of e.animals.slice()) {
        a.hunger = e.food > 0 ? Math.min(100, a.hunger + 12) : Math.max(0, a.hunger - 3.5);
        a.happy += (Z.happyTarget(e, a) - a.happy) * .15;
        if (a.hunger <= 0) a.health -= 2; else if (a.sick) a.health -= 2.5; else if (a.happy > 50) a.health = Math.min(100, a.health + 1.5);
        if (!a.sick) {
          const p = .0005 * Z.rmod('disease') * (1 + (100 - e.clean) / 35 + (100 - a.happy) / 60) * (anySick ? 5 : 1);
          if (Math.random() < p) { a.sick = 1; Z.notify('🤒 ' + a.name + ' (' + sp.n.toLowerCase() + ') est malade', 'warn', e); }
        }
        if (a.health <= 0) die(e, a, a.hunger <= 0 ? 'de faim' : 'de maladie', true);
      }
      if (e.food <= 0 && e.warn !== S.day) { e.warn = S.day; Z.notify('🍽️ Les ' + sp.pl + ' ont faim : ' + (S.staff.some(s => s.type === 'keeper') ? 'vos soigneurs sont débordés' : 'embauchez un soigneur') + ' !', 'warn', e); }
      if (e.fence < 20 && e.animals.length && Math.random() < .06) {
        Z.notify('🚨 Un ' + sp.n.toLowerCase() + ' s’est échappé de son enclos ! Capture : 800 €', 'bad', e);
        Z.spend('misc', 800); S.ratings.push(1, 1); for (const v of S.visitors) v.happy -= 15; e.fence = 20;
      }
    }
  }
  function animalsDaily() {
    const S = Z.S;
    for (const e of S.enclosures) {
      if (!e.animals.length) continue;
      const sp = SP[e.animals[0].sp];
      for (const a of e.animals.slice()) {
        a.age += .1;
        if (a.age > sp.life && Math.random() < .08) { die(e, a, 'de vieillesse', false); continue; }
        if (a.preg > 0 && --a.preg <= 0) {
          const b = makeAnimal(e, a.sp, Math.random() < .5 ? 'M' : 'F', 0); b.x = b.tx = a.x; b.y = b.ty = a.y; e.animals.push(b); S.stats.births++; Z.onBirth(e, a, b); Z.xp(35);
          Z.notify('🍼 Naissance ! ' + a.name + ' a donné naissance à ' + b.name + ' (' + sp.n.toLowerCase() + ')', 'good', e);
        }
      }
      const ok = a => a.age >= sp.mat && a.age < sp.life * .85 && a.happy > 65 && a.health > 70 && !a.sick;
      if (e.w * e.h >= (e.animals.length + 1) * sp.space && e.animals.some(a => a.sex === 'M' && ok(a))) {
        for (const a of e.animals) if (a.sex === 'F' && !a.preg && ok(a) && Math.random() < sp.fert * Z.rmod('fert')) { a.preg = sp.gest; break; }
      }
    }
  }

  // ---------- Visiteurs ----------
  const COLS = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#34495e', '#ff7eb6', '#2ecc71'];
  const SKINS = ['#f6d3b3', '#e8b88f', '#c98e62', '#8d5a3b', '#f9e0c7'];
  function think(v, t) { v.thought = t; Z.thoughts.unshift(v.name + ' : ' + t); if (Z.thoughts.length > 14) Z.thoughts.pop(); }
  function spawnVisitor() {
    const S = Z.S, v = {
      id: S.nextId++, kind: 'vis', name: pick(Z.PEOPLE_NAMES), x: EX + .5, y: EY + .5, ox: rnd(-.32, .32), oy: rnd(-.32, .32),
      path: null, st: 'idle', t: 0, goal: null, money: Math.round(ri(25, 140) * Z.mapMod('wealth')), hunger: rnd(45, 100), thirst: rnd(45, 100), bladder: rnd(55, 100), energy: rnd(75, 100),
      happy: 50, seen: {}, nseen: 0, trash: 0, gift: false, lt: -1, thought: '', col: pick(COLS), skin: pick(SKINS), kid: Math.random() < .25, c: {},
    };
    const fair = Z.fairPrice();
    if (S.ticket > fair * 1.25) { v.happy -= 12; think(v, 'Le billet est vraiment cher… 💸'); }
    else if (S.ticket < fair * .7) { v.happy += 6; think(v, 'L’entrée n’est pas chère, super !'); }
    Z.earn('tickets', S.ticket); S.stats.visitors++; S.fin.vis++; S.visitors.push(v); Z.onSpawn(v);
  }
  function goBuilding(v, type) {
    const ts = [].concat(type), all = Z.S.buildings.filter(b => ts.includes(b.type) && b.acc.length && !b.bt && !b.closed); if (!all.length) return false;
    const goals = []; for (const b of all) for (const t of b.acc) goals.push(t);
    const p = Z.findPath(tileOf(v), goals); if (!p) return false;
    const end = p.length ? p[p.length - 1] : tileOf(v);
    v.path = p; v.st = 'walk'; const tb = all.find(b => b.acc.includes(end)); v.goal = { k: tb.type, id: tb.id }; return true;
  }
  function complain(v, key, txt, pen) { if (!v.c[key]) { v.c[key] = 1; v.happy -= pen; think(v, txt); } }
  function leave(v) {
    v.leaving = true; const p = Z.findPath(tileOf(v), [idx(EX, EY)]);
    if (!p) { v.x = EX + .5; v.y = EY + .5; v.path = []; } else v.path = p;
    v.st = 'walk'; v.goal = { k: 'exit' };
  }
  function decide(v) {
    const S = Z.S;
    if (v.leaving || !Z.isOpen() || v.happy < 15 || v.energy < 8) return leave(v);
    if (v.bladder < 25) { if (goBuilding(v, 'toilet')) return; complain(v, 'wc', 'Il n’y a pas de toilettes ici ?! 😣', 12); v.bladder = 32; }
    if (v.thirst < 30) { if (goBuilding(v, 'drink')) return; complain(v, 'drink', 'J’ai soif et rien à boire…', 8); v.thirst = 36; }
    if (v.hunger < 25) { if (goBuilding(v, ['food', 'resto'])) return; complain(v, 'food', 'J’ai faim, il n’y a rien à manger !', 8); v.hunger = 32; }
    if (v.energy < 28 && !v.c.bench) { if (goBuilding(v, 'bench')) return; complain(v, 'bench', 'Pas un seul banc pour se reposer…', 5); }
    if (!v.c.ice && Math.random() < .05) { v.c.ice = 1; if (goBuilding(v, 'ice')) return; }
    if (Math.random() < .25) { const rs = [...new Set(S.buildings.filter(b => BL[b.type].cat === 'ride' && !v.c['r' + b.type]).map(b => b.type))]; if (rs.length && goBuilding(v, rs)) return; }
    if (v.kid && !v.c.play && Math.random() < .12) { v.c.play = 1; if (goBuilding(v, 'play')) return; }
    const cand = S.enclosures.filter(e => e.animals.length && e.vp.length && !v.seen[e.id]);
    if (cand.length) {
      let best = null, bd = 1e9;
      for (let i = 0; i < 3; i++) { const e = pick(cand), d = Math.abs(e.x + e.w / 2 - v.x) + Math.abs(e.y + e.h / 2 - v.y); if (d < bd) { bd = d; best = e; } }
      const p = Z.findPath(tileOf(v), [pick(best.vp)]);
      if (p) { v.path = p; v.st = 'walk'; v.goal = { k: 'encl', id: best.id }; return; }
      v.seen[best.id] = 1; return;
    }
    if (!v.nseen) { v.happy -= 30; think(v, 'Il n’y a rien à voir dans ce zoo !'); return leave(v); }
    if (!v.gift) { v.gift = true; if (Math.random() < .6 && goBuilding(v, 'gift')) return; }
    leave(v);
  }
  function shopBuy(v, b, mult) {
    const d = BL[b.type], wtp = d.price * rnd(1.15, 2.1) * mult;
    if (b.price > wtp || v.money < b.price) { v.happy -= 4; think(v, d.name + ' : c’est trop cher !'); return false; }
    v.money -= b.price; Z.earn('shops', b.price); Z.spend('goods', d.goods); b.sold++; v.happy += 4; return true;
  }
  function arrive(v) {
    const S = Z.S, g = v.goal; v.goal = null; v.st = 'idle'; if (!g) return;
    if (g.k === 'exit') { v.gone = true; Z.onExit(v); Z.xp(Math.max(0, v.happy - 25) / 110); S.ratings.push(clamp((v.happy - 20) / 16, 0, 5)); if (S.ratings.length > 80) S.ratings.splice(0, S.ratings.length - 80); return; }
    if (g.k === 'encl') { v.st = 'busy'; v.t = rnd(18, 35); v.act = g; return; }
    const b = S.buildings.find(b => b.id === g.id); if (!b) return;
    if (Z.queueFor(v, b, g)) return;
    serve(v, b, g);
  }
  function serve(v, b, g) {
    if (g.k === 'toilet') { v.bladder = 100; v.st = 'busy'; v.t = 6; }
    else if (g.k === 'bench') { v.st = 'busy'; v.t = 30; v.energy = Math.min(100, v.energy + 45); v.happy += 2; }
    else if (g.k === 'food') { if (shopBuy(v, b, 1)) { v.hunger = 100; v.trash = 1; v.st = 'busy'; v.t = 15; } else v.hunger = 40; }
    else if (g.k === 'drink') { if (shopBuy(v, b, 1)) { v.thirst = 100; v.bladder -= 20; v.trash = 1; v.st = 'busy'; v.t = 5; } else v.thirst = 42; }
    else if (g.k === 'gift') { if (v.happy > 50 && shopBuy(v, b, v.happy / 70)) { v.st = 'busy'; v.t = 10; think(v, 'Un joli souvenir du zoo 🎁'); } }
    else if (g.k === 'resto') { if (shopBuy(v, b, 1)) { v.hunger = 100; v.thirst = Math.max(v.thirst, 70); v.energy = Math.min(100, v.energy + 20); v.happy += 3; v.st = 'busy'; v.t = 30; } else v.hunger = 40; }
    else if (g.k === 'ice') { if (shopBuy(v, b, 1)) { v.thirst = Math.min(100, v.thirst + 25); v.happy += 4; v.trash = 1; v.st = 'busy'; v.t = 6; } }
    else if (BL[g.k].cat === 'ride') { v.c['r' + g.k] = 1; if (shopBuy(v, b, 1.4)) { v.happy += BL[g.k].fun - 4; v.st = 'busy'; v.t = BL[g.k].dur; think(v, BL[g.k].name + ' : génial ! ' + BL[g.k].icon); } }
    else if (g.k === 'play') { v.happy += 8; v.st = 'busy'; v.t = 20; think(v, 'Trop bien, l’aire de jeux ! 🎠'); }
  }
  Z.serve = serve;
  function finishBusy(v) {
    v.st = 'idle'; const g = v.act; v.act = null; if (!g) return;
    const e = Z.S.enclosures.find(e => e.id === g.id); if (!e || !e.animals.length) return;
    const sp = SP[e.animals[0].sp], hp = Z.avg(e, 'happy'); let gain = (clamp(Z.enclAppeal(e) * .3, 1, 14) + Z.beauty * 3) * Z.guideBonus() + Z.fanBonus(v, e);
    if (hp < 40) { gain = -6; think(v, 'Ces ' + sp.pl + ' ont l’air malheureux 😟'); }
    else if (e.clean < 30) { gain -= 6; think(v, 'L’enclos des ' + sp.pl + ' est sale…'); }
    else if (e.animals.some(a => a.age < 1)) { gain += 3; think(v, 'Oh, un bébé ' + sp.n.toLowerCase() + ' ! 😍'); }
    else if (Math.random() < .5) think(v, pick(['J’adore les ' + sp.pl + ' !', 'Les ' + sp.pl + ' sont magnifiques', 'Regarde les ' + sp.pl + ' ! ' + sp.e]));
    v.happy = clamp(v.happy + gain, 0, 100); v.seen[e.id] = 1; v.nseen++;
  }
  function visitorUpdate(v, dt) {
    const S = Z.S;
    v.hunger -= .28 * dt; v.thirst -= .4 * dt * Z.evMod('thirst'); v.bladder -= .3 * dt; v.energy -= .2 * dt;
    if (S.weather === 'rain') v.happy -= .02 * dt;
    if (v.st === 'walk') {
      const arrived = moveAlong(v, dt, v.kid ? .17 : .2), t = tileOf(v);
      if (t !== v.lt) {
        v.lt = t;
        if (S.litter[t] > 0) { v.happy -= .5; if (Math.random() < .03) think(v, 'Beurk, des déchets partout…'); }
        if (v.trash) { if (Z.binCover[t]) v.trash = 0; else if (Math.random() < .12) { S.litter[t] = Math.min(3, S.litter[t] + 1); v.trash = 0; } }
      }
      if (arrived) arrive(v);
    } else if (v.st === 'busy') { v.t -= dt; if (v.t <= 0) finishBusy(v); }
    else if (v.st === 'queue') { v.t -= dt; if (v.t <= 0) Z.queueDone(v); }
    else decide(v);
  }

  // ---------- Personnel ----------
  const FIRST = ['Marie', 'Thomas', 'Sophie', 'Julien', 'Laura', 'Kevin', 'Élise', 'Mehdi', 'Anna', 'Bruno', 'Clara', 'David', 'Fatou', 'Rémi', 'Nora', 'Yann'];
  Z.hire = function (type) {
    const S = Z.S; if (!Z.staffUnlocked(type)) { Z.notify('Poste disponible au niveau ' + Z.STAFF[type].lvl, 'bad'); return null; } if (!Z.pay('salaries', 200)) return null;
    const s = { id: S.nextId++, kind: 'staff', type, name: pick(FIRST), x: EX + .5, y: EY + .5, ox: rnd(-.2, .2), oy: rnd(-.2, .2), st: 'idle', cool: 1, t: 0, task: null, path: null };
    S.staff.push(s); return s;
  };
  Z.fire = function (id) {
    const S = Z.S, i = S.staff.findIndex(s => s.id === id); if (i < 0) return;
    for (const k in Z.claims) if (Z.claims[k] === id) delete Z.claims[k];
    S.staff.splice(i, 1);
  };
  Z.staffLabel = function (s) {
    if (Z.STAFF[s.type].desk) return 'En poste';
    if (!s.task) return 'En attente';
    const e = Z.S.enclosures.find(e => e.id === s.task.eid), nm = e ? ' (' + e.name + ')' : '';
    const verb = { care: 'Nourrit et nettoie', fix: 'Répare la clôture', vet: 'Soigne les animaux', litter: 'Ramasse les déchets' }[s.task.k];
    return (s.st === 'walk' ? 'En route — ' : '') + verb + nm;
  };
  function assign(s) {
    const S = Z.S, start = tileOf(s); let best = null, bs = 0, kind = null;
    const claimFree = (k, e) => { const c = Z.claims[k + e.id]; return !c || c === s.id; };
    if (s.type === 'keeper') {
      kind = 'care';
      for (const e of S.enclosures) { if (!e.animals.length || !e.vp.length || !claimFree(kind, e) || !Z.inZone(s, e)) continue; const sc = Math.max((60 - e.food) * 1.5, 65 - e.clean); if (sc > bs) { bs = sc; best = e; } }
    } else if (s.type === 'vet') {
      kind = 'vet';
      for (const e of S.enclosures) { if (!e.vp.length || !claimFree(kind, e) || !Z.inZone(s, e)) continue; const sc = e.animals.filter(a => a.sick).length; if (sc > bs) { bs = sc; best = e; } }
    } else {
      kind = 'fix';
      for (const e of S.enclosures) { if (!e.vp.length || !claimFree(kind, e) || !Z.inZone(s, e)) continue; const sc = 65 - e.fence; if (sc > bs) { bs = sc; best = e; } }
      if (!best || bs < 35) {
        const goals = []; for (let i = 0; i < W * H; i++) if (S.litter[i] > 0 && Z.reach[i]) goals.push(i);
        const p = Z.findPath(start, goals);
        if (p) { s.path = p; s.st = 'walk'; s.task = { k: 'litter', tile: p.length ? p[p.length - 1] : start, dur: 4 }; return; }
      }
    }
    if (!best) return;
    const p = Z.findPath(start, best.vp); if (!p) return;
    const ns = best.animals.filter(a => a.sick).length;
    const dur = kind === 'care' ? 35 + best.w * best.h * .5 : kind === 'vet' ? 30 + ns * 25 : 40 + (100 - best.fence) * .6;
    Z.claims[kind + best.id] = s.id; s.path = p; s.st = 'walk'; s.task = { k: kind, eid: best.id, dur: dur * Z.skillMod(s) };
  }
  function completeTask(s) {
    const S = Z.S, t = s.task;
    if (t.k === 'litter') { S.litter[t.tile] = 0; return; }
    delete Z.claims[t.k + t.eid];
    const e = S.enclosures.find(e => e.id === t.eid); if (!e) return;
    if (t.k === 'care') {
      const daily = e.animals.reduce((n, a) => n + SP[a.sp].food * (a.age < 1 ? .5 : 1), 0);
      e.food = Z.feed((100 - e.food) / 100 * daily * Z.rmod('food'), e.food); e.clean = 100;
    } else if (t.k === 'fix') { Z.spend('upkeep', (100 - e.fence) * 2); e.fence = 100; }
    else if (t.k === 'vet') for (const a of e.animals) if (a.sick) { a.sick = 0; a.health = Math.min(100, a.health + 30); Z.spend('vet', 120); Z.notify('💉 ' + a.name + ' est guéri(e)', 'good'); }
  }
  function staffUpdate(s, dt) {
    if (Z.onStrike()) return;
    if (s.st === 'walk') { if (moveAlong(s, dt, .27)) { s.st = 'work'; s.t = s.task.dur; } }
    else if (s.st === 'work') { s.t -= dt; if (s.t <= 0) { completeTask(s); Z.onTask(s); s.st = 'idle'; s.task = null; s.cool = 3; } }
    else { s.cool -= dt; if (s.cool <= 0) { assign(s); if (!s.task) s.cool = 15; } }
  }

  // ---------- Horloge ----------
  function checkUnlocks(silent) {
    const S = Z.S, r = Z.rep();
    for (const k in SP) if (false) { S.unlocked[k] = 1; if (!silent) Z.notify('🔓 Nouvelle espèce disponible : ' + SP[k].e + ' ' + SP[k].n, 'good'); }
  }
  function checkGoals() {
    const S = Z.S; if (S.scn) return;
    while (S.goal < Z.GOALS.length && Z.GOALS[S.goal].c(S)) {
      const g = Z.GOALS[S.goal]; S.goal++; Z.earn('rewards', g.r); Z.xp(g.r / 40);
      Z.notify('🎯 Objectif atteint : ' + g.t + ' (+' + Z.fmt(g.r) + ')', 'good');
      for (const k in BL) if (BL[k].need === S.goal - 1) Z.notify('🔓 Nouveau bâtiment disponible : ' + BL[k].icon + ' ' + BL[k].name, 'good');
    }
  }
  function hourly() { Z.progressHourly(); Z.staffHourly(); animalsHourly(); checkUnlocks(false); checkGoals(); if (Z.onHourly) Z.onHourly(); }
  function daily() {
    const S = Z.S;
    for (const s of S.staff) Z.spend('salaries', Z.salaryOf(s));
    for (const e of S.enclosures) Z.spend('upkeep', e.w * e.h * .8);
    for (const b of S.buildings) { if (BL[b.type].upkeep) Z.spend('upkeep', BL[b.type].upkeep); b.sold = 0; }
    Z.bankDaily();
    { let p = 0; for (const k in S.fin.today) if (k !== 'rewards' && k !== 'sales') p += S.fin.today[k]; if (p > 0) Z.spend('tax', p * .2); }
    let inc = 0, exp = 0; for (const k in S.fin.today) { const v = S.fin.today[k]; if (v > 0) inc += v; else exp -= v; }
    S.fin.history.push({ d: S.day, inc, exp, vis: S.fin.vis, cats: S.fin.today, money: S.money, rep: Z.rep(), an: Z.animalCount(), val: Z.zooValue() }); if (S.fin.history.length > 60) S.fin.history.shift();
    if (S.fin.vis > S.stats.bestDay) S.stats.bestDay = S.fin.vis;
    S.fin.today = {}; S.fin.vis = 0; S.day++;
    S.weather = S.forecast.shift(); S.forecast.push(Z.rollWeather());
    animalsDaily();
    if (Z.onDaily) Z.onDaily();
    Z.save();
  }
  function step(dt) {
    const S = Z.S; S.minute += dt;
    if (S.minute >= 1440) { S.minute -= 1440; S.lastHour = -1; daily(); }
    const h = Math.floor(S.minute / 60); if (h !== S.lastHour) { S.lastHour = h; hourly(); }
    const hr = S.minute / 60;
    if (hr >= 9 && hr < 17.5) { const dm = Z.demand(), cap = Z.entryCap(); if (dm > cap) S.lost = (S.lost || 0) + (dm - cap) / 60 * dt; S.spawnAcc = (S.spawnAcc || 0) + Math.min(dm, cap) / 60 * dt * Z.rnd(.5, 1.5); while (S.spawnAcc >= 1) { S.spawnAcc--; if (S.visitors.length < 700) spawnVisitor(); } }
    for (const v of S.visitors) visitorUpdate(v, dt);
    if (S.visitors.some(v => v.gone)) S.visitors = S.visitors.filter(v => !v.gone);
    if (hr >= 21 && S.visitors.length) S.visitors = [];
    if (S.visitors.length > S.stats.peak) S.stats.peak = S.visitors.length;
    for (const s of S.staff) if (!Z.STAFF[s.type].desk) staffUpdate(s, dt);
    animalsMove(dt);
  }
  Z.advance = function (gm) { while (gm > 0) { const dt = Math.min(1, gm); step(dt); gm -= dt; } };
  Z.tick = function (realSec) {
    const S = Z.S; if (!S.speed) return;
    const fast = !Z.isOpen() && !S.visitors.length ? 4 : 1;
    Z.advance(realSec * MIN_PER_SEC * S.speed * fast);
  };
})();
