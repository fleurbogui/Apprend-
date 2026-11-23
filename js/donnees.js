// Accès aux données chargées par les scripts classiques de index.html
// (config.js, data.js, credits.js), pour que les modules n'utilisent pas de globales.
/* global NIVEAUX, CONFIG_SERVEUR, CREDITS_PHOTOS */

const niveaux = NIVEAUX;
const serveur = typeof CONFIG_SERVEUR !== 'undefined' ? CONFIG_SERVEUR : { url: '', cleAnon: '' };
const credits = typeof CREDITS_PHOTOS !== 'undefined' ? CREDITS_PHOTOS : {};

export { niveaux as NIVEAUX, serveur as SERVEUR, credits as CREDITS };
