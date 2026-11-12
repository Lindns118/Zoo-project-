// Zoo Project — profondeur de jeu : files d'attente, événements, profils de visiteurs, généalogie, bourse aux animaux,
// carrière du personnel, entrepôt de nourriture
(function () {
  const SP = Z.SPECIES, BL = Z.BUILDINGS, fmt = Z.fmt, pick = Z.pick, rnd = Z.rnd, clamp = Z.clamp;
  const now = () => Z.S.day * 1440 + Z.S.minute;
  const bar = (v, col) => `<div class="bar"><i style="width:${clamp(v, 0, 100)}%;background:${col || (v > 60 ? '#3fae5a' : v > 30 ? '#e0a020' : '#d9534f')}"></i></div>`;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const findAnimal = id => { for (const e of Z.S.enclosures) { const a = e.animals.find(a => a.id === id); if (a) return [e, a]; } return [null, null]; };

  // ================= 3. Files d'attente =================
  const SVC = { food: 2, drink: 1, gift: 2, ice: 1, resto: 3, toilet: 1.5 }; // minutes par client
  const svcOf = b => { const d = BL[b.type]; return d.cat === 'ride' ? d.dur / (d.size * d.size * 2.5) : SVC[b.type] || 0; };
  Z.queueWait = b => Math.max(0, (b.qt || 0) - now());
  Z.queueLen = b => { const s = svcOf(b); return s ? Math.ceil(Z.queueWait(b) / s) : 0; };
  Z.queueFor = function (v, b, g) {
    const svc = svcOf(b); if (!svc) return false;
    let wait = Z.queueWait(b); if (v.fast) wait *= .25;
    if (wait > 28 + rnd(0, 17)) { // trop d'attente : le visiteur renonce
      v.happy -= 5; v.thought = BL[b.type].name + ' : trop de queue, j’abandonne'; Z.thoughts.unshift(v.name + ' : ' + v.thought); if (Z.thoughts.length > 14) Z.thoughts.pop();
      if (g.k === 'food' || g.k === 'resto') v.hunger = 42; else if (g.k === 'drink') v.thirst = 44; else if (g.k === 'toilet') v.bladder = 40; else v.c['r' + g.k] = 1;
      v.c.queue = 1; Z.S.qLost = (Z.S.qLost || 0) + 1; return true;
    }
    b.qt = Math.max(now(), b.qt || 0) + svc;
    if (wait < .5) return false;
    if (wait > 12) v.happy -= 2;
    v.st = 'queue'; v.t = wait; v.qb = b.id; v.qg = g; return true;
  };
  Z.queueDone = function (v) { v.st = 'idle'; const b = Z.S.buildings.find(b => b.id === v.qb); if (b && !b.closed && !b.bt) Z.serve(v, b, v.qg); };

  // ================= 4. Événements =================
  Z.EVENTS = {
    canicule: { n: 'Canicule', icon: '🥵', d: 3, txt: 'Les visiteurs ont deux fois plus soif et l’affluence baisse un peu. Buvettes et glaciers vont faire le plein.', mods: { thirst: 2, demand: .9 } },
    tempete: { n: 'Tempête', icon: '🌪️', d: 1, txt: 'Presque personne ne viendra aujourd’hui et les clôtures ont souffert.', mods: { demand: .25 }, on: S => { S.weather = 'rain'; for (const e of S.enclosures) e.fence = Math.max(5, e.fence - 25); } },
    epidemie: { n: 'Épidémie', icon: '🦠', d: 2, txt: 'Un virus circule : de nombreux animaux tombent malades. Vos vétérinaires vont être débordés.', mods: {}, on: S => { for (const e of S.enclosures) for (const a of e.animals) if (Math.random() < .3) a.sick = 1; } },
    star: { n: 'Visite d’une célébrité', icon: '🌟', d: 2, txt: 'Une vedette visite le zoo : la foule accourt.', mods: { demand: 1.6 } },
    tv: { n: 'Reportage télévisé', icon: '📺', d: 3, txt: 'Une chaîne nationale diffuse un reportage sur votre zoo : affluence et réputation en hausse.', mods: { demand: 1.3 }, on: S => S.ratings.push(5, 5, 5) },
    vacances: { n: 'Vacances scolaires', icon: '🎒', d: 5, txt: 'Les familles ont du temps libre : affluence en nette hausse.', mods: { demand: 1.35 } },
    greve: { n: 'Grève des transports', icon: '🚇', d: 2, txt: 'Difficile de venir jusqu’au zoo : moins de visiteurs.', mods: { demand: .6 } },
    mecene: { n: 'Don d’un mécène', icon: '💝', d: 1, txt: 'Un admirateur du zoo vous fait un don.', mods: {}, on: S => Z.earn('rewards', 1500 * S.level) },
    inspection: { n: 'Inspection surprise', icon: '🕵️', d: 1, txt: '', mods: {}, on: S => { const ok = S.enclosures.every(e => !e.animals.length || (e.clean >= 50 && e.fence >= 50)); if (ok) { Z.earn('rewards', 2500); S.ratings.push(5, 5); } else { Z.spend('misc', 3000); S.ratings.push(1, 1); } Z.EVENTS.inspection.txt = ok ? 'Tout est en ordre : prime de 2 500 € et réputation en hausse.' : 'Enclos sales ou clôtures abîmées : amende de 3 000 €.'; } },
  };
  Z.evMod = k => { const ev = Z.S.event && Z.EVENTS[Z.S.event.k]; return ev && ev.mods[k] || 1; };
  function eventsDaily() {
    const S = Z.S;
    if (S.event && --S.event.left <= 0) { Z.notify(Z.EVENTS[S.event.k].icon + ' Fin de l’événement : ' + Z.EVENTS[S.event.k].n, 'info'); S.event = null; }
    if (!S.event && S.day > 6 && Z.animalCount() >= 4 && Math.random() < .13) {
      const k = pick(Object.keys(Z.EVENTS)), ev = Z.EVENTS[k]; S.event = { k, left: ev.d }; if (ev.on) ev.on(S);
      Z.notify(ev.icon + ' Événement : ' + ev.n, 'warn');
      if (Z.modal && !Z.silentLevel) Z.modal(ev.icon + ' ' + ev.n, `<p>${ev.txt}</p><p class="muted">Durée : ${ev.d} jour${ev.d > 1 ? 's' : ''}.</p>`, [['Compris']]);
    }
  }

  // ================= 5. Profils de visiteurs, avis, abonnements, coupe-file =================
  const CAT = { fauves: ['lion', 'tigre', 'leopard', 'loup', 'ours', 'ourspol', 'croco', 'trex'], oiseaux: ['paon', 'flamant', 'manchot', 'perroquet', 'aigle', 'cygne'], primates: ['singe', 'gorille', 'orang', 'paresseux'], géants: ['elephant', 'girafe', 'rhino', 'hippo', 'diplo', 'bison', 'buffle', 'chameau'] };
  const catOf = sp => Object.keys(CAT).find(c => CAT[c].includes(sp));
  Z.VTYPES = { promeneur: 'Promeneur', famille: 'En famille', fan: 'Passionné', vip: 'Visiteur aisé', scolaire: 'Sortie scolaire' };
  Z.onSpawn = function (v) {
    const S = Z.S, r = Math.random();
    v.type = r < .3 ? 'famille' : r < .45 ? 'fan' : r < .52 ? 'vip' : r < .62 ? 'scolaire' : 'promeneur';
    if (v.type === 'fan') v.fav = pick(Object.keys(CAT));
    if (v.type === 'vip') { v.money *= 3; v.happy -= 5; v.kid = false; }
    if (v.type === 'scolaire') { v.kid = true; v.money = Math.round(v.money * .25); }
    if (S.pass.on && Math.random() < .12) { v.pass = 1; Z.earn('tickets', -S.ticket); v.happy += 4; }
    if (S.fast.on && v.money > S.fast.price * 3 && Math.random() < (v.type === 'vip' ? .7 : .15)) { v.fast = 1; v.money -= S.fast.price; Z.earn('shops', S.fast.price); }
  };
  Z.fanBonus = function (v, e) { if (v.fav && catOf(e.animals[0].sp) === v.fav) { v.favSeen = 1; return 6; } return 0; };
  const REV = {
    5: ['Une journée magnifique, on reviendra !', 'Des animaux superbes et bien soignés.', 'Le meilleur zoo de la région.'],
    4: ['Très belle visite.', 'Beau parc, quelques détails à améliorer.'], 3: ['Correct, sans plus.', 'Pas mal, mais un peu cher pour ce que c’est.'],
    2: ['Déçu, je m’attendais à mieux.', 'Trop peu d’animaux à voir.'], 1: ['À fuir.', 'Une honte, les animaux font peine à voir.'],
  };
  const WHY = { wc: 'Pas de toilettes !', drink: 'Impossible de trouver à boire.', food: 'Rien à manger sur place.', bench: 'Aucun banc pour s’asseoir.', queue: 'Des files d’attente interminables.' };
  Z.onExit = function (v) {
    const S = Z.S;
    if (v.fav && !v.favSeen) v.happy -= 10;
    if (Math.random() < .12) {
      const stars = clamp(Math.round((v.happy - 20) / 16), 1, 5), why = Object.keys(WHY).find(k => v.c[k]);
      const txt = stars <= 3 && why ? WHY[why] : v.fav && !v.favSeen ? 'Je venais pour les ' + v.fav + ' : il n’y en avait pas.' : pick(REV[stars]);
      S.reviews.unshift({ n: v.name, s: stars, t: txt, d: S.day }); if (S.reviews.length > 15) S.reviews.pop();
    }
  };
  function passDaily() {
    const S = Z.S; if (!S.pass.on) return;
    const n = Math.round(Z.demand() * .4 * clamp(1.5 - S.pass.price / (Z.fairPrice() * 6), 0, 1.2));
    if (n > 0) { Z.earn('tickets', n * S.pass.price); S.pass.sold = (S.pass.sold || 0) + n; }
  }

  // ================= 6. Généalogie, réintroduction, bourse aux animaux =================
  const ENDANGERED = ['panda', 'tigre', 'gorille', 'orang', 'rhino', 'elephant', 'ourspol', 'leopard', 'koala', 'tortue'];
  Z.onBirth = function (e, mom, baby) {
    const dads = e.animals.filter(a => a.sex === 'M' && a.age >= SP[a.sp].mat && a !== baby), dad = dads.length ? pick(dads) : null;
    baby.mom = mom.id; baby.pn = mom.name; if (dad) { baby.dad = dad.id; baby.pn += ' et ' + dad.name; }
    const rel = dad && (dad.mom === mom.id || mom.dad === dad.id || (dad.mom && dad.mom === mom.mom) || (dad.dad && dad.dad === mom.dad));
    if (rel) { baby.inbred = 1; baby.health = 65; Z.notify('🧬 Consanguinité : ' + baby.name + ' est né(e) de parents apparentés et sera fragile. Introduisez du sang neuf par la bourse aux animaux.', 'warn', e); }
  };
  Z.canRelease = a => ENDANGERED.includes(a.sp) && a.mom && a.age >= SP[a.sp].mat && a.health > 80 && a.happy > 70 && !a.sick;
  Z.release = function (id) {
    const [e, a] = findAnimal(id), S = Z.S; if (!a || !Z.canRelease(a)) return;
    e.animals.splice(e.animals.indexOf(a), 1); const grant = Math.round(SP[a.sp].price * .35);
    Z.earn('rewards', grant); S.ratings.push(5, 5, 5); Z.xp(80); S.stats.released = (S.stats.released || 0) + 1;
    Z.notify('🌍 ' + a.name + ' (' + SP[a.sp].n.toLowerCase() + ') a été réintroduit(e) dans la nature ! Subvention : ' + fmt(grant), 'good');
  };
  function marketRefresh() {
    const S = Z.S, ks = Object.keys(SP).filter(k => Z.biomeUnlocked(SP[k].b)); S.market = [];
    for (let i = 0; i < 4; i++) { const k = pick(ks), sp = SP[k], known = Z.speciesUnlocked(k); S.market.push({ id: S.nextId++, sp: k, sex: Math.random() < .5 ? 'M' : 'F', age: sp.mat + rnd(0, 4), price: Math.round(sp.price * (known ? rnd(.6, .85) : rnd(1.1, 1.4)) / 50) * 50 }); }
    S.marketDay = S.day;
  }
  Z.buyOffer = function (eid, oid) {
    const S = Z.S, e = S.enclosures.find(e => e.id === eid), i = S.market.findIndex(o => o.id === oid); if (!e || i < 0) return;
    const o = S.market[i], sp = SP[o.sp];
    if (e.bt > 0) return Z.notify('L’enclos est encore en chantier', 'bad');
    if (sp.b !== e.biome || (e.animals.length && e.animals[0].sp !== o.sp) || (e.pending.length && e.pending[0].sp !== o.sp)) return Z.notify('Cet animal ne convient pas à cet enclos', 'bad');
    if (!Z.pay('animals', o.price)) return;
    S.market.splice(i, 1); S.unlocked[o.sp] = 1; e.pending.push({ sp: o.sp, sex: o.sex, age: o.age, eta: Z.DELIVERY_HOURS });
    Z.notify('🤝 Échange conclu : un ' + sp.n.toLowerCase() + ' arrive dans ' + Z.DELIVERY_HOURS + ' h', 'good');
  };

  // ================= 7. Carrière du personnel =================
  Z.skillMod = s => (1 - .1 * ((s.lvl || 1) - 1)) * (Z.S.morale > 75 ? .9 : 1);
  Z.salaryOf = s => Z.STAFF[s.type].salary * (1 + .1 * ((s.lvl || 1) - 1)) * Z.S.pay;
  Z.inZone = (s, e) => s.zone == null || Z.parcelAt(e.x, e.y).id === s.zone;
  Z.onStrike = () => Z.S.strike > 0;
  Z.onTask = function (s) { s.n = (s.n || 0) + (s.task && s.task.k === 'litter' ? .15 : 1); if ((s.lvl || 1) < 5 && s.n >= 14 * (s.lvl || 1)) { s.n = 0; s.lvl = (s.lvl || 1) + 1; Z.notify('🎓 ' + s.name + ' gagne en expérience : niveau ' + s.lvl, 'good'); } };
  Z.trainCost = s => 600 * (s.lvl || 1);
  Z.train = function (id) { const s = Z.S.staff.find(s => s.id === id); if (!s || (s.lvl || 1) >= 5 || !Z.pay('salaries', Z.trainCost(s))) return; s.lvl = (s.lvl || 1) + 1; s.n = 0; };
  function staffDaily() {
    const S = Z.S, nd = Z.staffNeeds(); let lack = 0; for (const k in nd) if (!nd[k].opt && nd[k].have < nd[k].need) lack += nd[k].need - nd[k].have;
    const target = clamp(60 + (S.pay - 1) * 160 - lack * 7, 0, 100); S.morale += (target - S.morale) * .3;
    if (S.strike > 0) { S.strike--; if (!S.strike) Z.notify('✊ La grève est terminée', 'info'); }
    else if (S.staff.length >= 4 && S.morale < 25 && Math.random() < .25) { S.strike = 1; Z.notify('✊ Grève du personnel ! Moral trop bas : personne ne travaille sur le terrain aujourd’hui. Augmentez les salaires ou embauchez.', 'bad'); }
    else if (S.staff.length >= 4 && S.morale < 40 && Math.random() < .12) { const s = pick(S.staff); Z.fire(s.id); Z.notify('🚪 ' + s.name + ' (' + Z.STAFF[s.type].name.toLowerCase() + ') démissionne : le moral est trop bas.', 'bad'); }
  }

  // ================= 8. Entrepôt de nourriture =================
  BL.depot = { name: 'Entrepôt', icon: '📦', size: 2, cost: 6000, upkeep: 40, cat: 'shop', color: '#8d6e4a', lvl: 3, desc: 'Augmente la capacité de stockage de nourriture de 6 000 €.' };
  Z.PACKS = { s: { n: 'Petite commande', amt: 1000, disc: 0 }, m: { n: 'Commande moyenne', amt: 4000, disc: .08 }, l: { n: 'Gros arrivage', amt: 12000, disc: .15 } };
  Z.stockCap = () => 4000 + 6000 * Z.S.buildings.filter(b => b.type === 'depot' && !b.bt).length;
  Z.orderFood = function (k, auto) {
    const S = Z.S, p = Z.PACKS[k], room = Z.stockCap() - S.stock - S.orders.reduce((n, o) => n + o.amt, 0);
    if (room < p.amt) { if (!auto) Z.notify('Entrepôt trop petit pour cette commande : construisez un entrepôt (Services)', 'bad'); return false; }
    const cost = p.amt * (1 - p.disc) * (auto ? 1.1 : 1); if (auto ? S.money < cost : !Z.pay('food', cost)) return false;
    if (auto) Z.spend('food', cost); S.orders.push({ amt: p.amt, eta: 10 }); return true;
  };
  Z.feed = function (cost, level) {
    const S = Z.S; if (cost <= 0) return 100;
    if (S.stock >= cost) { S.stock -= cost; return 100; }
    const f = S.stock / cost; S.stock = 0;
    if (S.stockWarn !== S.day) { S.stockWarn = S.day; Z.notify('📦 Entrepôt vide : les soigneurs n’ont plus de nourriture. Passez commande dans 🦁 Animaux.', 'bad'); }
    return level + (100 - level) * f;
  };
  function stockHourly() {
    const S = Z.S;
    for (const o of S.orders.slice()) if (--o.eta <= 0) { S.orders.splice(S.orders.indexOf(o), 1); S.stock = Math.min(Z.stockCap(), S.stock + o.amt); Z.notify('🚚 Livraison de nourriture : +' + fmt(o.amt), 'info'); }
    if (S.autoOrder && !S.orders.length && S.stock < Z.stockCap() * .25 && Z.animalCount()) Z.orderFood('s', true);
  }

  // ================= Crochets =================
  const oldMig = Z.progressMigrate;
  Z.progressMigrate = function (S) {
    oldMig(S);
    S.reviews = S.reviews || []; S.pass = S.pass || { on: false, price: 60 }; S.fast = S.fast || { on: false, price: 8 };
    S.market = S.market || []; S.pay = S.pay || 1; if (S.morale == null) S.morale = 60; S.strike = S.strike || 0;
    if (S.stock == null) { S.stock = 2000; S.autoOrder = true; } S.orders = S.orders || [];
  };
  const oldH = Z.onHourly, oldD = Z.onDaily;
  Z.onHourly = function () { if (oldH) oldH(); stockHourly(); for (const e of Z.S.enclosures) for (const a of e.animals) if (a.inbred && a.health > 75) a.health = 75; };
  Z.onDaily = function () {
    const S = Z.S; if (oldD) oldD();
    eventsDaily(); passDaily(); staffDaily(); S.stock *= .98;
    if (!S.market.length || S.day - (S.marketDay || 0) >= 3) marketRefresh();
    if (S.qLost > 8) Z.notify(`⏳ ${S.qLost} visiteurs ont renoncé hier à cause des files d’attente : ajoutez des stands ou des attractions.`, 'warn'); S.qLost = 0;
  };

  // ================= Morceaux d'interface =================
  Z.html = {
    visitor: v => `<p class="muted">${Z.VTYPES[v.type] || 'Promeneur'}${v.fav ? ' — fan de ' + v.fav : ''}${v.pass ? ' · abonné' : ''}${v.fast ? ' · coupe-file' : ''}${v.st === 'queue' ? ' · fait la queue (' + Math.ceil(v.t) + ' min)' : ''}</p>`,
    visitors() {
      const S = Z.S; let h = '<h3>Avis en ligne</h3>' + (S.reviews.length ? S.reviews.slice(0, 8).map(r => `<div class="quote"><span class="stars">${'★'.repeat(r.s)}${'☆'.repeat(5 - r.s)}</span> <b>${esc(r.n)}</b> <span class="muted">· jour ${r.d}</span><br>${esc(r.t)}</div>`).join('') : '<p class="muted">Aucun avis pour l’instant.</p>');
      h += `<h3>Abonnements annuels</h3><p class="muted">Les abonnés entrent gratuitement (environ 12 % des visiteurs) mais achètent sur place. Les ventes d’abonnements rapportent chaque jour.</p><label>Prix de l’abonnement : <b id="rv">${fmt(S.pass.price)}</b><input type="range" min="20" max="200" step="5" value="${S.pass.price}" data-r="pass"></label><div class="btns"><button data-a="passtog">${S.pass.on ? '✅ Abonnements en vente — arrêter' : 'Mettre les abonnements en vente'}</button></div>${S.pass.sold ? row('Abonnements vendus', S.pass.sold) : ''}`;
      h += `<h3>Coupe-file</h3><p class="muted">Un bracelet payant qui divise l’attente par quatre aux stands et attractions.</p><div class="btns"><button data-a="fasttog">${S.fast.on ? '✅ Coupe-file à ' + fmt(S.fast.price) + ' — arrêter' : 'Vendre un coupe-file à ' + fmt(S.fast.price)}</button></div>`;
      return h;
    },
    animal: a => `${a.pn ? `<p class="muted">Né(e) au zoo · parents : ${esc(a.pn)}${a.inbred ? ' <span class="tag bad">consanguin</span>' : ''}</p>` : ''}${ENDANGERED.includes(a.sp) ? `<div class="btns"><button data-a="release" data-id="${a.id}" ${Z.canRelease(a) ? '' : 'disabled'}>🌍 Réintroduire dans la nature${Z.canRelease(a) ? '' : '<small>né au zoo, adulte, en pleine forme</small>'}</button></div>` : ''}`,
    encl(e) {
      const S = Z.S, sp = e.animals.length ? e.animals[0].sp : e.pending && e.pending.length ? e.pending[0].sp : null;
      const offers = S.market.filter(o => SP[o.sp].b === e.biome && (!sp || sp === o.sp));
      return '<h3>Bourse aux animaux</h3><p class="muted">Offres d’autres zoos, renouvelées tous les 3 jours : sang neuf à bon prix, parfois des espèces que vous n’avez pas encore débloquées.</p>' + (offers.length ? offers.map(o => `<div class="row"><span>${SP[o.sp].e} ${SP[o.sp].n} ${o.sex === 'M' ? '♂' : '♀'} · ${Math.floor(o.age)} ans${Z.speciesUnlocked(o.sp) ? '' : ' <span class="tag ok">rare</span>'}</span><button class="mini" data-a="offer" data-id="${o.id}">${fmt(o.price)}</button></div>`).join('') : '<p class="muted">Aucune offre pour cet enclos en ce moment.</p>');
    },
    staffTop() {
      const S = Z.S;
      return `<div class="grid2"><div>Moral du personnel${bar(S.morale)}</div><div>${S.strike ? '<span class="bad">✊ Grève en cours</span>' : S.morale < 40 ? '<span class="bad">Risque de démission</span>' : S.morale > 75 ? '<span class="good">Équipe motivée (+10 % d’efficacité)</span>' : 'Ambiance correcte'}</div></div><label>Niveau des salaires : <b id="rv">${Math.round(S.pay * 100)} %</b> <span class="muted">du salaire de base</span><input type="range" min="80" max="130" step="5" value="${Math.round(S.pay * 100)}" data-r="pay"></label>`;
    },
    staffm(s) {
      const lvl = s.lvl || 1, own = Z.PARCELS.filter(p => Z.S.land[p.id]);
      return row('Expérience', '🎓'.repeat(lvl) + ' niveau ' + lvl + ' / 5') + row('Salaire', fmt(Z.salaryOf(s)) + '/jour') + `<p class="muted">Chaque niveau rend ${s.name} 10 % plus rapide (et 10 % mieux payé). L’expérience vient avec le travail, ou par la formation.</p>
        <div class="btns"><button data-a="train" data-id="${s.id}" ${lvl >= 5 ? 'disabled' : ''}>🎓 Former (${fmt(Z.trainCost(s))})</button></div>
        <label>Zone de travail <select data-zone="${s.id}"><option value="">Tout le zoo</option>${own.map(p => `<option value="${p.id}" ${s.zone === p.id ? 'selected' : ''}>${p.n}</option>`).join('')}</select></label>`;
    },
    stock() {
      const S = Z.S, cap = Z.stockCap();
      return `<h3>📦 Entrepôt de nourriture</h3><div>Stock : <b>${fmt(S.stock)}</b> / ${fmt(cap)}${bar(S.stock / cap * 100)}</div>${S.orders.length ? `<p class="muted">🚚 En route : ${S.orders.map(o => fmt(o.amt) + ' dans ' + o.eta + ' h').join(', ')}</p>` : ''}
        <div class="btns">${Object.keys(Z.PACKS).map(k => { const p = Z.PACKS[k]; return `<button data-a="order" data-k="${k}">${p.n}<small>${fmt(p.amt)} de nourriture pour ${fmt(p.amt * (1 - p.disc))}</small></button>`; }).join('')}</div>
        <div class="btns"><button data-a="autotog">${S.autoOrder ? '✅ Réapprovisionnement automatique (+10 %) — désactiver' : 'Activer le réapprovisionnement automatique (+10 %)'}</button></div><p class="muted">Les soigneurs puisent dans le stock. 2 % de la nourriture se perd chaque jour. Livraison en 10 heures.</p>`;
    },
    bld: b => { const q = Z.queueLen(b); return svcOf(b) ? row('File d’attente', q ? q + ' pers. (~' + Math.ceil(Z.queueWait(b)) + ' min)' : 'aucune') : ''; },
    event: () => { const S = Z.S, ev = S.event && Z.EVENTS[S.event.k]; return ev ? ev.icon + ' ' + ev.n + ' (' + S.event.left + ' j) · ' : S.strike ? '✊ Grève · ' : ''; },
  };
  Z.extraActs = {
    passtog: () => { Z.S.pass.on = !Z.S.pass.on; }, fasttog: () => { Z.S.fast.on = !Z.S.fast.on; }, autotog: () => { Z.S.autoOrder = !Z.S.autoOrder; },
    release: d => Z.release(+d.id), offer: d => Z.buyOffer(Z.ui.parg, +d.id), train: d => Z.train(+d.id), order: d => Z.orderFood(d.k),
  };
  Z.extraRange = { pass: v => { Z.S.pass.price = v; return fmt(v); }, pay: v => { Z.S.pay = v / 100; return v + ' %'; } };
  document.addEventListener('change', ev => { const id = ev.target.dataset.zone; if (!id) return; const s = Z.S.staff.find(s => s.id === +id); if (s) { for (const k in Z.claims) if (Z.claims[k] === s.id) delete Z.claims[k]; s.zone = ev.target.value === '' ? null : +ev.target.value; s.task = null; s.st = 'idle'; s.cool = 1; } ev.target.blur(); if (Z.refreshPanel) Z.refreshPanel(); });
})();
