# Apprend+

Application web pour apprendre le vocabulaire français, destinée à des élèves chinois. Elle s'installe sur iPhone et Android comme une application (PWA) et fonctionne hors connexion.

Les élèves se connectent avec leur prénom. Un projet Supabase, facultatif, permet de garder la progression d'un téléphone à l'autre et donne accès au tableau de bord des profs (devoirs, suivi, classement).

## Contenu

- 9 niveaux, 21 étapes, 105 mots illustrés par des photos.
- Quatre types d'exercices : lettres à cliquer, mot à compléter, mot à écrire, devinette avec indice.
- Trois essais par exercice, puis une à trois étoiles selon le nombre d'erreurs.
- Onglets Accueil, Parcours, Carnet (mots appris, à réécouter) et Classement.

## Structure

| Fichier | Rôle |
|---|---|
| `index.html`, `app.js`, `styles.css` | Application élève |
| `data.js` | Niveaux, étapes et exercices |
| `images/`, `credits.js` | Photos (Wikimedia Commons) et leurs auteurs |
| `prof.html`, `prof.js`, `prof.css` | Tableau de bord des profs |
| `supabase/installation.sql` | Tables, règles d'accès et fonctions de la base |
| `.env` | Adresse et clé Supabase (non versionné) |
| `outils/generer-config.js` | Génère `config.js` à partir de `.env` |
| `service-worker.js` | Cache hors connexion et mises à jour |
| `manifest.json`, `icons/` | Installation sur l'écran d'accueil |
| `netlify.toml`, `vercel.json` | Déploiement et en-têtes de sécurité |

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

## Mettre en ligne

Le site doit être servi en HTTPS. Netlify, Vercel et GitHub Pages conviennent. Les fichiers `netlify.toml` et `vercel.json` ajoutent les en-têtes de sécurité et bloquent l'accès à `.env`, `outils/` et `supabase/`.

`config.js` est généré en local à partir de `.env`, puis envoyé sur GitHub avec le reste du code. L'hébergeur publie les fichiers tels quels, sans étape de build. Après un changement de `.env`, relancer `node outils/generer-config.js` avant de pousser.

## Mises à jour

Augmenter `VERSION` dans `service-worker.js` à chaque mise en ligne. Les téléphones téléchargent la nouvelle version en arrière-plan et l'installent dès que l'élève n'est pas au milieu d'un exercice.

## Ajouter du contenu

Les niveaux sont décrits dans `data.js`. Chaque niveau a un `id` qui ne doit jamais changer, car il sert à enregistrer la progression. L'ordre du tableau donne l'ordre d'affichage. Les photos vont dans `images/` (JPG d'environ 500 px de large) et leur auteur dans `credits.js`.

À la correction, les majuscules, les accents, les espaces et les tirets sont ignorés : `grand-mere` est accepté pour « grand-mère ».

## Sécurité

- Aucune table n'est lisible avec la clé publique. Les élèves passent par trois fonctions SQL qui valident les données : format des étapes, scores plafonnés, dates bornées, nombre d'envois limité par heure.
- Le tableau de bord est réservé aux comptes listés dans la table `profs`, avec un e-mail confirmé.
- Une politique de sécurité du contenu (CSP) n'autorise que les scripts du site et les appels vers Supabase.
- Les noms affichés sont échappés, et l'export CSV neutralise les cellules qui pourraient être lues comme des formules.
- `.env` n'est ni versionné ni servi. Il ne doit contenir que la clé anon, jamais la clé service_role.

Limite connue : la connexion par prénom ne protège pas un compte élève contre quelqu'un qui connaît ce prénom. C'est un choix de simplicité pour de jeunes élèves.

## Licences des photos

Les photos viennent de Wikimedia Commons sous licences libres (CC BY, CC BY-SA, domaine public). Les auteurs sont cités dans l'écran Crédits photos de l'application, à partir de `credits.js`.
