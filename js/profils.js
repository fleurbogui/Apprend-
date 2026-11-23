// Profils des élèves, gardés sur le téléphone (localStorage).
// Une déconnexion ne supprime jamais un profil.
import { CONFIG } from './reglages.js';
import { cleNom } from './outils.js';

export const Profils = {
  data: { actif: null, profils: {} },

  charger() {
    try {
      const brut = localStorage.getItem(CONFIG.cleProfils);
      const d = brut ? JSON.parse(brut) : null;
      if (d && typeof d.profils === 'object') this.data = d;
    } catch (e) {
      console.warn('Profils illisibles', e);
    }
  },

  sauver() {
    try {
      localStorage.setItem(CONFIG.cleProfils, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Sauvegarde impossible', e);
    }
  },

  actif() { return this.data.profils[this.data.actif] || null; },
  trouver(nom) { return this.data.profils[cleNom(nom)] || null; },
  liste() { return Object.values(this.data.profils).sort((a, b) => (b.dernier || 0) - (a.dernier || 0)); },

  ouvrir(nom) {
    const propre = String(nom).replace(/\s+/g, ' ').trim();
    const cle = cleNom(propre);
    let p = this.data.profils[cle];
    if (!p) {
      p = {
        cle, nom: propre, cree: Date.now(), dernier: Date.now(), jeton: null, codeLocal: null,
        etapes: {}, historique: [], enAttente: [], devoirs: [], synchro: null
      };
      // Progression de la toute première version (un seul joueur)
      try {
        const ancien = JSON.parse(localStorage.getItem(CONFIG.cleAncienne) || 'null');
        if (ancien && ancien.etapes && !Object.keys(this.data.profils).length) {
          p.etapes = ancien.etapes;
          localStorage.removeItem(CONFIG.cleAncienne);
        }
      } catch (e) {}
      this.data.profils[cle] = p;
    }
    p.dernier = Date.now();
    this.data.actif = cle;
    this.sauver();
    return p;
  },

  deconnecter() {
    this.data.actif = null;
    this.sauver();
  }
};

// Profil de l'élève connecté
export const P = () => Profils.actif();
