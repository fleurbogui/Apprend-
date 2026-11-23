// Apprend+ : point d'entrée de l'application des élèves.
// Routes : #/ (accueil), #/parcours, #/carnet, #/classement, #/niveau/N,
// #/etape/N/E, #/resultat/N/E, #/credits. N et E commencent à 0.
import { NIVEAUX } from './donnees.js';
import { ecouter, parler, toast } from './outils.js';
import { etat } from './etat.js';
import { P, Profils } from './profils.js';
import { etapeDebloquee, niveauDebloque } from './progression.js';
import { dernierEssai, retirerProfilsSupprimes, serveurConfigure, synchroniser } from './sync.js';
import { aller, afficherRoute, definirRouteur, ecranPrecedent, retourVers } from './navigation.js';
import { installerActions, surActions } from './actions.js';
import { fermerModale, installerModale } from './ui/modale.js';
import { installerMisesAJour } from './mises-a-jour.js';
import { afficherConnexion, installerConnexion } from './ecrans/connexion.js';
import { afficherAccueil } from './ecrans/accueil.js';
import { afficherNiveau, afficherParcours } from './ecrans/parcours.js';
import { afficherCarnet } from './ecrans/carnet.js';
import { afficherClassement } from './ecrans/classement.js';
import { afficherCredits } from './ecrans/credits.js';
import { installerMenu } from './ecrans/menu.js';
import { demarrerEtape, installerChrono } from './jeu/exercice.js';
import { afficherResultat } from './jeu/resultat.js';

definirRouteur(([ecran, a, b]) => {
  const n = parseInt(a, 10);
  const e = parseInt(b, 10);
  const niveauValide = Number.isInteger(n) && n >= 0 && n < NIVEAUX.length;
  const etapeValide = niveauValide && Number.isInteger(e) && e >= 0 && e < NIVEAUX[n].etapes.length;

  fermerModale();
  document.body.classList.remove('jeu');
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  window.scrollTo(0, 0);

  if (!P()) return afficherConnexion();
  if (ecran === 'credits') return afficherCredits();
  if (ecran === 'parcours') return afficherParcours();
  if (ecran === 'carnet') return afficherCarnet();
  if (ecran === 'classement') return afficherClassement();
  if (ecran === 'niveau' && niveauValide && niveauDebloque(n)) return afficherNiveau(n);
  if (ecran === 'etape' && etapeValide && etapeDebloquee(n, e)) return demarrerEtape(n, e);
  const r = etat.dernierResultat;
  if (ecran === 'resultat' && r && r.n === n && r.e === e) return afficherResultat();
  if (location.hash && location.hash !== '#/') history.replaceState({ prev: null }, '', '#/');
  return afficherAccueil();
});

// Redessine l'écran affiché quand de nouvelles données arrivent du serveur
function rafraichirEcran() {
  const y = window.scrollY;
  const ecrans = { accueil: afficherAccueil, parcours: afficherParcours, carnet: afficherCarnet, classement: () => afficherClassement(false) };
  if (ecrans[etat.ecran]) ecrans[etat.ecran]();
  else if (etat.ecran.startsWith('niveau:')) afficherNiveau(Number(etat.ecran.split(':')[1]));
  else return;
  window.scrollTo(0, y);
}

surActions({
  accueil: () => retourVers('#/'),
  retour: () => retourVers(ecranPrecedent(etat.ecran.startsWith('niveau:') ? '#/parcours' : '#/')),
  onglet: (el) => {
    if (el.dataset.hash !== (location.hash || '#/')) aller(el.dataset.hash, true);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
  },
  dire: (el) => parler(el.dataset.texte)
});

ecouter('synchro-terminee', rafraichirEcran);
ecouter('session-expiree', () => {
  Profils.deconnecter();
  etat.messageConnexion = 'Ton prof a remis ton code à zéro. Choisis un nouveau code secret.';
  aller('#/', true);
});
// Élèves supprimés par le prof : ils disparaissent de « Déjà venus sur ce téléphone »
ecouter('profils-retires', ({ actif }) => {
  if (actif) {
    etat.messageConnexion = 'Ce compte n\'existe plus. Écris ton prénom et choisis un code secret.';
    aller('#/', true);
  } else if (etat.ecran === 'connexion') {
    afficherConnexion();
  }
});

installerActions();
installerModale();
installerConnexion();
installerMenu();
installerChrono();
installerMisesAJour();

window.addEventListener('popstate', afficherRoute);
window.addEventListener('online', synchroniser);
window.addEventListener('offline', () => toast('Hors ligne : tout continue de marcher'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - dernierEssai > 60000) synchroniser();
});

// Démarrage
Profils.charger();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
if (serveurConfigure() && P() && !P().jeton) {
  // Élève connecté avant l'arrivée du code secret
  Profils.deconnecter();
  etat.messageConnexion = 'Nouveau : protège ton compte avec un code secret de 4 chiffres. Tes étoiles sont gardées.';
}
afficherRoute();
synchroniser();
retirerProfilsSupprimes();
