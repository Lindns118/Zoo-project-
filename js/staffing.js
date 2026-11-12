// Zoo Project — personnel : postes fixes, besoins en effectif, conséquences du sous-effectif ; grille de prix
(function () {
  const SP = Z.SPECIES, BL = Z.BUILDINGS, BIO = Z.BIOMES, fmt = Z.fmt;

  // ---------- Prix relevés ----------
  for (const k in SP) SP[k].price = Math.round(SP[k].price * 1.5 / 100) * 100;
  for (const k in BL) BL[k].cost = Math.round(BL[k].cost * 1.6 / 50) * 50;
  for (const k in BIO) BIO[k].cost = Math.round(BIO[k].cost * 1.5);
  Z.UPGRADES.abri.cost = e => 2000; Z.UPGRADES.jeux.cost = e => 1500; Z.UPGRADES.veg.cost = e => e.w * e.h * 35;

  // ---------- Nouveaux postes (postes fixes : ils ne se déplacent pas sur la carte) ----------
  Object.assign(Z.STAFF, {
    cashier:  { name: 'Caissier', icon: '🎟️', salary: 85, color: '#3b7dd8', desk: true, lvl: 1, desc: 'Tient un guichet à l’entrée : 40 entrées par heure et par caissier (10 seulement sans personne).' },
    vendor:   { name: 'Vendeur', icon: '🧑‍🍳', salary: 80, color: '#e8743b', desk: true, lvl: 1, desc: 'Un vendeur par boutique ou stand (deux pour un restaurant). Sans vendeur, le commerce reste fermé.' },
    guide:    { name: 'Animateur', icon: '🧑‍🏫', salary: 120, color: '#8b5cc9', desk: true, lvl: 5, desc: 'Présente les animaux au public : jusqu’à +20 % de satisfaction devant les enclos (1 pour 150 visiteurs).' },
    security: { name: 'Agent de sécurité', icon: '💂', salary: 110, color: '#444', desk: true, lvl: 7, desc: 'Prévient vols et dégradations quand la foule grossit (1 pour 200 visiteurs).' },
  });
  const VSLOTS = { food: 1, drink: 1, gift: 1, ice: 1, resto: 2 };

  Z.staffCount = t => Z.S.staff.reduce((n, s) => n + (s.type === t ? 1 : 0), 0);
  Z.crowd = () => Math.max(Z.S.pk || 0, Z.S.pkY || 0, Z.S.visitors.length);
  Z.entryCap = () => 10 + 40 * Z.staffCount('cashier');
  Z.guideBonus = function () { const g = Z.staffCount('guide'); return g ? 1 + .2 * Math.min(1, g * 150 / Math.max(1, Z.S.visitors.length)) : 1; };

  // Besoins en personnel, calculés d'après la taille réelle du zoo
  Z.staffNeeds = function () {
    const S = Z.S, an = Z.animalCount(), en = S.enclosures.filter(e => e.animals.length).length, vis = Z.crowd(), dm = Z.demand(), r = {};
    const set = (k, need, why, risk, opt) => { r[k] = { need: Z.staffUnlocked(k) ? Math.max(0, Math.ceil(need)) : 0, have: Z.staffCount(k), why, risk, opt }; };
    set('keeper', an ? Math.max(en / 3, an / 14) : 0, `${en} enclos occupés, ${an} animaux (1 pour 3 enclos ou 14 animaux)`, 'animaux affamés, enclos sales, maladies');
    set('maint', vis || en ? Z.pathCount / 120 + vis / 250 + S.enclosures.length / 10 : 0, `${Z.pathCount} cases d’allées, ${vis} visiteurs, ${S.enclosures.length} enclos`, 'déchets, clôtures abîmées, évasions');
    set('vet', an >= 6 ? an / 35 : 0, `${an} animaux (1 pour 35)`, 'maladies non soignées, décès');
    let slots = 0; for (const b of S.buildings) if (!b.bt) slots += VSLOTS[b.type] || 0;
    set('vendor', slots, `${slots} poste(s) de vente à tenir`, 'commerces fermés, visiteurs affamés');
    set('cashier', dm > 0 ? Math.max(1, (dm - 10) / 40) : 0, `${Math.round(dm)} visiteurs/heure attendus à l’entrée`, 'file d’attente : des visiteurs repartent');
    set('guide', vis / 150, `${vis} visiteurs (1 pour 150)`, 'bonus de satisfaction perdu', true);
    set('security', vis >= 80 ? vis / 200 : 0, `${vis} visiteurs (1 pour 200)`, 'vols et dégradations');
    return r;
  };

  // Affecte les vendeurs aux commerces (dans l'ordre de construction)
  Z.staffAssign = function () {
    const S = Z.S; let v = Z.staffCount('vendor');
    for (const b of S.buildings) { const n = VSLOTS[b.type]; if (!n) continue; if (!b.bt && v >= n) { v -= n; b.closed = 0; } else b.closed = 1; }
  };
  const wrap = (name, after) => { const f = Z[name]; Z[name] = function () { const r = f.apply(this, arguments); after(r, arguments); return r; }; };
  wrap('hire', Z.staffAssign); wrap('fire', Z.staffAssign); wrap('demolish', Z.staffAssign);
  wrap('place', (b) => { Z.staffAssign(); });
  wrap('load', ok => { if (ok) Z.staffAssign(); });

  const INCIDENTS = ['Vol à la tire signalé près des enclos', 'Un visiteur a escaladé une barrière', 'Dégradations sur le mobilier du zoo', 'Bagarre entre visiteurs devant un stand'];
  Z.staffHourly = function () {
    const S = Z.S; Z.staffAssign(); S.pk = Math.max(S.pk || 0, S.visitors.length);
    if (!Z.isOpen() || S.visitors.length < 80 || !Z.staffUnlocked('security')) return;
    const need = Math.ceil(S.visitors.length / 200), lack = need - Z.staffCount('security');
    if (lack > 0 && Math.random() < .05 * lack) {
      const cost = 300 + Math.round(Math.random() * 6) * 100; Z.spend('misc', cost); S.ratings.push(2);
      for (const v of S.visitors) v.happy -= 3;
      Z.notify('🚨 ' + Z.pick(INCIDENTS) + ' (−' + fmt(cost) + '). Renforcez la sécurité.', 'bad');
    }
  };
  const prevDaily = Z.onDaily;
  Z.onDaily = function () {
    const S = Z.S; if (prevDaily) prevDaily();
    if (S.lost > 5) Z.notify(`🎟️ ${Math.round(S.lost)} visiteurs sont repartis hier à cause de la file d’attente : embauchez des caissiers.`, 'warn');
    S.lostY = S.lost || 0; S.lost = 0; S.pkY = S.pk || 0; S.pk = 0;
    const nd = Z.staffNeeds(), miss = Object.keys(nd).filter(k => !nd[k].opt && nd[k].have < nd[k].need).map(k => Z.STAFF[k].name.toLowerCase() + ' (' + nd[k].have + '/' + nd[k].need + ')');
    if (miss.length) Z.notify('👷 Sous-effectif : ' + miss.join(', '), 'warn');
  };
})();
