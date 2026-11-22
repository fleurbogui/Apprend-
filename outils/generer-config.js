/* =====================================================================
   ⚙️ GÉNÉRER config.js À PARTIR DU FICHIER .env
   ---------------------------------------------------------------------
   Utilisation (dans le dossier de l'appli) :   node outils/generer-config.js

   • Lit .env (ou, s'il n'existe pas, les variables d'environnement :
     pratique sur Netlify / Vercel, où on les saisit dans le site).
   • Vérifie l'adresse et refuse la clé secrète "service_role".
   • Écrit config.js, puis augmente VERSION dans service-worker.js si la
     configuration a changé (sinon les téléphones garderaient l'ancienne).
   Aucune installation nécessaire : Node.js suffit.
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const racine = path.join(__dirname, '..');
const fichierEnv = path.join(racine, '.env');
const fichierConfig = path.join(racine, 'config.js');
const fichierSW = path.join(racine, 'service-worker.js');

function arreter(message) {
  console.error('\n❌ ' + message + '\n');
  process.exit(1);
}

/* ---------- Lecture du .env (format CLE=valeur, # pour les commentaires) ---------- */
function lireEnv(fichier) {
  const vars = {};
  fs.readFileSync(fichier, 'utf8').split(/\r?\n/).forEach((ligne) => {
    const m = ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (!m) return;
    vars[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
  return vars;
}

const depuisFichier = fs.existsSync(fichierEnv);
const env = depuisFichier ? lireEnv(fichierEnv) : process.env;
const url = String(env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const cle = String(env.SUPABASE_ANON_KEY || '').trim();

/* ---------- Vérifications ---------- */
if (url && !/^https:\/\/[a-z0-9.-]+$/i.test(url)) {
  arreter(`SUPABASE_URL n'est pas valide : « ${url} »\n   Elle doit ressembler à https://abcdxyz.supabase.co`);
}
if (!!url !== !!cle) {
  arreter('Remplis les DEUX valeurs SUPABASE_URL et SUPABASE_ANON_KEY (ou aucune).');
}
if (cle) {
  if (/^sb_secret_/i.test(cle)) arreter('Ceci est une clé SECRÈTE (sb_secret_…). Mets la clé "publishable" / "anon".');
  if (/^eyJ/.test(cle)) {
    try {
      const charge = JSON.parse(Buffer.from(cle.split('.')[1], 'base64url').toString('utf8'));
      if (charge.role === 'service_role') arreter('Ceci est la clé "service_role" (secrète). Mets la clé "anon" / "public".');
    } catch (e) {
      arreter('SUPABASE_ANON_KEY semble incomplète (copie-la en entier).');
    }
  } else if (!/^sb_publishable_/i.test(cle)) {
    arreter('SUPABASE_ANON_KEY ne ressemble pas à une clé Supabase (elle commence par eyJ… ou sb_publishable_…).');
  }
}

/* ---------- Écriture de config.js ---------- */
const contenu = `/* =====================================================================
   🔌 CONNEXION AU SERVEUR (Supabase)
   ⚠️ Fichier GÉNÉRÉ par « node outils/generer-config.js » à partir de .env
      Ne le modifie pas à la main : change .env puis relance la commande.

   ✅ La clé "anon" peut être publique : les élèves ne peuvent rien lire
      grâce aux règles de sécurité du fichier supabase/installation.sql.
   ⛔ Ne mets JAMAIS la clé "service_role" / "secret".
   Sans valeurs, l'appli marche quand même, mais la progression reste
   uniquement sur le téléphone.
   ===================================================================== */
const CONFIG_SERVEUR = {
  url: ${JSON.stringify(url)},
  cleAnon: ${JSON.stringify(cle)}
};
`;

const ancien = fs.existsSync(fichierConfig) ? fs.readFileSync(fichierConfig, 'utf8') : '';
const valeurs = (t) => (t.match(/url:\s*(['"])(.*?)\1[\s\S]*?cleAnon:\s*(['"])(.*?)\3/) || []).filter((_, i) => i === 2 || i === 4).join('|');
const change = valeurs(ancien) !== valeurs(contenu);
fs.writeFileSync(fichierConfig, contenu, 'utf8');

/* ---------- Nouvelle version du Service Worker si la config a changé ---------- */
let versionTexte = '';
if (change && fs.existsSync(fichierSW)) {
  const sw = fs.readFileSync(fichierSW, 'utf8');
  const m = sw.match(/const VERSION = 'v(\d+)\.(\d+)\.(\d+)'/);
  if (m) {
    const nouvelle = `v${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
    fs.writeFileSync(fichierSW, sw.replace(m[0], `const VERSION = '${nouvelle}'`), 'utf8');
    versionTexte = `\n   Version de l'appli : v${m[1]}.${m[2]}.${m[3]} → ${nouvelle} (les téléphones recevront la mise à jour)`;
  }
}

console.log(`\n✅ config.js ${change ? 'mis à jour' : 'inchangé'} (source : ${depuisFichier ? '.env' : "variables d'environnement"})`);
console.log(url ? `   Serveur : ${url}` : '   Aucun serveur : la progression restera sur chaque téléphone.');
if (versionTexte) console.log(versionTexte);
console.log('');
