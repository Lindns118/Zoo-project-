// Zoo Project — données du jeu
const Z = window.Z = {};
Z.TILE = 32; Z.W = 56; Z.H = 40;
Z.EX = 28; Z.EY = Z.H - 1; // entrée du zoo

Z.BIOMES = {
  savane:    { name: 'Savane',    icon: '🌾', cost: 40,  color: '#dcc178' },
  foret:     { name: 'Forêt',     icon: '🌳', cost: 55,  color: '#5f9e4c' },
  montagne:  { name: 'Montagne',  icon: '⛰️', cost: 60,  color: '#a9a39a' },
  aquatique: { name: 'Aquatique', icon: '💧', cost: 90,  color: '#e3d6a0' },
  polaire:   { name: 'Polaire',   icon: '❄️', cost: 110, color: '#eef6fb' },
};

// space = cases par animal · app = attrait · food = €/jour · grp = groupe minimum
// life/mat en années (1 an = 10 jours de jeu) · gest en jours · rep = étoiles requises
Z.SPECIES = {
  zebre:     { n: 'Zèbre', pl: 'zèbres', e: '🦓', b: 'savane', price: 1800, space: 6, app: 14, food: 18, grp: 3, life: 25, mat: 3, gest: 8, fert: .10, rep: 0, size: 24, spd: .05 },
  kangourou: { n: 'Kangourou', pl: 'kangourous', e: '🦘', b: 'savane', price: 2200, space: 6, app: 18, food: 14, grp: 3, life: 20, mat: 2, gest: 5, fert: .12, rep: 2.8, size: 22, spd: .06 },
  girafe:    { n: 'Girafe', pl: 'girafes', e: '🦒', b: 'savane', price: 4500, space: 10, app: 26, food: 30, grp: 2, life: 26, mat: 4, gest: 10, fert: .07, rep: 3.2, size: 30, spd: .04 },
  lion:      { n: 'Lion', pl: 'lions', e: '🦁', b: 'savane', price: 6000, space: 12, app: 34, food: 45, grp: 2, life: 18, mat: 3, gest: 6, fert: .08, rep: 3.6, size: 26, spd: .04 },
  rhino:     { n: 'Rhinocéros', pl: 'rhinocéros', e: '🦏', b: 'savane', price: 8000, space: 16, app: 34, food: 55, grp: 1, life: 40, mat: 6, gest: 12, fert: .04, rep: 3.9, size: 30, spd: .03 },
  elephant:  { n: 'Éléphant', pl: 'éléphants', e: '🐘', b: 'savane', price: 9000, space: 18, app: 40, food: 70, grp: 2, life: 60, mat: 10, gest: 14, fert: .03, rep: 3.9, size: 34, spd: .03 },
  singe:     { n: 'Capucin', pl: 'singes', e: '🐒', b: 'foret', price: 1200, space: 4, app: 14, food: 10, grp: 4, life: 30, mat: 4, gest: 5, fert: .10, rep: 0, size: 20, spd: .07 },
  paon:      { n: 'Paon', pl: 'paons', e: '🦚', b: 'foret', price: 600, space: 3, app: 8, food: 5, grp: 2, life: 18, mat: 2, gest: 3, fert: .12, rep: 0, size: 20, spd: .04 },
  tigre:     { n: 'Tigre', pl: 'tigres', e: '🐅', b: 'foret', price: 7000, space: 14, app: 36, food: 48, grp: 1, life: 20, mat: 3, gest: 6, fert: .06, rep: 3.6, size: 28, spd: .05 },
  gorille:   { n: 'Gorille', pl: 'gorilles', e: '🦍', b: 'foret', price: 8500, space: 12, app: 38, food: 35, grp: 3, life: 40, mat: 8, gest: 10, fert: .04, rep: 3.9, size: 28, spd: .03 },
  panda:     { n: 'Panda', pl: 'pandas', e: '🐼', b: 'foret', price: 15000, space: 12, app: 55, food: 60, grp: 1, life: 25, mat: 5, gest: 8, fert: .02, rep: 4.3, size: 28, spd: .02 },
  chevre:    { n: 'Bouquetin', pl: 'bouquetins', e: '🐐', b: 'montagne', price: 800, space: 5, app: 10, food: 9, grp: 3, life: 16, mat: 2, gest: 5, fert: .12, rep: 0, size: 20, spd: .05 },
  lama:      { n: 'Lama', pl: 'lamas', e: '🦙', b: 'montagne', price: 1100, space: 5, app: 12, food: 10, grp: 3, life: 20, mat: 2, gest: 7, fert: .10, rep: 0, size: 22, spd: .04 },
  loup:      { n: 'Loup', pl: 'loups', e: '🐺', b: 'montagne', price: 4000, space: 10, app: 28, food: 28, grp: 4, life: 14, mat: 2, gest: 4, fert: .08, rep: 3.2, size: 22, spd: .06 },
  ours:      { n: 'Ours brun', pl: 'ours bruns', e: '🐻', b: 'montagne', price: 5500, space: 14, app: 30, food: 40, grp: 1, life: 30, mat: 4, gest: 8, fert: .05, rep: 3.2, size: 28, spd: .03 },
  flamant:   { n: 'Flamant rose', pl: 'flamants roses', e: '🦩', b: 'aquatique', price: 900, space: 3, app: 12, food: 8, grp: 6, life: 30, mat: 3, gest: 3, fert: .08, rep: 0, size: 20, spd: .03 },
  loutre:    { n: 'Loutre', pl: 'loutres', e: '🦦', b: 'aquatique', price: 1600, space: 4, app: 18, food: 10, grp: 2, life: 15, mat: 2, gest: 4, fert: .10, rep: 2.8, size: 20, spd: .07 },
  croco:     { n: 'Crocodile', pl: 'crocodiles', e: '🐊', b: 'aquatique', price: 3500, space: 8, app: 24, food: 22, grp: 1, life: 60, mat: 8, gest: 6, fert: .04, rep: 2.8, size: 28, spd: .02 },
  hippo:     { n: 'Hippopotame', pl: 'hippopotames', e: '🦛', b: 'aquatique', price: 7000, space: 14, app: 32, food: 50, grp: 2, life: 45, mat: 6, gest: 10, fert: .04, rep: 3.6, size: 30, spd: .02 },
  manchot:   { n: 'Manchot', pl: 'manchots', e: '🐧', b: 'polaire', price: 1500, space: 3, app: 18, food: 12, grp: 6, life: 20, mat: 3, gest: 4, fert: .08, rep: 2.8, size: 20, spd: .03 },
  phoque:    { n: 'Phoque', pl: 'phoques', e: '🦭', b: 'polaire', price: 3000, space: 6, app: 22, food: 20, grp: 3, life: 28, mat: 4, gest: 8, fert: .06, rep: 3.2, size: 24, spd: .03 },
  ourspol:   { n: 'Ours polaire', pl: 'ours polaires', e: '🐻‍❄️', b: 'polaire', price: 9500, space: 16, app: 40, food: 55, grp: 1, life: 28, mat: 5, gest: 8, fert: .04, rep: 3.9, size: 30, spd: .03 },
};

Z.BUILDINGS = {
  food:     { name: 'Stand burger', icon: '🍔', size: 2, cost: 2200, upkeep: 45, price: 9, goods: 5, cat: 'shop', color: '#e8743b', desc: 'Les visiteurs affamés y mangent.' },
  drink:    { name: 'Buvette', icon: '🥤', size: 1, cost: 900, upkeep: 20, price: 3.5, goods: 1.5, cat: 'shop', color: '#3b9be8', desc: 'Boissons fraîches.' },
  gift:     { name: 'Boutique souvenirs', icon: '🎁', size: 2, cost: 3500, upkeep: 50, price: 15, goods: 9, cat: 'shop', color: '#b05cc9', desc: 'Les visiteurs satisfaits achètent en partant.' },
  toilet:   { name: 'Toilettes', icon: '🚻', size: 2, cost: 1500, upkeep: 30, cat: 'shop', color: '#6b8a99', desc: 'Indispensables !' },
  ice:      { name: 'Glacier', icon: '🍦', size: 1, cost: 1100, upkeep: 20, price: 4, goods: 1.5, cat: 'shop', color: '#f29cc0', need: 4, desc: 'Une petite douceur qui rend les visiteurs heureux.' },
  play:     { name: 'Aire de jeux', icon: '🎠', size: 2, cost: 3000, upkeep: 35, cat: 'shop', color: '#f2c230', need: 5, desc: 'Les enfants l’adorent (gratuit).' },
  resto:    { name: 'Restaurant', icon: '🍽️', size: 2, cost: 6000, upkeep: 90, price: 18, goods: 8, cat: 'shop', color: '#8c5a3c', need: 8, desc: 'Repas complet : rassasie, désaltère et repose.' },
  bench:    { name: 'Banc', icon: '🪑', size: 1, cost: 120, upkeep: 0, cat: 'shop', desc: 'Les visiteurs fatigués s’y reposent.' },
  bin:      { name: 'Poubelle', icon: '🗑️', size: 1, cost: 80, upkeep: 0, cat: 'shop', desc: 'Évite les déchets dans un rayon de 5 cases.' },
  tree:     { name: 'Arbre', icon: '🌳', size: 1, cost: 150, upkeep: 0, cat: 'decor', beauty: 1, desc: 'Embellit le zoo.' },
  flowers:  { name: 'Massif de fleurs', icon: '🌷', size: 1, cost: 90, upkeep: 0, cat: 'decor', beauty: 1, desc: 'Embellit le zoo.' },
  fountain: { name: 'Fontaine', icon: '⛲', size: 1, cost: 1200, upkeep: 5, cat: 'decor', beauty: 4, desc: 'Très décorative.' },
  statue:   { name: 'Statue', icon: '🗿', size: 1, cost: 2500, upkeep: 0, cat: 'decor', beauty: 6, need: 10, desc: 'Une œuvre qui fait la fierté du zoo.' },
};

Z.STAFF = {
  keeper: { name: 'Soigneur', icon: '🧑‍🌾', salary: 130, color: '#3f9d4a', desc: 'Nourrit les animaux et nettoie les enclos.' },
  maint:  { name: 'Agent de maintenance', icon: '👷', salary: 100, color: '#e0a020', desc: 'Ramasse les déchets et répare les clôtures.' },
  vet:    { name: 'Vétérinaire', icon: '🧑‍⚕️', salary: 220, color: '#d9534f', desc: 'Soigne les animaux malades.' },
};

Z.UPGRADES = {
  abri: { name: 'Abri', icon: '🛖', cost: e => 800, desc: '+7 bonheur' },
  jeux: { name: 'Enrichissement', icon: '🪵', cost: e => 600, desc: '+8 bonheur' },
  veg:  { name: 'Végétation', icon: '🌿', cost: e => e.w * e.h * 20, desc: '+5 bonheur, +10 % attrait' },
};

Z.FIN = {
  tickets: 'Billetterie', shops: 'Restauration & boutiques', sales: 'Vente d’animaux', rewards: 'Récompenses',
  build: 'Construction', animals: 'Achat d’animaux', salaries: 'Salaires', food: 'Nourriture des animaux',
  goods: 'Marchandises', upkeep: 'Entretien', vet: 'Soins vétérinaires', interest: 'Intérêts d’emprunt', misc: 'Divers',
};

Z.GOALS = [
  { t: 'Construisez votre premier enclos', r: 500, c: S => S.enclosures.length >= 1 },
  { t: 'Accueillez au moins 3 animaux', r: 1000, c: S => Z.animalCount() >= 3 },
  { t: 'Reliez un enclos à l’entrée par une allée', r: 500, c: S => S.enclosures.some(e => e.vp.length) },
  { t: 'Embauchez un soigneur', r: 500, c: S => S.staff.some(s => s.type === 'keeper') },
  { t: 'Accueillez 50 visiteurs', r: 1500, c: S => S.stats.visitors >= 50 },
  { t: 'Installez un stand burger, une buvette et des toilettes', r: 2000, c: S => ['food', 'drink', 'toilet'].every(t => S.buildings.some(b => b.type === t)) },
  { t: 'Embauchez un agent de maintenance et un vétérinaire', r: 2000, c: S => ['maint', 'vet'].every(t => S.staff.some(s => s.type === t)) },
  { t: 'Présentez 4 espèces différentes', r: 4000, c: S => Z.speciesCount() >= 4 },
  { t: 'Atteignez 3,5 étoiles de réputation', r: 5000, c: S => Z.rep() >= 3.5 },
  { t: 'Célébrez une première naissance', r: 5000, c: S => S.stats.births >= 1 },
  { t: 'Accueillez 2 000 visiteurs', r: 8000, c: S => S.stats.visitors >= 2000 },
  { t: 'Présentez 10 espèces différentes', r: 15000, c: S => Z.speciesCount() >= 10 },
  { t: 'Atteignez 4,5 étoiles avec 12 espèces', r: 30000, c: S => Z.rep() >= 4.5 && Z.speciesCount() >= 12 },
];

Z.ANIMAL_NAMES = ['Kiki', 'Simba', 'Nala', 'Zazou', 'Bambou', 'Coco', 'Luna', 'Rocky', 'Maya', 'Titus', 'Nina', 'Oscar', 'Zoé', 'Félix', 'Lola', 'Max', 'Mimi', 'Pacha', 'Rosie', 'Sam', 'Tara', 'Uma', 'Victor', 'Willy', 'Yuki', 'Zéphyr', 'Gaïa', 'Hugo', 'Iris', 'Jade', 'Kali', 'Léo', 'Moka', 'Noé', 'Olga', 'Pablo', 'Ruby', 'Sacha', 'Tina', 'Ugo'];
Z.PEOPLE_NAMES = ['Emma', 'Lucas', 'Léa', 'Hugo', 'Chloé', 'Louis', 'Manon', 'Nathan', 'Camille', 'Jules', 'Sarah', 'Tom', 'Inès', 'Paul', 'Jade', 'Adam', 'Lina', 'Noah', 'Zoé', 'Théo', 'Alice', 'Marc', 'Julie', 'Karim', 'Sofia', 'Pierre', 'Nadia', 'Antoine', 'Clara', 'Yanis'];
