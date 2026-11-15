// Zoo Project — résultats et améliorations des bâtiments, analyse de la réputation
(function () {
  const BL = Z.BUILDINGS, fmt = Z.fmt, clamp = Z.clamp;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;
  const sign = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v));
  const pips = n => '●'.repeat(n) + '○'.repeat(3 - n);

  // ================= Améliorations d'un bâtiment (3 niveaux chacune) =================
  // us = rapidité : chaque niveau sert 43 % de clients en plus par heure
  // ua = attractivité : les clients acceptent de payer 12 % de plus par niveau et repartent plus contents
  Z.bldSpeed = b => Math.pow(.7, b.us || 0);
  Z.bldWtp = b => 1 + .12 * (b.ua || 0);
  const kind = b => (BL[b.type].cat === 'ride' ? 'ride' : b.type === 'toilet' ? 'wc' : BL[b.type].price ? 'shop' : null);
  Z.UPG = {
    us: { shop: ['Caisse supplémentaire', '🧾'], wc: ['Cabines supplémentaires', '🚪'], ride: ['Places supplémentaires', '💺'], desc: 'Sert plus de monde à l’heure : moins d’attente, moins d’abandons.', f: .35 },
    ua: { shop: ['Produits de qualité', '⭐'], ride: ['Décors et effets', '✨'], desc: 'Les clients acceptent un prix plus élevé et repartent plus satisfaits.', f: .45 },
  };
  Z.upgCost = (b, k) => Math.round(BL[b.type].cost * Z.UPG[k].f * ((b[k] || 0) + 1) / 50) * 50;
  Z.upgBld = function (id, k) {
    const b = Z.S.buildings.find(b => b.id === id); if (!b || (b[k] || 0) >= 3 || !Z.UPG[k][kind(b)]) return;
    if (!Z.pay('build', Z.upgCost(b, k))) return; b[k] = (b[k] || 0) + 1; Z.groundDirty = true;
    Z.notify('🔧 ' + BL[b.type].name + ' amélioré : ' + Z.UPG[k][kind(b)][0].toLowerCase() + ', niveau ' + b[k], 'good');
  };
  Z.bldUpkeep = b => (BL[b.type].upkeep || 0) * (1 + .1 * ((b.us || 0) + (b.ua || 0)));
  Z.bldStaffCost = b => (Z.VSLOTS[b.type] || 0) * Z.STAFF.vendor.salary + (Z.OSLOTS[b.type] || 0) * Z.STAFF.operator.salary;
  Z.bldRate = b => { const s = Z.svcOf(b); return s ? Math.round(60 / s) : 0; };
  Z.bldProfit = (b, sold, rev) => rev - sold * (BL[b.type].goods || 0) - Z.bldUpkeep(b) - Z.bldStaffCost(b);

  // ================= Historique et prévision =================
  Z.bldDaily = function (b) { // appelé à minuit, avant la remise à zéro du compteur de ventes
    (b.h = b.h || []).push({ s: b.sold || 0, r: Math.round(b.rev || 0), lq: b.lq || 0, lp: b.lp || 0, w: Math.round(b.wm || 0) }); if (b.h.length > 7) b.h.shift();
    b.rev = 0; b.lq = 0; b.lp = 0; b.wm = 0;
  };
  Z.bldForecast = function (b) {
    const S = Z.S, h = (b.h || []).slice(-3); if (!h.length) return null;
    const avg = h.reduce((n, d) => n + d.s, 0) / h.length, vh = S.fin.history.slice(-h.length), va = vh.reduce((n, d) => n + d.vis, 0) / Math.max(1, vh.length), f = Z.forecast()[0];
    const sold = Math.round(avg * (va > 5 ? clamp(f.vis / va, .3, 2.5) : 1)), rev = sold * (b.price || 0);
    return { sold, rev, profit: Z.bldProfit(b, sold, rev), w: f.w, vis: f.vis };
  };
  const WX = { sun: '☀️', cloud: '⛅', rain: '🌧️' };

  Z.html.bld = function (b) {
    const d = BL[b.type], kd = kind(b); if (!kd) return '';
    const sold = b.sold || 0, rev = b.rev || 0, q = Z.queueLen(b), wait = Z.queueWait(b), h = b.h || [];
    let s = '<h3>Aujourd’hui</h3>' + row(d.price ? 'Ventes' : 'Passages', sold);
    if (d.price) s += row('Chiffre d’affaires', fmt(rev)) + row('Marchandises', '−' + fmt(sold * d.goods));
    s += row('Entretien', '−' + fmt(Z.bldUpkeep(b))) + (Z.bldStaffCost(b) ? row('Personnel affecté', '−' + fmt(Z.bldStaffCost(b))) : '');
    const pr = Z.bldProfit(b, sold, rev); s += `<div class="row total"><span>Résultat</span><b class="${pr >= 0 ? 'good' : 'bad'}">${sign(pr)}</b></div>`;
    s += '<h3>Service</h3>' + row('Débit', Z.bldRate(b) + ' clients/heure') + row('File d’attente', q ? q + ' pers. (~' + Math.ceil(wait) + ' min)' : 'aucune') + row('Attente maximale du jour', Math.round(b.wm || 0) + ' min');
    s += row('Clients partis : file trop longue', `<span class="${b.lq ? 'bad' : ''}">${b.lq || 0}</span>`) + (d.price ? row('Clients partis : trop cher', `<span class="${b.lp ? 'bad' : ''}">${b.lp || 0}</span>`) : '');
    if ((b.lq || 0) > 5) s += '<div class="warn">⏳ Beaucoup d’abandons : améliorez la rapidité ou construisez un deuxième point de vente.</div>';
    else if (d.price && (b.lp || 0) > Math.max(5, sold * .25)) s += '<div class="warn">💸 Beaucoup de clients trouvent le prix trop élevé : baissez-le ou améliorez l’attractivité.</div>';
    if (h.length) {
      const mx = Math.max(1, ...h.map(x => x.s));
      s += '<h3>7 derniers jours <small>(ventes ; en rouge : clients perdus)</small></h3><div class="chart">' + h.map(x => `<div title="${x.s} ventes · ${fmt(x.r)} · ${x.lq + x.lp} clients perdus · attente max ${x.w} min"><i style="height:${x.s / mx * 100}%;background:#3fae5a"></i><i style="height:${Math.min(100, (x.lq + x.lp) / mx * 100)}%;background:#d9534f"></i></div>`).join('') + '</div>';
      const y = h[h.length - 1]; s += row('Hier', y.s + ' ventes · ' + fmt(y.r));
      const f = Z.bldForecast(b);
      if (f) s += `<h3>Prévision pour demain ${WX[f.w]}</h3>` + row('Visiteurs attendus au zoo', f.vis) + row(d.price ? 'Ventes estimées' : 'Passages estimés', f.sold) + (d.price ? row('Chiffre d’affaires estimé', fmt(f.rev)) : '') + `<div class="row total"><span>Résultat estimé</span><b class="${f.profit >= 0 ? 'good' : 'bad'}">${sign(f.profit)}</b></div>`;
    } else s += '<p class="muted">Historique et prévision disponibles à partir de demain.</p>';
    s += '<h3>Améliorations</h3>';
    for (const k of ['us', 'ua']) {
      const u = Z.UPG[k], nm = u[kd]; if (!nm) continue; const lv = b[k] || 0;
      const eff = k === 'us' ? 'Débit : ' + Z.bldRate(b) + ' → ' + Math.round(Z.bldRate(b) / .7) + ' clients/heure' : 'Prix accepté : +' + lv * 12 + ' % → +' + (lv + 1) * 12 + ' %';
      s += `<div class="card"><div class="ctitle"><b>${nm[1]} ${nm[0]}</b><b class="stars">${pips(lv)}</b></div><p class="muted">${u.desc} Entretien +10 % par niveau.</p>${lv < 3 ? `<p>${eff}</p><div class="btns"><button data-a="bupg" data-k="${k}">Améliorer — ${fmt(Z.upgCost(b, k))}</button></div>` : '<p class="good">Niveau maximum atteint.</p>'}</div>`;
    }
    return s;
  };
  // tableau de tous les commerces et attractions, pour le panneau Statistiques
  Z.html.bldTable = function () {
    const list = Z.S.buildings.filter(b => kind(b) && !b.bt);
    if (!list.length) return '<h3>Commerces et attractions</h3><p class="muted">Aucun pour le moment.</p>';
    let tot = 0; const rows = list.map(b => { const d = BL[b.type], pr = Z.bldProfit(b, b.sold || 0, b.rev || 0); tot += pr; return `<div class="card click" data-a="gotob" data-id="${b.id}"><div class="ctitle"><b>${d.icon} ${d.name}${(b.us || b.ua) ? ' <span class="stars">' + '★'.repeat((b.us || 0) + (b.ua || 0)) + '</span>' : ''}</b><b class="${pr >= 0 ? 'good' : 'bad'}">${sign(pr)}</b></div><p class="muted">${b.closed ? '🚫 fermé · ' : ''}${b.sold || 0} ${d.price ? 'ventes' : 'passages'}${d.price ? ' à ' + fmt(b.price) : ''} · attente max ${Math.round(b.wm || 0)} min${(b.lq || 0) + (b.lp || 0) ? ' · <span class="bad">' + ((b.lq || 0) + (b.lp || 0)) + ' clients perdus</span>' : ''}</p></div>`; }).join('');
    return `<h3>Commerces et attractions <small>(aujourd’hui, touchez pour le détail)</small></h3>${rows}<div class="row total"><span>Résultat du jour</span><b class="${tot >= 0 ? 'good' : 'bad'}">${sign(tot)}</b></div>`;
  };
  Object.assign(Z.ACT, {
    bupg: d => Z.upgBld(Z.ui.parg, d.k),
    gotob: d => { const b = Z.S.buildings.find(b => b.id === +d.id); if (b) { Z.focus(b.x + 1, b.y + 1); Z.openPanel('bld', b.id); } },
  });

  // ================= Réputation : d'où elle vient, comment la monter =================
  const blank = () => ({ n: 0, h0: 0, h1: 0, seen: 0, c: {} });
  const oldMig = Z.progressMigrate; Z.progressMigrate = function (S) { oldMig(S); S.rs = S.rs || blank(); S.rsY = S.rsY || blank(); };
  const oldSpawn = Z.onSpawn; Z.onSpawn = function (v) { oldSpawn(v); v.h0 = v.happy; if (Z.S.ticket > Z.fairPrice() * 1.25) v.c.price = 1; };
  const oldExit = Z.onExit; Z.onExit = function (v) {
    const before = v.happy; oldExit(v); const r = Z.S.rs; r.n++; r.h0 += v.h0 == null ? 50 : v.h0; r.h1 += v.happy; r.seen += v.nseen;
    for (const k of ['wc', 'drink', 'food', 'bench', 'queue', 'crowd', 'price', 'lost']) if (v.c[k]) r.c[k] = (r.c[k] || 0) + 1;
    if (v.fav && !v.favSeen) r.c.fav = (r.c.fav || 0) + 1; if (before !== v.happy) { /* pénalité « fan déçu » déjà incluse */ }
  };
  const oldD = Z.onDaily; Z.onDaily = function () { if (oldD) oldD(); const S = Z.S; if (S.rs.n) S.rsY = S.rs; S.rs = blank(); };
  // causes d'insatisfaction : [libellé, points perdus par visiteur touché, conseil]
  const CAUSES = {
    lost: ['🧭 Se sont perdus ou n’ont pas trouvé un service', 6, 'Distribuez des plans (🧑‍🤝‍🧑 Visiteurs › Orientation) ou posez des panneaux d’orientation.'],
    wc: ['🚻 N’ont pas trouvé de toilettes', 12, 'Construisez des toilettes, réparties dans le parc.'],
    drink: ['🥤 N’ont rien trouvé à boire', 8, 'Ajoutez une buvette ou un glacier.'],
    food: ['🍔 N’ont rien trouvé à manger', 8, 'Ajoutez un stand burger ou un restaurant.'],
    bench: ['🪑 Pas de banc pour se reposer', 5, 'Posez des bancs le long des allées.'],
    queue: ['⏳ Ont renoncé à une file d’attente', 5, 'Améliorez la rapidité des bâtiments ou multipliez les points de vente.'],
    crowd: ['😣 Ont trouvé le parc bondé', 8, 'Augmentez la capacité d’accueil : allées, enclos, attractions.'],
    price: ['💸 Ont trouvé le billet trop cher', 12, 'Baissez le prix du billet (voir Finances › Simulation).'],
    fav: ['🔎 Fans repartis sans voir leurs animaux préférés', 10, 'Diversifiez : fauves, oiseaux, primates, grands animaux.'],
  };
  Z.PANELS.rep = function () {
    const S = Z.S, r = Z.rep(), t = S.rs.n >= 15 ? S.rs : S.rsY.n ? S.rsY : S.rs, n = Math.max(1, t.n), h0 = t.h0 / n, h1 = t.h1 / n, seen = t.seen / n;
    const stars = v => '★'.repeat(Math.round(v)) + '☆'.repeat(5 - Math.round(v));
    let h = `<div class="lvlhead"><div class="lvlnum" style="background:#e3a008">${r.toFixed(1).replace('.', ',')}</div><div><b class="stars" style="font-size:18px">${stars(r)}</b><br><span class="muted">Moyenne des 80 derniers avis. L’affluence est proportionnelle à cette note : × ${Z.repFactor().toFixed(2).replace('.', ',')} actuellement.</span></div></div>`;
    h += '<p class="muted">Chaque visiteur note le zoo en partant d’après sa satisfaction : 52 % donne 2 ★, 68 % donne 3 ★, 84 % donne 4 ★, 100 % donne 5 ★.</p>';
    if (!t.n) return { title: '⭐ Réputation', html: h + '<p>Aucun visiteur n’est encore reparti. Revenez après la première journée.</p>' };
    h += `<h3>La visite type <small>(${t === S.rs ? 'aujourd’hui' : 'hier'}, ${t.n} visiteurs)</small></h3>` + row('Satisfaction à l’arrivée', Math.round(h0) + ' %') + row('Enclos vus', seen.toFixed(1).replace('.', ',') + ' sur ' + S.enclosures.filter(e => e.animals.length && e.vp.length).length) + `<div class="row total"><span>Satisfaction à la sortie</span><b>${Math.round(h1)} % · ${clamp((h1 - 20) / 16, 0, 5).toFixed(1).replace('.', ',')} ★</b></div>`;
    // ce qui fait monter
    const occ = S.enclosures.filter(e => e.animals.length), st = occ.length ? occ.reduce((a, e) => a + Z.enclStars(e), 0) / occ.length : 0, gb = Z.guideBonus();
    h += '<h3>Ce qui fait monter la note</h3>' + row('🦁 Qualité des enclos (note moyenne)', st ? st.toFixed(1).replace('.', ',') + ' ★ sur 5' : '—') + row('👀 Nombre d’enclos vus par visiteur', seen.toFixed(1).replace('.', ',')) + row('🌳 Beauté du parc (décors, arbres, eau)', Math.round(Z.beauty * 100) + ' %') + row('🧑‍🏫 Animateurs', gb > 1 ? '+' + Math.round((gb - 1) * 100) + ' % devant les enclos' : 'aucun') + row('🎡 Attractions et achats', 'chaque achat et chaque tour plaît');
    // ce qui fait baisser, classé par points perdus en moyenne
    const loss = Object.keys(CAUSES).map(k => ({ k, share: (t.c[k] || 0) / n, pts: (t.c[k] || 0) / n * CAUSES[k][1] })).filter(x => x.share > .02).sort((a, b) => b.pts - a.pts);
    if (Z.expect() > 0) h += row('🎓 Exigence liée au niveau ' + S.level, '<span class="bad">−' + Z.expect().toFixed(1).replace('.', ',') + ' à l’arrivée</span>');
    h += '<h3>Ce qui la fait baisser</h3>' + (loss.length ? loss.map(x => `<div class="card"><div class="ctitle"><b>${CAUSES[x.k][0]}</b><b class="bad">${Math.round(x.share * 100)} % des visiteurs</b></div><p class="muted">Environ −${x.pts.toFixed(1).replace('.', ',')} point de satisfaction en moyenne. 👉 ${CAUSES[x.k][2]}</p></div>`).join('') : '<p class="good">Aucun motif de mécontentement notable. Bravo !</p>');
    const bad = S.log.filter(l => l.d >= S.day - 3 && /est mort|échappé|Bagarre|Vol à la tire|escaladé|Dégradations|amende|Grève du personnel/.test(l.t));
    if (bad.length) h += '<h3>Incidents récents <small>(chacun ajoute de très mauvais avis)</small></h3>' + bad.slice(0, 6).map(l => `<div class="row log bad"><span>J${l.d} · ${l.t.replace(/[<>]/g, '')}</span></div>`).join('');
    // conseils prioritaires
    const tips = loss.slice(0, 2).map(x => CAUSES[x.k][2]);
    if (st && st < 4) tips.push('Comblez les besoins de chaque espèce pour faire monter la note des enclos (' + st.toFixed(1).replace('.', ',') + ' ★ en moyenne).');
    if (seen < 3 && occ.length > 3) tips.push('Les visiteurs voient peu d’enclos : rapprochez-les, bouclez les allées et répartissez toilettes et buvettes.');
    if (Z.beauty < .5) tips.push('Ajoutez des décors, des arbres et de l’eau : la beauté du parc augmente le plaisir devant chaque enclos.');
    if (gb === 1 && Z.staffUnlocked('guide')) tips.push('Embauchez un animateur : jusqu’à +20 % de plaisir devant les enclos.');
    if (tips.length) h += '<h3>Par quoi commencer</h3><ol>' + tips.slice(0, 4).map(x => '<li>' + x + '</li>').join('') + '</ol>';
    return { title: '⭐ Réputation', html: h };
  };
  const oldVis = Z.html.visitors;
  Z.html.visitors = () => '<div class="btns"><button data-a="tool" data-id="p:rep">⭐ Comprendre et améliorer la réputation</button></div>' + oldVis();
  window.addEventListener('DOMContentLoaded', () => { const el = document.querySelector('#rep'); if (el) { el.dataset.a = 'tool'; el.dataset.id = 'p:rep'; el.style.cursor = 'pointer'; el.title = 'Réputation : touchez pour le détail'; } });
})();
