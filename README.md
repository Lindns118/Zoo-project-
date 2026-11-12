# 🦁 Zoo Project

Jeu de gestion de zoo réaliste, jouable directement dans le navigateur (aucune installation, aucun serveur).

**Jouer :** https://lindns118.github.io/Zoo-project-/

## Le jeu

- **Vue isométrique** : sol en losanges, bâtiments en volume, clôtures et personnages triés en profondeur.
- **Cartes du monde** : six régions (France, Kenya, Canada, Brésil, Australie, Japon) avec leur relief, leur climat, leur public et leurs habitats naturels moins chers ; une sauvegarde par carte.
- **Plan de construction** : les tracés s'ajoutent à un plan qu'on valide ou annule d'un coup ; bancs et poubelles se posent sur les allées ; arbres à défricher.

- **Enclos** : cinq habitats (savane, forêt, montagne, aquatique, polaire). Chaque espèce exige son habitat, assez d'espace et un groupe minimum.
- **22 espèces** avec faim, santé, bonheur, maladies, vieillissement et reproduction. Les espèces rares se débloquent avec la réputation du zoo.
- **Visiteurs** : chacun a ses besoins (faim, soif, toilettes, fatigue), son budget et son avis. Leur satisfaction fait la réputation.
- **Services** : stand burger, buvette, boutique de souvenirs, toilettes, bancs, poubelles, décorations.
- **Personnel** : soigneurs, agents de maintenance et vétérinaires sur le terrain ; caissiers, vendeurs, animateurs et agents de sécurité à leur poste. Les effectifs nécessaires dépendent du nombre d'animaux, d'enclos, de visiteurs, d'allées et de commerces, et le sous-effectif a des conséquences.
- **Économie** : prix du billet et des boutiques, salaires, entretien, emprunt, bilan quotidien.
- **Modifier ses créations** : déplacer enclos et bâtiments, agrandir ou réduire un enclos, le renommer, transférer un animal.
- **Progression** : 15 niveaux de zoo gagnés grâce à l'expérience (visiteurs satisfaits, naissances, nouvelles espèces, missions). Chaque niveau débloque habitats, espèces, bâtiments, employés et terrains, visibles sur une ligne de progression.
- **Terrain** : on démarre sur une petite parcelle ; 14 parcelles voisines s'achètent selon le niveau.
- **Temps réel de gestion** : les chantiers durent plusieurs heures de jeu, les animaux commandés sont livrés en 14 h, impôt de 20 % sur les bénéfices.
- **Recherche** : un budget quotidien et des chercheurs produisent des points pour 19 projets (animaux, attractions, gestion).
- **Nouvelles espèces** : 19 espèces supplémentaires à débloquer par la recherche, dont deux habitats inédits (désert, préhistorique avec dinosaures).
- **Attractions** : mini-ferme, petit train, vivarium, amphithéâtre, grande roue, aquarium, cinéma 4D, montagnes russes, tenues par des opérateurs ; décors à thème.
- **Simulation** : simulateur de prix du billet et d'effet des campagnes de publicité.
- **Gestion** : statistiques avec courbes, prévisions à 3 jours, banque (trois types de prêts, faillite), campagnes de publicité.
- **Missions** : contrats à accepter (inspection sanitaire, programme de conservation, dons d'animaux…) avec récompenses.
- **Campagne** : cinq scénarios à objectifs et durée limitée, avec médailles, plus un mode libre.
- **Vues** : surimpressions bonheur des animaux, propreté et affluence, mini-carte.
- Météo, cycle jour/nuit, objectifs qui débloquent de nouveaux bâtiments, sauvegarde automatique dans le navigateur.

## Commandes

- Souris : glisser pour se déplacer, molette pour zoomer, clic pour agir, clic droit glissé pour se déplacer pendant une construction.
- Tactile : un doigt pour agir, deux doigts pour se déplacer et zoomer.
- Appui long puis glisser : déplacer la carte pendant une construction, ou saisir un bâtiment ou un enclos en mode Explorer.
- Clavier : flèches ou ZQSD pour se déplacer, Espace pour la pause, 1/2/3 pour la vitesse, Échap pour annuler.

## Technique

HTML, CSS et JavaScript sans dépendance ni étape de compilation. Ouvrir `index.html` via un serveur web suffit.
