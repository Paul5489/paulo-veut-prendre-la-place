# Projet : « Paulo veut prendre la place »

Web app de quiz de culture générale pour iPhone, inspirée de « Tout le monde veut prendre sa place ».

## 0. Comment travailler avec moi

- Je m'appelle Paul et je ne suis pas développeur. Parle-moi en français, simplement, sans jargon inutile.
- Pour tout ce que je dois faire moi-même (créer un compte, cliquer quelque part, installer l'appli sur l'iPhone), donne-moi des instructions pas à pas.
- Première action : enregistre l'intégralité de ce cahier des charges dans un fichier CLAUDE.md à la racine du projet. Il servira de référence dans toutes les sessions suivantes, car le projet se fera en plusieurs fois.
- Avant de coder, présente-moi ton plan : architecture, choix techniques et découpage en étapes, en termes simples. Attends ensuite mon feu vert.
- Travaille par phases (section 10). Fais un commit git à chaque étape qui fonctionne.
- À la fin de chaque phase, résume ce qui est fait, explique comment le tester sur mon iPhone et dis ce qui reste.
- Écris des tests automatiques pour la logique critique : calcul des scores, validation des réponses cash, tirage des questions sans répétition.

## 1. Vue d'ensemble

- Nom du jeu : « Paulo veut prendre la place ».
- Genre : jeu de culture générale en français. Il s'inspire du déroulé de l'émission de France 2 « Tout le monde veut prendre sa place » : Qualifs, Compet', Défi contre le champion.
- Appareil : mon iPhone 13, avec Safari et une web app installée sur l'écran d'accueil (PWA).
- Pas de serveur. L'hébergement est gratuit sur GitHub Pages.
- Fonctionne hors ligne, sauf la génération de nouvelles questions par IA (section 7).
- Identité visuelle originale. Ne reprends ni le logo, ni les musiques, ni les visuels de l'émission.

Trois modes de jeu :

1. **Carrière** (solo contre l'ordinateur), fidèle à l'émission.
2. **Duel à deux** sur le même iPhone (avec ma copine, par exemple).
3. **Partie rapide** : 10 questions de culture générale.

## 2. Règles communes à tous les modes

### 2.1 Modes de réponse (duo / carré / cash)

| Mode  | Points | Ce que voit le joueur                      |
|-------|--------|--------------------------------------------|
| Duo   | +1     | 2 propositions (la bonne + 1 mauvaise)     |
| Carré | +3     | 4 propositions (la bonne + 3 mauvaises)    |
| Cash  | +5     | Aucune proposition, saisie libre           |

- Le joueur lit la question, puis choisit son mode, et ne peut plus en changer.
- Certaines questions ont un mode imposé (précisé dans les manches concernées).
- L'ordre des propositions est mélangé à chaque affichage.

### 2.2 Réponses cash : validation tolérante

- Normalisation : minuscules, suppression des accents, de la ponctuation et des espaces en trop. Les articles en début de réponse sont ignorés (le, la, les, l', un, une, des, du, de la).
- Comparaison avec la bonne réponse et la liste des variantes acceptées de la question.
- Tolérance aux fautes de frappe (distance de Levenshtein) :
  - au plus 1 erreur pour une réponse de 5 caractères ou moins ;
  - au plus 2 erreurs de 6 à 10 caractères ;
  - au plus 3 erreurs au-delà.
- Nombres et dates : correspondance exacte, sans tolérance (1788 ne doit pas valider 1789). Accepter les équivalences chiffres / lettres / chiffres romains quand elles ont du sens (« 14 », « quatorze », « XIV »).
- Bouton « Contester » en cas de refus :
  - en solo, je peux valider moi-même (la contestation est comptée dans les stats) ;
  - en duel à deux, c'est l'autre joueur qui tranche.
- Champ de saisie :
  - autocorrection, majuscule automatique et suggestions désactivées ;
  - police d'au moins 16 px, pour éviter le zoom automatique d'iOS ;
  - validation avec la touche Entrée.

### 2.3 Niveaux de difficulté

- Quatre niveaux : 1 Facile, 2 Moyen, 3 Difficile, 4 Expert. Je choisis le niveau au début de chaque partie.
- Effet sur les questions : surtout des questions du niveau choisi, avec un peu du niveau voisin pour la variété.
- Effet sur les adversaires virtuels : leur force s'aligne sur le niveau (voir 3.1).

### 2.4 Après chaque réponse

- Affichage de la bonne réponse et d'une anecdote courte (1 à 2 phrases).
- Bouton « Signaler une erreur » sur chaque question (voir 6.4).

### 2.5 Jamais les mêmes questions

- Mémoriser chaque question vue : identifiant, date, réussie ou ratée, mode choisi.
- Toujours tirer en priorité des questions jamais vues.
- Quand les inédites d'une catégorie et d'un niveau sont épuisées, reproposer d'abord les questions ratées (les plus anciennes d'abord), puis les réussies les plus anciennes.
- Jamais deux fois la même question dans une même partie.
- Les questions signalées sont retirées de la rotation.

## 3. Mode « Carrière » : Paulo veut prendre la place (solo contre l'ordinateur)

### 3.1 Adversaires virtuels

- Ils sont générés à chaque partie : prénom français, avatar original (initiales colorées ou emoji), petite présentation fictive (métier, ville) pour l'ambiance.
- Un champion virtuel en titre garde sa place d'une partie à l'autre, avec ses victoires et sa cagnotte, comme à la télé. Il ne change que s'il est battu.
- Probabilité de bonne réponse. Elle dépend :
  - du niveau de la partie ;
  - de la difficulté de la question ;
  - d'un profil propre à chaque adversaire (forces et faiblesses selon les catégories).
- Choix du mode. Les adversaires choisissent duo, carré ou cash selon leur « confiance ». Leur réussite doit être cohérente avec le mode : plus facile en duo, plus dure en cash.
- Réalisme. Ils doivent parfois rater des questions faciles et parfois réussir des questions difficiles. Jamais d'omniscience.
- Rythme. Temps de réponse simulé pour le suspense, avec un bouton « Accélérer ».
- Progression (option activable) : plus j'enchaîne les victoires en tant que champion, plus les challengers deviennent forts.

### 3.2 Manche 1 : les Qualifs (6 candidats, moi + 5 adversaires)

- 3 questions collectives : tout le monde répond à la même question, avec le mode imposé. Une en duo, une en carré, une en cash.
- 2 questions individuelles par candidat, mode au choix. Les questions des adversaires s'affichent rapidement ou en résumé, avec possibilité de passer.
- Score maximal : 19 points.
- Les 4 meilleurs sont qualifiés.
- En cas d'égalité à la limite de qualification : question de départage à réponse numérique (« En quelle année… », « Combien… »). Chaque candidat donne un nombre, et le plus proche est qualifié. Les adversaires répondent avec une erreur plausible.
- Si je suis éliminé : écran de fin avec mon bilan et un bouton « Rejouer ».

### 3.3 Manche 2 : la Compet' (4 candidats)

- Un thème précis est annoncé en début de manche (tiré des thèmes, voir 6.1).
- 8 questions sur ce thème, identiques pour tous, avec les modes imposés : 3 en duo, 3 en carré, 2 en cash.
- Puis la « super cash ». Le champion attribue à chaque candidat une question cash différente sur le thème : +5 points si elle est juste, −5 si elle est fausse. Le champion virtuel donne les plus dures aux candidats qu'il juge les plus dangereux.
- Score maximal : 27 points.
- Le meilleur devient le challenger. En cas d'égalité, le champion choisit son challenger : il prend celui qu'il juge le moins dangereux.

### 3.4 Manche 3 : le Défi (challenger contre champion)

- Choix des thèmes. 4 thèmes précis sont proposés. Le champion choisit d'abord le thème du challenger, puis le sien.
- Stratégie du champion virtuel quand je suis challenger :
  - il me donne le thème de la catégorie où mes statistiques sont les plus faibles ;
  - il prend celui où il est le plus fort ;
  - le tout avec une part d'aléatoire.
- Le challenger joue en premier : 6 questions, mode au choix. Ses réponses ne sont pas corrigées tout de suite. On affiche seulement son « score potentiel », c'est-à-dire la somme des modes choisis.
- Puis le champion joue ses 6 questions, corrigées au fur et à mesure.
- Révélation finale : les réponses du challenger sont dévoilées une par une, avec du suspense.
- Score maximal : 30 points.
- Victoire : le challenger doit faire strictement plus que le champion. En cas d'égalité, le champion garde sa place.
- Cagnotte fictive : le champion gagne 100 € par point marqué par le challenger.

### 3.5 Quand je deviens champion

- Si je gagne le Défi, je deviens champion, avec une cagnotte de départ égale à mon score × 100 €. Le champion virtuel battu quitte le jeu.
- À la partie suivante, je suis dans le fauteuil :
  - Les Qualifs et la Compet' se jouent entre 6 adversaires virtuels. Elles sont simulées et présentées en résumé, avec l'option « Regarder en accéléré ». Elles désignent le challenger du jour.
  - C'est moi qui choisis parmi 4 thèmes celui du challenger, puis le mien.
  - Option « Thème libre » : je tape un thème de mon choix, pour moi ou pour le challenger, et les questions sont générées par IA (section 7).
  - Le challenger virtuel joue d'abord. Je ne vois que son score potentiel, pas ses corrections. Ensuite je joue, corrigé au fur et à mesure, puis vient la révélation finale.
- Suivi du champion :
  - nombre de victoires consécutives et cagnotte ;
  - trophées débloqués à 10, 30, 50, 100 et 200 victoires.
- Si je perds : le challenger virtuel devient le nouveau champion en titre, et je redeviens candidat. Ma série est enregistrée au palmarès.
- Palmarès : meilleure série, cagnotte record, historique des champions qui m'ont battu.
- Reprise : si je quitte en pleine partie, je peux reprendre là où j'en étais.

### 3.6 La Négo (phase 5, bonus)

Quand le challenger bat le champion, le champion peut proposer une partie de sa cagnotte pour racheter son titre.

- Si je suis challenger et que je gagne, le champion virtuel me fait une offre. J'ai deux choix :
  - J'accepte : je repars avec mon score × 100 € plus l'offre, et le champion garde sa place.
  - Je refuse : je deviens champion, avec une cagnotte de départ égale à mon score × 100 €.
- Si je suis champion et que je perds, je peux faire une offre au challenger virtuel :
  - il accepte ou refuse selon le montant, son score et une part d'aléatoire ;
  - s'il accepte, je reste champion avec une cagnotte diminuée.

## 4. Mode « Duel à deux » (sur le même iPhone)

- Préparation :
  - saisie des deux prénoms, mémorisés pour la fois suivante ;
  - choix du niveau ;
  - choix de la longueur du match : 1 manche, en 2 manches gagnantes ou en 3 manches gagnantes.
- Qui choisit les thèmes :
  - 1re manche : pile ou face animé, et le gagnant est le « champion » ;
  - manches suivantes : le gagnant de la manche précédente est le champion.
- Choix des thèmes. 4 thèmes précis sont proposés. Le champion choisit d'abord le thème de son adversaire, puis le sien. Option « Thème libre » avec génération par IA (section 7).
- Déroulé d'une manche :
  1. Le challenger joue 6 questions, mode au choix. Ses corrections restent cachées, seul son score potentiel s'affiche.
  2. Écran « Passe le téléphone à [prénom] » : le contenu est masqué jusqu'à ce que l'autre appuie sur « Je suis prêt ».
  3. Le champion joue ses 6 questions, corrigées au fur et à mesure.
  4. Révélation des réponses du challenger, puis score final.
- Égalité : question de départage à réponse numérique. Chaque joueur saisit son nombre à tour de rôle, sans voir celui de l'autre. Le plus proche gagne.
- Contestation cash : c'est l'autre joueur qui valide ou refuse.
- Fin de match : récapitulatif, plus un historique des duels entre ces deux joueurs (bilan des victoires, meilleurs scores).

## 5. Mode « Partie rapide »

- 10 questions de culture générale mélangée, ou d'une catégorie au choix.
- Niveau au choix, mode de réponse au choix à chaque question.
- Score maximal : 50 points. Un record est gardé par niveau.
- Chrono optionnel de 20 secondes par question, activable dans les réglages et valable pour tous les modes.

## 6. La banque de questions

### 6.1 Format

Fichiers JSON dans un dossier `data/`, découpés par catégorie et par thème pour un chargement rapide.

Question standard :

```json
{
  "id": "hist-000123",
  "categorie": "histoire",
  "theme": null,
  "niveau": 2,
  "question": "Quel roi de France était surnommé le Roi-Soleil ?",
  "reponse": "Louis XIV",
  "variantes": ["Louis 14", "Louis quatorze"],
  "mauvaises": ["Louis XV", "Louis XIII", "Henri IV"],
  "anecdote": "Il a régné 72 ans, le plus long règne de l'histoire de France.",
  "origine": "base",
  "date_creation": "2026-09-30"
}
```

- `mauvaises` contient 3 mauvaises réponses. La première est la plus plausible : c'est elle qu'on utilise en mode duo.
- `theme` vaut `null` pour une question de culture générale, ou l'identifiant d'un thème précis.
- `origine` vaut `"base"` pour la banque livrée, ou `"ia"` pour une question générée dans l'appli.

Thème précis : `id`, `titre` (par exemple « Les rois de France »), `categorie`, `description` courte, puis les questions du thème. Un thème compte au moins 12 questions, de niveaux mélangés, pour servir en Compet' comme au Défi.

Question de départage numérique : `id`, `question`, `valeur` (nombre), `unite`, `niveau`, `anecdote`.

### 6.2 Règles de qualité (pour toi comme pour la génération automatique)

- Rédaction : français impeccable, question claire, une seule bonne réponse, indiscutable.
- Faits : établis et vérifiables. Aucune question dont la réponse change avec le temps (dirigeant « actuel », record en cours, « aujourd'hui »), sauf si elle est datée explicitement (« En 2020, … »).
- Mauvaises réponses :
  - plausibles et de même nature que la bonne (4 dates, 4 villes, 4 personnages…) ;
  - jamais absurdes ;
  - jamais une variante de la bonne réponse.
- Réponses cash :
  - courtes (1 à 4 mots) ;
  - avec des variantes listées : nom seul, prénom + nom, chiffres ou lettres, orthographes courantes.
- Difficulté réaliste : le niveau 1 est connu de presque tout le monde, le niveau 4 est pointu.
- Variété : pas de doublons, ni de questions différentes qui portent sur le même fait.
- Relecture : après chaque lot, relis-toi et supprime toute question douteuse. Mieux vaut moins de questions que des questions fausses.

### 6.3 Contenu et volume visé

Catégories générales (au moins 12) :

- Histoire
- Géographie
- Sciences & techniques
- Nature & animaux
- Corps humain
- Littérature & langue française
- Arts & musique
- Cinéma, télé & séries
- Sport
- Gastronomie
- Société, institutions & économie
- Mythologie & croyances
- Insolite & divers

Thèmes précis : exemples à varier largement.

- « Les rois de France »
- « Le système solaire »
- « Les capitales européennes »
- « La Révolution française »
- « Les peintres impressionnistes »
- « Le Tour de France »
- « Les Jeux olympiques »
- « La chanson française des années 80 »
- « Les fromages de France »
- « La mythologie grecque »
- « Les grandes inventions »
- « Les films d'Alfred Hitchcock »

Objectifs :

- au moins 3 000 questions générales, réparties de façon équilibrée entre catégories et niveaux ;
- au moins 150 thèmes précis de 12 questions ;
- au moins 200 questions de départage numériques.

Méthode :

- Commence par un petit jeu d'environ 300 questions et 20 thèmes, pour tester l'appli.
- Grossis ensuite par lots d'environ 100 questions, en plusieurs sessions si nécessaire.

Script de contrôle `npm run check-questions` :

- vérifie le format, l'unicité des identifiants et les doublons (texte normalisé très proche avec la même réponse) ;
- vérifie qu'aucune mauvaise réponse n'est égale à la bonne ;
- affiche la répartition par catégorie, niveau et thème.

### 6.4 Signalements

- Bouton « Signaler une erreur », avec un motif facultatif : réponse fausse, ambiguë, faute, niveau mal évalué.
- La question signalée est retirée de la rotation et stockée dans une liste.
- Dans les réglages, je peux :
  - voir les signalements ;
  - restaurer une question ;
  - exporter les signalements en JSON, pour qu'on corrige la banque lors d'une prochaine session.

## 7. Agrandissement automatique de la banque par IA (API Anthropic)

### 7.1 Réglages

- Champ clé API Anthropic, stockée uniquement sur l'iPhone. Jamais dans le code ni dans le dépôt Git : le dépôt sera public.
- Bouton « Tester la clé ».
- Choix du modèle. Par défaut : le modèle Claude Haiku le plus récent, le moins cher.
- Guide-moi pour créer la clé et ajouter du crédit sur la console Anthropic le moment venu.

### 7.2 Appel de l'API

- Appel direct depuis le navigateur à l'API Messages.
- Vérifie dans la documentation officielle (https://docs.claude.com) le format de requête, l'en-tête nécessaire pour autoriser les appels depuis un navigateur et le nom exact du modèle.

### 7.3 Déclenchement automatique

- Quand les questions inédites d'une catégorie et d'un niveau passent sous un seuil (par exemple 40), l'appli génère un lot (par exemple 30 questions).
- Elle garde en permanence au moins 20 thèmes précis jamais joués, en générant de nouveaux thèmes quand il le faut.
- Tout se fait en arrière-plan, sans bloquer le jeu, uniquement si l'iPhone est en ligne et qu'une clé est configurée.

### 7.4 Thème libre

- Dans le Défi (quand je suis champion) et dans le Duel à deux, je tape un thème et l'appli génère 6 à 8 questions dessus.
- Un écran d'attente s'affiche pendant la génération.
- Message clair si je suis hors ligne ou en cas d'erreur, avec retour aux 4 thèmes proposés.

### 7.5 Contrôle qualité automatique

- Le prompt de génération reprend les règles de la section 6.2 et demande une sortie JSON stricte, validée par un schéma.
- Rejet des doublons par rapport à toute la banque existante.
- Double vérification (activée par défaut, désactivable) :
  - un second appel fait répondre le modèle aux questions sans lui montrer la réponse attendue ;
  - il doit aussi signaler les ambiguïtés ;
  - toute question en désaccord est écartée.

### 7.6 Garde-fous et stockage

- Garde-fous de coût :
  - limite quotidienne de lots, réglable (5 par défaut) ;
  - compteur de questions générées et estimation de la consommation.
- Stockage : les questions générées vont dans le stockage local avec `origine: "ia"`, et sont utilisées comme les autres.
- Export : elles peuvent être exportées en JSON, pour les intégrer plus tard à la banque de base.
- Sans clé API, tout fonctionne avec la banque de base.

## 8. Technique

- Web app statique, sans serveur : HTML, CSS, TypeScript. Propose un outillage simple (par exemple Vite) et justifie ton choix. Évite les dépendances lourdes.
- PWA pour iOS :
  - manifest avec affichage standalone ;
  - icône originale, dont apple-touch-icon en 180×180 ;
  - balises apple-mobile-web-app-capable et status-bar-style ;
  - viewport-fit=cover et gestion des zones sûres (encoche de l'iPhone 13) ;
  - orientation portrait, pas de zoom intempestif.
- Service worker :
  - met en cache l'appli et la banque, pour que tout fonctionne hors ligne ;
  - affiche « Nouvelle version disponible » lors d'une mise à jour.
- Stockage local (IndexedDB) : historique des questions vues, statistiques, état de la carrière (champion, cagnotte, palmarès), joueurs du duel, questions générées par IA, signalements et réglages.
- Sauvegarde et restauration par export/import d'un fichier JSON depuis les réglages. C'est important : si la web app est supprimée de l'écran d'accueil, les données locales sont perdues.
- Chargement : ne charge pas toute la banque d'un coup, découpe-la par catégorie et par thème.
- Pas de vibrations, car elles ne sont pas prises en charge par les web apps sur iOS.
- Sons : effets courts originaux, générés en Web Audio (bonne réponse, mauvaise réponse, suspense, révélation, victoire), avec un bouton pour couper le son.
- Hébergement :
  - dépôt GitHub et GitHub Pages, avec déploiement automatique via GitHub Actions à chaque mise à jour ;
  - guide-moi pas à pas : création du dépôt, activation de Pages, adresse finale ;
  - puis installation sur l'iPhone : Safari → Partager → « Sur l'écran d'accueil ».
- Pendant le développement, permets-moi de tester sur l'iPhone via le Wi-Fi de la maison si c'est possible.

## 9. Interface et ambiance

- Tout est en français.
- Ambiance plateau télé :
  - fond sombre, projecteurs, couleurs vives ;
  - réponses qui s'illuminent à la révélation ;
  - fauteuil du champion et tableau des scores animés.
- Confort : utilisable d'une main sur iPhone 13, avec de grands boutons, un bon contraste et un texte lisible.
- Écran d'accueil :
  - titre « Paulo veut prendre la place » ;
  - les 3 modes : Carrière, Duel à deux, Partie rapide ;
  - mon statut actuel (par exemple « Champion depuis 7 victoires, cagnotte 12 400 € », ou « Candidat ») ;
  - accès aux Statistiques et aux Réglages.
- Statistiques :
  - taux de réussite par catégorie et par niveau ;
  - modes de réponse utilisés et leur réussite ;
  - séries et palmarès ;
  - nombre de questions inédites restantes.
- Réglages :
  - son et chrono ;
  - clé API et génération automatique ;
  - signalements ;
  - sauvegarde et restauration ;
  - remise à zéro, avec double confirmation.

## 10. Phases de développement

1. **Fondations**
   - Plan et CLAUDE.md.
   - Squelette de la PWA.
   - Format de la banque, avec environ 300 questions, 20 thèmes et le script de contrôle.
   - Mode Partie rapide complet : réponses cash tolérantes, anti-répétition, signalement.
   - Déploiement sur GitHub Pages et installation sur mon iPhone.
   - → Je teste avant de continuer.
2. **Mode Carrière** : adversaires virtuels, Qualifs, Compet', Défi, statut de champion, cagnotte, palmarès, reprise de partie.
3. **Duel à deux.**
4. **Génération automatique par IA** : réglages, déclenchement automatique, thème libre, contrôle qualité, garde-fous de coût.
5. **Finitions** :
   - agrandissement de la banque jusqu'aux objectifs de la section 6.3, en plusieurs sessions ;
   - la Négo ;
   - sons et animations ;
   - statistiques détaillées, sauvegarde et restauration.

---

## 11. Plan technique, décisions et avancement (tenu à jour par Claude)

### Décisions prises avec Paul (30/09/2026)

- **Aucune dépense.** Paul ne veut rien payer en plus de son abonnement Claude. La génération par IA dans l'appli (phase 4) passerait par une clé API facturée à part : elle reste **optionnelle et désactivée**. C'est Claude qui agrandit la banque au fil des sessions. Conséquence : pas de « Thème libre » sans clé.
- **GitHub** : Paul n'a pas encore de compte. Il le créera à l'étape 1.5 (gratuit), avec un guidage pas à pas.
- **Règles cash complémentaires** (validées) :
  - les nombres sont toujours exacts, y compris dans un nom (« Louis XV » ≠ « Louis XIV ») ;
  - aucune faute tolérée jusqu'à 3 lettres ;
  - les lettres isolées sont exactes (« vitamine E » ≠ « vitamine D ») ;
  - réponse refusée si elle est égale ou plus proche d'une mauvaise proposition, ou de son dernier mot (« Manet » pour « Monet ») ;
  - deux lettres inversées comptent pour une seule faute.

### Outils

- Vite 8, TypeScript 7, Preact 11, vite-plugin-pwa (service worker, mise à jour), idb (IndexedDB), Vitest, tsx.
- `npm run dev` : serveur de test, accessible depuis l'iPhone sur le même Wi-Fi (adresse « Network » affichée).
- `npm test` : tests automatiques.
- `npm run formater-banque` : complète les champs automatiques (id, catégorie, thème, origine, date) et régénère `public/data/index.json`.
- `npm run check-questions` : contrôle de la banque.
- `npm run build` : formate, contrôle, vérifie les types et construit `dist/`.

### Organisation du code

- `src/logique/` : règles pures et testées (texte, cash, scores, tirage, propositions, hasard, types, catégories, **adversaires**, **carriere**).
- `src/stockage/db.ts` : IndexedDB (historique, journal, signalements, réglages, records, questions IA).
- `src/donnees/banque.ts` : chargement de la banque, fichier par fichier.
- `src/jeu/` : préparation des parties (`partieRapide.ts`, `carriere.ts` : déroulé complet d'une émission, enregistré après chaque étape pour la reprise).
- `src/composants/` : `CarteQuestion` (une question, du choix du mode à la correction), modale de signalement, etc.
- `src/ecrans/` : Accueil, Partie rapide (config, jeu, fin), Réglages, `carriere/` (accueil Carrière, partie, manches, Défi, palmarès).
- `src/composants/` : aussi `Avatar`, `TableauScores` (lignes qui glissent), `Defile` (réponses des adversaires avec Accélérer/Passer), `SaisieNombre`.
- `public/data/` : la banque (`categories/*.json`, `themes/*.json`, `departage.json`, `index.json` généré).

### Écrire des questions

- Une question par ligne. Pour en ajouter, écrire seulement `niveau`, `question`, `reponse`, `variantes`, `mauvaises`, `anecdote`, puis lancer `npm run formater-banque` et `npm run check-questions`.
- Dans un même thème, aucune question ni anecdote ne doit révéler la réponse d'une autre question du thème.
- Éviter les réponses cash de plus de 4 mots ; lister les variantes (nom seul, orthographes).

### Git

- Compte GitHub de Paul : **Paul5489**. Identité des commits : « Paul <196360979+Paul5489@users.noreply.github.com> » (adresse privée fournie par GitHub : le dépôt est public, l'e-mail personnel de Paul ne doit jamais y apparaître).

### Avancement

- Phase 1 :
  - [x] Plan et CLAUDE.md
  - [x] Squelette de la PWA (icône, manifest, hors ligne, bannière de mise à jour)
  - [x] Moteur testé : validation cash, scores, tirage sans répétition
  - [x] Banque de départ : 331 questions générales, 20 thèmes (13 à 15 questions chacun), 30 départages, scripts de contrôle
  - [x] Partie rapide complète : choix du mode, cash tolérant, contestation, signalement, chrono, records par niveau
  - [x] Déploiement sur GitHub Pages (automatique à chaque envoi sur `main`)
  - [x] Installation et test sur l'iPhone par Paul (validé le 30/09/2026)
- Phase 2 (Carrière) :
  - [x] Adversaires virtuels (identité, profil par catégorie, choix du mode selon la confiance, erreurs plausibles, temps de réflexion)
  - [x] Qualifs (3 collectives + 2 tours individuels), départage numérique, Compet' (8 questions + super cash), Défi (thèmes, correction différée, révélation, contestation)
  - [x] Fauteuil du champion : cagnotte, victoires, trophées, progression (option), préliminaires simulés quand Paul est champion
  - [x] Palmarès, reprise de partie, statut sur l'accueil
  - [x] Sauvegarde / restauration des données (avancée depuis la phase 5)
  - [x] Plateau télé (demande de Paul) : avatars dessinés, pupitres avec buzzers, bulles de réponse, projecteur, fauteuil doré, look du joueur modifiable (Réglages)
  - [x] Plateau vérifié à l'écran (et plantage du début du Défi corrigé) ; Paul a validé la Carrière

### Choix de règles (phase 2)

- Gagner le Défi compte comme la 1re victoire du nouveau champion (cagnotte de départ = score × 100 €).
- Quand Paul est éliminé, la fin de l'émission est simulée en coulisses : le champion virtuel peut être détrôné par un autre candidat.
- Quand Paul est champion, Qualifs et Compet' sont simulées sans questions réelles (scores seulement) ; en cas d'égalité en tête de Compet', c'est Paul qui choisit son challenger.
- Les questions montrées pendant le tour des adversaires sont marquées « vues » (reproposées en dernier) sans entrer dans les statistiques de Paul.
- Modèle des adversaires : compétence = niveau de la partie + force + bonus de catégorie (± progression) ; probabilité de réussite bornée entre 3 % et 97 %.
- « Thème libre » : non proposé tant que la génération par IA n'existe pas (phase 4, optionnelle).

### Adresses

- Appli : https://paul5489.github.io/paulo-veut-prendre-la-place/
- Dépôt (public) : https://github.com/Paul5489/paulo-veut-prendre-la-place
- Le Mac est connecté au compte GitHub de Paul via l'outil `gh` (installé avec Homebrew) : `git push` suffit pour publier.
- À faire plus tard : mettre à jour les versions des actions GitHub (avertissement « Node.js 20 is deprecated »), sans urgence.
