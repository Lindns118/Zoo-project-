// Zoo Project — orientation des visiteurs : plans distribués à l'entrée, grand plan, panneaux sur les allées
(function () {
  const BL = Z.BUILDINGS, fmt = Z.fmt;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;
  Z.SIGHT = 16;        // sans plan, un visiteur ne connaît que les enclos à moins de 16 cases
  Z.SVC_RANGE = 26;    // … et les services à moins de 26 cases de marche
  BL.sign = { name: 'Panneau d’orientation', icon: '🧭', size: 1, cost: 400, upkeep: 2, cat: 'shop', onPath: true, lvl: 1, desc: 'À poser sur une allée : les visiteurs qui passent à moins de 3 cases apprennent le plan de tout le parc.' };
  Z.LEAF = {
    off: { n: 'Aucun plan distribué', d: 'Les visiteurs se débrouillent avec ce qu’ils voient autour d’eux.' },
    sell: { n: 'Plan vendu 2 €', d: 'Environ 55 % des visiteurs l’achètent. Rapporte 1,60 € net par plan.' },
    free: { n: 'Plan offert', d: 'Tous les visiteurs l’ont. Coûte 0,40 € par visiteur.' },
  };
  const ENTRY_MAP_COST = 1500;
  Z.buyEntryMap = function () { const S = Z.S; if (S.entryMap || !Z.pay('build', ENTRY_MAP_COST)) return; S.entryMap = 1; Z.notify('🗺️ Grand plan installé à l’entrée : 60 % des visiteurs le consultent en arrivant.', 'good'); };
  // un visiteur perdu se plaint une fois, puis part explorer au hasard
  Z.lostWander = function (v) {
    v.lostN = (v.lostN || 0) + 1; // la première fois il explore sans se plaindre ; il ne s'agace qu'à la deuxième
    if (v.lostN >= 2 && !v.c.lost) { v.c.lost = 1; v.happy -= 5; v.thought = 'Où sont les autres animaux ? Il me faudrait un plan…'; Z.thoughts.unshift(v.name + ' : ' + v.thought); if (Z.thoughts.length > 14) Z.thoughts.pop(); }
    if (!Z.pathList || Z.pathList.length < 8) return false;
    for (let i = 0; i < 3; i++) { const p = Z.findPath(Z.idx(Math.floor(v.x), Math.floor(v.y)), [Z.pick(Z.pathList)]); if (p && p.length > 6 && p.length < 50) { v.path = p; v.st = 'walk'; v.goal = { k: 'stroll' }; return true; } }
    return false;
  };
  const oldMig = Z.progressMigrate; Z.progressMigrate = function (S) { oldMig(S); if (!S.leaflet) S.leaflet = 'off'; };
  const oldSpawn = Z.onSpawn;
  Z.onSpawn = function (v) {
    oldSpawn(v); const S = Z.S;
    if (S.leaflet === 'free') { v.map = 1; Z.spend('misc', .4); }
    else if (S.leaflet === 'sell' && Math.random() < .55) { v.map = 1; Z.earn('shops', 2); Z.spend('goods', .4); }
    if (!v.map && S.entryMap && Math.random() < .6) v.map = 1;
  };
  const oldD = Z.onDaily;
  Z.onDaily = function () {
    const S = Z.S, lost = (S.rs && S.rs.c.lost) || 0, n = (S.rs && S.rs.n) || 0; if (oldD) oldD();
    if (lost > 8 && lost > n * .15) Z.notify(`🧭 ${lost} visiteurs se sont perdus hier (${Math.round(lost / n * 100)} %) : distribuez des plans ou posez des panneaux d’orientation (voir 🧑‍🤝‍🧑 Visiteurs).`, 'warn');
  };
  const oldVis = Z.html.visitors;
  Z.html.visitors = function () {
    const S = Z.S, n = S.visitors.length, withMap = S.visitors.filter(v => v.map).length, signs = S.buildings.filter(b => b.type === 'sign' && !b.bt).length;
    let h = '<h3>🧭 Orientation</h3><p class="muted">Sans plan, un visiteur ne connaît que les enclos et services proches de lui : dans un grand parc il erre, rate des animaux et ne trouve pas les toilettes. Un plan lui fait connaître tout le zoo.</p>';
    h += row('Visiteurs qui ont le plan en tête', n ? Math.round(withMap / n * 100) + ' %' : '—') + row('Panneaux d’orientation posés', signs);
    h += '<div class="btns col">' + Object.keys(Z.LEAF).map(k => `<button data-a="leaf" data-k="${k}" ${S.leaflet === k ? 'style="border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)"' : ''}>${S.leaflet === k ? '✓ ' : ''}${Z.LEAF[k].n}<small>${Z.LEAF[k].d}</small></button>`).join('') + '</div>';
    h += `<div class="btns">${S.entryMap ? '<span class="tag ok">🗺️ Grand plan à l’entrée ✓</span>' : `<button data-a="entrymap">🗺️ Grand plan à l’entrée — ${fmt(ENTRY_MAP_COST)}<small>60 % des arrivants le consultent</small></button>`}</div><p class="muted">Les panneaux d’orientation (400 €) se posent sur les allées depuis 🏪 Services.</p>`;
    return h + oldVis();
  };
  Object.assign(Z.ACT, { leaf: d => { Z.S.leaflet = d.k; }, entrymap: Z.buyEntryMap });
})();
