# Guide prof

Ce guide explique comment relier l'application à Supabase et comment utiliser le tableau de bord.

Sans serveur, l'application fonctionne, mais la progression reste sur chaque téléphone et le tableau de bord ne montre rien. Avec Supabase (offre gratuite), les élèves retrouvent leur progression sur n'importe quel téléphone et le prof suit tout depuis `prof.html`.

Comptez environ 15 minutes, à faire une seule fois.

## 1. Créer le projet Supabase

1. Créer un compte sur https://supabase.com.
2. Créer un projet (New project) :
   - Name : `francais-aventures`
   - Database password : à noter, il ne sera pas redemandé
   - Region : la plus proche des élèves (Northeast Asia (Tokyo) pour la Chine, West EU (Paris) pour la France)
3. Attendre une à deux minutes que le projet soit prêt.

## 2. Créer les tables

1. Ouvrir `supabase/installation.sql`.
2. Dans la commande `insert into public.profs`, remplacer l'adresse par votre e-mail.
3. Dans Supabase, ouvrir SQL Editor, New query, coller tout le fichier, puis Run.
4. Le message attendu est « Success. No rows returned ».

Le script peut être relancé sans perte de données. Il faut le relancer après chaque mise à jour de l'application, car il installe les nouvelles fonctions et règles de sécurité.

## 3. Créer le compte prof

1. Authentication, Users, Add user, Create new user.
2. Utiliser le même e-mail qu'à l'étape 2 et choisir un mot de passe solide.
3. Cocher Auto Confirm User, puis Create user.
4. Dans Authentication, Sign In / Providers, désactiver « Allow new users to sign up ». Personne d'autre ne pourra alors créer de compte.

Seuls les comptes dont l'e-mail figure dans la table `profs` et a été confirmé peuvent voir les résultats.

## 4. Relier l'application au serveur

1. Dans Project Settings, API (ou Data API / API Keys), copier Project URL et la clé anon public (ou publishable).
2. Les coller dans le fichier `.env`, sans guillemets :

   ```
   SUPABASE_URL=https://abcdxyz.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

   Ne jamais utiliser la clé service_role ou secret. Le script la refuse.

3. Dans un terminal ouvert dans le dossier de l'application :

   ```
   node outils/generer-config.js
   ```

   Le script écrit `config.js` et augmente `VERSION` dans `service-worker.js`.

4. Mettre le dossier en ligne (par exemple sur https://app.netlify.com/drop).

Si le site est relié à GitHub, `.env` n'y est pas envoyé. Il faut alors saisir `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans les variables d'environnement de Netlify (Site configuration, Environment variables) ou de Vercel (Settings, Environment Variables). Le script est lancé automatiquement à chaque déploiement.

## 5. Le tableau de bord

Ouvrir `https://votre-site/prof.html` sur un ordinateur et se connecter avec le compte de l'étape 3.

| Onglet | Contenu |
|---|---|
| Vue d'ensemble | Élèves actifs cette semaine, taux de devoirs rendus, étapes terminées par jour, élèves à surveiller, classement de la semaine. |
| Devoirs | Création d'un devoir (titre, étapes, date limite). Les élèves le voient sur leur accueil et les étapes sont débloquées pour eux. Un clic sur un devoir donne le détail par élève : fait, rendu en retard ou non rendu, avec les étoiles et le temps passé. |
| Élèves | Dernière activité, activité sur 14 jours, étapes, étoiles, temps et devoirs rendus. Un clic sur un élève ouvre son historique. Le bouton Exporter (CSV) produit un fichier lisible dans Excel. |

Pour vérifier qu'un devoir a vraiment été fait :

- seules les étapes jouées après la création du devoir comptent ;
- une étape faite en moins de 6 secondes par mot est signalée comme trop rapide ;
- une étape où plus de 2 exercices ont été passés est signalée ;
- le temps passé ne compte pas les moments où l'application est fermée.

Ces seuils se règlent dans `prof.js` (constante `REGLES`).

## Le classement

L'onglet Classement de l'application propose deux classements :

- Cette semaine : points gagnés depuis lundi, remis à zéro chaque lundi ;
- Général : total des étoiles.

Chaque élève voit le podium, le top 20, sa place et l'écart avec l'élève juste devant lui.

Une étape ne rapporte des points qu'une fois par jour, et les étapes faites trop vite ne rapportent rien. Les élèves ne voient que les prénoms et les scores des autres.

## Ajouter un autre prof

1. Dans SQL Editor : `insert into public.profs (email) values ('collegue@ecole.fr');`
2. Dans Authentication, Users, créer un compte avec ce même e-mail.

## Sécurité

- La clé anon présente dans `config.js` est publique par nature. Elle ne donne accès à aucune table : les élèves passent uniquement par trois fonctions qui contrôlent toutes les valeurs reçues (format des étapes, scores plafonnés, dates bornées, nombre d'envois limité par heure).
- Le tableau de bord n'est accessible qu'aux profs listés dans la table `profs`, avec un e-mail confirmé.
- Les pages sont protégées par une politique de sécurité du contenu (CSP) qui bloque les scripts extérieurs.
- La connexion des élèves se fait par prénom seulement. C'est simple pour les enfants, mais un élève qui tape le prénom d'un autre jouera sur son compte, et deux élèves qui ont le même prénom partagent leur progression. Demandez-leur d'écrire le prénom suivi de l'initiale du nom, toujours de la même façon (par exemple `Li W.`).

## À savoir

- Hors connexion, les étapes terminées sont envoyées au prochain lancement avec Internet.
- Pour supprimer un élève (faute de frappe, doublon) : fiche de l'élève, Supprimer cet élève. C'est définitif.
- Un projet Supabase gratuit est mis en pause après 7 jours sans activité. Les élèves continuent de jouer hors connexion. Pour le réactiver : supabase.com, votre projet, Restore.
- Seuls les prénoms et les résultats sont enregistrés, et les prénoms sont visibles par les autres élèves dans le classement. Informez les familles selon les règles de votre établissement.
