// Navigation par adresse (#/...), compatible avec le bouton Retour d'Android.
// Les routes sont déclarées dans main.js avec definirRouteur().
import { emettre } from './outils.js';

let routeur = () => {};

export function definirRouteur(fn) { routeur = fn; }

export function afficherRoute() {
  routeur(location.hash.replace(/^#\/?/, '').split('/'));
  emettre('navigation');
}

export function aller(hash, remplacer = false) {
  const etat = history.state || {};
  if (remplacer) history.replaceState({ prev: etat.prev || null }, '', hash);
  else history.pushState({ prev: location.hash || '#/' }, '', hash);
  afficherRoute();
}

// Revient à l'écran demandé, en réutilisant l'historique s'il y mène
export function retourVers(hash) {
  const etat = history.state || {};
  if (etat.prev === hash) history.back();
  else aller(hash, true);
}

export const ecranPrecedent = (parDefaut) => (history.state && history.state.prev) || parDefaut;
