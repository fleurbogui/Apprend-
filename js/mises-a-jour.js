// Service worker : mode hors ligne et mises à jour automatiques.
// Une nouvelle version s'installe seule, mais jamais pendant un exercice ou une saisie.
import { $, ecouter, toast } from './outils.js';
import { etat } from './etat.js';

let enAttente = null;
let demandee = false;

function momentCalme() {
  const saisie = document.activeElement && document.activeElement.matches('input, textarea');
  return !etat.session && !['etape', 'resultat'].includes(etat.ecran) && !saisie && $('#modale').hidden;
}

export function essayerMiseAJour() {
  if (!enAttente || demandee || !momentCalme()) return;
  demandee = true;
  try { sessionStorage.setItem('maj-faite', '1'); } catch (e) {}
  enAttente.postMessage({ type: 'SKIP_WAITING' });
}

function proposer(travailleur) {
  enAttente = travailleur;
  essayerMiseAJour();
}

export function installerMisesAJour() {
  try {
    if (sessionStorage.getItem('maj-faite')) {
      sessionStorage.removeItem('maj-faite');
      setTimeout(() => toast('Appli mise à jour'), 600);
    }
  } catch (e) {}

  ecouter('navigation', essayerMiseAJour);
  ecouter('modale-fermee', () => setTimeout(essayerMiseAJour, 0));

  const autorise = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!('serviceWorker' in navigator) || !autorise) return;

  navigator.serviceWorker.register('./service-worker.js').then((reg) => {
    if (reg.waiting && navigator.serviceWorker.controller) proposer(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nouveau = reg.installing;
      if (!nouveau) return;
      nouveau.addEventListener('statechange', () => {
        if (nouveau.state === 'installed' && navigator.serviceWorker.controller) proposer(nouveau);
      });
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
      essayerMiseAJour();
    });
  }).catch((err) => console.warn('Service worker non enregistré :', err));

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (demandee) location.reload();
  });
}
