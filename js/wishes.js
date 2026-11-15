// Zoo Project — attentes des visiteurs : chacun vient pour voir certains animaux
(function () {
  const SP = Z.SPECIES, fmt = Z.fmt;
  const row = (l, v) => `<div class="row"><span>${l}</span><b>${v}</b></div>`;
  const say = (v, t) => { v.thought = t; Z.thoughts.unshift(v.name + ' : ' + t); if (Z.thoughts.length > 14) Z.thoughts.pop(); };
  Z.WISH = { seen: 7, all: 4, missed: 3, absent: 5 }; // points de satisfaction gagnés ou perdus
  // tirage pondéré par l'attrait de l'espèce : les animaux vedettes sont les plus demandés
  function draw(keys, not) { let tot = 0; const ks = keys.filter(k => !not.includes(k)); for (const k of ks) tot += SP[k].app; let r = Math.random() * tot; for (const k of ks) { r -= SP[k].app; if (r <= 0) return k; } return ks[ks.length - 1]; }
  const oldSpawn = Z.onSpawn;
  Z.onSpawn = function (v) {
    oldSpawn(v); const S = Z.S, here = [...Z.presentSp()]; if (!here.length) return;
    // la plupart des souhaits portent sur les animaux que le zoo présente, quelques-uns sur des espèces qu'il pourrait bientôt avoir
    const soon = Object.keys(SP).filter(k => !here.includes(k) && ((SP[k].lvl || 99) <= S.level + 2 || Z.speciesUnlocked(k)));
    const n = Math.random() < .4 ? 1 : Math.random() < .67 ? 2 : 3; v.w = []; v.wd = {};
    for (let i = 0; i < n; i++) { const pool = soon.length && Math.random() < .25 ? soon : here, k = draw(pool, v.w); if (k) v.w.push(k); }
  };
  const oldFan = Z.fanBonus;
  Z.fanBonus = function (v, e) {
    let b = oldFan(v, e); const sp = e.animals[0].sp;
    if (v.w && v.w.includes(sp) && !v.wd[sp]) { v.wd[sp] = 1; b += Z.WISH.seen; say(v, 'Les ' + SP[sp].pl + ' ! C’est pour eux que je suis venu ' + SP[sp].e); Z.fxAdd(v.x, v.y, '★', '#e3a008'); }
    return b;
  };
  // parmi les enclos connus, le visiteur va d'abord vers ceux qu'il est venu voir
  Z.wishFirst = function (v, cand) { if (!v.w) return cand; const want = cand.filter(e => v.w.includes(e.animals[0].sp) && !v.wd[e.animals[0].sp]); return want.length ? want : cand; };
  const blank = () => ({});
  const oldMig = Z.progressMigrate; Z.progressMigrate = function (S) { oldMig(S); S.ws = S.ws || blank(); S.wsY = S.wsY || blank(); };
  const oldExit = Z.onExit;
  Z.onExit = function (v) {
    const S = Z.S;
    if (v.w && v.w.length) {
      const here = Z.presentSp(); let ok = 0;
      for (const sp of v.w) {
        const st = S.ws[sp] = S.ws[sp] || [0, 0]; st[0]++;
        if (v.wd[sp]) { ok++; st[1]++; }
        else if (here.has(sp)) { v.happy -= Z.WISH.missed; v.c.wishmiss = 1; }
        else { v.happy -= Z.WISH.absent; v.c.wishno = 1; }
      }
      if (ok === v.w.length) { v.happy += Z.WISH.all; v.c.wishall = 1; say(v, 'J’ai vu tout ce que je voulais voir, quelle belle journée !'); }
      else if (!ok) say(v, 'Je repars sans avoir vu les ' + SP[v.w[0]].pl + '…');
      v.happy = Z.clamp(v.happy, 0, 100);
    }
    oldExit(v);
  };
  const oldD = Z.onDaily; Z.onDaily = function () { if (oldD) oldD(); const S = Z.S; if (Object.keys(S.ws).length) S.wsY = S.ws; S.ws = blank(); };

  // ---------- Interface ----------
  const oldVisitor = Z.html.visitor;
  Z.html.visitor = v => oldVisitor(v) + (v.w && v.w.length ? '<p>🎯 Venu pour voir : ' + v.w.map(k => `<span class="tag ${v.wd[k] ? 'ok' : ''}">${SP[k].e} ${SP[k].n}${v.wd[k] ? ' ✓' : ''}</span>`).join(' ') + '</p>' : '');
  Z.html.wishes = function () {
    const S = Z.S, cur = Object.keys(S.ws).reduce((n, k) => n + S.ws[k][0], 0) >= 20 ? S.ws : Object.keys(S.wsY).length ? S.wsY : S.ws, ks = Object.keys(cur).sort((a, b) => cur[b][0] - cur[a][0]);
    if (!ks.length) return ''; const here = Z.presentSp(), tot = ks.reduce((n, k) => n + cur[k][0], 0), got = ks.reduce((n, k) => n + cur[k][1], 0);
    let h = `<h3>🎯 Ce que les visiteurs viennent voir <small>(${cur === S.ws ? 'aujourd’hui' : 'hier'})</small></h3><p class="muted">Chaque visiteur arrive avec un à trois animaux en tête. Vu : +${Z.WISH.seen} de satisfaction, et +${Z.WISH.all} si toute sa liste y passe. Pas vu : −${Z.WISH.missed}. Absent du zoo : −${Z.WISH.absent}.</p>` + row('Souhaits exaucés', Math.round(got / tot * 100) + ' %');
    h += ks.slice(0, 8).map(k => { const [w, g] = cur[k], has = here.has(k), pc = Math.round(g / w * 100); return `<div class="row"><span>${SP[k].e} ${SP[k].n} <span class="muted">· ${w} demandes</span></span><b class="${!has ? 'bad' : pc >= 70 ? 'good' : ''}">${has ? pc + ' % l’ont vu' : 'absent du zoo'}</b></div>`; }).join('');
    const miss = ks.filter(k => !here.has(k)).slice(0, 3);
    if (miss.length) h += '<p class="muted">👉 Espèces réclamées que vous n’avez pas : ' + miss.map(k => SP[k].e + ' ' + SP[k].n + (Z.speciesUnlocked(k) ? '' : ' (' + Z.lockLabel(SP[k]) + ')')).join(', ') + '.</p>';
    const low = ks.filter(k => here.has(k) && cur[k][0] >= 5 && cur[k][1] / cur[k][0] < .5).slice(0, 2);
    if (low.length) h += '<p class="muted">👉 Peu vus alors qu’ils sont demandés : ' + low.map(k => SP[k].e + ' ' + SP[k].n).join(', ') + '. Rapprochez leur enclos de l’entrée ou distribuez des plans.</p>';
    return h;
  };
  const oldRep = Z.PANELS.rep;
  Z.PANELS.rep = function () { const r = oldRep(); if (r) { const i = r.html.indexOf('<h3>Ce qui la fait baisser</h3>'); r.html = i >= 0 ? r.html.slice(0, i) + Z.html.wishes() + r.html.slice(i) : r.html + Z.html.wishes(); } return r; };
})();
