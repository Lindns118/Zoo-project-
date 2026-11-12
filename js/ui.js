// Zoo Project — interface
(function () {
  const { W, H, TILE: T } = Z;
  const SP = Z.SPECIES, BL = Z.BUILDINGS, BIO = Z.BIOMES, fmt = Z.fmt;
  const $ = s => document.querySelector(s);
  const ui = Z.ui = { tool: 'select', arg: null, panel: null, parg: null, sel: null, ghost: null, view: null, tab: { fin: 'bilan', goals: 'obj' } };
  const VIEWS = { happy: 'bonheur des animaux', clean: 'propreté et déchets', crowd: 'affluence des visiteurs' };
  const sign = v => (v >= 0 ? '+' : '−') + fmt(Math.abs(v));
  const tabs = (p, list) => '<div class="tabs">' + list.map(t => `<button class="${ui.tab[p] === t[0] ? 'on' : ''}" data-a="tab" data-p="${p}" data-id="${t[0]}">${t[1]}</button>`).join('') + '</div>';
  function line(vals, col, f) {
    if (vals.length < 2) return '<p class="muted">Courbe disponible après deux jours complets.</p>';
    const mn = Math.min(...vals), mx = Math.max(...vals), sp = mx - mn || 1, n = vals.length;
    const pts = vals.map((v, i) => (i / (n - 1) * 300).toFixed(1) + ',' + (66 - (v - mn) / sp * 60).toFixed(1)).join(' ');
    return `<svg class="lc" viewBox="0 0 300 72" preserveAspectRatio="none"><polygon points="0,72 ${pts} 300,72" fill="${col}" opacity=".13"/><polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" vector-effect="non-scaling-stroke"/></svg><div class="lcl"><span>min ${f(mn)}</span><span>max ${f(mx)}</span><b>${f(vals[n - 1])}</b></div>`;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const bar = (v, col) => `<div class="bar"><i style="width:${Z.clamp(v, 0, 100)}%;background:${col || (v > 60 ? '#3fae5a' : v > 30 ? '#e0a020' : '#d9534f')}"></i></div>`;
  const stars = r => { let s = ''; for (let i = 1; i <= 5; i++) s += r >= i - .5 ? '★' : '☆'; return s; };
  const ent = id => Z.S.enclosures.find(e => e.id === id) || Z.S.buildings.find(e => e.id === id) || Z.S.staff.find(e => e.id === id) || Z.S.visitors.find(e => e.id === id);

  // ---------- Barre d'outils ----------
  const TOOLS = [
    ['select', '🖐️', 'Explorer'], ['path', '🛣️', 'Allées'], ['encl', '🚧', 'Enclos'], ['shop', '🏪', 'Services'], ['decor', '🌳', 'Décor'], ['move', '↔️', 'Déplacer'], ['demo', '🧨', 'Démolir'],
    ['|'], ['p:staff', '👷', 'Personnel'], ['p:animals', '🦁', 'Animaux'], ['p:visitors', '🧑‍🤝‍🧑', 'Visiteurs'], ['p:fin', '💶', 'Finances'], ['p:prog', '📈', 'Progression'], ['p:stats', '📊', 'Stats'], ['p:goals', '🎯', 'Missions'], ['view', '👁️', 'Vues'], ['p:menu', '⚙️', 'Menu'],
  ];
  function renderTools() {
    $('#tools').innerHTML = TOOLS.map(t => t[0] === '|' ? '<span class="sep"></span>' :
      `<button class="tool ${ui.tool === t[0] || (t[0] === 'view' && ui.view) || (ui.panel && 'p:' + ui.panel === t[0]) ? 'on' : ''}" data-a="tool" data-id="${t[0]}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('');
    let sub = '';
    if (ui.tool === 'encl') sub = Object.keys(BIO).filter(k => !Z.S.rules.biomes || Z.S.rules.biomes.includes(k)).map(k => !Z.biomeUnlocked(k) ? `<button class="chip locked" disabled>🔒 ${BIO[k].name}<small>Niveau ${BIO[k].lvl}</small></button>` : `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}">${BIO[k].icon} ${BIO[k].name}<small>${BIO[k].cost} €/case</small></button>`).join('');
    if (ui.tool === 'shop' || ui.tool === 'decor') sub = Object.keys(BL).filter(k => BL[k].cat === ui.tool).map(k => !Z.bldUnlocked(k) ? `<button class="chip locked" disabled>🔒 ${BL[k].name}<small>Niveau ${BL[k].lvl}</small></button>` : `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}" title="${esc(BL[k].desc)}">${BL[k].icon} ${BL[k].name}<small>${fmt(BL[k].cost)}</small></button>`).join('');
    $('#sub').innerHTML = sub; $('#sub').style.display = sub ? 'flex' : 'none';
    const hints = {
      select: '', path: 'Glissez pour tracer une allée (12 €/case). Les visiteurs et le personnel ne marchent que sur les allées.',
      encl: 'Choisissez un habitat puis glissez pour dessiner l’enclos sur votre terrain. Une allée doit le longer. Le chantier dure plusieurs heures.',
      shop: BL[ui.arg] ? BL[ui.arg].desc + ' À placer le long d’une allée.' : '', decor: BL[ui.arg] ? BL[ui.arg].desc : '',
      move: 'Glissez un bâtiment ou un enclos (avec ses animaux) vers son nouvel emplacement. Coût : 10 % de son prix.',
      demo: 'Touchez une allée, un bâtiment ou un enclos vide pour le démolir (30 % remboursés).',
    };
    setHint(hints[ui.tool] || (ui.view ? 'Vue : ' + VIEWS[ui.view] + ' — touchez 👁️ pour changer' : ''));
  }
  function setHint(t) { const h = $('#hint'); h.textContent = t; h.style.display = t ? 'block' : 'none'; }
  function setTool(id) {
    if (id === 'view') { const o = [null, 'happy', 'clean', 'crowd']; ui.view = o[(o.indexOf(ui.view) + 1) % 4]; renderTools(); return; }
    if (id.startsWith('p:')) { const p = id.slice(2); if (ui.panel === p) closePanel(); else openPanel(p); return; }
    ui.tool = id; ui.ghost = null;
    ui.arg = id === 'encl' ? 'savane' : id === 'shop' ? 'food' : id === 'decor' ? 'tree' : null;
    renderTools();
  }

  // ---------- Panneaux ----------
  function openPanel(name, arg, tab) { if (tab) ui.tab[name] = tab; ui.panel = name; ui.parg = arg; ui.sel = arg != null ? ent(arg) : null; renderPanel(true); renderTools(); }
  function closePanel() { ui.panel = null; ui.sel = null; $('#panel').style.display = 'none'; renderTools(); }
  Z.openPanel = openPanel;
  let panelBusy = false;
  function renderPanel(force) {
    if (!ui.panel || (panelBusy && !force)) return;
    if (!force && document.activeElement && document.activeElement.tagName === 'SELECT') return;
    const r = PANELS[ui.panel](ui.parg); if (!r) return closePanel();
    const p = $('#panel'), body = p.querySelector('.pbody'), sc = body ? body.scrollTop : 0;
    p.innerHTML = `<div class="phead"><h2>${r.title}</h2><button data-a="close" class="x">✕</button></div><div class="pbody">${r.html}</div>`;
    p.style.display = 'flex'; if (!force || body) p.querySelector('.pbody').scrollTop = sc;
  }
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;
  const PANELS = {
    encl(id) {
      const e = ent(id); if (!e) return null; const n = e.animals.length, area = e.w * e.h, bio = BIO[e.biome];
      let h = `<p class="muted">${bio.icon} Habitat ${bio.name.toLowerCase()} · ${e.w}×${e.h} = ${area} cases</p>`;
      if (e.bt > 0) h += `<div class="warn">🏗️ Chantier en cours : encore ${e.bt} h de travaux${bar(100 - e.bt / Z.enclBuildHours(e.w, e.h) * 100, '#e0a020')}</div>`;
      if (e.pending && e.pending.length) h += `<div class="warn">📦 En livraison : ${e.pending.map(d => SP[d.sp].e + ' ' + (d.sex === 'M' ? '♂' : '♀') + ' dans ' + d.eta + ' h').join(', ')}</div>`;
      const iss = Z.enclIssues(e); if (iss.length) h += `<div class="warn">${iss.map(i => '⚠️ ' + esc(i)).join('<br>')}</div>`;
      h += `<div class="grid3"><div>Nourriture${bar(e.food)}</div><div>Propreté${bar(e.clean)}</div><div>Clôture${bar(e.fence)}</div></div>`;
      h += '<h3>Aménagements</h3><div class="btns">' + Object.keys(Z.UPGRADES).map(k => { const u = Z.UPGRADES[k]; return e.up[k] ? `<span class="tag ok">${u.icon} ${u.name} ✓</span>` : `<button data-a="upg" data-k="${k}" title="${u.desc}">${u.icon} ${u.name} — ${fmt(u.cost(e))}<small>${u.desc}</small></button>`; }).join('') + '</div>';
      const xfer = a => { const ts = Z.transferTargets(e, a); return ts.length ? `<select data-x="${a.id}"><option value="">🚚 Transférer vers… (100 €)</option>${ts.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>` : ''; };
      if (n) {
        const sp = SP[e.animals[0].sp];
        h += `<h3>${sp.e} ${n} ${n > 1 ? sp.pl : sp.n.toLowerCase()} <small>(${n * sp.space}/${area} cases utilisées · attrait ${Math.round(Z.enclAppeal(e))})</small></h3>`;
        h += e.animals.map(a => `<div class="card"><div class="ctitle"><b>${sp.e} ${esc(a.name)}</b> <span class="muted">${a.sex === 'M' ? '♂' : '♀'} · ${a.age < 1 ? 'bébé' : Math.floor(a.age) + ' ans'}${a.preg ? ' · 🤰 gestation' : ''}</span>${a.sick ? '<span class="tag bad">malade</span>' : ''}</div>
          <div class="grid3"><div>Santé${bar(a.health)}</div><div>Bonheur${bar(a.happy)}</div><div>Satiété${bar(a.hunger)}</div></div>
          <div class="btns">${a.sick ? `<button data-a="evet" data-id="${a.id}">🚑 Soin d’urgence — 500 €</button>` : ''}<button data-a="sell" data-id="${a.id}">Vendre (+${fmt(Z.animalValue(a))})</button>${xfer(a)}</div></div>`).join('');
      }
      const rz = (sd, d, lbl) => { const r = Z.resizeInfo(e, sd, d); return `<button ${r ? '' : 'disabled'} data-a="resize" data-s="${sd}" data-d="${d}">${lbl}${r && r.cost ? `<small>${fmt(r.cost)}</small>` : ''}</button>`; };
      h += `<h3>Modifier l’enclos</h3><div class="btns"><button data-a="rename">✏️ Renommer</button></div><p class="muted">Agrandir d’une rangée :</p><div class="btns">${rz('n', 1, '⬆️ Nord')}${rz('s', 1, '⬇️ Sud')}${rz('w', 1, '⬅️ Ouest')}${rz('e', 1, '➡️ Est')}</div><p class="muted">Réduire d’une rangée :</p><div class="btns">${rz('n', -1, 'Nord')}${rz('s', -1, 'Sud')}${rz('w', -1, 'Ouest')}${rz('e', -1, 'Est')}</div><p class="muted">Pour le déplacer : outil ↔️ Déplacer.</p>`;
      h += '<h3>Acheter un animal</h3>';
      const list = Object.keys(SP).filter(k => SP[k].b === e.biome && (!n || e.animals[0].sp === k));
      h += list.map(k => {
        const s = SP[k], ok = Z.speciesUnlocked(k);
        return `<div class="card ${ok ? '' : 'locked'}"><div class="ctitle"><b>${s.e} ${s.n}</b><b>${fmt(s.price)}</b></div>
          <p class="muted">Espace : ${s.space} cases/animal · Groupe : ${s.grp} min. · Nourriture : ${s.food} €/j · Attrait : ${s.app}</p>
          ${ok ? `<div class="btns"><button data-a="buy" data-k="${k}" data-s="M">Acheter un mâle ♂</button><button data-a="buy" data-k="${k}" data-s="F">Acheter une femelle ♀</button></div>` : `<p>🔒 Disponible au niveau ${s.lvl}</p>`}</div>`;
      }).join('');
      if (!n) h += `<div class="btns"><button class="danger" data-a="demoencl">🧨 Démolir l’enclos</button></div>`;
      return { title: esc(e.name), html: h };
    },
    bld(id) {
      const b = ent(id); if (!b) return null; const d = BL[b.type];
      let h = `<p class="muted">${esc(d.desc)}</p>`;
      if (b.bt > 0) h += `<div class="warn">🏗️ En construction : ouverture dans ${b.bt} h</div>`;
      if (b.closed && !b.bt) h += '<div class="warn">🚫 Fermé : aucun vendeur disponible. Embauchez-en dans 👷 Personnel.</div>';
      if (!b.acc.length && d.cat === 'shop') h += '<div class="warn">⚠️ Aucune allée reliée à l’entrée ne touche ce bâtiment</div>';
      if (d.price) h += `<label>Prix de vente : <b id="rv">${fmt(b.price)}</b> <span class="muted">(conseillé ${fmt(d.price)})</span><input type="range" min="${d.price * .4}" max="${d.price * 2.5}" step="0.5" value="${b.price}" data-r="price"></label>` + row('Ventes aujourd’hui', b.sold) + row('Coût par vente', fmt(d.goods));
      if (d.upkeep) h += row('Entretien', fmt(d.upkeep) + '/jour');
      h += `<div class="btns"><button class="danger" data-a="demobld">🧨 Démolir (+${fmt(d.cost * .3)})</button></div>`;
      return { title: d.icon + ' ' + d.name, html: h };
    },
    vis(id) {
      const v = ent(id); if (!v) return null;
      const act = v.leaving ? 'Rentre à la maison' : v.st === 'busy' ? (v.act ? 'Observe les animaux' : 'Fait une pause') : v.goal ? { encl: 'Va voir des animaux', food: 'Va manger', drink: 'Va boire', toilet: 'Cherche les toilettes', bench: 'Va se reposer', gift: 'Va à la boutique' }[v.goal.k] : 'Se promène';
      let h = `<p class="muted">${v.kid ? 'Enfant' : 'Adulte'} · ${act}</p>` + (v.thought ? `<div class="quote">💭 ${esc(v.thought)}</div>` : '');
      h += `<div class="grid2"><div>Satisfaction${bar(v.happy)}</div><div>Faim${bar(v.hunger)}</div><div>Soif${bar(v.thirst)}</div><div>Toilettes${bar(v.bladder)}</div><div>Énergie${bar(v.energy)}</div></div>`;
      h += row('Argent de poche', fmt(v.money)) + row('Enclos visités', v.nseen);
      return { title: '🧑 ' + esc(v.name), html: h };
    },
    staffm(id) {
      const s = ent(id); if (!s) return null; const d = Z.STAFF[s.type];
      return { title: d.icon + ' ' + esc(s.name), html: `<p class="muted">${d.name} · ${fmt(d.salary)}/jour</p>` + row('Activité', esc(Z.staffLabel(s))) + `<div class="btns"><button class="danger" data-a="fire" data-id="${s.id}">Licencier</button></div>` };
    },
    staff() {
      const S = Z.S, nd = Z.staffNeeds(); let h = '<p class="muted">Les besoins dépendent du nombre d’animaux, d’enclos, de visiteurs, d’allées et de commerces. Ils sont recalculés en permanence.</p>';
      if (S.lostY > 5 || S.lost > 5) h += `<div class="warn">🎟️ File d’attente à l’entrée : ${Math.round(S.lost || 0)} visiteurs perdus aujourd’hui, ${Math.round(S.lostY || 0)} hier.</div>`;
      for (const k in Z.STAFF) {
        const d = Z.STAFF[k], list = S.staff.filter(s => s.type === k), n = nd[k], un = Z.staffUnlocked(k);
        const st = !un ? '' : n.have < n.need ? (n.opt ? `<span class="tag">conseillé : ${n.need}</span>` : `<span class="tag bad">besoin : ${n.need}</span>`) : n.need ? `<span class="tag ok">besoin : ${n.need} ✓</span>` : '<span class="tag">aucun besoin</span>';
        h += `<div class="card ${un ? '' : 'locked'}"><div class="ctitle"><b>${d.icon} ${d.name} × ${list.length}</b>${st}</div><p class="muted">${d.desc} Salaire : ${fmt(d.salary)}/jour.</p>`;
        if (un) {
          h += `<p class="muted">📋 ${n.why}.${n.have < n.need ? ` <span class="${n.opt ? '' : 'bad'}">Risque : ${n.risk}.</span>` : ''}</p>`;
          h += `<div class="btns"><button data-a="hire" data-k="${k}">Embaucher (200 €)</button>${d.desk && list.length ? `<button class="danger" data-a="fire" data-id="${list[list.length - 1].id}">Licencier un ${d.name.toLowerCase()}</button>` : ''}</div>`;
          if (!d.desk) h += list.map(s => `<div class="row"><span><b>${esc(s.name)}</b> — ${esc(Z.staffLabel(s))}</span><span><button class="mini" data-a="goto" data-id="${s.id}">👁️</button><button class="mini danger" data-a="fire" data-id="${s.id}">✕</button></span></div>`).join('');
        } else h += `<p>🔒 Disponible au niveau ${d.lvl}</p>`;
        h += '</div>';
      }
      const tot = S.staff.reduce((n, s) => n + Z.STAFF[s.type].salary, 0);
      return { title: '👷 Personnel', html: h + row('Effectif total', S.staff.length) + row('Masse salariale', fmt(tot) + '/jour') };
    },
    animals() {
      const S = Z.S; let h = row('Animaux', Z.animalCount()) + row('Espèces', Z.speciesCount()) + row('Naissances', S.stats.births);
      if (!S.enclosures.length) h += '<p class="muted">Aucun enclos. Utilisez l’outil 🚧 Enclos pour en construire un.</p>';
      h += S.enclosures.map(e => {
        const n = e.animals.length, sp = n ? SP[e.animals[0].sp] : null, iss = Z.enclIssues(e);
        return `<div class="card click" data-a="goto" data-id="${e.id}"><div class="ctitle"><b>${sp ? sp.e : BIO[e.biome].icon} ${esc(e.name)}</b><span class="muted">${n ? n + ' ' + (n > 1 ? sp.pl : sp.n.toLowerCase()) : 'vide'}</span></div>
          ${n ? `<div class="grid3"><div>Bonheur${bar(Z.avg(e, 'happy'))}</div><div>Santé${bar(Z.avg(e, 'health'))}</div><div>Nourriture${bar(e.food)}</div></div>` : ''}${iss.length ? `<p class="bad">⚠️ ${esc(iss[0])}</p>` : ''}</div>`;
      }).join('');
      h += '<h3>Espèces à débloquer</h3>' + Object.keys(SP).filter(k => !Z.speciesUnlocked(k)).map(k => `<div class="row"><span>${SP[k].e} ${SP[k].n} <span class="muted">(${BIO[SP[k].b].name})</span></span><b>Niveau ${SP[k].lvl}</b></div>`).join('');
      return { title: '🦁 Animaux', html: h };
    },
    visitors() {
      const S = Z.S, n = S.visitors.length, av = k => n ? S.visitors.reduce((s, v) => s + v[k], 0) / n : 0, r = Z.rep();
      let h = row('Réputation', `<span class="stars">${stars(r)}</span> ${r.toFixed(1).replace('.', ',')}`) + row('Dans le zoo', n) + row('Aujourd’hui', S.fin.vis) + row('Depuis l’ouverture', S.stats.visitors) + row('Affluence estimée', Math.round(Z.demand()) + ' /heure');
      if (n) h += `<h3>Moyennes</h3><div class="grid2"><div>Satisfaction${bar(av('happy'))}</div><div>Faim${bar(av('hunger'))}</div><div>Soif${bar(av('thirst'))}</div><div>Toilettes${bar(av('bladder'))}</div><div>Énergie${bar(av('energy'))}</div></div>`;
      h += '<h3>Ce qu’ils disent</h3>' + (Z.thoughts.length ? Z.thoughts.map(t => `<div class="quote">💭 ${esc(t)}</div>`).join('') : '<p class="muted">Pas encore d’avis. Le zoo ouvre de 9 h à 19 h.</p>');
      return { title: '🧑‍🤝‍🧑 Visiteurs', html: h };
    },
    fin() {
      const S = Z.S, tab = ui.tab.fin; let h = tabs('fin', [['bilan', 'Bilan'], ['prev', 'Prévisions'], ['bank', 'Banque'], ['ads', 'Marketing']]);
      if (tab === 'bilan') {
        h += `<label>Prix du billet : <b id="rv">${fmt(S.ticket)}</b> <span class="muted">(prix juste ≈ ${fmt(Z.fairPrice())})</span><input type="range" min="0" max="80" step="1" value="${S.ticket}" data-r="ticket"></label>`;
        const table = (cats, title) => {
          let inc = 0, exp = 0, r = ''; for (const k in Z.FIN) { const v = cats[k]; if (!v) continue; if (v > 0) inc += v; else exp -= v; r += `<div class="row"><span>${Z.FIN[k]}</span><b class="${v > 0 ? 'good' : 'bad'}">${sign(v)}</b></div>`; }
          return `<h3>${title}</h3>${r || '<p class="muted">Aucun mouvement</p>'}<div class="row total"><span>Résultat</span><b class="${inc - exp >= 0 ? 'good' : 'bad'}">${sign(inc - exp)}</b></div>`;
        };
        h += table(S.fin.today, 'Aujourd’hui (jour ' + S.day + ')');
        const hist = S.fin.history; if (hist.length) {
          h += table(hist[hist.length - 1].cats, 'Hier');
          const last = hist.slice(-14), mx = Math.max(1, ...last.map(d => Math.max(d.inc, d.exp)));
          h += '<h3>14 derniers jours <small>(<span class="good">recettes</span> / <span class="bad">dépenses</span>)</small></h3><div class="chart">' + last.map(d => `<div title="Jour ${d.d} : +${fmt(d.inc)} / −${fmt(d.exp)} · ${d.vis} visiteurs"><i style="height:${d.inc / mx * 100}%;background:#3fae5a"></i><i style="height:${d.exp / mx * 100}%;background:#d9534f"></i></div>`).join('') + '</div>';
        }
      } else if (tab === 'prev') {
        const f = Z.forecast(), c = Z.dailyCosts();
        h += '<p class="muted">Estimation fondée sur l’attrait du zoo, sa réputation, le prix du billet, la publicité et la météo annoncée.</p>';
        h += f.map(d => `<div class="card"><div class="ctitle"><b>${WX[d.w]} Jour ${d.d}</b><b class="${d.net >= 0 ? 'good' : 'bad'}">${sign(d.net)}</b></div>` + row('Visiteurs attendus', d.vis) + row('Billetterie', '+' + fmt(d.tickets)) + row('Boutiques (marge)', '+' + fmt(d.shops)) + row('Charges', '−' + fmt(d.costs)) + '</div>').join('');
        h += '<h3>Charges quotidiennes</h3>' + row('Salaires', fmt(c.salaries)) + row('Nourriture des animaux', fmt(c.food)) + row('Entretien des bâtiments', fmt(c.upkeep)) + row('Intérêts', fmt(c.interest)) + row('Remboursement des prêts', fmt(c.repay));
        const end = S.money + f.reduce((s, d) => s + d.net - d.repay, 0);
        h += `<div class="row total"><span>Trésorerie estimée dans 3 jours</span><b class="${end >= 0 ? 'good' : 'bad'}">${fmt(end)}</b></div>`;
      } else if (tab === 'bank') {
        h += row('Trésorerie', fmt(S.money)) + row('Patrimoine (enclos, bâtiments, animaux)', fmt(Z.assets())) + row('Dettes', fmt(Z.debt())) + `<div class="row total"><span>Valeur nette du zoo</span><b>${fmt(Z.zooValue())}</b></div>`;
        const pct = r => (r * 100).toFixed(2).replace('.', ',') + ' %';
        h += '<h3>Prêts en cours</h3>' + (S.loans.length ? S.loans.map((l, i) => `<div class="card"><div class="ctitle"><b>${esc(l.n)}</b><b>${fmt(l.left)}</b></div><p class="muted">Remboursement : ${fmt(l.pay)}/jour + ${pct(l.rate)} d’intérêts par jour · encore ${Math.ceil(l.left / l.pay)} jours</p><div class="btns"><button data-a="repay" data-i="${i}">Solder maintenant (${fmt(l.left)})</button></div></div>`).join('') : '<p class="muted">Aucun prêt en cours.</p>');
        h += '<h3>Offres de la banque</h3>' + Object.keys(Z.LOANS).map(k => { const d = Z.LOANS[k], ok = d.ok(); return `<div class="card ${ok ? '' : 'locked'}"><div class="ctitle"><b>${d.n}</b><b>${fmt(d.amt)}</b></div><p class="muted">${d.days} jours · ${pct(d.rate)} par jour · ${fmt(d.amt / d.days)}/jour · ${d.req}</p>${ok ? `<div class="btns"><button data-a="borrow" data-k="${k}">Emprunter</button></div>` : '<p>🔒 Condition non remplie</p>'}</div>`; }).join('');
        h += '<p class="muted">Trois prêts au maximum. Si la trésorerie reste négative 7 jours de suite, c’est la faillite.</p>';
      } else {
        h += S.ads ? `<div class="warn">📣 ${Z.ADS[S.ads.k].n} en cours : encore ${S.ads.d} jour(s)</div>` : '<p class="muted">Une campagne publicitaire augmente l’affluence pendant quelques jours. Une seule à la fois.</p>';
        h += Object.keys(Z.ADS).map(k => { const a = Z.ADS[k]; return `<div class="card"><div class="ctitle"><b>${a.icon} ${a.n}</b><b>${fmt(a.cost)}</b></div><p class="muted">${a.desc}</p>${S.ads ? '' : `<div class="btns"><button data-a="ads" data-k="${k}">Lancer</button></div>`}</div>`; }).join('');
        h += row('Affluence estimée', Math.round(Z.demand()) + ' visiteurs/heure');
      }
      return { title: '💶 Finances', html: h };
    },
    prog() {
      const S = Z.S, L = S.level, xi = Z.xpInfo();
      let h = `<div class="lvlhead"><div class="lvlnum">${L}</div><div><b>${Z.LEVEL_TITLES[L]}</b><br><span class="muted">${xi.max ? 'Niveau maximum atteint !' : Math.floor(xi.cur) + ' / ' + xi.need + ' XP — encore ' + Math.ceil(xi.left) + ' XP'}</span>${bar(xi.pct, '#8b5cc9')}</div></div>`;
      h += '<p class="muted">Gagnez de l’expérience (XP) avec les visiteurs satisfaits, les naissances, les nouvelles espèces présentées, les missions et les objectifs. Chaque niveau rapporte une prime et débloque du contenu.</p>';
      h += '<h3>Ligne de progression</h3><div class="road">';
      for (let i = 1; i <= Z.MAX_LEVEL; i++) {
        const u = Z.unlocksAt(i), st = i < L ? 'done' : i === L ? 'cur' : 'next';
        h += `<div class="step ${st}"><div class="dot">${i < L ? '✓' : i}</div><div class="sbody"><b>Niveau ${i} · ${Z.LEVEL_TITLES[i]}</b> <span class="muted">${i > 1 ? Z.XP_LEVELS[i] + ' XP · prime ' + fmt(Z.levelBonus(i)) : 'départ'}</span><div class="unl">${u.join(' · ') || '—'}</div></div></div>`;
      }
      h += '</div><h3>Terrains</h3><p class="muted">Agrandissez le zoo en achetant les parcelles voisines. Touchez une zone sombre sur la carte pour la voir.</p>';
      h += Z.PARCELS.map(p => { const own = S.land[p.id], ok = !own && p.lvl <= L && Z.adjacentOwned(p); return `<div class="row"><span>${own ? '✅' : p.lvl > L ? '🔒' : '🗺️'} ${p.n} <span class="muted">(${p.w}×${p.h})</span></span>${own ? '<b class="good">Acquis</b>' : p.lvl > L ? `<b class="muted">Niveau ${p.lvl}</b>` : ok ? `<button class="mini" data-a="land" data-id="${p.id}">Acheter ${fmt(p.price)}</button>` : '<span class="muted">Non contigu</span>'}</div>`; }).join('');
      return { title: '📈 Progression du zoo', html: h };
    },
    land(id) {
      const S = Z.S, p = Z.PARCELS[id]; if (!p) return null; const own = S.land[id];
      let h = `<p class="muted">Parcelle de ${p.w}×${p.h} = ${p.w * p.h} cases.</p>` + row('Prix', fmt(p.price)) + row('Niveau requis', p.lvl);
      if (own) h += '<p class="good">Ce terrain vous appartient.</p>';
      else if (p.lvl > S.level) h += `<div class="warn">🔒 Atteignez le niveau ${p.lvl} pour l’acheter (actuellement ${S.level}).</div>`;
      else if (!Z.adjacentOwned(p)) h += '<div class="warn">Achetez d’abord un terrain voisin.</div>';
      else h += `<div class="btns"><button data-a="land" data-id="${p.id}">🗺️ Acheter pour ${fmt(p.price)}</button></div>`;
      return { title: '🗺️ ' + p.n, html: h };
    },
    stats() {
      const S = Z.S, hs = S.fin.history.filter(x => x.money != null), kpi = (l, v) => `<div><small>${l}</small><b>${v}</b></div>`;
      let h = '<div class="kpis">' + kpi('Valeur du zoo', fmt(Z.zooValue())) + kpi('Réputation', Z.rep().toFixed(1).replace('.', ',') + ' ★') + kpi('Animaux', Z.animalCount()) + kpi('Espèces', Z.speciesCount()) + kpi('Record par jour', S.stats.bestDay) + kpi('Pic simultané', S.stats.peak) + kpi('Visiteurs cumulés', S.stats.visitors) + kpi('Naissances', S.stats.births) + kpi('Décès', S.stats.deaths) + kpi('Missions réussies', S.stats.missions) + '</div>';
      const num = v => Math.round(v).toLocaleString('fr-FR');
      h += '<h3>Trésorerie</h3>' + line(hs.map(x => x.money), '#2f8f4e', fmt) + '<h3>Résultat quotidien</h3>' + line(hs.map(x => x.inc - x.exp), '#c9870f', fmt) + '<h3>Visiteurs par jour</h3>' + line(hs.map(x => x.vis), '#3b7dd8', num)
        + '<h3>Réputation</h3>' + line(hs.map(x => x.rep), '#e3a008', v => v.toFixed(2).replace('.', ',') + ' ★') + '<h3>Valeur du zoo</h3>' + line(hs.map(x => x.val), '#8b5cc9', fmt);
      const shops = S.buildings.filter(b => BL[b.type].price);
      h += '<h3>Ventes du jour</h3>' + (shops.length ? shops.map(b => row(BL[b.type].icon + ' ' + BL[b.type].name + ' <span class="muted">(' + fmt(b.price) + ')</span>', b.sold + ' ventes · ' + fmt(b.sold * (b.price - BL[b.type].goods)))).join('') : '<p class="muted">Aucune boutique.</p>');
      const by = {}; for (const e of S.enclosures) for (const a of e.animals) { const o = by[a.sp] = by[a.sp] || { n: 0, h: 0 }; o.n++; o.h += a.happy; }
      h += '<h3>Espèces</h3>' + (Object.keys(by).map(k => row(SP[k].e + ' ' + SP[k].n + ' × ' + by[k].n, 'bonheur ' + Math.round(by[k].h / by[k].n) + ' %')).join('') || '<p class="muted">Aucun animal.</p>');
      return { title: '📊 Statistiques', html: h };
    },
    goals() {
      const S = Z.S, sc = Z.scenario(), tab = ui.tab.goals;
      let h = tabs('goals', [['obj', sc ? 'Scénario' : 'Objectifs'], ['mis', 'Missions' + (S.missions.length ? ' (' + S.missions.length + ')' : '')], ['camp', 'Campagne']]);
      if (tab === 'obj') {
        if (sc) {
          h += `<p><b>${sc.icon} ${sc.name}</b> — jour ${S.day} sur ${sc.days}</p><p class="muted">${sc.desc}</p>` + sc.goals.map(g => { const ok = g.c(S); return `<div class="card ${ok ? 'done' : 'cur'}"><div class="ctitle"><span>${ok ? '✅' : '🎯'} ${g.t}</span><b>${g.p ? g.p(S) : ''}</b></div></div>`; }).join('');
          if (S.scnEnd === 'win') h += '<p class="good">Scénario réussi ! Vous pouvez continuer à jouer ou en lancer un autre.</p>';
        } else h += Z.GOALS.map((g, i) => { const u = Object.keys(BL).filter(k => BL[k].need === i).map(k => BL[k].icon + ' ' + BL[k].name).join(', '); return `<div class="card ${i < S.goal ? 'done' : i > S.goal ? 'locked' : 'cur'}"><div class="ctitle"><span>${i < S.goal ? '✅' : i === S.goal ? '🎯' : '🔒'} ${esc(g.t)}</span><b>+${fmt(g.r)}</b></div>${u ? `<p class="muted">Débloque : ${u}</p>` : ''}</div>`; }).join('');
        h += '<h3>Journal</h3>' + S.log.slice(0, 15).map(l => `<div class="row log ${l.k}"><span>J${l.d} · ${esc(l.t)}</span></div>`).join('');
      } else if (tab === 'mis') {
        h += '<p class="muted">De nouvelles missions sont proposées tous les 2 à 4 jours. Acceptez-les pour gagner de l’argent, de la réputation ou des animaux.</p>';
        h += S.missions.map(m => `<div class="card ${m.st === 'active' ? 'cur' : ''}"><div class="ctitle"><b>${esc(m.t)}</b><b class="good">${m.money ? '+' + fmt(m.money) : '🎁'}</b></div><p>${esc(m.d)}</p><p class="muted">${m.st === 'active' ? 'En cours — échéance : jour ' + m.end + (Z.missionProg(m) ? ' · ' + Z.missionProg(m) : '') : 'Offre valable jusqu’au jour ' + m.exp + ' · durée : ' + m.days + ' jours'}${m.rep ? ' · bonus de réputation' : ''}</p>${m.st === 'offer' ? `<div class="btns"><button data-a="macc" data-id="${m.id}">✅ Accepter</button><button data-a="mdec" data-id="${m.id}">Refuser</button></div>` : ''}</div>`).join('') || '<p>Aucune mission pour le moment.</p>';
        h += row('Missions réussies', S.stats.missions);
      } else {
        const c = Z.campaign(), med = { or: '🥇', argent: '🥈', bronze: '🥉' };
        h += '<p class="muted">Cinq scénarios à objectifs et durée limitée. Chaque réussite débloque le suivant et ajoute 5 000 € au capital de départ du mode libre. Lancer un scénario remplace la partie en cours.</p>';
        h += Z.SCENARIOS.map((s, i) => { const ok = Z.scnUnlocked(i); return `<div class="card ${ok ? (S.scn === s.id ? 'cur' : '') : 'locked'}"><div class="ctitle"><b>${s.icon} ${i + 1}. ${s.name}</b><b>${med[c[s.id]] || (ok ? '' : '🔒')}</b></div><p class="muted">${s.desc}</p><p>${s.goals.map(g => '• ' + g.t).join('<br>')}</p><p class="muted">Capital : ${fmt(s.money)} · Délai : ${s.days} jours</p>${ok ? `<div class="btns"><button data-a="scn" data-id="${s.id}">${S.scn === s.id ? 'Recommencer' : 'Jouer ce scénario'}</button></div>` : ''}</div>`; }).join('');
        h += `<div class="card"><div class="ctitle"><b>🌍 Mode libre</b></div><p class="muted">Sans limite de temps. Capital de départ : ${fmt(25000 + Z.campaignBonus())}.</p><div class="btns"><button data-a="scn" data-id="">Nouvelle partie libre</button></div></div>`;
      }
      return { title: '🎯 Missions & campagne', html: h };
    },
    menu() {
      return { title: '⚙️ Menu', html: `<div class="btns col"><button data-a="save">💾 Sauvegarder</button><button data-a="camp">🏆 Campagne et mode libre</button><button data-a="help">❓ Comment jouer</button><button class="danger" data-a="reset">🗑️ Nouvelle partie libre</button></div><p class="muted">La partie est sauvegardée automatiquement chaque jour dans ce navigateur.</p>` };
    },
  };

  // ---------- Actions ----------
  const ACT = {
    tool: d => setTool(d.id), arg: d => { ui.arg = d.id; renderTools(); }, close: closePanel,
    speed: d => { Z.S.speed = +d.v; updateTop(); },
    upg: d => Z.upgrade(ent(ui.parg), d.k),
    buy: d => Z.buyAnimal(ent(ui.parg), d.k, d.s),
    sell: d => { const e = ent(ui.parg), a = e.animals.find(a => a.id === +d.id); if (a) Z.sellAnimal(e, a); },
    evet: d => { const e = ent(ui.parg), a = e.animals.find(a => a.id === +d.id); if (a) Z.emergencyVet(e, a); },
    demoencl: () => { const e = ent(ui.parg); if (e && Z.demolish(e.x, e.y)) closePanel(); },
    demobld: () => { const b = ent(ui.parg); if (b && Z.demolish(b.x, b.y)) closePanel(); },
    hire: d => Z.hire(d.k), fire: d => { Z.fire(+d.id); if (ui.panel === 'staffm') openPanel('staff'); },
    goto: d => { const o = ent(+d.id); if (!o) return; if (o.kind === 'encl') { Z.focus(o.x + o.w / 2, o.y + o.h / 2); openPanel('encl', o.id); } else { Z.focus(o.x, o.y); openPanel('staffm', o.id); } },
    tab: d => { ui.tab[d.p] = d.id; },
    land: d => { Z.buyParcel(+d.id); },
    rename: () => { const e = ent(ui.parg), n = prompt('Nom de l’enclos :', e.name); if (n && n.trim()) e.name = n.trim().slice(0, 40); },
    resize: d => Z.resizeEncl(ent(ui.parg), d.s, +d.d),
    repay: d => Z.repayLoan(+d.i), borrow: d => Z.takeLoan(d.k), ads: d => Z.buyAds(d.k),
    macc: d => Z.acceptMission(+d.id), mdec: d => Z.declineMission(+d.id),
    camp: () => openPanel('goals', null, 'camp'),
    scn: d => { const sc = Z.SCENARIOS.find(x => x.id === d.id); modal(sc ? sc.icon + ' ' + sc.name : '🌍 Mode libre', '<p>' + (sc ? sc.desc : 'Une nouvelle partie sans limite de temps.') + '</p><p class="muted">La partie en cours sera remplacée.</p>', [['Annuler'], ['Commencer', () => Z.restart(d.id || null)]]); },
    save: () => toast(Z.save() ? 'Partie sauvegardée' : 'Sauvegarde impossible', 'good'),
    help: () => showHelp(),
    reset: () => modal('Nouvelle partie ?', '<p>Votre zoo actuel sera définitivement effacé.</p>', [['Annuler'], ['Tout effacer', () => { Z.restart(null); showHelp(); }, 'danger']]),
    modalbtn: d => { const f = modalBtns[+d.i]; $('#modal').style.display = 'none'; if (f) f(); },
  };
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]'); if (!el) return;
    const f = ACT[el.dataset.a]; if (f) { f(el.dataset); renderPanel(true); updateTop(); }
  });
  document.addEventListener('input', ev => {
    const r = ev.target.dataset.r; if (!r) return; const v = +ev.target.value;
    if (r === 'ticket') Z.S.ticket = v; else { const b = ent(ui.parg); if (b) b.price = v; }
    const o = $('#rv'); if (o) o.textContent = fmt(v);
  });

  document.addEventListener('change', ev => {
    const x = ev.target.dataset.x; if (!x || !ev.target.value) return;
    const e = ent(ui.parg), a = e && e.animals.find(a => a.id === +x); if (a) Z.transfer(e, a, ent(+ev.target.value));
    ev.target.blur(); renderPanel(true);
  });

  // ---------- Messages ----------
  function toast(text, kind) {
    const t = document.createElement('div'); t.className = 'toast ' + (kind || 'info'); t.textContent = text; const box = $('#toasts'); box.appendChild(t);
    while (box.children.length > 4) box.firstChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 5000);
  }
  Z.onNotify = toast;
  let modalBtns = [];
  function modal(title, html, btns) {
    modalBtns = btns.map(b => b[1]);
    $('#modal').innerHTML = `<div class="mbox"><h2>${title}</h2>${html}<div class="btns">${btns.map((b, i) => `<button class="${b[2] || ''}" data-a="modalbtn" data-i="${i}">${b[0]}</button>`).join('')}</div></div>`;
    $('#modal').style.display = 'flex';
  }
  Z.modal = modal;
  Z.onRestart = () => { closePanel(); ui.tool = 'select'; renderTools(); updateTop(); const sc = Z.scenario(); if (sc) modal(sc.icon + ' ' + sc.name, `<p>${sc.desc}</p><p><b>Objectifs à atteindre en ${sc.days} jours :</b><br>${sc.goals.map(g => '• ' + g.t).join('<br>')}</p>`, [['C’est parti !', () => openPanel('goals', null, 'obj')]]); };
  function showHelp() {
    modal('🦁 Bienvenue dans Zoo Project', `<p>Vous dirigez un zoo. Faites-en un lieu où les animaux vivent bien et où les visiteurs se pressent.</p><ol>
      <li><b>🚧 Enclos</b> — choisissez un habitat et dessinez un enclos. Chaque espèce exige son habitat, assez d’espace et un groupe minimum.</li>
      <li><b>🛣️ Allées</b> — reliez l’enclos à l’entrée : visiteurs et personnel ne marchent que sur les allées.</li>
      <li><b>🖐️ Explorer</b> — touchez l’enclos pour y acheter des animaux.</li>
      <li><b>👷 Personnel</b> — soigneurs, agents de maintenance et vétérinaires travaillent sur le terrain ; caissiers, vendeurs, animateurs et agents de sécurité tiennent leur poste. Le panneau indique combien il en faut selon la taille du zoo.</li>
      <li><b>🏪 Services</b> — restauration, toilettes, bancs, poubelles et boutique gardent les visiteurs satisfaits.</li>
      <li><b>💶 Finances</b> — réglez le prix du billet. La réputation (★) attire le public et débloque de nouvelles espèces.</li>
      <li><b>📈 Progression</b> — votre zoo gagne de l’expérience et monte de niveau (15 niveaux) : nouveaux habitats, espèces, bâtiments, employés et terrains. Les chantiers durent plusieurs heures et les animaux commandés sont livrés le lendemain.</li>
      <li><b>↔️ Déplacer</b> — glissez un enclos ou un bâtiment pour le déplacer ; agrandissez un enclos depuis sa fiche.</li>
      <li><b>🎯 Missions</b> — acceptez des missions, suivez vos objectifs et lancez la campagne de 5 scénarios. <b>📊 Stats</b> et <b>👁️ Vues</b> vous aident à piloter.</li></ol>
      <p class="muted">Souris : glisser pour se déplacer, molette pour zoomer. Tactile : un doigt pour agir, deux pour se déplacer et zoomer. Le zoo ouvre de 9 h à 19 h ; un an pour les animaux = 10 jours.</p>`, [['C’est parti !']]);
  }

  // ---------- Barre du haut ----------
  const WX = { sun: '☀️', cloud: '⛅', rain: '🌧️' };
  function updateTop() {
    const S = Z.S, h = Math.floor(S.minute / 60), m = Math.floor(S.minute % 60), r = Z.rep();
    $('#money').textContent = fmt(S.money); $('#money').className = S.money < 0 ? 'bad' : '';
    const xi = Z.xpInfo(); $('#lvl').innerHTML = `⭐ Niv. <b>${S.level}</b><span class="xpbar"><i style="width:${xi.pct}%"></i></span>`;
    $('#vis').textContent = S.visitors.length; $('#rep').innerHTML = `<span class="stars">${stars(r)}</span> ${r.toFixed(1).replace('.', ',')}`;
    $('#clock').textContent = `${WX[S.weather]} Jour ${S.day} · ${String(h).padStart(2, '0')}:${String(m - m % 10).padStart(2, '0')}`;
    $('#open').textContent = Z.isOpen() ? 'Ouvert' : 'Fermé'; $('#open').className = 'tag ' + (Z.isOpen() ? 'ok' : 'bad');
    document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.speed));
    const g = Z.GOALS[S.goal], sc = Z.scenario(); $('#goal').textContent = sc ? `${sc.icon} ${sc.name} — jour ${S.day}/${sc.days} · ${sc.goals.filter(x => x.c(S)).length}/${sc.goals.length} objectifs` : g ? '🎯 ' + g.t : '🏆 Tous les objectifs sont atteints !';
  }

  // ---------- Carte : souris et tactile ----------
  const pts = new Map(); let drag = null, pinch = null;
  function ghostFor(tx, ty) {
    if (ui.tool === 'shop' || ui.tool === 'decor') { if (!ui.arg) return null; const s = BL[ui.arg].size; return { x: tx, y: ty, w: s, h: s, type: ui.arg, ok: Z.freeRect(tx, ty, s, s) }; }
    if (ui.tool === 'path') return { x: tx, y: ty, w: 1, h: 1, ok: Z.freeRect(tx, ty, 1, 1) };
    if (ui.tool === 'demo') return { x: tx, y: ty, w: 1, h: 1, ok: false };
    return null;
  }
  function enclRect(a, b) { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x) + 1, h = Math.abs(a.y - b.y) + 1; return { x, y, w, h, ok: w >= 2 && h >= 2 && w * h >= 6 && Z.freeRect(x, y, w, h) }; }
  function moveGhost(d, t) { const o = d.mo, [w, h] = Z.sizeOf(o), x = o.x + t.x - d.start.x, y = o.y + t.y - d.start.y; return { x, y, w, h, type: o.kind === 'bld' ? o.type : null, ok: Z.canMove(o, x, y) }; }
  function drawMini() {
    const m = $('#mini'); if (!m || !m.clientWidth) return;
    const c = m.getContext('2d'), sx = m.width / (W * T), sy = m.height / (H * T); c.drawImage(Z.groundCanvas, 0, 0, m.width, m.height);
    for (const p of Z.PARCELS) if (!Z.S.land[p.id]) { c.fillStyle = 'rgba(10,20,5,.5)'; c.fillRect(p.x * T * sx, p.y * T * sy, p.w * T * sx, p.h * T * sy); }
    c.fillStyle = '#fff'; for (const v of Z.S.visitors) c.fillRect(v.x * T * sx - 1, v.y * T * sy - 1, 2, 2);
    const r = Z.viewRect(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(r.x * sx, r.y * sy, r.w * sx, r.h * sy);
  }
  function clickSelect(sx, sy) {
    const w = Z.toWorld(sx, sy), wx = w.x / T, wy = w.y / T, S = Z.S; let best = null, bd = .9;
    for (const a of S.staff.filter(s => !Z.STAFF[s.type].desk).concat(S.visitors)) { const d = Math.hypot(a.x + a.ox - wx, a.y + a.oy - wy - .1); if (d < bd) { bd = d; best = a; } }
    if (best) return openPanel(best.kind === 'staff' ? 'staffm' : 'vis', best.id);
    const tx = Math.floor(wx), ty = Math.floor(wy), o = Z.inb(tx, ty) ? Z.occ[Z.idx(tx, ty)] : null;
    if (o) openPanel(o.kind === 'encl' ? 'encl' : 'bld', o.id); else if (Z.inb(tx, ty) && !Z.owned(tx, ty)) openPanel('land', Z.parcelAt(tx, ty).id); else if (ui.sel) closePanel();
  }
  function down(ev) {
    cvEl.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; drag = null; ui.ghost = null; return; }
    const t = Z.toTile(ev.clientX, ev.clientY), mo = ui.tool === 'move' && ev.button === 0 && Z.inb(t.x, t.y) ? Z.occ[Z.idx(t.x, t.y)] : null, pan = ev.button === 1 || ev.button === 2 || ui.tool === 'select' || (ui.tool === 'move' && !mo);
    drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, lx: ev.clientX, ly: ev.clientY, pan, moved: false, start: t, mo };
    if (!pan) { if (mo) ui.ghost = moveGhost(drag, t); else if (ui.tool === 'path') Z.buildPath(t.x, t.y); else if (ui.tool === 'encl') ui.ghost = enclRect(t, t); else ui.ghost = ghostFor(t.x, t.y); }
  }
  function move(ev) {
    const p = pts.get(ev.pointerId); if (p) { p.x = ev.clientX; p.y = ev.clientY; }
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(mx, my, d / pinch.d); Z.cam.x -= (mx - pinch.mx) / Z.cam.z; Z.cam.y -= (my - pinch.my) / Z.cam.z; Z.clampCam();
      pinch = { d, mx, my }; return;
    }
    const t = Z.toTile(ev.clientX, ev.clientY);
    if (!drag || drag.id !== ev.pointerId) { if (ev.pointerType === 'mouse' && ui.tool !== 'select' && ui.tool !== 'encl') ui.ghost = ghostFor(t.x, t.y); return; }
    if (Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 6) drag.moved = true;
    if (drag.pan) { Z.cam.x -= (ev.clientX - drag.lx) / Z.cam.z; Z.cam.y -= (ev.clientY - drag.ly) / Z.cam.z; Z.clampCam(); }
    else if (drag.mo) { ui.ghost = moveGhost(drag, t); setHint('Déplacement : ' + fmt(Z.moveCost(drag.mo))); }
    else if (ui.tool === 'path') Z.buildPath(t.x, t.y);
    else if (ui.tool === 'encl') { ui.ghost = enclRect(drag.start, t); setHint(`${ui.ghost.w}×${ui.ghost.h} = ${ui.ghost.w * ui.ghost.h} cases — ${fmt(Z.enclCost(ui.ghost.w, ui.ghost.h, ui.arg))}`); }
    else ui.ghost = ghostFor(t.x, t.y);
    drag.lx = ev.clientX; drag.ly = ev.clientY;
  }
  function up(ev) {
    pts.delete(ev.pointerId); if (pts.size < 2) pinch = null;
    if (!drag || drag.id !== ev.pointerId) return; const d = drag; drag = null;
    const t = Z.toTile(ev.clientX, ev.clientY);
    if (d.pan) { if (!d.moved && ev.button === 0) { if (ui.tool === 'select') clickSelect(ev.clientX, ev.clientY); } }
    else if (d.mo) { const gh = ui.ghost; ui.ghost = null; if (gh && d.moved) Z.moveObj(d.mo, gh.x, gh.y); renderTools(); }
    else if (ui.tool === 'encl') { const r = ui.ghost; ui.ghost = null; if (r && r.w * r.h > 1) { const e = Z.buildEncl(r.x, r.y, r.w, r.h, ui.arg); if (e) { setTool('select'); openPanel('encl', e.id); } } renderTools(); }
    else if (ui.tool === 'shop' || ui.tool === 'decor') { if (ui.arg) Z.place(ui.arg, t.x, t.y); if (ev.pointerType !== 'mouse') ui.ghost = null; }
    else if (ui.tool === 'demo') { Z.demolish(t.x, t.y); if (ui.sel && !ent(ui.parg)) closePanel(); ui.ghost = null; }
    updateTop();
  }
  function zoomAt(sx, sy, f) { const c = Z.cam, w = Z.toWorld(sx, sy); c.z = Z.clamp(c.z * f, .35, 2.6); const w2 = Z.toWorld(sx, sy); c.x += w.x - w2.x; c.y += w.y - w2.y; Z.clampCam(); }
  let cvEl;

  // ---------- Démarrage ----------
  Z.start = function () {
    cvEl = $('#cv'); Z.initRender(cvEl);
    const loaded = Z.load(); if (!loaded) Z.newGame();
    if (window.innerWidth < 700) Z.cam.z = .75;
    cvEl.addEventListener('pointerdown', down); cvEl.addEventListener('pointermove', move);
    cvEl.addEventListener('pointerup', up); cvEl.addEventListener('pointercancel', ev => { pts.delete(ev.pointerId); drag = null; pinch = null; ui.ghost = null; });
    cvEl.addEventListener('pointerleave', () => { if (!drag) ui.ghost = null; });
    cvEl.addEventListener('contextmenu', ev => ev.preventDefault());
    cvEl.addEventListener('wheel', ev => { ev.preventDefault(); zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 1.12 : 1 / 1.12); }, { passive: false });
    const pn = $('#panel'); pn.addEventListener('pointerdown', () => panelBusy = true);
    window.addEventListener('pointerup', () => setTimeout(() => panelBusy = false, 80));
    const mini = $('#mini'), mgo = ev => { const r = mini.getBoundingClientRect(); Z.focus((ev.clientX - r.left) / r.width * W, (ev.clientY - r.top) / r.height * H); };
    mini.addEventListener('pointerdown', ev => { mini.setPointerCapture(ev.pointerId); mgo(ev); }); mini.addEventListener('pointermove', ev => { if (ev.buttons) mgo(ev); });
    const keys = {};
    window.addEventListener('keydown', ev => {
      if (ev.target.tagName === 'INPUT') return; keys[ev.key.toLowerCase()] = true;
      if (ev.key === 'Escape') { if (ui.tool !== 'select') setTool('select'); else closePanel(); }
      if (ev.key === ' ') { ev.preventDefault(); Z.S.speed = Z.S.speed ? 0 : 1; updateTop(); }
      if (['1', '2', '3'].includes(ev.key)) { Z.S.speed = [1, 2, 4][+ev.key - 1]; updateTop(); }
    });
    window.addEventListener('keyup', ev => keys[ev.key.toLowerCase()] = false);
    document.addEventListener('visibilitychange', () => { if (document.hidden) Z.save(); });
    renderTools(); updateTop(); if (!loaded) showHelp();
    let last = performance.now(), acc = 0;
    (function frame(now) {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      const sp = 500 * dt / Z.cam.z, c = Z.cam;
      if (keys.arrowleft || keys.q || keys.a) c.x -= sp; if (keys.arrowright || keys.d) c.x += sp;
      if (keys.arrowup || keys.z || keys.w) c.y -= sp; if (keys.arrowdown || keys.s) c.y += sp; Z.clampCam();
      Z.tick(dt); Z.draw();
      acc += dt; if (acc > .4) { acc = 0; updateTop(); renderPanel(false); drawMini(); }
      requestAnimationFrame(frame);
    })(last);
  };
  window.addEventListener('DOMContentLoaded', Z.start);
})();
