// Zoo Project — interface
(function () {
  const { W, H, TILE: T } = Z;
  const SP = Z.SPECIES, BL = Z.BUILDINGS, BIO = Z.BIOMES, fmt = Z.fmt;
  const $ = s => document.querySelector(s);
  const ui = Z.ui = { tool: 'select', arg: null, panel: null, parg: null, sel: null, ghost: null };
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const bar = (v, col) => `<div class="bar"><i style="width:${Z.clamp(v, 0, 100)}%;background:${col || (v > 60 ? '#3fae5a' : v > 30 ? '#e0a020' : '#d9534f')}"></i></div>`;
  const stars = r => { let s = ''; for (let i = 1; i <= 5; i++) s += r >= i - .5 ? '★' : '☆'; return s; };
  const ent = id => Z.S.enclosures.find(e => e.id === id) || Z.S.buildings.find(e => e.id === id) || Z.S.staff.find(e => e.id === id) || Z.S.visitors.find(e => e.id === id);

  // ---------- Barre d'outils ----------
  const TOOLS = [
    ['select', '🖐️', 'Explorer'], ['path', '🛣️', 'Allées'], ['encl', '🚧', 'Enclos'], ['shop', '🏪', 'Services'], ['decor', '🌳', 'Décor'], ['demo', '🧨', 'Démolir'],
    ['|'], ['p:staff', '👷', 'Personnel'], ['p:animals', '🦁', 'Animaux'], ['p:visitors', '🧑‍🤝‍🧑', 'Visiteurs'], ['p:fin', '💶', 'Finances'], ['p:goals', '🎯', 'Objectifs'], ['p:menu', '⚙️', 'Menu'],
  ];
  function renderTools() {
    $('#tools').innerHTML = TOOLS.map(t => t[0] === '|' ? '<span class="sep"></span>' :
      `<button class="tool ${ui.tool === t[0] || (ui.panel && 'p:' + ui.panel === t[0]) ? 'on' : ''}" data-a="tool" data-id="${t[0]}"><b>${t[1]}</b><span>${t[2]}</span></button>`).join('');
    let sub = '';
    if (ui.tool === 'encl') sub = Object.keys(BIO).map(k => `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}">${BIO[k].icon} ${BIO[k].name}<small>${BIO[k].cost} €/case</small></button>`).join('');
    if (ui.tool === 'shop' || ui.tool === 'decor') sub = Object.keys(BL).filter(k => BL[k].cat === ui.tool).map(k => `<button class="chip ${ui.arg === k ? 'on' : ''}" data-a="arg" data-id="${k}" title="${esc(BL[k].desc)}">${BL[k].icon} ${BL[k].name}<small>${fmt(BL[k].cost)}</small></button>`).join('');
    $('#sub').innerHTML = sub; $('#sub').style.display = sub ? 'flex' : 'none';
    const hints = {
      select: '', path: 'Glissez pour tracer une allée (12 €/case). Les visiteurs et le personnel ne marchent que sur les allées.',
      encl: 'Choisissez un habitat puis glissez pour dessiner l’enclos. Une allée doit le longer.',
      shop: BL[ui.arg] ? BL[ui.arg].desc + ' À placer le long d’une allée.' : '', decor: BL[ui.arg] ? BL[ui.arg].desc : '',
      demo: 'Touchez une allée, un bâtiment ou un enclos vide pour le démolir (30 % remboursés).',
    };
    setHint(hints[ui.tool] || '');
  }
  function setHint(t) { const h = $('#hint'); h.textContent = t; h.style.display = t ? 'block' : 'none'; }
  function setTool(id) {
    if (id.startsWith('p:')) { const p = id.slice(2); if (ui.panel === p) closePanel(); else openPanel(p); return; }
    ui.tool = id; ui.ghost = null;
    ui.arg = id === 'encl' ? 'savane' : id === 'shop' ? 'food' : id === 'decor' ? 'tree' : null;
    renderTools();
  }

  // ---------- Panneaux ----------
  function openPanel(name, arg) { ui.panel = name; ui.parg = arg; ui.sel = arg != null ? ent(arg) : null; renderPanel(true); renderTools(); }
  function closePanel() { ui.panel = null; ui.sel = null; $('#panel').style.display = 'none'; renderTools(); }
  Z.openPanel = openPanel;
  let panelBusy = false;
  function renderPanel(force) {
    if (!ui.panel || (panelBusy && !force)) return;
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
      const iss = Z.enclIssues(e); if (iss.length) h += `<div class="warn">${iss.map(i => '⚠️ ' + esc(i)).join('<br>')}</div>`;
      h += `<div class="grid3"><div>Nourriture${bar(e.food)}</div><div>Propreté${bar(e.clean)}</div><div>Clôture${bar(e.fence)}</div></div>`;
      h += '<h3>Aménagements</h3><div class="btns">' + Object.keys(Z.UPGRADES).map(k => { const u = Z.UPGRADES[k]; return e.up[k] ? `<span class="tag ok">${u.icon} ${u.name} ✓</span>` : `<button data-a="upg" data-k="${k}" title="${u.desc}">${u.icon} ${u.name} — ${fmt(u.cost(e))}<small>${u.desc}</small></button>`; }).join('') + '</div>';
      if (n) {
        const sp = SP[e.animals[0].sp];
        h += `<h3>${sp.e} ${n} ${n > 1 ? sp.pl : sp.n.toLowerCase()} <small>(${n * sp.space}/${area} cases utilisées · attrait ${Math.round(Z.enclAppeal(e))})</small></h3>`;
        h += e.animals.map(a => `<div class="card"><div class="ctitle"><b>${sp.e} ${esc(a.name)}</b> <span class="muted">${a.sex === 'M' ? '♂' : '♀'} · ${a.age < 1 ? 'bébé' : Math.floor(a.age) + ' ans'}${a.preg ? ' · 🤰 gestation' : ''}</span>${a.sick ? '<span class="tag bad">malade</span>' : ''}</div>
          <div class="grid3"><div>Santé${bar(a.health)}</div><div>Bonheur${bar(a.happy)}</div><div>Satiété${bar(a.hunger)}</div></div>
          <div class="btns">${a.sick ? `<button data-a="evet" data-id="${a.id}">🚑 Soin d’urgence — 500 €</button>` : ''}<button data-a="sell" data-id="${a.id}">Vendre (+${fmt(Z.animalValue(a))})</button></div></div>`).join('');
      }
      h += '<h3>Acheter un animal</h3>';
      const list = Object.keys(SP).filter(k => SP[k].b === e.biome && (!n || e.animals[0].sp === k));
      h += list.map(k => {
        const s = SP[k], ok = Z.speciesUnlocked(k);
        return `<div class="card ${ok ? '' : 'locked'}"><div class="ctitle"><b>${s.e} ${s.n}</b><b>${fmt(s.price)}</b></div>
          <p class="muted">Espace : ${s.space} cases/animal · Groupe : ${s.grp} min. · Nourriture : ${s.food} €/j · Attrait : ${s.app}</p>
          ${ok ? `<div class="btns"><button data-a="buy" data-k="${k}" data-s="M">Acheter un mâle ♂</button><button data-a="buy" data-k="${k}" data-s="F">Acheter une femelle ♀</button></div>` : `<p>🔒 Réputation ${String(s.rep).replace('.', ',')} ★ requise</p>`}</div>`;
      }).join('');
      if (!n) h += `<div class="btns"><button class="danger" data-a="demoencl">🧨 Démolir l’enclos</button></div>`;
      return { title: esc(e.name), html: h };
    },
    bld(id) {
      const b = ent(id); if (!b) return null; const d = BL[b.type];
      let h = `<p class="muted">${esc(d.desc)}</p>`;
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
      const S = Z.S; let h = '';
      for (const k in Z.STAFF) {
        const d = Z.STAFF[k], list = S.staff.filter(s => s.type === k);
        h += `<div class="card"><div class="ctitle"><b>${d.icon} ${d.name} × ${list.length}</b><button data-a="hire" data-k="${k}">Embaucher</button></div><p class="muted">${d.desc} Salaire : ${fmt(d.salary)}/jour (+200 € de recrutement).</p>`;
        h += list.map(s => `<div class="row"><span><b>${esc(s.name)}</b> — ${esc(Z.staffLabel(s))}</span><span><button class="mini" data-a="goto" data-id="${s.id}">👁️</button><button class="mini danger" data-a="fire" data-id="${s.id}">✕</button></span></div>`).join('') + '</div>';
      }
      const tot = S.staff.reduce((n, s) => n + Z.STAFF[s.type].salary, 0);
      return { title: '👷 Personnel', html: h + row('Masse salariale', fmt(tot) + '/jour') };
    },
    animals() {
      const S = Z.S; let h = row('Animaux', Z.animalCount()) + row('Espèces', Z.speciesCount()) + row('Naissances', S.stats.births);
      if (!S.enclosures.length) h += '<p class="muted">Aucun enclos. Utilisez l’outil 🚧 Enclos pour en construire un.</p>';
      h += S.enclosures.map(e => {
        const n = e.animals.length, sp = n ? SP[e.animals[0].sp] : null, iss = Z.enclIssues(e);
        return `<div class="card click" data-a="goto" data-id="${e.id}"><div class="ctitle"><b>${sp ? sp.e : BIO[e.biome].icon} ${esc(e.name)}</b><span class="muted">${n ? n + ' ' + (n > 1 ? sp.pl : sp.n.toLowerCase()) : 'vide'}</span></div>
          ${n ? `<div class="grid3"><div>Bonheur${bar(Z.avg(e, 'happy'))}</div><div>Santé${bar(Z.avg(e, 'health'))}</div><div>Nourriture${bar(e.food)}</div></div>` : ''}${iss.length ? `<p class="bad">⚠️ ${esc(iss[0])}</p>` : ''}</div>`;
      }).join('');
      h += '<h3>Espèces à débloquer</h3>' + Object.keys(SP).filter(k => !Z.speciesUnlocked(k)).map(k => `<div class="row"><span>${SP[k].e} ${SP[k].n} <span class="muted">(${BIO[SP[k].b].name})</span></span><b>${String(SP[k].rep).replace('.', ',')} ★</b></div>`).join('');
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
      const S = Z.S, fair = Z.fairPrice();
      let h = `<label>Prix du billet : <b id="rv">${fmt(S.ticket)}</b> <span class="muted">(prix juste ≈ ${fmt(fair)})</span><input type="range" min="0" max="80" step="1" value="${S.ticket}" data-r="ticket"></label>`;
      const table = (cats, title) => {
        let inc = 0, exp = 0, r = ''; for (const k in Z.FIN) { const v = cats[k]; if (!v) continue; if (v > 0) inc += v; else exp -= v; r += `<div class="row"><span>${Z.FIN[k]}</span><b class="${v > 0 ? 'good' : 'bad'}">${v > 0 ? '+' : '−'}${fmt(Math.abs(v))}</b></div>`; }
        return `<h3>${title}</h3>${r || '<p class="muted">Aucun mouvement</p>'}<div class="row total"><span>Résultat</span><b class="${inc - exp >= 0 ? 'good' : 'bad'}">${inc - exp >= 0 ? '+' : '−'}${fmt(Math.abs(inc - exp))}</b></div>`;
      };
      h += table(S.fin.today, 'Aujourd’hui (jour ' + S.day + ')');
      const hist = S.fin.history; if (hist.length) {
        h += table(hist[hist.length - 1].cats, 'Hier');
        const last = hist.slice(-14), mx = Math.max(1, ...last.map(d => Math.max(d.inc, d.exp)));
        h += '<h3>14 derniers jours <small>(<span class="good">recettes</span> / <span class="bad">dépenses</span>)</small></h3><div class="chart">' + last.map(d => `<div title="Jour ${d.d} : +${fmt(d.inc)} / −${fmt(d.exp)} · ${d.vis} visiteurs"><i style="height:${d.inc / mx * 100}%;background:#3fae5a"></i><i style="height:${d.exp / mx * 100}%;background:#d9534f"></i></div>`).join('') + '</div>';
      }
      h += `<h3>Emprunt</h3>` + row('Dette', fmt(S.loan)) + `<p class="muted">Intérêts : 0,4 % par jour. Plafond : 50 000 €.</p><div class="btns"><button data-a="loan" data-v="10000">Emprunter 10 000 €</button><button data-a="loan" data-v="-10000">Rembourser 10 000 €</button></div>`;
      return { title: '💶 Finances', html: h };
    },
    goals() {
      const S = Z.S;
      const h = Z.GOALS.map((g, i) => `<div class="card ${i < S.goal ? 'done' : i > S.goal ? 'locked' : 'cur'}"><div class="ctitle"><span>${i < S.goal ? '✅' : i === S.goal ? '🎯' : '🔒'} ${esc(g.t)}</span><b>+${fmt(g.r)}</b></div></div>`).join('');
      return { title: '🎯 Objectifs', html: h + '<h3>Journal</h3>' + S.log.slice(0, 15).map(l => `<div class="row log ${l.k}"><span>J${l.d} · ${esc(l.t)}</span></div>`).join('') };
    },
    menu() {
      return { title: '⚙️ Menu', html: `<div class="btns col"><button data-a="save">💾 Sauvegarder</button><button data-a="help">❓ Comment jouer</button><button class="danger" data-a="reset">🗑️ Nouvelle partie</button></div><p class="muted">La partie est sauvegardée automatiquement chaque jour dans ce navigateur.</p>` };
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
    loan: d => Z.borrow(+d.v),
    save: () => toast(Z.save() ? 'Partie sauvegardée' : 'Sauvegarde impossible', 'good'),
    help: () => showHelp(),
    reset: () => modal('Nouvelle partie ?', '<p>Votre zoo actuel sera définitivement effacé.</p>', [['Annuler'], ['Tout effacer', () => { Z.wipe(); Z.newGame(); closePanel(); showHelp(); }, 'danger']]),
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
  function showHelp() {
    modal('🦁 Bienvenue dans Zoo Project', `<p>Vous dirigez un zoo. Faites-en un lieu où les animaux vivent bien et où les visiteurs se pressent.</p><ol>
      <li><b>🚧 Enclos</b> — choisissez un habitat et dessinez un enclos. Chaque espèce exige son habitat, assez d’espace et un groupe minimum.</li>
      <li><b>🛣️ Allées</b> — reliez l’enclos à l’entrée : visiteurs et personnel ne marchent que sur les allées.</li>
      <li><b>🖐️ Explorer</b> — touchez l’enclos pour y acheter des animaux.</li>
      <li><b>👷 Personnel</b> — les soigneurs nourrissent et nettoient, les agents de maintenance ramassent les déchets et réparent les clôtures, les vétérinaires soignent.</li>
      <li><b>🏪 Services</b> — restauration, toilettes, bancs, poubelles et boutique gardent les visiteurs satisfaits.</li>
      <li><b>💶 Finances</b> — réglez le prix du billet. La réputation (★) attire le public et débloque de nouvelles espèces.</li></ol>
      <p class="muted">Souris : glisser pour se déplacer, molette pour zoomer. Tactile : un doigt pour agir, deux pour se déplacer et zoomer. Le zoo ouvre de 9 h à 19 h ; un an pour les animaux = 10 jours.</p>`, [['C’est parti !']]);
  }

  // ---------- Barre du haut ----------
  const WX = { sun: '☀️', cloud: '⛅', rain: '🌧️' };
  function updateTop() {
    const S = Z.S, h = Math.floor(S.minute / 60), m = Math.floor(S.minute % 60), r = Z.rep();
    $('#money').textContent = fmt(S.money); $('#money').className = S.money < 0 ? 'bad' : '';
    $('#vis').textContent = S.visitors.length; $('#rep').innerHTML = `<span class="stars">${stars(r)}</span> ${r.toFixed(1).replace('.', ',')}`;
    $('#clock').textContent = `${WX[S.weather]} Jour ${S.day} · ${String(h).padStart(2, '0')}:${String(m - m % 10).padStart(2, '0')}`;
    $('#open').textContent = Z.isOpen() ? 'Ouvert' : 'Fermé'; $('#open').className = 'tag ' + (Z.isOpen() ? 'ok' : 'bad');
    document.querySelectorAll('#speed button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.speed));
    const g = Z.GOALS[S.goal]; $('#goal').textContent = g ? '🎯 ' + g.t : '🏆 Tous les objectifs sont atteints !';
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
  function clickSelect(sx, sy) {
    const w = Z.toWorld(sx, sy), wx = w.x / T, wy = w.y / T, S = Z.S; let best = null, bd = .9;
    for (const a of S.staff.concat(S.visitors)) { const d = Math.hypot(a.x + a.ox - wx, a.y + a.oy - wy - .1); if (d < bd) { bd = d; best = a; } }
    if (best) return openPanel(best.kind === 'staff' ? 'staffm' : 'vis', best.id);
    const tx = Math.floor(wx), ty = Math.floor(wy), o = Z.inb(tx, ty) ? Z.occ[Z.idx(tx, ty)] : null;
    if (o) openPanel(o.kind === 'encl' ? 'encl' : 'bld', o.id); else if (ui.sel) closePanel();
  }
  function down(ev) {
    cvEl.setPointerCapture(ev.pointerId); pts.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; drag = null; ui.ghost = null; return; }
    const t = Z.toTile(ev.clientX, ev.clientY), pan = ev.button === 1 || ev.button === 2 || ui.tool === 'select';
    drag = { id: ev.pointerId, sx: ev.clientX, sy: ev.clientY, lx: ev.clientX, ly: ev.clientY, pan, moved: false, start: t };
    if (!pan) { if (ui.tool === 'path') Z.buildPath(t.x, t.y); else if (ui.tool === 'encl') ui.ghost = enclRect(t, t); else ui.ghost = ghostFor(t.x, t.y); }
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
      acc += dt; if (acc > .4) { acc = 0; updateTop(); renderPanel(false); }
      requestAnimationFrame(frame);
    })(last);
  };
  window.addEventListener('DOMContentLoaded', Z.start);
})();
