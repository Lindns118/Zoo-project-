// Zoo Project — logique d'affluence : capacité d'accueil du parc, saturation, difficulté
(function () {
  const BL = Z.BUILDINGS, fmt = Z.fmt, clamp = Z.clamp;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;

  // ---------- Difficulté ----------
  Z.DIFF = {
    easy: { n: 'Détendu', icon: '🌤️', demand: 1.2, xp: .9, desc: '+20 % de visiteurs, progression un peu plus lente.' },
    normal: { n: 'Normal', icon: '⚖️', demand: 1, xp: 1, desc: 'L’équilibre prévu.' },
    hard: { n: 'Expert', icon: '🔥', demand: .8, xp: 1.25, desc: '−20 % de visiteurs, mais +25 % d’expérience.' },
  };
  Z.diff = () => Z.DIFF[Z.S.diff] || Z.DIFF.normal;
  Z.diffMod = () => Z.diff().demand;
  const oldXp = Z.xp; Z.xp = n => oldXp(n * (Z.S ? Z.diff().xp : 1));

  // ---------- Capacité d'accueil : combien de visiteurs le parc peut recevoir confortablement ----------
  // Chaque case d'allée, chaque point d'observation d'un enclos, chaque attraction et chaque commerce ajoute de la place.
  Z.capacityParts = function () {
    const S = Z.S, p = { base: 15, paths: Z.pathCount * .6, encl: 0, rides: 0, shops: 0 };
    for (const e of S.enclosures) if (e.animals.length && !e.bt) p.encl += e.vp.length * 2;
    for (const b of S.buildings) { if (b.bt || b.closed || !b.acc.length) continue; const d = BL[b.type], a = d.size * d.size; if (d.cat === 'ride') p.rides += a * 5; else if (d.cat === 'shop') p.shops += d.onPath ? (b.type === 'bench' ? 2 : 0) : a * 1.5; }
    p.total = Math.round(p.base + p.paths + p.encl + p.rides + p.shops); return p;
  };
  let cache = { h: -1, cap: 60 };
  Z.capacity = function () { const S = Z.S, k = S.day * 24 + Math.floor(S.minute / 60); if (cache.h !== k || cache.S !== S) cache = { h: k, S, cap: Z.capacityParts().total }; return cache.cap; };
  Z.fillRatio = () => Z.S.visitors.length / Math.max(1, Z.capacity());
  // Régulation des entrées : libre jusqu'à 85 % de remplissage, puis de plus en plus de gens renoncent ; parc complet à 110 %
  Z.parkFill = () => clamp((1.1 - Z.fillRatio()) / .25, 0, 1);
  // Gêne ressentie par les visiteurs au-delà de 100 % (points de satisfaction perdus par minute)
  Z.crowdPen = () => Math.max(0, Z.fillRatio() - 1) * .08;

  Z.demandFactors = function () {
    const S = Z.S, at = Z.attract(), fair = Z.fairPrice();
    return [
      ['Attrait du zoo (animaux, espèces, attractions)', Math.round(at) + ' pts', (2 + 1.6 * Math.sqrt(at) + at * .06).toFixed(0) + ' /h'],
      ['Réputation', Z.rep().toFixed(1) + ' ★', .4 + Z.rep() / 5 * 1.2],
      ['Prix du billet', fmt(S.ticket) + ' (juste : ' + fmt(fair) + ')', clamp(1.6 - S.ticket / fair * .8, 0, 1.5)],
      ['Météo', '', Z.weatherF()], ['Saison', Z.season().n, Z.seasonMod()], ['Événement', S.event ? Z.EVENTS[S.event.k].n : 'aucun', Z.evMod('demand')],
      ['Publicité', S.ads ? Z.ADS[S.ads.k].n : 'aucune', S.ads ? S.ads.f : 1], ['Recherche', '', Z.rmod('demand')],
      ['Région', Z.mapDef().name, Z.mapMod('demand')], ['Difficulté', Z.diff().n, Z.diffMod()],
    ];
  };
  const oldVis = Z.html.visitors;
  Z.html.visitors = function () {
    const S = Z.S, p = Z.capacityParts(), n = S.visitors.length, fr = n / Math.max(1, p.total) * 100, dm = Z.demand(), eff = Math.min(dm * Z.parkFill(), Z.entryCap());
    const col = fr > 100 ? '#d9534f' : fr > 85 ? '#e0a020' : '#3fae5a', mult = v => (typeof v === 'number' ? `<span class="${v > 1.001 ? 'good' : v < .999 ? 'bad' : ''}">× ${v.toFixed(2).replace('.', ',')}</span>` : v);
    let h = `<h3>Capacité d’accueil</h3><div class="card"><div class="ctitle"><b>${n} visiteurs pour ${p.total} places</b><b style="color:${col}">${Math.round(fr)} %</b></div><div class="bar"><i style="width:${Math.min(100, fr)}%;background:${col}"></i></div>
      <p class="muted">${fr > 100 ? '😣 Parc bondé : les visiteurs se marchent dessus et perdent en satisfaction.' : fr > 85 ? '🚶 Parc presque plein : une partie des arrivants renonce à entrer.' : '✅ Les visiteurs circulent à l’aise.'} Entrées libres jusqu’à 85 %, parc complet à 110 %.</p></div>`;
    h += row('Allées (' + Z.pathCount + ' cases)', '+' + Math.round(p.paths)) + row('Enclos visibles depuis les allées', '+' + Math.round(p.encl)) + row('Attractions ouvertes', '+' + Math.round(p.rides)) + row('Commerces et bancs', '+' + Math.round(p.shops)) + row('Entrée du zoo', '+' + p.base);
    h += '<p class="muted">Pour accueillir plus de monde : allongez les allées, entourez les enclos d’allées, ajoutez attractions et commerces.</p>';
    h += '<h3>D’où vient l’affluence</h3>' + Z.demandFactors().map(f => `<div class="row"><span>${f[0]}${f[1] ? ' <span class="muted">· ' + f[1] + '</span>' : ''}</span><b>${mult(f[2])}</b></div>`).join('');
    h += `<div class="row total"><span>Envie de venir</span><b>${Math.round(dm)} visiteurs/h</b></div>` + row('Places libres dans le parc', mult(Z.parkFill())) + row('Débit des guichets', Math.round(Z.entryCap()) + ' /h max') + `<div class="row total"><span>Entrées réelles</span><b>${Math.round(eff)} visiteurs/h</b></div>`;
    if (S.fullY > 5) h += `<div class="warn">🚧 Hier, environ ${Math.round(S.fullY)} personnes ont renoncé à entrer parce que le parc était plein.</div>`;
    return h + oldVis();
  };
  const oldD = Z.onDaily;
  Z.onDaily = function () {
    if (oldD) oldD(); const S = Z.S;
    if (S.full > 15) Z.notify(`🚧 Parc saturé : environ ${Math.round(S.full)} personnes ont renoncé à entrer hier. Agrandissez les allées ou ajoutez des enclos et attractions (voir 🧑‍🤝‍🧑 Visiteurs).`, 'warn');
    S.fullY = S.full || 0; S.full = 0;
  };
  // ---------- Prestige : à partir du niveau 7, le public accepte des prix plus élevés et dépense davantage ----------
  Z.prestige = () => 1 + Math.max(0, Z.S.level - 6) * .05;
  const oldFair = Z.fairPrice; Z.fairPrice = () => oldFair() * Z.prestige();
  const oldSpawn = Z.onSpawn; Z.onSpawn = function (v) { v.money = Math.round(v.money * Z.prestige()); oldSpawn(v); };
  // ---------- Passer la nuit : avance d'un coup jusqu'à 8 h quand le zoo est fermé et vide ----------
  Z.canSkip = () => { const S = Z.S, m = S.minute; return !S.visitors.length && (m >= 19 * 60 || m < 8 * 60); };
  Z.skipNight = function () { if (!Z.canSkip()) return; const m = Z.S.minute; Z.advance(m < 480 ? 480 - m : 1440 - m + 480); Z.notify('🌅 Bonjour ! Il est 8 h, le zoo ouvre dans une heure.', 'info'); };
  Z.ACT.skipnight = Z.skipNight;
  // ---------- Première mission guidée, dès le deuxième jour ----------
  const oldD2 = Z.onDaily;
  Z.onDaily = function () {
    if (oldD2) oldD2(); const S = Z.S;
    if (S.day === 2 && !S.firstM && !S.scn && !S.sandbox) { S.firstM = 1; S.missions.push({ k: 'school', id: S.nextId++, st: 'active', t: '🎟️ Première affluence', d: 'Accueillez 40 visiteurs en une seule journée. Il vous faut un enclos occupé relié à l’entrée, un soigneur et un caissier.', n: 40, days: 7, end: S.day + 7, from: S.day, money: 2500, xp: 90 }); Z.notify('📜 Première mission : accueillez 40 visiteurs en une journée (+2 500 €). Voir 🎯 Missions.', 'info'); }
  };
  const oldMenu = Z.html.menu;
  Z.html.menu = () => oldMenu() + '<h3>Difficulté</h3><div class="btns col">' + Object.keys(Z.DIFF).map(k => { const d = Z.DIFF[k], on = (Z.S.diff || 'normal') === k; return `<button data-a="diff" data-k="${k}" ${on ? 'style="border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)"' : ''}>${d.icon} ${d.n}${on ? ' ✓' : ''}<small>${d.desc}</small></button>`; }).join('') + '</div>';
  Z.ACT.diff = d => { Z.S.diff = d.k; };
})();
