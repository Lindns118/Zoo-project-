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
  const ent = id => Z.S.enclosures.find(e => e.id === id) || Z.S.buildings.find(e => e.id === id) || Z.S.staff.find(e => e.id === id) || Z.S.visitors.find(e => e.id === id) || (Z.animalById && Z.animalById(id));

  // ---------- Barre d'outils ----------
  const TOOLS = [
    ['select', '🖐️', 'Explorer'], ['path', '🛣️', 'Allées'], ['encl', '🚧', 'Enclos'], ['shop', '🏪', 'Services'], ['ride', '🎡', 'Attractions'], ['decor', '🌳', 'Décor'], ['terra', '⛏️', 'Terrain'], ['move', '↔️', 'Déplacer'], ['demo', '🧨', 'Démolir'],
    ['|'], ['p:staff', '👷', 'Personnel'], ['p:animals', '🦁', 'Animaux'], ['p:visitors', '🧑‍🤝‍🧑', 'Visiteurs'], ['p:fin', '💶', 'Finances'], ['p:research', '🔬', 'Recherche'], ['p:prog', '📈', 'Progression'], ['p:stats', '📊', 'Stats'], ['p:goals', '🎯', 'Missions'], ['p:world', '🌍', 'Monde'], ['view', '👁️', 'Vues'], ['p:menu', '⚙️', 'Menu'],
  ];
  function renderTools() {
    $('#tools').innerHTML = TOOLS.map(t => t[0] === '|' ? '<span class="sep"></span>' :
      `<button class="tool ${ui.tool === t[0] || (t[0] === 'view' && ui.view) || (ui.panel && 'p:' + ui.panel === t[0]) ? 'on' : ''}" data-a="tool" data-id="${t[0]}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('');
    let sub = '';
    if (ui.tool === 'encl') sub = Object.keys(BIO).filter(k => !Z.S.rules.biomes || Z.S.rules.biomes.includes(k)).map(k => !Z.biomeUnlocked(k) ? `<button class="chip locked" disabled>🔒 ${BIO[k].name}<small>${Z.lockLabel(BIO[k])}</small></button>` : `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}">${BIO[k].icon} ${BIO[k].name}<small>${Math.round(BIO[k].cost * Z.biomeMult(k))} €/case</small></button>`).join('');
    if (ui.tool === 'shop' || ui.tool === 'decor' || ui.tool === 'ride') sub = Object.keys(BL).filter(k => BL[k].cat === ui.tool).map(k => !Z.bldUnlocked(k) ? `<button class="chip locked" disabled>🔒 ${BL[k].name}<small>${Z.lockLabel(BL[k])}</small></button>` : `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}" title="${esc(BL[k].desc)}">${BL[k].icon} ${BL[k].name}<small>${fmt(BL[k].cost)}</small></button>`).join('');
    if (ui.tool === 'terra') sub = Object.keys(Z.TERRA).map(k => `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}">${Z.TERRA[k].icon} ${Z.TERRA[k].name}<small>${fmt(Z.TERRA[k].cost)}/case</small></button>`).join('');
    $('#sub').innerHTML = sub; $('#sub').style.display = sub ? 'flex' : 'none';
    const hints = {
      select: '', path: 'Glissez pour tracer une allée (12 €/case), puis validez. Appui long : déplacer la carte.',
      encl: 'Glissez pour dessiner l’enclos, puis validez. Une allée doit le longer. Appui long : déplacer la carte.',
      shop: BL[ui.arg] ? BL[ui.arg].desc + ' Touchez pour ajouter au plan, puis validez.' : '', decor: BL[ui.arg] ? BL[ui.arg].desc : '',
      move: 'Glissez un bâtiment ou un enclos (avec ses animaux) vers son nouvel emplacement. Coût : 10 % de son prix.',
      ride: BL[ui.arg] ? BL[ui.arg].desc + ' Nécessite un opérateur et une allée.' : 'Aucune attraction disponible : lancez un projet dans 🔬 Recherche.',
      terra: 'Touchez ou glissez sur votre terrain. L’eau et les arbres embellissent le zoo ; une allée posée sur l’eau devient un pont (60 €).',
      demo: 'Touchez une allée, un bâtiment, un enclos vide (30 % remboursés) ou un arbre à défricher (120 €).',
    };
    setHint(hints[ui.tool] || (ui.view ? 'Vue : ' + VIEWS[ui.view] + ' — touchez 👁️ pour changer' : ''));
  }
  function setHint(t) { const h = $('#hint'); h.textContent = t; h.style.display = t ? 'block' : 'none'; }
  function setTool(id) {
    if (id === 'view') { const o = [null, 'happy', 'clean', 'crowd']; ui.view = o[(o.indexOf(ui.view) + 1) % 4]; renderTools(); return; }
    if (id.startsWith('p:')) { const p = id.slice(2); if (ui.panel === p) closePanel(); else openPanel(p); return; }
    ui.tool = id; ui.ghost = null;
    ui.arg = id === 'encl' ? 'savane' : id === 'shop' ? 'food' : id === 'decor' ? 'tree' : id === 'terra' ? 'dig' : id === 'ride' ? (Object.keys(BL).find(k => BL[k].cat === 'ride' && Z.bldUnlocked(k)) || null) : null;
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
      h += Z.html.crowd(e);
      const iss = Z.enclIssues(e); if (iss.length) h += `<div class="warn">${iss.map(i => '⚠️ ' + esc(i)).join('<br>')}</div>`;
      h += `<div class="grid3"><div>Nourriture${bar(e.food)}</div><div>Propreté${bar(e.clean)}</div><div>Clôture${bar(e.fence)}</div></div>`;
      h += '<h3>Aménagements</h3><div class="btns">' + Object.keys(Z.UPGRADES).map(k => { const u = Z.UPGRADES[k]; return e.up[k] ? `<span class="tag ok">${u.icon} ${u.name} ✓</span>` : `<button data-a="upg" data-k="${k}" title="${u.desc}">${u.icon} ${u.name} — ${fmt(u.cost(e))}<small>${u.desc}</small></button>`; }).join('') + '</div>';
      const xfer = a => { const ts = Z.transferTargets(e, a); return ts.length ? `<select data-x="${a.id}"><option value="">🚚 Transférer vers… (100 €)</option>${ts.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select>` : ''; };
      if (n) {
        const sp = SP[e.animals[0].sp];
        h += `<h3>${sp.e} ${n} ${n > 1 ? sp.pl : sp.n.toLowerCase()} <small>(${n * sp.space}/${area} cases utilisées · attrait ${Math.round(Z.enclAppeal(e))})</small></h3>`;
        h += e.animals.map(a => `<div class="card"><div class="ctitle"><b>${sp.e} ${esc(a.name)}</b> <span class="muted">${a.sex === 'M' ? '♂' : '♀'} · ${a.age < 1 ? 'bébé' : Math.floor(a.age) + ' ans'}${a.preg ? ' · 🤰 gestation' : ''}</span>${a.sick ? '<span class="tag bad">malade</span>' : ''}</div>
          <div class="grid3"><div>Santé${bar(a.health)}</div><div>Bonheur${bar(a.happy)}</div><div>Satiété${bar(a.hunger)}</div></div>
          <div class="btns">${a.sick ? `<button data-a="evet" data-id="${a.id}">🚑 Soin d’urgence — 500 €</button>` : ''}<button data-a="afiche" data-id="${a.id}">📋 Fiche</button><button data-a="sell" data-id="${a.id}">Vendre (+${fmt(Z.animalValue(a))})</button>${xfer(a)}</div>${Z.html.animal(a)}</div>`).join('');
      }
      const rz = (sd, d, lbl) => { const r = Z.resizeInfo(e, sd, d); return `<button ${r ? '' : 'disabled'} data-a="resize" data-s="${sd}" data-d="${d}">${lbl}${r && r.cost ? `<small>${fmt(r.cost)}</small>` : ''}</button>`; };
      h += `<h3>Modifier l’enclos</h3><div class="btns"><button data-a="rename">✏️ Renommer</button></div><p class="muted">Agrandir d’une rangée :</p><div class="btns">${rz('n', 1, '⬆️ Nord')}${rz('s', 1, '⬇️ Sud')}${rz('w', 1, '⬅️ Ouest')}${rz('e', 1, '➡️ Est')}</div><p class="muted">Réduire d’une rangée :</p><div class="btns">${rz('n', -1, 'Nord')}${rz('s', -1, 'Sud')}${rz('w', -1, 'Ouest')}${rz('e', -1, 'Est')}</div><p class="muted">Pour le déplacer : outil ↔️ Déplacer.</p>`;
      h += '<h3>Acheter un animal</h3>';
      const list = Object.keys(SP).filter(k => SP[k].b === e.biome && (!n || e.animals[0].sp === k));
      h += list.map(k => {
        const s = SP[k], ok = Z.speciesUnlocked(k);
        return `<div class="card ${ok ? '' : 'locked'}"><div class="ctitle"><b>${s.e} ${s.n}</b><b>${fmt(s.price)}</b></div>
          <p class="muted">Espace : ${s.space} cases/animal · Groupe : ${s.grp} min. · Nourriture : ${s.food} €/j · Attrait : ${s.app}</p>
          ${ok ? `<div class="btns"><button data-a="buy" data-k="${k}" data-s="M">Acheter un mâle ♂</button><button data-a="buy" data-k="${k}" data-s="F">Acheter une femelle ♀</button></div>` : `<p>🔒 ${s.res ? 'À débloquer par la recherche : ' + Z.RESEARCH[s.res].name : 'Disponible au niveau ' + s.lvl}</p>`}</div>`;
      }).join('');
      h += Z.html.encl(e);
      if (!n) h += `<div class="btns"><button class="danger" data-a="demoencl">🧨 Démolir l’enclos</button></div>`;
      return { title: esc(e.name), html: h };
    },
    bld(id) {
      const b = ent(id); if (!b) return null; const d = BL[b.type];
      let h = `<p class="muted">${esc(d.desc)}</p>`;
      if (b.bt > 0) h += `<div class="warn">🏗️ En construction : ouverture dans ${b.bt} h</div>`;
      if (b.closed && !b.bt) h += '<div class="warn">🚫 Fermé : personnel manquant (vendeur ou opérateur). Embauchez-en dans 👷 Personnel.</div>';
      if (!b.acc.length && d.cat === 'shop') h += '<div class="warn">⚠️ Aucune allée reliée à l’entrée ne touche ce bâtiment</div>';
      if (d.price) h += `<label>Prix de vente : <b id="rv">${fmt(b.price)}</b> <span class="muted">(conseillé ${fmt(d.price)})</span><input type="range" min="${d.price * .4}" max="${d.price * 2.5}" step="0.5" value="${b.price}" data-r="price"></label>` + row('Ventes aujourd’hui', b.sold) + row('Coût par vente', fmt(d.goods));
      if (d.upkeep) h += row('Entretien', fmt(d.upkeep) + '/jour');
      h += Z.html.bld(b);
      h += `<div class="btns"><button class="danger" data-a="demobld">🧨 Démolir (+${fmt(d.cost * .3)})</button></div>`;
      return { title: d.icon + ' ' + d.name, html: h };
    },
    vis(id) {
      const v = ent(id); if (!v) return null;
      const act = v.leaving ? 'Rentre à la maison' : v.st === 'busy' ? (v.act ? 'Observe les animaux' : 'Fait une pause') : v.goal ? { encl: 'Va voir des animaux', food: 'Va manger', drink: 'Va boire', toilet: 'Cherche les toilettes', bench: 'Va se reposer', gift: 'Va à la boutique' }[v.goal.k] : 'Se promène';
      let h = `<p class="muted">${v.kid ? 'Enfant' : 'Adulte'} · ${act}</p>` + Z.html.visitor(v) + (v.thought ? `<div class="quote">💭 ${esc(v.thought)}</div>` : '');
      h += `<div class="grid2"><div>Satisfaction${bar(v.happy)}</div><div>Faim${bar(v.hunger)}</div><div>Soif${bar(v.thirst)}</div><div>Toilettes${bar(v.bladder)}</div><div>Énergie${bar(v.energy)}</div></div>`;
      h += row('Argent de poche', fmt(v.money)) + row('Enclos visités', v.nseen);
      return { title: '🧑 ' + esc(v.name), html: h };
    },
    staffm(id) {
      const s = ent(id); if (!s) return null; const d = Z.STAFF[s.type];
      return { title: d.icon + ' ' + esc(s.name), html: `<p class="muted">${d.name}</p>` + row('Activité', esc(Z.staffLabel(s))) + Z.html.staffm(s) + `<div class="btns"><button class="danger" data-a="fire" data-id="${s.id}">Licencier</button></div>` };
    },
    staff() {
      const S = Z.S, nd = Z.staffNeeds(); let h = '<p class="muted">Les besoins dépendent du nombre d’animaux, d’enclos, de visiteurs, d’allées et de commerces. Ils sont recalculés en permanence.</p>';
      h += Z.html.staffTop();
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
      h += Z.html.stock();
      h += '<h3>Espèces à débloquer</h3>' + Object.keys(SP).filter(k => !Z.speciesUnlocked(k)).map(k => `<div class="row"><span>${SP[k].e} ${SP[k].n} <span class="muted">(${BIO[SP[k].b].name})</span></span><b>${Z.lockLabel(SP[k])}</b></div>`).join('');
      return { title: '🦁 Animaux', html: h };
    },
    visitors() {
      const S = Z.S, n = S.visitors.length, av = k => n ? S.visitors.reduce((s, v) => s + v[k], 0) / n : 0, r = Z.rep();
      let h = row('Réputation', `<span class="stars">${stars(r)}</span> ${r.toFixed(1).replace('.', ',')}`) + row('Dans le zoo', n) + row('Aujourd’hui', S.fin.vis) + row('Depuis l’ouverture', S.stats.visitors) + row('Affluence estimée', Math.round(Z.demand()) + ' /heure');
      if (n) h += `<h3>Moyennes</h3><div class="grid2"><div>Satisfaction${bar(av('happy'))}</div><div>Faim${bar(av('hunger'))}</div><div>Soif${bar(av('thirst'))}</div><div>Toilettes${bar(av('bladder'))}</div><div>Énergie${bar(av('energy'))}</div></div>`;
      h += Z.html.visitors();
      h += '<h3>Ce qu’ils disent</h3>' + (Z.thoughts.length ? Z.thoughts.map(t => `<div class="quote">💭 ${esc(t)}</div>`).join('') : '<p class="muted">Pas encore d’avis. Le zoo ouvre de 9 h à 19 h.</p>');
      return { title: '🧑‍🤝‍🧑 Visiteurs', html: h };
    },
    fin() {
      const S = Z.S, tab = ui.tab.fin; let h = tabs('fin', [['bilan', 'Bilan'], ['prev', 'Prévisions'], ['bank', 'Banque'], ['ads', 'Marketing'], ['sim', 'Simulation']]);
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
      } else if (tab === 'sim') {
        const sim = Z.simulate();
        h += '<p class="muted">Simulation d’une journée type (météo et réputation actuelles) selon le prix du billet. La capacité des guichets limite les entrées.</p>';
        h += '<div class="row total"><span>Prix</span><span>Visiteurs</span><span>Billets</span><b>Total estimé</b></div>' + sim.map(r => `<div class="row ${r.best ? 'simbest' : ''}"><span>${fmt(r.p)}${r.cur ? ' <span class="tag">actuel</span>' : ''}</span><span>${r.v}${r.lost ? ` <span class="bad">(−${r.lost})</span>` : ''}</span><span>${fmt(r.tickets)}</span><b>${fmt(r.total)}${r.best ? ' ★' : ''}</b></div>`).join('');
        const b = sim.find(r => r.best); h += `<p class="muted">★ Meilleur total estimé (billets + marge des boutiques). Entre parenthèses : visiteurs perdus faute de caissiers.</p><div class="btns"><button data-a="setprice" data-v="${b.p}">Appliquer ${fmt(b.p)}</button></div>`;
        h += '<h3>Effet d’une campagne de publicité</h3>' + Object.keys(Z.ADS).map(k => { const a = Z.ADS[k], cur = sim.find(r => r.cur), gain = cur.total * (a.f - 1) * a.d; return row(a.icon + ' ' + a.n + ' <span class="muted">(' + fmt(a.cost) + ')</span>', `<span class="${gain > a.cost ? 'good' : 'bad'}">${gain > a.cost ? '+' : '−'}${fmt(Math.abs(gain - a.cost))}</span>`); }).join('') + '<p class="muted">Gain net estimé sur la durée de la campagne.</p>';
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
    research() {
      const S = Z.S, R = S.research, rate = Z.researchRate(), cur = R.cur && Z.RESEARCH[R.cur];
      let h = `<div class="kpis"><div><small>Points par jour</small><b>${rate.toFixed(0)}</b></div><div><small>Chercheurs</small><b>${Z.staffCount('scientist')}</b></div></div>`;
      h += `<label>Budget de recherche : <b id="rv">${fmt(R.budget)}</b> <span class="muted">par jour (50 € = 1 point)</span><input type="range" min="0" max="3000" step="50" value="${R.budget}" data-r="rbudget"></label>`;
      h += `<div class="btns">${Z.staffUnlocked('scientist') ? '<button data-a="hire" data-k="scientist">🧑‍🔬 Embaucher un chercheur (180 €/jour)</button>' : '<span class="muted">🔒 Chercheurs disponibles au niveau 2</span>'}</div>`;
      h += cur ? `<div class="card cur"><div class="ctitle"><b>${cur.icon} ${cur.name}</b><b>${Math.floor(R.prog)} / ${cur.cost}</b></div>${bar(R.prog / cur.cost * 100, '#00838f')}<p class="muted">${rate > 0 ? 'Fin estimée dans ' + Math.ceil((cur.cost - R.prog) / rate) + ' jour(s)' : '⚠️ Aucun chercheur ni budget : le projet est à l’arrêt'}</p></div>` : '<div class="warn">Aucun projet en cours : choisissez-en un ci-dessous.</div>';
      for (const cat of ['Animaux', 'Attractions', 'Gestion']) {
        h += `<h3>${cat}</h3>` + Object.keys(Z.RESEARCH).filter(k => Z.RESEARCH[k].cat === cat).map(k => {
          const p = Z.RESEARCH[k], st = Z.researchState(k), u = Z.researchUnlocks(k);
          const right = st === 'done' ? '✅' : st === 'cur' ? '⏳' : st === 'lvl' ? '🔒 Niv. ' + p.lvl : st === 'req' ? '🔒 ' + Z.RESEARCH[p.req].name : p.cost + ' pts';
          return `<div class="card ${st === 'done' ? 'done' : st === 'cur' ? 'cur' : st === 'ok' ? '' : 'locked'}"><div class="ctitle"><b>${p.icon} ${p.name}</b><b>${right}</b></div><p class="muted">${u.length ? u.join(' · ') : p.desc}</p>${st === 'ok' ? `<div class="btns"><button data-a="rstart" data-k="${k}">${cur ? 'Remplacer le projet en cours' : 'Lancer la recherche'}</button></div>` : ''}</div>`;
        }).join('');
      }
      return { title: '🔬 Recherche', html: h };
    },
    world() {
      const S = Z.S; let h = '<p class="muted">Chaque région a son climat, son relief, son public et ses habitats naturels, moins chers à construire. Chaque carte garde sa propre sauvegarde : vous pouvez y revenir à tout moment. Les régions s’ouvrent quand l’un de vos zoos atteint le niveau requis.</p>' + row('Meilleur niveau atteint', '⭐ ' + Z.bestLevel()) + '<div class="btns"><button data-a="sandbox">🏖️ Bac à sable</button><button data-a="importz">📥 Importer un zoo</button></div>';
      h += Z.WORLD.map(m => {
        const info = Z.slotInfo(m.id), ok = Z.mapUnlocked(m), here = Z.slot === m.id, w = m.weather;
        const mods = Object.keys(m.bm).filter(k => BIO[k] && m.bm[k] !== 1).map(k => `<span class="${m.bm[k] < 1 ? 'good' : 'bad'}">${BIO[k].icon} ${m.bm[k] < 1 ? '−' : '+'}${Math.round(Math.abs(1 - m.bm[k]) * 100)} %</span>`).join(' ');
        return `<div class="card ${ok ? (here ? 'cur' : '') : 'locked'}"><div class="ctitle"><b>${m.icon} ${m.name}, ${m.country}</b><b>${ok ? (here ? 'En cours' : '') : '🔒 Niv. ' + m.req}</b></div><p class="muted">${m.desc}</p>
          <p class="muted">☀️ ${Math.round(w[0] * 100)} % · ${m.snow ? '🌨️' : '🌧️'} ${Math.round(w[2] * 100)} % · Affluence ×${String(m.demand).replace('.', ',')} · Budget des visiteurs ×${String(m.wealth).replace('.', ',')} · Capital ${fmt(m.money)}</p><p>${mods}</p>
          ${info ? `<p>💾 Jour ${info.day} · niveau ${info.level} · ${info.animals} animaux · ${fmt(info.money)}</p>` : ''}
          ${ok ? `<div class="btns">${here ? '' : `<button data-a="map" data-id="${m.id}">${info ? '▶ Continuer' : '▶ Jouer cette carte'}</button>`}${info ? `<button class="danger" data-a="map" data-id="${m.id}" data-fresh="1">Recommencer à zéro</button>` : ''}</div>` : ''}</div>`;
      }).join('');
      return { title: '🌍 Cartes du monde', html: h };
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
        h += `<div class="card"><div class="ctitle"><b>🌍 Mode libre</b></div><p class="muted">Sans limite de temps, sur la carte du monde de votre choix. Bonus de capital gagné en campagne : ${fmt(Z.campaignBonus())}.</p><div class="btns"><button data-a="tool" data-id="p:world">🌍 Choisir une carte</button></div></div>`;
      }
      return { title: '🎯 Missions & campagne', html: h };
    },
    menu() {
      return { title: '⚙️ Menu', html: `<div class="btns col"><button data-a="save">💾 Sauvegarder</button><button data-a="camp">🏆 Campagne et mode libre</button><button data-a="help">❓ Comment jouer</button><button class="danger" data-a="reset">🗑️ Nouvelle partie libre</button></div><p class="muted">La partie est sauvegardée automatiquement chaque jour dans ce navigateur.</p>` + Z.html.menu() };
    },
  };

  // ---------- Actions ----------
  Z.refreshPanel = () => renderPanel(true);
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
    rot: d => Z.rotate(+d.v),
    map: d => { const m = Z.WORLD.find(x => x.id === d.id); if (d.fresh) modal('Recommencer ' + m.name + ' ?', '<p>La sauvegarde de cette carte sera effacée.</p>', [['Annuler'], ['Recommencer', () => Z.playMap(d.id, true), 'danger']]); else Z.playMap(d.id, false); },
    rstart: d => Z.startResearch(d.k), setprice: d => { Z.S.ticket = +d.v; },
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
  Object.assign(ACT, Z.extraActs || {}); Z.ACT = ACT; Z.PANELS = PANELS;
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]'); if (!el) return;
    const f = ACT[el.dataset.a]; if (f) { f(el.dataset); renderPanel(true); updateTop(); }
  });
  document.addEventListener('input', ev => {
    const r = ev.target.dataset.r; if (!r) return; const v = +ev.target.value;
    if (Z.extraRange[r]) { const o = $('#rv'); if (o) o.textContent = Z.extraRange[r](v); return; }
    if (r === 'ticket') Z.S.ticket = v; else if (r === 'rbudget') Z.S.research.budget = v; else { const b = ent(ui.parg); if (b) b.price = v; }
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
  Z.onNotify = (t, k, p) => { toast(t, k, p); Z.soundFor(t, k); };
  let modalBtns = [];
  function modal(title, html, btns) {
    modalBtns = btns.map(b => b[1]);
    $('#modal').innerHTML = `<div class="mbox"><h2>${title}</h2>${html}<div class="btns">${btns.map((b, i) => `<button class="${b[2] || ''}" data-a="modalbtn" data-i="${i}">${b[0]}</button>`).join('')}</div></div>`;
    $('#modal').style.display = 'flex';
  }
  Z.modal = modal;
  Z.onRestart = () => { closePanel(); ui.tool = 'select'; plan.length = 0; renderPlan(); Z.focus(Z.EX, H - 8); renderTools(); updateTop(); const sc = Z.scenario(); if (sc) modal(sc.icon + ' ' + sc.name, `<p>${sc.desc}</p><p><b>Objectifs à atteindre en ${sc.days} jours :</b><br>${sc.goals.map(g => '• ' + g.t).join('<br>')}</p>`, [['C’est parti !', () => openPanel('goals', null, 'obj')]]); };
  function showHelp() {
    modal('🦁 Bienvenue dans Zoo Project', `<p>Vous dirigez un zoo. Faites-en un lieu où les animaux vivent bien et où les visiteurs se pressent.</p><ol>
      <li><b>🚧 Enclos</b> — choisissez un habitat et dessinez un enclos. Chaque espèce exige son habitat, assez d’espace et un groupe minimum.</li>
      <li><b>🛣️ Allées</b> — reliez l’enclos à l’entrée : visiteurs et personnel ne marchent que sur les allées.</li>
      <li><b>🖐️ Explorer</b> — touchez l’enclos pour y acheter des animaux.</li>
      <li><b>👷 Personnel</b> — soigneurs, agents de maintenance et vétérinaires travaillent sur le terrain ; caissiers, vendeurs, animateurs et agents de sécurité tiennent leur poste. Le panneau indique combien il en faut selon la taille du zoo.</li>
      <li><b>🏪 Services</b> — restauration, toilettes, bancs, poubelles et boutique gardent les visiteurs satisfaits.</li>
      <li><b>💶 Finances</b> — réglez le prix du billet. La réputation (★) attire le public et débloque de nouvelles espèces.</li>
      <li><b>🔬 Recherche</b> — financez des projets et embauchez des chercheurs pour débloquer de nouvelles espèces, des habitats (désert, préhistoire), des attractions (petit train, grande roue, aquarium, montagnes russes…) et des améliorations de gestion.</li>
      <li><b>📈 Progression</b> — votre zoo gagne de l’expérience et monte de niveau (15 niveaux) : nouveaux habitats, espèces, bâtiments, employés et terrains. Les chantiers durent quelques heures, les animaux commandés arrivent en 8 heures, et le bouton 🌙 permet de passer la nuit.</li>
      <li><b>↔️ Déplacer</b> — glissez un enclos ou un bâtiment pour le déplacer ; agrandissez un enclos depuis sa fiche.</li>
      <li><b>🎯 Missions</b> — acceptez des missions, suivez vos objectifs et lancez la campagne de 5 scénarios. <b>📊 Stats</b> et <b>👁️ Vues</b> vous aident à piloter.</li></ol>
      <p class="muted">Construction : vos tracés s’ajoutent à un plan ; rien n’est payé tant que vous n’avez pas touché ✅ Valider. Appui long puis glisser : déplacer la carte pendant une construction, ou saisir un bâtiment en mode Explorer. Molette ou deux doigts : zoom. Le zoo ouvre de 9 h à 19 h ; un an pour les animaux = 10 jours.</p>`, [['C’est parti !']]);
  }

  // ---------- Barre du haut ----------
  const WX = { sun: '☀️', cloud: '⛅', rain: '🌧️' };
  function updateTop() {
    const S = Z.S, h = Math.floor(S.minute / 60), m = Math.floor(S.minute % 60), r = Z.rep();
    $('#money').textContent = fmt(S.money); $('#money').className = S.money < 0 ? 'bad' : '';
    const xi = Z.xpInfo(); $('#lvl').innerHTML = `⭐ Niv. <b>${S.level}</b><span class="xpbar"><i style="width:${xi.pct}%"></i></span>`;
    $('#vis').textContent = S.visitors.length; $('#rep').innerHTML = `<span class="stars">${stars(r)}</span> ${r.toFixed(1).replace('.', ',')}`;
    $('#clock').textContent = `${Z.html.event()}${Z.html.season()} · ${WX[S.weather]} Jour ${S.day} · ${String(h).padStart(2, '0')}:${String(m - m % 10).padStart(2, '0')}`;
    $('#open').textContent = Z.isOpen() ? 'Ouvert' : 'Fermé'; $('#open').className = 'tag ' + (Z.isOpen() ? 'ok' : 'bad');
    const sk = $('#skip'); if (sk) sk.style.display = Z.canSkip() ? '' : 'none';
    document.querySelectorAll('#speed button[data-v]').forEach(b => b.classList.toggle('on', +b.dataset.v === S.speed));
    const g = Z.GOALS[S.goal], sc = Z.scenario(); $('#goal').textContent = sc ? `${sc.icon} ${sc.name} — jour ${S.day}/${sc.days} · ${sc.goals.filter(x => x.c(S)).length}/${sc.goals.length} objectifs` : g ? '🎯 ' + g.t : '🏆 Tous les objectifs sont atteints !';
  }

  // ---------- Carte : souris et tactile ----------
  const pts = new Map(); let drag = null, pinch = null;
  const plan = Z.plan = [];
  const isBld = () => ui.tool === 'shop' || ui.tool === 'decor' || ui.tool === 'ride';
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const buzz = () => { try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) { } };
  // Un emplacement est libre s'il l'est sur la carte ET dans le plan en attente de validation
  function planFree(x, y, w, h, type) {
    const r = { x, y, w, h };
    if (type && BL[type].onPath) {
      if (!Z.inb(x, y) || !Z.owned(x, y) || (x === Z.EX && y >= H - 2)) return false; const t = Z.idx(x, y);
      const onPath = (Z.S.ground[t] === 1 && !Z.occ[t]) || plan.some(p => p.k === 'path' && p.x === x && p.y === y);
      return onPath && !plan.some(p => p.k === 'bld' && overlap(p, r));
    }
    return Z.freeRect(x, y, w, h) && !plan.some(p => overlap(p, r));
  }
  const planCost = () => plan.reduce((s, p) => s + p.cost, 0);
  function renderPlan() {
    const el = $('#planbar'); if (!plan.length) { el.style.display = 'none'; return; }
    const c = planCost(), ok = Z.S.money >= c;
    el.innerHTML = `<span>📐 <b>${plan.length}</b> élément${plan.length > 1 ? 's' : ''} · <b class="${ok ? '' : 'bad'}">${fmt(c)}</b></span><button class="ok" data-a="planok">✅ Valider</button><button data-a="planundo" title="Retirer le dernier">↩️</button><button data-a="plancancel">✖ Annuler</button>`;
    el.style.display = 'flex';
  }
  function planAdd(it) { plan.push(it); renderPlan(); }
  const pathFree = (x, y) => Z.pathOk(x, y) && !plan.some(p => p.x <= x && x < p.x + p.w && p.y <= y && y < p.y + p.h);
  function planPath(x, y) { if (pathFree(x, y)) planAdd({ k: 'path', x, y, w: 1, h: 1, cost: Z.pathCost(x, y) }); }
  function planCommit() {
    const c = planCost(); if (Z.S.money < c) return Z.notify('Fonds insuffisants pour ce plan (' + fmt(c) + ')', 'bad');
    let last = null;
    for (const p of plan.splice(0)) { if (p.k === 'path') Z.buildPath(p.x, p.y); else if (p.k === 'encl') last = Z.buildEncl(p.x, p.y, p.w, p.h, p.biome) || last; else Z.place(p.type, p.x, p.y); }
    Z.audio.play('build'); renderPlan(); if (last) { setTool('select'); openPanel('encl', last.id); }
  }
  Object.assign(ACT, { planok: planCommit, planundo: () => { plan.pop(); renderPlan(); }, plancancel: () => { plan.length = 0; renderPlan(); } });
  function ghostFor(tx, ty) {
    if (isBld()) { if (!ui.arg) return null; const s = BL[ui.arg].size; return { x: tx, y: ty, w: s, h: s, type: ui.arg, ok: planFree(tx, ty, s, s, ui.arg) }; }
    if (ui.tool === 'path') return { x: tx, y: ty, w: 1, h: 1, ok: pathFree(tx, ty) };
    if (ui.tool === 'terra') return { x: tx, y: ty, w: 1, h: 1, ok: Z.terraOk(ui.arg, tx, ty) };
    if (ui.tool === 'demo') return { x: tx, y: ty, w: 1, h: 1, ok: false };
    return null;
  }
  function enclRect(a, b) { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y), w = Math.abs(a.x - b.x) + 1, h = Math.abs(a.y - b.y) + 1; return { x, y, w, h, ok: w >= 2 && h >= 2 && w * h >= 6 && planFree(x, y, w, h) }; }
  function moveGhost(d, t) { const o = d.mo, [w, h] = Z.sizeOf(o), x = o.x + t.x - d.start.x, y = o.y + t.y - d.start.y; return { x, y, w, h, type: o.kind === 'bld' ? o.type : null, ok: Z.canMove(o, x, y) }; }
  function pathTo(d, t) { let x = d.last.x, y = d.last.y, n = 0; while ((x !== t.x || y !== t.y) && n++ < 200) { if (x !== t.x && Math.abs(t.x - x) >= Math.abs(t.y - y)) x += Math.sign(t.x - x); else y += Math.sign(t.y - y); planPath(x, y); } d.last = t; }
  function drawMini() {
    const m = $('#mini'); if (!m || !m.clientWidth) return;
    const c = m.getContext('2d'), gs = Z.groundSize, s = m.width / gs.w; c.clearRect(0, 0, m.width, m.height); c.drawImage(Z.groundCanvas, 0, 0, m.width, m.height);
    const gp = (x, y) => { const p = Z.groundPos(x, y); return [p.x * s, p.y * s]; };
    for (const p of Z.PARCELS) if (!Z.S.land[p.id]) { c.fillStyle = 'rgba(10,20,5,.5)'; c.beginPath(); c.moveTo(...gp(p.x, p.y)); c.lineTo(...gp(p.x + p.w, p.y)); c.lineTo(...gp(p.x + p.w, p.y + p.h)); c.lineTo(...gp(p.x, p.y + p.h)); c.fill(); }
    c.fillStyle = '#fff'; for (const v of Z.S.visitors) { const q = gp(v.x, v.y); c.fillRect(q[0] - 1, q[1] - 1, 2, 2); }
    const r = Z.viewRect(); c.strokeStyle = '#fff'; c.lineWidth = 2; c.strokeRect(r.x * s, r.y * s, r.w * s, r.h * s);
  }
  function clickSelect(sx, sy) {
    const f = Z.toTileF(sx, sy), S = Z.S; let best = null, bd = .9;
    for (const a of S.staff.filter(s => !Z.STAFF[s.type].desk).concat(S.visitors)) { const d = Math.hypot(a.x + a.ox - f.x - .3, a.y + a.oy - f.y - .3); if (d < bd) { bd = d; best = a; } }
    if (best) return openPanel(best.kind === 'staff' ? 'staffm' : 'vis', best.id);
    const an = Z.pickAnimal(f); if (an) return openPanel('animal', an);
    const at = (x, y) => (Z.inb(Math.floor(x), Math.floor(y)) ? Z.occ[Z.idx(Math.floor(x), Math.floor(y))] : null);
    let o = at(f.x, f.y);
    if (!o || o.kind !== 'bld') for (const k of [.5, 1]) { const b = at(f.x + k, f.y + k); if (b && b.kind === 'bld' && !BL[b.type].onPath) { o = b; break; } }
    const tx = Math.floor(f.x), ty = Math.floor(f.y);
    if (o) openPanel(o.kind === 'encl' ? 'encl' : 'bld', o.id); else if (Z.inb(tx, ty) && !Z.owned(tx, ty)) openPanel('land', Z.parcelAt(tx, ty).id); else if (ui.sel) closePanel();
  }
  function down(ev) {
    cvEl.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; if (drag) clearTimeout(drag.timer); drag = null; ui.ghost = null; return; }
    const t = Z.toTile(ev.clientX, ev.clientY), o = Z.inb(t.x, t.y) ? Z.occ[Z.idx(t.x, t.y)] : null;
    const d = drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, lx: ev.clientX, ly: ev.clientY, start: t, last: t, moved: false, mode: 'pan', mo: null };
    if (ev.button === 1 || ev.button === 2) return;
    if (ui.tool === 'select') {
      // appui long sur un objet : on le saisit pour le déplacer
      if (o) d.timer = setTimeout(() => { if (drag === d && !d.moved) { d.mode = 'obj'; d.mo = o; ui.ghost = moveGhost(d, d.start); buzz(); setHint('Glissez pour déplacer — coût : ' + fmt(Z.moveCost(o))); } }, 400);
    } else if (ui.tool === 'move') { if (o) { d.mode = 'obj'; d.mo = o; ui.ghost = moveGhost(d, t); } }
    else {
      // outil de construction : appui long = déplacer la carte au lieu de construire
      d.mode = 'build'; ui.ghost = ui.tool === 'encl' ? enclRect(t, t) : ghostFor(t.x, t.y);
      d.timer = setTimeout(() => { if (drag === d && !d.moved) { d.mode = 'pan'; ui.ghost = null; buzz(); setHint('🖐️ Déplacement de la carte'); } }, 400);
    }
  }
  function move(ev) {
    const p = pts.get(ev.pointerId); if (p) { p.x = ev.clientX; p.y = ev.clientY; }
    if (pinch && pts.size === 2) {
      const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(mx, my, d / pinch.d); Z.cam.x -= (mx - pinch.mx) / Z.cam.z; Z.cam.y -= (my - pinch.my) / Z.cam.z; Z.clampCam();
      pinch = { d, mx, my }; return;
    }
    const t = Z.toTile(ev.clientX, ev.clientY), d = drag;
    if (!d || d.id !== ev.pointerId) { if (ev.pointerType === 'mouse' && ui.tool !== 'select' && ui.tool !== 'encl' && ui.tool !== 'move') ui.ghost = ghostFor(t.x, t.y); return; }
    if (!d.moved && Math.hypot(ev.clientX - d.sx, ev.clientY - d.sy) > 6) { d.moved = true; if (d.mode === 'build' && ui.tool === 'path') planPath(d.start.x, d.start.y); if (d.mode === 'build' && ui.tool === 'terra') Z.terra(ui.arg, d.start.x, d.start.y); }
    if (d.mode === 'pan') { Z.cam.x -= (ev.clientX - d.lx) / Z.cam.z; Z.cam.y -= (ev.clientY - d.ly) / Z.cam.z; Z.clampCam(); }
    else if (d.mode === 'obj') ui.ghost = moveGhost(d, t);
    else if (d.moved) {
      if (ui.tool === 'path') { pathTo(d, t); ui.ghost = null; }
      else if (ui.tool === 'terra') { if (t.x !== d.last.x || t.y !== d.last.y) { Z.terra(ui.arg, t.x, t.y); d.last = t; } ui.ghost = ghostFor(t.x, t.y); }
      else if (ui.tool === 'encl') { ui.ghost = enclRect(d.start, t); setHint(`${ui.ghost.w}×${ui.ghost.h} = ${ui.ghost.w * ui.ghost.h} cases — ${fmt(Z.enclCost(ui.ghost.w, ui.ghost.h, ui.arg))}`); }
      else ui.ghost = ghostFor(t.x, t.y);
    }
    d.lx = ev.clientX; d.ly = ev.clientY;
  }
  function up(ev) {
    pts.delete(ev.pointerId); if (pts.size < 2) pinch = null;
    if (!drag || drag.id !== ev.pointerId) return; const d = drag; drag = null; clearTimeout(d.timer);
    const t = Z.toTile(ev.clientX, ev.clientY), touch = ev.pointerType !== 'mouse';
    if (d.mode === 'pan') { if (!d.moved && ev.button === 0 && ui.tool === 'select') clickSelect(ev.clientX, ev.clientY); else if (ui.tool !== 'select') renderTools(); }
    else if (d.mode === 'obj') { const gh = ui.ghost; ui.ghost = null; if (gh && d.moved) Z.moveObj(d.mo, gh.x, gh.y); else if (ui.tool === 'select') clickSelect(ev.clientX, ev.clientY); renderTools(); }
    else if (ui.tool === 'path') { if (!d.moved) planPath(t.x, t.y); if (touch) ui.ghost = null; }
    else if (ui.tool === 'terra') { if (!d.moved) Z.terra(ui.arg, t.x, t.y); if (touch) ui.ghost = null; }
    else if (ui.tool === 'encl') {
      const r = ui.ghost; ui.ghost = null;
      if (r && r.ok) planAdd({ k: 'encl', x: r.x, y: r.y, w: r.w, h: r.h, biome: ui.arg, cost: Z.enclCost(r.w, r.h, ui.arg) });
      else if (r && d.moved) Z.notify(r.w * r.h < 6 || r.w < 2 || r.h < 2 ? 'Enclos trop petit (6 cases minimum)' : 'Emplacement occupé ou hors de votre terrain', 'bad');
      renderTools();
    } else if (isBld()) {
      if (ui.arg) { const s = BL[ui.arg].size; if (planFree(t.x, t.y, s, s, ui.arg)) planAdd({ k: 'bld', type: ui.arg, x: t.x, y: t.y, w: s, h: s, cost: BL[ui.arg].cost }); else Z.notify(BL[ui.arg].onPath ? 'À poser sur une allée libre' : 'Emplacement occupé ou hors de votre terrain', 'bad'); }
      if (touch) ui.ghost = null;
    } else if (ui.tool === 'demo') { Z.demolish(t.x, t.y); if (ui.sel && !ent(ui.parg)) closePanel(); ui.ghost = null; }
    updateTop();
  }
  function zoomAt(sx, sy, f) { const c = Z.cam, w = Z.toWorld(sx, sy); c.z = Z.clamp(c.z * f, .3, 2.6); const w2 = Z.toWorld(sx, sy); c.x += w.x - w2.x; c.y += w.y - w2.y; Z.clampCam(); }
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
    const mini = $('#mini'), mgo = ev => { const r = mini.getBoundingClientRect(); Z.camToGround((ev.clientX - r.left) / r.width * Z.groundSize.w, (ev.clientY - r.top) / r.height * Z.groundSize.h); };
    mini.addEventListener('pointerdown', ev => { mini.setPointerCapture(ev.pointerId); mgo(ev); }); mini.addEventListener('pointermove', ev => { if (ev.buttons) mgo(ev); });
    const keys = {};
    window.addEventListener('keydown', ev => {
      if (ev.target.tagName === 'INPUT') return; keys[ev.key.toLowerCase()] = true;
      if (ev.key === 'Escape') { if (plan.length) { plan.length = 0; renderPlan(); } else if (ui.tool !== 'select') setTool('select'); else closePanel(); }
      if (ev.key.toLowerCase() === 'r') Z.rotate(1);
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
      Z.tick(dt); Z.draw(); Z.audio.tick(dt);
      acc += dt; if (acc > .4) { acc = 0; updateTop(); renderPanel(false); drawMini(); }
      requestAnimationFrame(frame);
    })(last);
  };
  window.addEventListener('DOMContentLoaded', Z.start);
})();
