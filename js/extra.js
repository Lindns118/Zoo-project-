// Zoo Project — ambiance sonore, saisons, bac à sable, partage de zoo
(function () {
  const fmt = Z.fmt, { W, H } = Z;
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } } };

  // ================= 9. Saisons =================
  Z.SEASONS = [{ n: 'Printemps', icon: '🌱', demand: 1, tint: null }, { n: 'Été', icon: '🌞', demand: 1.25, tint: 'rgba(255,215,120,.05)' }, { n: 'Automne', icon: '🍂', demand: .9, tint: 'rgba(200,110,30,.09)' }, { n: 'Hiver', icon: '⛄', demand: .6, tint: 'rgba(210,230,255,.16)' }];
  Z.SEASON_DAYS = 12;
  Z.seasonIdx = () => Math.floor((Z.S.day - 1) / Z.SEASON_DAYS) % 4;
  Z.season = () => Z.SEASONS[Z.seasonIdx()];
  Z.seasonMod = () => Z.season().demand;
  const baseRoll = Z.rollWeather;
  Z.rollWeather = function () { const w = baseRoll(), s = Z.S ? Z.seasonIdx() : 0; if (s === 3 && w === 'sun' && Math.random() < .35) return 'rain'; if (s === 1 && w === 'rain' && Math.random() < .5) return 'sun'; return w; };

  // ================= 9. Sons (synthétisés, aucun fichier) =================
  const A = Z.audio = { on: ls.get('zoo-sound') !== '0', music: ls.get('zoo-music') === '1', ctx: null };
  function init() {
    if (A.ctx || !A.on && !A.music) return; const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = A.ctx = new AC(); A.master = c.createGain(); A.master.gain.value = .5; A.master.connect(c.destination);
    // brouhaha de foule : bruit filtré dont le volume suit le nombre de visiteurs
    const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 600; f.Q.value = .6;
    A.crowd = c.createGain(); A.crowd.gain.value = 0; src.connect(f); f.connect(A.crowd); A.crowd.connect(A.master); src.start();
  }
  function tone(freq, dur, type, vol, slide, when) {
    const c = A.ctx; if (!c || !A.on) return; const t = c.currentTime + (when || 0), o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || .15, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + dur);
    o.connect(g); g.connect(A.master); o.start(t); o.stop(t + dur + .05);
  }
  A.play = function (k) {
    if (!A.ctx) return;
    if (k === 'click') tone(700, .05, 'triangle', .06);
    else if (k === 'build') { tone(180, .12, 'square', .07); tone(240, .12, 'square', .07, 0, .09); }
    else if (k === 'good') { tone(660, .12, 'sine', .12); tone(880, .2, 'sine', .12, 0, .1); }
    else if (k === 'bad') tone(220, .3, 'sawtooth', .07, 110);
    else if (k === 'warn') tone(440, .15, 'triangle', .1);
    else if (k === 'cash') { tone(1300, .07, 'sine', .08); tone(1750, .12, 'sine', .08, 0, .06); }
    else if (k === 'level') [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .13, 0, i * .12));
    else if (k === 'bird') { const f = 2200 + Math.random() * 1400; tone(f, .09, 'sine', .035, f * 1.3); tone(f * 1.1, .08, 'sine', .03, f * .9, .13); }
  };
  const SCALE = [262, 294, 330, 392, 440, 523, 587, 659]; let step = 0, acc = 0, birdT = 3;
  A.tick = function (dt) { // appelé à chaque image
    if (!A.ctx) return; const S = Z.S;
    A.crowd.gain.value = A.on && S.speed ? Math.min(.09, S.visitors.length / 2500) : 0;
    if (A.on && S.speed && !Z.isNight() && S.weather !== 'rain') { birdT -= dt; if (birdT <= 0) { A.play('bird'); birdT = 1.5 + Math.random() * 5; } }
    if (A.music && S.speed) { acc += dt; if (acc > .42) { acc = 0; step++; const on = A.on; A.on = true; if (step % 2 === 0 || Math.random() < .3) tone(SCALE[(step * 3 + (step >> 3) * 2 + (Math.random() < .2 ? 1 : 0)) % 8] / (step % 8 === 0 ? 2 : 1), .5, 'sine', .045); A.on = on; } }
  };
  A.set = function (k, v) { A[k] = v; ls.set(k === 'on' ? 'zoo-sound' : 'zoo-music', v ? '1' : '0'); init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); };
  window.addEventListener('pointerdown', () => { init(); if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume(); }, { once: false });
  document.addEventListener('click', ev => { if (ev.target.closest('[data-a]')) A.play('click'); });
  const oldNotify = Z.onNotifySound = null;
  Z.soundFor = function (text, kind) { A.play(/Niveau \d+ atteint/.test(text) ? 'level' : kind === 'good' ? 'good' : kind === 'bad' ? 'bad' : kind === 'warn' ? 'warn' : ''); };

  // ================= 10. Bac à sable =================
  Z.playSandbox = function () {
    if (Z.S) Z.save(); const map = Z.S && Z.S.map || 'france'; Z.setSlot('sandbox'); Z.wipe(); Z.newGame(null, map);
    const S = Z.S; S.sandbox = 1; S.money = 5000000; Z.silentLevel = true; S.level = Z.MAX_LEVEL; S.xp = Z.XP_LEVELS[Z.MAX_LEVEL]; Z.silentLevel = false;
    for (const p of Z.PARCELS) S.land[p.id] = 1; for (const k in Z.RESEARCH) S.research.done[k] = 1; S.goal = Z.GOALS.length; S.stock = 4000;
    Z.rebuild(true); Z.save(); if (Z.onRestart) Z.onRestart(); Z.notify('🏖️ Bac à sable : tout est débloqué, argent quasi illimité. Amusez-vous !', 'good');
  };

  // ================= 10. Partage de zoo par code =================
  const b64 = { enc: u8 => { let s = ''; for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192)); return btoa(s); }, dec: s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; } };
  async function pipe(u8, stream) { const r = new Response(new Blob([u8]).stream().pipeThrough(stream)); return new Uint8Array(await r.arrayBuffer()); }
  Z.exportCode = async function () {
    Z.save(); const json = ls.get(Z.slotKey(Z.slot)); if (!json) return null; const raw = new TextEncoder().encode(json);
    try { if (window.CompressionStream) return 'ZOOG' + b64.enc(await pipe(raw, new CompressionStream('gzip'))); } catch (e) { }
    return 'ZOOJ' + b64.enc(raw);
  };
  Z.importCode = async function (code) {
    try {
      code = code.trim().replace(/\s+/g, ''); const kind = code.slice(0, 4); let raw = b64.dec(code.slice(4));
      if (kind === 'ZOOG') raw = await pipe(raw, new DecompressionStream('gzip')); else if (kind !== 'ZOOJ') throw 0;
      const json = new TextDecoder().decode(raw), S = JSON.parse(json); if (!S || S.v !== 1 || !S.ground || S.ground.length !== W * H) throw 0;
      if (Z.S) Z.save(); Z.setSlot('import'); ls.set(Z.slotKey('import'), json); if (!Z.load()) throw 0;
      Z.S.scn = null; Z.save(); if (Z.onRestart) Z.onRestart(); Z.notify('📥 Zoo importé : jour ' + Z.S.day + ', niveau ' + Z.S.level, 'good'); return true;
    } catch (e) { Z.notify('Code invalide ou incomplet', 'bad'); return false; }
  };

  Object.assign(Z.extraActs, {
    sandbox: () => Z.modal('🏖️ Bac à sable', '<p>Une partie à part, sur la carte actuelle : argent quasi illimité, niveau maximum, toutes les recherches et tous les terrains débloqués. Votre partie normale est conservée.</p>', [['Annuler'], ['Lancer', Z.playSandbox]]),
    sndtog: () => A.set('on', !A.on), mustog: () => A.set('music', !A.music),
    share: async () => { const code = await Z.exportCode(); if (!code) return; let copied = false; try { await navigator.clipboard.writeText(code); copied = true; } catch (e) { } Z.modal('📤 Partager mon zoo', `<p>${copied ? 'Le code est copié dans le presse-papiers. ' : ''}Envoyez ce code à un ami : il pourra visiter et reprendre votre zoo via « Importer un zoo ».</p><textarea readonly class="code" onclick="this.select()">${code}</textarea><p class="muted">${Math.round(code.length / 1024)} Ko</p>`, [['Fermer']]); },
    importz: () => Z.modal('📥 Importer un zoo', '<p>Collez ici le code reçu. Le zoo s’ouvre dans un emplacement à part : vos propres parties ne sont pas touchées.</p><textarea class="code" id="impcode" placeholder="ZOOG…"></textarea>', [['Annuler'], ['Importer', () => Z.importCode(document.querySelector('#impcode').value)]]),
  });
  Z.html.menu = () => `<h3>Ambiance</h3><div class="btns col"><button data-a="sndtog">${A.on ? '🔊 Sons activés' : '🔇 Sons coupés'}</button><button data-a="mustog">${A.music ? '🎵 Musique activée' : '🎵 Musique coupée'}</button></div>
    <h3>Modes et partage</h3><div class="btns col"><button data-a="sandbox">🏖️ Bac à sable (tout débloqué)</button><button data-a="share">📤 Partager mon zoo (code)</button><button data-a="importz">📥 Importer un zoo</button></div>${Z.S.sandbox ? '<p class="muted">Vous êtes en mode bac à sable.</p>' : ''}`;
  Z.html.season = () => { const s = Z.season(); return s.icon + ' ' + s.n; };
})();
