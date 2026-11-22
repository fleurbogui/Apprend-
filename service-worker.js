// Service worker : met l'application en cache pour qu'elle fonctionne hors ligne.
// Il doit rester à la racine du site. Augmenter VERSION à chaque mise en ligne.

const VERSION = 'v2.9.0';
const NOM_CACHE = 'apprend-plus-' + VERSION;

// La liste des photos est lue dans data.js.
importScripts('./data.js');
const PHOTOS = [];
NIVEAUX.forEach((niv) => {
  if (niv.image) PHOTOS.push(niv.image);
  niv.etapes.forEach((etape) => etape.forEach((ex) => {
    if (/\.(png|jpe?g|gif|svg|webp|avif)$/i.test(ex.image || '')) PHOTOS.push(ex.image);
  }));
});

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

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(NOM_CACHE).then((cache) =>
      cache.addAll(FICHIERS_APPLI.map((url) => new Request(url, { cache: 'reload' })))
    )
  );
  // Pas de skipWaiting ici : app.js l'envoie quand l'élève n'est pas en plein exercice.
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((noms) => Promise.all(
        noms.filter((nom) => /^(apprend-plus|francais-aventures)-/.test(nom) && nom !== NOM_CACHE)
            .map((nom) => caches.delete(nom))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Le tableau de bord prof n'est jamais mis en cache.
  if (/\/prof(\.html|\.js|\.css)?$/.test(url.pathname)) return;

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
