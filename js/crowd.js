// Zoo Project — surpopulation des enclos : arrêt des naissances, refus de s'alimenter, bagarres
(function () {
  const SP = Z.SPECIES, fmt = Z.fmt, pick = Z.pick;
  Z.BREED_MAX = .8;   // au-delà de 80 % d'occupation, les animaux ne se reproduisent plus
  Z.enclMax = e => { const sp = e.animals.length ? SP[e.animals[0].sp] : e.pending && e.pending.length ? SP[e.pending[0].sp] : null; return sp ? Math.max(1, Math.floor(e.w * e.h / sp.space)) : 0; };
  Z.occupancy = (e, extra) => { const sp = e.animals.length ? SP[e.animals[0].sp] : null; return sp ? (e.animals.length + (extra || 0)) * sp.space / (e.w * e.h) : 0; };
  Z.crowdStage = e => (e.crowd >= 3 ? 3 : e.crowd >= 2 ? 2 : Z.occupancy(e) > 1 ? 1 : 0);
  Z.crowdText = function (e) {
    const o = Z.occupancy(e), st = Z.crowdStage(e);
    return st === 3 ? '⚔️ Surpopulation grave : les animaux se battent et refusent de manger' : st === 2 ? '🍽️ Surpopulation : les animaux refusent de s’alimenter' : st === 1 ? '😟 Enclos surpeuplé : animaux malheureux, risque de grève de la faim dans ' + (2 - (e.crowd || 0)) + ' j' : o > Z.BREED_MAX ? '⏸️ Enclos presque plein : les animaux ne se reproduisent plus' : '✅ Assez de place pour se reproduire';
  };
  // Image d'une bagarre : deux animaux face à face dans un nuage de poussière
  Z.fightImage = function (spk) {
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 150; const c = cv.getContext('2d'), sp = SP[spk];
    c.fillStyle = Z.BIOMES[sp.b].color; c.fillRect(0, 0, 300, 150); c.fillStyle = 'rgba(0,0,0,.08)'; c.fillRect(0, 118, 300, 32);
    const k = Math.min(3, 62 / (sp.size * 1.2)), mk = sex => ({ sp: spk, sex, age: sp.mat + 2, health: 100, wait: 0, x: 3.1, y: 0 });
    c.save(); c.translate(98, 126); c.rotate(-.12); c.scale(k, k); Z.drawAnimal(c, mk('M'), 0, 0, true, false); c.restore();
    c.save(); c.translate(202, 126); c.rotate(.12); c.scale(k, k); Z.drawAnimal(c, mk('M'), 0, 0, false, false); c.restore();
    for (let i = 0; i < 7; i++) { c.fillStyle = 'rgba(255,255,255,' + (.35 + i * .05) + ')'; c.beginPath(); c.arc(150 + Math.cos(i * 2.3) * 26, 96 + Math.sin(i * 1.7) * 20, 13 + (i % 3) * 5, 0, 7); c.fill(); }
    c.strokeStyle = '#e53935'; c.lineWidth = 3; c.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283; c.beginPath(); c.moveTo(150 + Math.cos(a) * 16, 62 + Math.sin(a) * 12); c.lineTo(150 + Math.cos(a) * 30, 62 + Math.sin(a) * 22); c.stroke(); }
    c.fillStyle = '#fdd835'; c.font = 'bold 30px sans-serif'; c.textAlign = 'center'; c.fillText('!', 150, 72);
    return cv.toDataURL();
  };
  const see = e => () => { Z.focus(e.x + e.w / 2, e.y + e.h / 2); Z.cam.z = Math.max(Z.cam.z, 1.2); Z.openPanel('encl', e.id); };
  function popup(e, title, text, img) {
    if (!Z.modal || Z.silentLevel) return;
    const sp0 = Z.S.speed || 1; Z.S.speed = 0; Z.modal(title, (img ? `<img class="portrait" src="${img}" alt="">` : '') + `<p>${text}</p><p class="muted">${e.name} : ${e.animals.length} animaux pour ${Z.enclMax(e)} places.</p>`, [['Plus tard', () => { Z.S.speed = sp0; }], ['👁️ Voir l’enclos', () => { Z.S.speed = sp0; see(e)(); }]]);
  }
  const oldD = Z.onDaily;
  Z.onDaily = function () {
    if (oldD) oldD(); const S = Z.S;
    for (const e of S.enclosures) {
      if (!e.animals.length || Z.occupancy(e) <= 1) { e.crowd = 0; continue; }
      e.crowd = (e.crowd || 0) + 1; const sp = SP[e.animals[0].sp];
      if (e.crowd === 1) Z.notify('😟 ' + e.name + ' est surpeuplé (' + e.animals.length + '/' + Z.enclMax(e) + ') : agrandissez-le, transférez ou vendez des animaux.', 'warn', e);
      else if (e.crowd === 2) { Z.notify('🍽️ Les ' + sp.pl + ' de ' + e.name + ', trop à l’étroit, refusent de manger.', 'bad', e); popup(e, '🍽️ Grève de la faim', 'Entassés depuis deux jours, vos ' + sp.pl + ' sont stressés et ne touchent plus à leur nourriture. Sans place supplémentaire, ils vont s’affaiblir et finir par se battre.'); }
      else if (Math.random() < .6 && e.animals.length >= 2) {
        const a = pick(e.animals), b = pick(e.animals.filter(x => x !== a));
        for (const x of [a, b]) { x.health = Math.max(8, x.health - 22 - Math.random() * 14); x.happy = Math.max(0, x.happy - 20); }
        S.ratings.push(1.5); for (const v of S.visitors) v.happy -= 2; S.stats.fights = (S.stats.fights || 0) + 1;
        Z.notify('⚔️ Bagarre dans ' + e.name + ' : ' + a.name + ' et ' + b.name + ' sont blessés.', 'bad', e);
        if (Z.audio && !Z.silentLevel) Z.audio.play('fight');
        popup(e, '⚔️ Bagarre entre ' + sp.pl + ' !', '<b>' + a.name + '</b> et <b>' + b.name + '</b> se sont battus pour l’espace et sont blessés. Les visiteurs sont choqués et la réputation du zoo en pâtit. Il faut d’urgence leur donner plus de place.', Z.fightImage(e.animals[0].sp));
      }
    }
  };
  Z.html.crowd = function (e) {
    const n = e.animals.length; if (!n) return ''; const mx = Z.enclMax(e), o = Z.occupancy(e) * 100, col = o > 100 ? '#d9534f' : o > Z.BREED_MAX * 100 ? '#e0a020' : '#3fae5a';
    return `<div class="card"><div class="ctitle"><b>Occupation : ${n} / ${mx} animaux</b><b style="color:${col}">${Math.round(o)} %</b></div><div class="bar"><i style="width:${Math.min(100, o)}%;background:${col}"></i></div><p class="muted">${Z.crowdText(e)}. Reproduction possible jusqu’à ${Math.round(Z.BREED_MAX * 100)} %.</p></div>`;
  };
})();
