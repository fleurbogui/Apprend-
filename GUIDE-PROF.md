# 👩‍🏫 Guide prof — brancher le serveur et suivre ses élèves

Sans serveur, l'appli fonctionne, mais la progression reste sur chaque téléphone et le tableau de bord est vide.
Avec **Supabase** (gratuit), les élèves retrouvent leur progression sur n'importe quel téléphone, et le prof voit tout sur `prof.html`.

Durée : environ 15 minutes, une seule fois.

---

## 1. Créer le projet Supabase

1. Va sur <https://supabase.com> → **Start your project** → crée un compte.
2. **New project** :
   - *Name* : `francais-aventures`
   - *Database password* : choisis-en un et garde-le (il ne sera pas demandé ailleurs)
   - *Region* : la plus proche de tes élèves (ex. *Northeast Asia (Tokyo)* pour la Chine, *West EU (Paris)* pour la France)
3. Attends 1 à 2 minutes que le projet soit prêt.

## 2. Créer les tables (copier-coller)

1. Ouvre le fichier `supabase/installation.sql` de ce dossier.
2. À la ligne marquée ✏️, remplace `prof@exemple.com` par **ton e-mail**.
3. Dans Supabase : menu de gauche **SQL Editor** → **New query** → colle tout le fichier → **Run**.
4. Tu dois voir « Success. No rows returned ».

Tu peux relancer ce script plus tard sans rien perdre. **Après chaque mise à jour de l'appli, relance-le** : il ajoute les nouvelles fonctions (par exemple le classement) sans effacer les élèves ni leurs résultats.

## 3. Créer ton compte prof

1. **Authentication** → **Users** → **Add user** → **Create new user**.
2. Mets **le même e-mail** qu'à l'étape 2 et un mot de passe.
3. Coche **Auto Confirm User** → **Create user**.

🔒 Conseillé : **Authentication** → **Sign In / Providers** (ou *Settings*) → désactive **Allow new users to sign up**.
Ainsi, personne d'autre ne peut créer de compte. Même sans ça, seuls les e-mails de la table `profs` voient les résultats.

## 4. Relier l'appli au serveur

1. **Project Settings** → **API** (ou **Data API** / **API Keys**).
2. Copie **Project URL** et la clé **anon public** (ou *publishable*).
3. Ouvre le fichier **`.env`** (à la racine du dossier) et colle-les, sans guillemets :

```
SUPABASE_URL=https://abcdxyz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
```

⛔ Ne colle jamais la clé **service_role / secret** (le script la refuse).

4. Dans un terminal ouvert dans le dossier de l'appli, lance :

```
node outils/generer-config.js
```

   Le script crée `config.js` et augmente tout seul `VERSION` dans `service-worker.js`. Il faut [Node.js](https://nodejs.org), déjà installé sur ton ordinateur.
5. Remets le dossier en ligne (Netlify : glisse le dossier sur <https://app.netlify.com/drop>, ou sur ton site existant → *Deploys*).

**Site relié à GitHub (Netlify ou Vercel)** : `.env` n'est pas envoyé sur GitHub (il est dans `.gitignore`). Saisis plutôt `SUPABASE_URL` et `SUPABASE_ANON_KEY` dans le site :
- Netlify : *Site configuration → Environment variables* ;
- Vercel : *Settings → Environment Variables*.

Le script est alors lancé automatiquement à chaque mise en ligne (`netlify.toml` / `vercel.json`).

## 5. Utiliser le tableau de bord

Ouvre **`https://ton-site.netlify.app/prof.html`** sur un ordinateur, puis connecte-toi avec l'e-mail et le mot de passe de l'étape 3.

| Onglet | Ce que tu y trouves |
|---|---|
| **Vue d'ensemble** | Élèves actifs cette semaine, taux de devoirs rendus, étapes terminées par jour, et les élèves **à surveiller** (devoirs manqués, réponses trop rapides, inactivité). |
| **Devoirs** | Créer un devoir : titre, étapes, date limite. Les élèves le voient en haut de leur appli, et les étapes sont débloquées pour eux. Clique sur un devoir pour voir, élève par élève : ✓ fait, ⏰ en retard, ✗ non rendu, avec les étoiles et le temps passé. |
| **Élèves** | Pour chaque élève : dernière activité, activité des 14 derniers jours, étapes, étoiles, temps et devoirs rendus. Clique sur un élève pour voir tout son historique. **Exporter (CSV)** ouvre la liste dans Excel. |

**Comment savoir si un élève a vraiment fait ses devoirs ?**
- Seules les étapes jouées **après** la création du devoir comptent.
- ⚡ **Trop rapide** : moins de 6 secondes par mot sur une étape. L'élève a sans doute cliqué au hasard.
- ⏭ **Exercices passés** : plus de 2 exercices passés sur une étape.
- Le **temps passé** ne compte pas les moments où l'appli est fermée ou en arrière-plan.
- Les seuils se règlent en haut de `prof.js` (`REGLES`).

## 🏆 Le classement

Les élèves ont un écran **Classement** (bouton 🏆 sur l'accueil de l'appli) avec deux onglets :
- **Cette semaine** : points gagnés depuis lundi. Il repart de zéro chaque lundi, pour que tout le monde ait sa chance.
- **Général** : total des étoiles depuis le début.

Chaque élève voit le podium, le top 20, sa place et l'écart avec l'élève juste devant lui (« Encore 15 points pour dépasser Li ! »).

Pour que le classement récompense le vrai travail :
- une étape rapporte ses points **une seule fois par jour** (le meilleur essai). Rejouer 20 fois la même étape facile ne sert à rien ;
- les étapes faites **trop vite** (moins de 6 s par mot) ne rapportent aucun point.

Tu retrouves le même classement en bas de la **Vue d'ensemble** du tableau de bord.
Les élèves ne voient que les **prénoms** et les scores des autres, jamais les erreurs, les devoirs ou les alertes.

## Ajouter un autre prof

1. Supabase → **SQL Editor** : `insert into public.profs (email) values ('collegue@ecole.fr');`
2. **Authentication → Users → Add user** avec ce même e-mail.

## À savoir

- **Connexion par prénom** : un élève qui tape le prénom d'un autre jouera sur son compte, et deux élèves qui ont le même prénom partagent leur progression. Demande-leur d'écrire **prénom + initiale du nom**, toujours de la même façon (ex. `Li W.`). Majuscules et accents sont ignorés.
- **Hors-ligne** : les étapes terminées sans Internet partent automatiquement au prochain lancement avec réseau.
- **Supprimer un élève** (faute de frappe, doublon) : fiche de l'élève → *Supprimer cet élève*. C'est définitif.
- **Projet Supabase gratuit en pause** : si personne ne l'utilise pendant 7 jours, Supabase le met en pause. Les élèves continuent de jouer hors-ligne. Va sur supabase.com → ton projet → **Restore**, et tout ce qui attendait est envoyé.
- **Données personnelles** : seuls les prénoms et les résultats sont enregistrés (pas d'e-mail ni de mot de passe élève). Les prénoms sont visibles par les autres élèves dans le classement. Informe les familles selon les règles de ton établissement.
