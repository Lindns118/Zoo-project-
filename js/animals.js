// Zoo Project — fiche individuelle d'un animal et marché de vente entre zoos
(function () {
  const SP = Z.SPECIES, BIO = Z.BIOMES, fmt = Z.fmt, pick = Z.pick, rnd = Z.rnd, clamp = Z.clamp;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const bar = v => `<div class="bar"><i style="width:${clamp(v, 0, 100)}%;background:${v > 60 ? '#3fae5a' : v > 30 ? '#e0a020' : '#d9534f'}"></i></div>`;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;
  const find = id => { for (const e of Z.S.enclosures) { const a = e.animals.find(a => a.id === id); if (a) return [e, a]; } return [null, null]; };
  Z.animalById = id => find(id)[1];
  // clic sur la carte : l'animal le plus proche du point visé (le dessin est au-dessus de ses pattes)
  Z.pickAnimal = function (f) {
    let best = null, bd = 1e9;
    for (const e of Z.S.enclosures) for (const a of e.animals) { const k = Z.animalScale(a), d = Math.hypot(a.x - f.x - .3 * k, a.y - f.y - .3 * k); if (d < .45 + .35 * k && d < bd) { bd = d; best = a; } }
    return best && best.id;
  };

  // ---------- Marché de vente : d'autres zoos recherchent des adultes ----------
  const ZOOS = ['Zoo de Beauval', 'Parc de Thoiry', 'Zoo de Berlin', 'Zoo de San Diego', 'Zoo de Singapour', 'Parc de Pairi Daiza', 'Zoo de Vienne', 'Zoo de Toronto', 'Bioparc de Valence', 'Zoo de Taronga'];
  function requestsRefresh() {
    const S = Z.S, own = [...new Set(S.enclosures.filter(e => e.animals.length).map(e => e.animals[0].sp))]; S.requests = [];
    for (let i = 0; i < Math.min(4, own.length + 1) && own.length; i++) { const k = pick(own); S.requests.push({ id: S.nextId++, sp: k, sex: Math.random() < .5 ? null : Math.random() < .5 ? 'M' : 'F', zoo: pick(ZOOS), price: Math.round(SP[k].price * rnd(.85, 1.35) / 50) * 50 }); }
    S.reqDay = S.day;
  }
  const adult = a => a.age >= SP[a.sp].mat && a.age < SP[a.sp].life * .8;
  Z.reqPrice = (r, a) => Math.round(r.price * (a.pn ? 1.15 : 1) * (a.inbred ? .7 : 1) * (a.health > 70 ? 1 : .7));
  Z.reqFor = a => Z.S.requests.filter(r => r.sp === a.sp && (!r.sex || r.sex === a.sex));
  Z.sellTo = function (aid, rid) {
    const S = Z.S, [e, a] = find(aid), i = S.requests.findIndex(r => r.id === rid); if (!a || i < 0) return;
    if (!adult(a)) return Z.notify('Les autres zoos ne reprennent que des adultes en âge de se reproduire', 'bad');
    if (a.sick) return Z.notify('Impossible de vendre un animal malade', 'bad');
    const r = S.requests[i], p = Z.reqPrice(r, a); e.animals.splice(e.animals.indexOf(a), 1); S.requests.splice(i, 1); Z.earn('sales', p); Z.xp(15); S.stats.sold = (S.stats.sold || 0) + 1;
    Z.notify('🤝 ' + a.name + ' rejoint le ' + r.zoo + ' pour ' + fmt(p), 'good');
  };
  const oldMig = Z.progressMigrate; Z.progressMigrate = function (S) { oldMig(S); S.requests = S.requests || []; };
  const oldD = Z.onDaily; Z.onDaily = function () { if (oldD) oldD(); const S = Z.S; if (S.day - (S.reqDay || 0) >= 3) requestsRefresh(); };
  const oldStock = Z.html.stock;
  Z.html.stock = function () {
    const S = Z.S; let h = '<h3>🤝 Demandes d’autres zoos</h3><p class="muted">Ils achètent vos adultes bien plus cher que la vente ordinaire (+15 % pour un animal né chez vous). Renouvelé tous les 3 jours. Vendre les jeunes devenus adultes évite aussi la consanguinité.</p>';
    h += S.requests.length ? S.requests.map(r => { const c = [].concat(...S.enclosures.map(e => e.animals)).filter(a => a.sp === r.sp && (!r.sex || r.sex === a.sex) && adult(a) && !a.sick); return `<div class="card"><div class="ctitle"><b>${SP[r.sp].e} ${SP[r.sp].n}${r.sex ? (r.sex === 'M' ? ' ♂' : ' ♀') : ''}</b><b class="good">${fmt(r.price)}</b></div><p class="muted">${r.zoo}</p>${c.length ? '<div class="btns">' + c.slice(0, 6).map(a => `<button data-a="asellto" data-id="${a.id}" data-r="${r.id}">${esc(a.name)} ${a.sex === 'M' ? '♂' : '♀'} · ${Math.floor(a.age)} ans<small>${fmt(Z.reqPrice(r, a))}</small></button>`).join('') + '</div>' : '<p class="muted">Aucun adulte disponible chez vous.</p>'}</div>`; }).join('') : '<p class="muted">Aucune demande pour le moment.</p>';
    return h + oldStock();
  };

  // ---------- Fiche d'un animal ----------
  Z.PANELS.animal = function (id) {
    const [e, a] = find(id); if (!a) return null; const sp = SP[a.sp], m = a.sex === 'M';
    const stage = a.age < sp.mat * .5 ? 'Bébé' : a.age < sp.mat ? 'Jeune' : a.age > sp.life * .8 ? 'Âgé' : 'Adulte';
    const state = [a.sick ? '🤒 Malade' : '', a.preg ? '🤰 Gestation : naissance dans ' + a.preg + ' j' : '', a.hunger < 25 ? '🍖 Affamé' : '', a.health < 25 ? '⚠️ Très affaibli' : '', Z.isNight() ? '💤 Dort' : ''].filter(Boolean).join(' · ') || '✅ En forme';
    let h = `<img class="portrait" src="${Z.animalPortrait(a)}" alt=""><p><b>${sp.n}</b> · ${m ? '♂ Mâle' : '♀ Femelle'} · ${stage}</p>`;
    h += row('Âge', (a.age < 1 ? Math.round(a.age * 12) + ' mois' : Math.floor(a.age) + ' ans') + ' <span class="muted">(espérance : ' + sp.life + ' ans)</span>') + row('Taille', Math.round(Z.animalScale(a) / (sp.size / 24) * 100) + ' % de la taille adulte') + row('État', state);
    h += `<div class="grid3"><div>Santé${bar(a.health)}</div><div>Bonheur${bar(a.happy)}</div><div>Satiété${bar(a.hunger)}</div></div>`;
    h += row('Origine', a.pn ? 'Né(e) au zoo — parents : ' + esc(a.pn) + (a.inbred ? ' <span class="tag bad">consanguin</span>' : '') : 'Arrivé(e) d’un autre zoo');
    h += row('Habitat', BIO[sp.b].icon + ' ' + BIO[sp.b].name) + `<div class="row"><span>Enclos</span><button class="mini" data-a="goto" data-id="${e.id}">${esc(e.name)} ›</button></div>`;
    const rq = Z.reqFor(a);
    h += '<h3>Vendre</h3>' + (rq.length ? rq.map(r => `<div class="row"><span>🤝 ${r.zoo}</span><button class="mini" data-a="asellto" data-id="${a.id}" data-r="${r.id}" ${adult(a) && !a.sick ? '' : 'disabled'}>${fmt(Z.reqPrice(r, a))}</button></div>`).join('') + (adult(a) ? '' : '<p class="muted">Les zoos ne reprennent que des adultes.</p>') : '<p class="muted">Aucun zoo ne recherche cet animal en ce moment (voir 🦁 Animaux).</p>');
    h += `<div class="btns"><button data-a="asell" data-id="${a.id}">Vente ordinaire (+${fmt(Z.animalValue(a))})</button></div>`;
    const ts = Z.transferTargets(e, a);
    h += `<h3>Actions</h3><div class="btns"><button data-a="aren" data-id="${a.id}">✏️ Renommer</button>${a.sick ? `<button data-a="aevet" data-id="${a.id}">🚑 Soin d’urgence — 500 €</button>` : ''}${ts.length ? `<select data-ax="${a.id}"><option value="">🚚 Transférer vers… (100 €)</option>${ts.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>` : ''}</div>` + Z.html.animal(a).replace(/<p class="muted">Né.*?<\/p>/, '');
    return { title: sp.e + ' ' + esc(a.name), html: h };
  };
  Object.assign(Z.ACT, {
    afiche: d => Z.openPanel('animal', +d.id),
    asell: d => { const [e, a] = find(+d.id); if (a) Z.sellAnimal(e, a); },
    asellto: d => Z.sellTo(+d.id, +d.r),
    aevet: d => { const [e, a] = find(+d.id); if (a) Z.emergencyVet(e, a); },
    aren: d => { const a = Z.animalById(+d.id); if (!a) return; const n = prompt('Nom de l’animal :', a.name); if (n && n.trim()) a.name = n.trim().slice(0, 24); },
  });
  document.addEventListener('change', ev => { const id = ev.target.dataset.ax; if (!id || !ev.target.value) return; const [e, a] = find(+id), t = Z.S.enclosures.find(x => x.id === +ev.target.value); if (a && t) Z.transfer(e, a, t); ev.target.blur(); Z.refreshPanel(); });
})();
