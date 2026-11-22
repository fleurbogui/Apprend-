/* =====================================================================
   ⚙️ SERVICE WORKER — Le Français en Aventures
   ---------------------------------------------------------------------
   Rôle : enregistrer l'appli dans le téléphone pour qu'elle marche
   HORS-LIGNE après la première visite.

   ⚠️ Ce fichier DOIT rester à la racine du site, à côté de index.html.

   🔄 POUR PUBLIER UNE MISE À JOUR :
      1. Modifie tes fichiers (data.js, styles.css, ...)
      2. Augmente VERSION ci-dessous (ex. 'v1.0.0' → 'v1.0.1')
      3. Mets en ligne. Au prochain lancement avec Internet, l'appli
         affiche « Nouvelle version ! Mettre à jour ».
   ===================================================================== */

const VERSION = 'v2.4.0';
const NOM_CACHE = 'francais-aventures-' + VERSION;

// On lit data.js pour connaître automatiquement toutes les photos des exercices
// → rien à ajouter ici quand tu crées de nouveaux exercices.
importScripts('./data.js');
const PHOTOS = [];
NIVEAUX.forEach((niv) => {
  if (niv.image) PHOTOS.push(niv.image);
  niv.etapes.forEach((etape) => etape.forEach((ex) => {
    if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(ex.image || '')) PHOTOS.push(ex.image);
  }));
});

// Fichiers indispensables, mis en cache dès l'installation (≈ 5 Mo avec les photos)
const FICHIERS_APPLI = [
  './',
  './index.html',
  './styles.css',
  './config.js',
  './data.js',
  './credits.js',
  './app.js',
  './manifest.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  ...[...new Set(PHOTOS)].map((p) => './' + p.replace(/^\.?\//, ''))
];

/* 1) Installation : on télécharge tous les fichiers dans le cache */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOM_CACHE).then((cache) =>
      // cache: 'reload' → on ignore le cache HTTP pour avoir les fichiers frais
      cache.addAll(FICHIERS_APPLI.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Pas de skipWaiting ici : l'appli l'envoie elle-même (message SKIP_WAITING)
  // dès que l'élève n'est pas au milieu d'un exercice → mise à jour automatique.
});

/* 2) Activation : on supprime les anciennes versions du cache */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms.filter((nom) => nom.startsWith('francais-aventures-') && nom !== NOM_CACHE)
            .map((nom) => caches.delete(nom))
      ))
      .then(() => self.clients.claim())
  );
});

/* 3) Message depuis l'appli : la nouvelle version prend la main (mise à jour automatique) */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* 4) Requêtes : "cache d'abord" (rapide + hors-ligne), réseau en secours */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // on ne touche pas aux autres sites

  // Tableau de bord du prof : toujours la version en ligne (jamais en cache)
  if (/\/prof(\.html|\.js|\.css)?$/.test(url.pathname)) return;

  // Ouverture de l'appli → index.html depuis le cache, même hors-ligne
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((rep) => rep || fetch(req))
        .catch(() => caches.match('./'))
    );
    return;
  }

  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((enCache) => {
      if (enCache) return enCache;
      // Pas en cache (ex. nouvelle image) → réseau, puis on garde une copie
      return fetch(req).then((rep) => {
        if (rep && rep.ok && rep.type === 'basic') {
          const copie = rep.clone();
          caches.open(NOM_CACHE).then((cache) => cache.put(req, copie));
        }
        return rep;
      });
    })
  );
});
