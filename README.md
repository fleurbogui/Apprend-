# Apprend+

Application web pour apprendre le vocabulaire français, destinée à des élèves chinois. Elle s'installe sur iPhone et Android comme une application (PWA) et fonctionne hors connexion.

Les élèves se connectent avec leur prénom et un code secret de 4 chiffres. Un projet Supabase, facultatif, permet de garder la progression d'un téléphone à l'autre et donne accès au tableau de bord des profs (devoirs, suivi, classement).

## Contenu

- 9 niveaux, 21 étapes, 105 mots illustrés par des photos.
- Quatre types d'exercices : lettres à cliquer, mot à compléter, mot à écrire, devinette avec indice.
- Trois essais par exercice, puis une à trois étoiles selon le nombre d'erreurs.
- Onglets Accueil, Parcours, Carnet (mots appris, à réécouter) et Classement.
- Coco, un petit coq, guide l'élève : il donne les consignes et réagit aux réponses dans des bulles de BD.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `js/`, `css/`, `fonts/` | Application élève (détail ci-dessous) |
| `data.js` | Niveaux, étapes et exercices |
| `images/`, `credits.js` | Photos (Wikimedia Commons) et leurs auteurs |
| `prof.html`, `prof.js`, `prof.css` | Tableau de bord des profs |
| `supabase/installation.sql` | Tables, règles d'accès et fonctions de la base |
| `.env` | Adresse et clé Supabase (non versionné) |
| `outils/generer-config.js` | Génère `config.js` à partir de `.env` |
| `service-worker.js` | Cache hors connexion et mises à jour |
| `manifest.json`, `icons/` | Installation sur l'écran d'accueil |
| `netlify.toml`, `vercel.json` | Déploiement et en-têtes de sécurité |

## Organisation du code

L'application élève est écrite en modules JavaScript, sans outil de build. `index.html` charge d'abord `config.js`, `data.js` et `credits.js`, puis `js/main.js`.

| Fichier | Rôle |
|---|---|
| `js/main.js` | Démarrage, routes (`#/parcours`, `#/etape/N/E`...) et actions communes |
| `js/donnees.js` | Accès aux niveaux, aux crédits et à la configuration du serveur |
| `js/reglages.js` | Réglages du jeu : essais, points, pénalités, types d'exercices |
| `js/outils.js` | Petites fonctions partagées et canal d'événements entre modules |
| `js/profils.js` | Profils des élèves gardés sur le téléphone |
| `js/progression.js` | Étapes faites, étoiles, déblocage, devoirs, série de jours |
| `js/sync.js` | Échanges avec Supabase et envoi des étapes en attente |
| `js/navigation.js`, `js/actions.js` | Navigation par adresse et gestion des boutons (`data-action`) |
| `js/mascotte.js` | Coco (dessin SVG, quatre humeurs) et ses bulles |
| `js/ecrans/` | Un fichier par écran : connexion, accueil, parcours, carnet, classement, crédits, menu |
| `js/jeu/` | Déroulement des exercices et écran de résultat |
| `js/ui/` | Éléments partagés : barre du haut, navigation, chemin, feuille du bas |
| `js/mises-a-jour.js` | Enregistrement du service worker et mise à jour automatique |
| `css/base.css` | Couleurs, polices, boutons, cartes, champs |
| `css/coco.css`, `css/navigation.css`, `css/ecrans.css`, `css/jeu.css` | Styles par partie de l'appli |

Chaque bouton porte un attribut `data-action`. Le module qui le gère le déclare avec `surActions({ nom: fonction })`. Pour ajouter un fichier dans `js/` ou `css/`, il faut aussi l'ajouter à la liste `CODE` de `service-worker.js`, sinon il ne sera pas disponible hors connexion.

Les polices Baloo 2 et Nunito (licence SIL Open Font License) sont dans `fonts/`.

## Lancer en local

```
python -m http.server 8000
```

Puis ouvrir http://localhost:8000. Le tableau de bord est sur http://localhost:8000/prof.html.

## Configurer Supabase

1. Exécuter `supabase/installation.sql` dans le SQL Editor du projet, après y avoir mis l'e-mail du prof.
2. Créer le compte du prof dans Authentication, puis désactiver les inscriptions.
3. Remplir `.env` (voir `.env.example`) puis lancer `node outils/generer-config.js`.

Le détail est dans `GUIDE-PROF.md`.

Base déjà installée : exécuter aussi `supabase/maj-eleves-supprimes.sql`. Il donne au prof le droit de supprimer un élève (avec sa progression) et ajoute `eleves_absents`, qui retire les élèves supprimés des téléphones.

## Mettre en ligne

Le site doit être servi en HTTPS. Netlify, Vercel et GitHub Pages conviennent. Les fichiers `netlify.toml` et `vercel.json` ajoutent les en-têtes de sécurité et bloquent l'accès à `.env`, `outils/` et `supabase/`.

`config.js` est généré en local à partir de `.env`, puis envoyé sur GitHub avec le reste du code. L'hébergeur publie les fichiers tels quels, sans étape de build. Après un changement de `.env`, relancer `node outils/generer-config.js` avant de pousser.

## Mises à jour

Augmenter `VERSION` dans `service-worker.js` à chaque mise en ligne. Les téléphones téléchargent la nouvelle version en arrière-plan et l'installent dès que l'élève n'est pas au milieu d'un exercice.

## Ajouter du contenu

Les niveaux sont décrits dans `data.js`. Chaque niveau a un `id` qui ne doit jamais changer, car il sert à enregistrer la progression. L'ordre du tableau donne l'ordre d'affichage. Les photos vont dans `images/` (JPG d'environ 500 px de large) et leur auteur dans `credits.js`.

À la correction, les majuscules, les accents, les espaces et les tirets sont ignorés : `grand-mere` est accepté pour « grand-mère ».

## Sécurité

- Chaque élève a un code secret de 4 chiffres, gardé haché (bcrypt) sur le serveur. Après 5 codes faux, le compte est bloqué 15 minutes. Le prof peut remettre un code à zéro depuis le tableau de bord.
- Une fois connecté, le téléphone utilise un jeton de session aléatoire. Le serveur n'en garde que l'empreinte SHA-256, et une remise à zéro du code déconnecte tous les téléphones de l'élève.
- Aucune table n'est lisible avec la clé publique. Les élèves passent par des fonctions SQL qui valident les données : format des étapes, scores plafonnés, dates bornées, nombre d'envois limité par heure.
- Le tableau de bord est réservé aux comptes listés dans la table `profs`, avec un e-mail confirmé.
- Une politique de sécurité du contenu (CSP) n'autorise que les scripts du site et les appels vers Supabase.
- Les noms affichés sont échappés, et l'export CSV neutralise les cellules qui pourraient être lues comme des formules.
- `.env` n'est ni versionné ni servi. Il ne doit contenir que la clé anon, jamais la clé service_role.

Limite connue : un code de 4 chiffres reste court. Le blocage après 5 essais rend sa recherche très lente, mais un élève qui voit un camarade taper son code peut s'en servir. Dans ce cas, le prof remet le code à zéro.

## Licences des photos

Les photos viennent de Wikimedia Commons sous licences libres (CC BY, CC BY-SA, domaine public). Les auteurs sont cités dans l'écran Crédits photos de l'application, à partir de `credits.js`.
