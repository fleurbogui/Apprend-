/* =====================================================================
   🧠 LOGIQUE — Le Français en Aventures
   ---------------------------------------------------------------------
   Écrans (adresse après le #) :
     (aucun profil)        → Connexion : « Comment tu t'appelles ? »
     #/                    → Accueil : devoirs + carte du parcours
     #/niveau/N            → Choix de l'étape du niveau N
     #/etape/N/E           → Exercices de l'étape E du niveau N
     #/resultat/N/E        → Résultat de fin d'étape
     #/credits             → Crédits photos
   (N et E commencent à 0)

   Données :
   • data.js    → NIVEAUX (contenu)
   • credits.js → CREDITS_PHOTOS
   • config.js  → CONFIG_SERVEUR (Supabase)
   • localStorage → profils des élèves de CE téléphone (jamais effacés
     à la déconnexion) + étapes en attente d'envoi au serveur.
   ===================================================================== */
'use strict';

/* ---------- ⚙️ Réglages ---------- */
const CONFIG = {
  cleProfils: 'francais-aventures-profils-v2',
  cleAncienne: 'francais-aventures-progression-v1', // version 1 (un seul joueur)
  essaisMax: 3,
  nbLeurres: 2,
  penaliteIndice: 1,
  penalitePasser: 3,
  pointsSansErreur: 10,
  pointsAvecErreur: 5,
  lettresLeurres: 'AEIOURSTLNMCPD',
  dureeMaxEtape: 3600       // secondes (au-delà : l'élève a sûrement laissé l'appli ouverte)
};

const TYPES = {
  1: { fr: 'Facile', zh: '简单', aide: true },
  2: { fr: 'Intermédiaire', zh: '中级', aide: true },
  3: { fr: 'Défi', zh: '挑战', aide: false },
  4: { fr: 'Devinette', zh: '猜谜', aide: false }
};

/* Valeur des lettres au Scrabble (petit chiffre sur les tuiles) */
const VALEURS = { A:1,B:3,C:3,D:2,E:1,F:4,G:2,H:4,I:1,J:8,K:10,L:1,M:2,N:1,O:1,P:3,Q:8,R:1,S:1,T:1,U:1,V:4,W:10,X:10,Y:10,Z:10 };

/* ---------- Icônes dessinées (SVG) ---------- */
const ICONES = {
  retour: '<path d="M15 18l-6-6 6-6"/>',
  fermer: '<path d="M18 6L6 18M6 6l12 12"/>',
  effacer: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  ampoule: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  passer: '<path d="M5 5.5l8 6.5-8 6.5z"/><path d="M18 5v14"/>',
  son: '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  etoile: '<path fill="currentColor" stroke="none" d="M12 2.2l3 6.2 6.8.9-5 4.7 1.3 6.7L12 17.5l-6.1 3.2 1.3-6.7-5-4.7 6.8-.9z"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V7.5a4 4 0 0 1 8 0V11"/>',
  coche: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  jouer: '<path fill="currentColor" stroke="none" d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.8l-10-6.4A1 1 0 0 0 8 5.6z"/>',
  flamme: '<path fill="currentColor" stroke="none" d="M12 2c1 3.6 5.5 5.6 5.5 11.2A5.5 5.5 0 0 1 6.5 13.5c0-2.6 1.1-4.3 2.6-5.8.2 1.9 1 3.2 2.5 3.4-1-3.2-.4-6.3.4-9.1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.6v.4"/>',
  sortir: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  photo: '<rect x="3" y="6" width="18" height="14" rx="2.5"/><circle cx="12" cy="13" r="3.5"/><path d="M8.5 6l1.5-2.2h4L15.5 6"/>',
  telephone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  livre: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  nuage: '<path d="M7 18.5h10.5a4 4 0 0 0 .4-8 6 6 0 0 0-11.6 1.6A3.5 3.5 0 0 0 7 18.5z"/>',
  maison: '<path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>',
  carte: '<path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  fleche: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  trophee: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 14v4M8.5 21h7M10 18h4"/>'
};
function ico(nom, classe = '') {
  return `<svg class="ico ${classe}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom] || ''}</svg>`;
}

/* ---------- Petits outils ---------- */
const $ = (sel) => document.querySelector(sel);

function esc(texte) {
  return String(texte ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
/** "Français / 中文" → { fr, zh } */
function bilingue(texte) {
  const i = String(texte).indexOf(' / ');
  return i === -1 ? { fr: String(texte), zh: '' } : { fr: texte.slice(0, i), zh: texte.slice(i + 3) };
}
/** Français en gros, chinois en dessous */
function htmlBi(texte) {
  const b = bilingue(texte);
  return esc(b.fr) + (b.zh ? ` <span class="zh" lang="zh">${esc(b.zh)}</span>` : '');
}
/** Comparaison des réponses : sans majuscules, accents, espaces, tirets ("sœur" = "soeur") */
function normaliser(texte) {
  return String(texte).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');
}
/** Clé d'un prénom : "  Zoé  Martin " → "zoe martin" (garde les caractères chinois) */
function cleNom(nom) {
  return String(nom).toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}
const estLettre = (c) => /\p{L}/u.test(c);
const estImage = (src) => /\.(png|jpe?g|gif|svg|webp|avif)$/i.test(String(src || ''));

function melanger(tab) {
  const t = tab.slice();
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}
function vibrer(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* iOS : ignoré */ } }

function parler(texte) {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texte);
    u.lang = 'fr-FR';
    u.rate = 0.85;
    const voix = window.speechSynthesis.getVoices().find((v) => /^fr/i.test(v.lang));
    if (voix) u.voice = voix;
    window.speechSynthesis.speak(u);
  } catch (e) { /* pas de synthèse vocale */ }
}

let minuteurToast = null;
function toast(message, duree = 2600) {
  const el = $('#toast');
  el.innerHTML = message;
  el.classList.add('visible');
  clearTimeout(minuteurToast);
  minuteurToast = setTimeout(() => el.classList.remove('visible'), duree);
}

/** Date locale "AAAA-MM-JJ" */
function jourLocal(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function joursEntre(jourA, jourB) {
  return Math.round((new Date(jourB + 'T12:00:00') - new Date(jourA + 'T12:00:00')) / 86400000);
}
function nouvelId() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

/* =====================================================================
   👤 PROFILS DES ÉLÈVES (sur ce téléphone)
   Un profil n'est JAMAIS supprimé à la déconnexion : l'élève retrouve
   tout en retapant son prénom. Avec le serveur, il le retrouve aussi
   sur un autre téléphone.
   ===================================================================== */
const Profils = {
  data: { actif: null, profils: {} },

  charger() {
    try {
      const brut = localStorage.getItem(CONFIG.cleProfils);
      if (brut) {
        const d = JSON.parse(brut);
        if (d && typeof d.profils === 'object') this.data = d;
      }
    } catch (e) { console.warn('Profils illisibles', e); }
  },
  sauver() {
    try { localStorage.setItem(CONFIG.cleProfils, JSON.stringify(this.data)); }
    catch (e) { console.warn('Sauvegarde impossible', e); }
  },
  actif() { return this.data.profils[this.data.actif] || null; },
  liste() { return Object.values(this.data.profils).sort((a, b) => (b.dernier || 0) - (a.dernier || 0)); },

  /** Ouvre (ou crée) le profil d'un prénom */
  ouvrir(nom) {
    const propre = String(nom).replace(/\s+/g, ' ').trim();
    const cle = cleNom(propre);
    let p = this.data.profils[cle];
    if (!p) {
      p = { cle, nom: propre, cree: Date.now(), dernier: Date.now(), idServeur: null,
            etapes: {}, historique: [], enAttente: [], devoirs: [], synchro: null };
      // Reprise de la progression de la version 1 (un seul joueur) pour le 1er profil
      try {
        const ancien = JSON.parse(localStorage.getItem(CONFIG.cleAncienne) || 'null');
        if (ancien && ancien.etapes && !Object.keys(this.data.profils).length) {
          p.etapes = ancien.etapes;
          localStorage.removeItem(CONFIG.cleAncienne);
        }
      } catch (e) { /* rien */ }
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
const P = () => Profils.actif();

/* ---------- Progression du profil actif ---------- */
const cleEtape = (n, e) => NIVEAUX[n].id + '-' + (e + 1);
function indexDeCle(cle) {
  const [id, num] = String(cle).split('-').map(Number);
  const n = NIVEAUX.findIndex((niv) => niv.id === id);
  if (n === -1 || !NIVEAUX[n].etapes[num - 1]) return null;
  return [n, num - 1];
}
const infoEtape = (n, e) => (P() && P().etapes[cleEtape(n, e)]) || null;
const etapeTerminee = (n, e) => !!infoEtape(n, e);
const etoilesEtape = (n, e) => (infoEtape(n, e) || { etoiles: 0 }).etoiles;
const niveauTermine = (n) => NIVEAUX[n].etapes.every((_, e) => etapeTerminee(n, e));
const etoilesNiveau = (n) => NIVEAUX[n].etapes.reduce((s, _, e) => s + etoilesEtape(n, e), 0);
const totalEtoiles = () => NIVEAUX.reduce((s, _, n) => s + etoilesNiveau(n), 0);
const totalEtapes = () => NIVEAUX.reduce((s, niv) => s + niv.etapes.length, 0);
const etapesFaites = () => NIVEAUX.reduce((s, niv, n) => s + niv.etapes.filter((_, e) => etapeTerminee(n, e)).length, 0);

/** Les étapes données en devoir sont toujours ouvertes (sinon impossible de les faire) */
function etapesEnDevoir() {
  const s = new Set();
  ((P() && P().devoirs) || []).forEach((d) => (d.etapes || []).forEach((k) => s.add(k)));
  return s;
}
function niveauDebloque(n) {
  if (n === 0 || niveauTermine(n - 1)) return true;
  // Un niveau déjà commencé reste ouvert (même si l'ordre des niveaux a changé)
  if (NIVEAUX[n].etapes.some((_, e) => etapeTerminee(n, e))) return true;
  const dev = etapesEnDevoir();
  return NIVEAUX[n].etapes.some((_, e) => dev.has(cleEtape(n, e)));
}
function etapeDebloquee(n, e) {
  if (etapesEnDevoir().has(cleEtape(n, e))) return true;
  const normal = (n === 0 || niveauTermine(n - 1)) && (e === 0 || etapeTerminee(n, e - 1));
  return normal || etapeTerminee(n, e);
}
function etapeSuivante(n, e) {
  if (e + 1 < NIVEAUX[n].etapes.length) return [n, e + 1];
  if (n + 1 < NIVEAUX.length) return [n + 1, 0];
  return null;
}

/** Enregistre une étape terminée : meilleur score + historique + file d'envoi au serveur */
function enregistrerEtape(n, e, r) {
  const p = P();
  const cle = cleEtape(n, e);
  const prec = p.etapes[cle];
  p.etapes[cle] = {
    etoiles: Math.max(r.etoiles, prec ? prec.etoiles : 0),
    points: Math.max(r.points, prec ? prec.points : 0),
    fois: (prec ? prec.fois : 0) + 1,
    date: Date.now()
  };
  const maintenant = new Date().toISOString();
  p.historique.push({ etape: cle, fait_le: maintenant, etoiles: r.etoiles });
  if (p.historique.length > 500) p.historique = p.historique.slice(-500);
  p.enAttente.push({
    client_id: nouvelId(), etape: cle, etoiles: r.etoiles, points: r.points,
    erreurs: r.erreurs, indices: r.indices, passes: r.passes,
    nb_exercices: r.nbExercices, duree_s: r.duree, fait_le: maintenant
  });
  Profils.sauver();
  return { record: !!prec && r.etoiles > prec.etoiles };
}

/** Jours d'affilée avec au moins une étape terminée */
function serieJours() {
  const jours = new Set((P().historique || []).map((h) => jourLocal(h.fait_le)));
  let jour = jourLocal();
  if (!jours.has(jour)) {
    const hier = new Date(); hier.setDate(hier.getDate() - 1);
    jour = jourLocal(hier);
    if (!jours.has(jour)) return 0;
  }
  let n = 0;
  const d = new Date(jour + 'T12:00:00');
  while (jours.has(jourLocal(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/* ---------- Devoirs (côté élève) ---------- */
/** Une étape du devoir est faite si l'élève l'a terminée APRÈS la création du devoir */
function etapeFaitePourDevoir(devoir, cle) {
  const depuis = new Date(devoir.cree_le).getTime() || 0;
  return (P().historique || []).some((h) => h.etape === cle && new Date(h.fait_le).getTime() >= depuis);
}
function devoirsAffiches() {
  const auj = jourLocal();
  return ((P() && P().devoirs) || [])
    .map((d) => {
      const etapes = (d.etapes || []).filter(indexDeCle);
      const faites = etapes.filter((k) => etapeFaitePourDevoir(d, k));
      return { ...d, etapes, faites, fini: etapes.length > 0 && faites.length === etapes.length, jours: joursEntre(auj, d.date_limite) };
    })
    .filter((d) => d.etapes.length && (!d.fini || d.jours >= 0))
    .sort((a, b) => a.date_limite.localeCompare(b.date_limite));
}
function texteEcheance(d) {
  if (d.fini) return { classe: 'fini', texte: 'Fait · 完成' };
  if (d.jours < 0) return { classe: 'urgent', texte: 'En retard · 逾期' };
  if (d.jours === 0) return { classe: 'urgent', texte: "Aujourd'hui · 今天" };
  if (d.jours === 1) return { classe: 'urgent', texte: 'Demain · 明天' };
  return { classe: '', texte: `Dans ${d.jours} jours · ${d.jours}天后` };
}

/* =====================================================================
   ☁️ SYNCHRONISATION AVEC LE SERVEUR (Supabase)
   L'appli marche hors-ligne : les étapes terminées attendent dans
   "enAttente" et partent dès que le réseau revient.
   ===================================================================== */
const Sync = {
  enCours: false,
  dernierEssai: 0,

  configure() {
    return typeof CONFIG_SERVEUR !== 'undefined' && /^https:\/\/.+/.test(CONFIG_SERVEUR.url || '') && !!CONFIG_SERVEUR.cleAnon;
  },

  async rpc(fonction, args) {
    const base = CONFIG_SERVEUR.url.replace(/\/+$/, '');
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), 15000);
    try {
      const rep = await fetch(`${base}/rest/v1/rpc/${fonction}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: CONFIG_SERVEUR.cleAnon, Authorization: 'Bearer ' + CONFIG_SERVEUR.cleAnon },
        body: JSON.stringify(args),
        signal: ctrl.signal
      });
      if (!rep.ok) throw new Error(`HTTP ${rep.status} ${(await rep.text()).slice(0, 200)}`);
      return await rep.json();
    } finally { clearTimeout(minuteur); }
  },

  /** Récupère le classement (top 20 + place de l'élève) et le garde pour le hors-ligne */
  async classement(q = P()) {
    if (!q || !q.idServeur || !this.configure() || navigator.onLine === false) return false;
    try {
      const c = await this.rpc('classement', { p_id: q.idServeur, p_debut: debutSemaine().toISOString() });
      if (!c || !Array.isArray(c.semaine)) return false;
      q.classement = { ...c, recu: Date.now() };
      Profils.sauver();
      return true;
    } catch (e) {
      console.warn('Classement indisponible :', e.message);
      return false;
    }
  },

  /** Récupère la progression du serveur et envoie les étapes en attente */
  async lancer() {
    const p = P();
    if (!p || !this.configure() || this.enCours || navigator.onLine === false) return;
    this.enCours = true;
    this.dernierEssai = Date.now();
    const cle = p.cle;
    let recuperees = 0;
    try {
      const d = await this.rpc('eleve_connexion', { p_nom: p.nom });
      const q = Profils.data.profils[cle];
      if (!q) return;
      q.idServeur = d.id;
      q.devoirs = Array.isArray(d.devoirs) ? d.devoirs : [];
      // Fusion : on garde le meilleur score de chaque étape (téléphone ↔ serveur)
      Object.entries(d.progression || {}).forEach(([k, s]) => {
        const loc = q.etapes[k];
        if (!loc) recuperees++;
        q.etapes[k] = {
          etoiles: Math.max(s.etoiles || 0, loc ? loc.etoiles : 0),
          points: Math.max(s.points || 0, loc ? loc.points : 0),
          fois: Math.max(s.fois || 0, loc ? loc.fois : 0),
          date: loc ? loc.date : Date.now()
        };
      });
      Profils.sauver();

      while (q.enAttente.length) {
        const lot = q.enAttente.slice(0, 50);
        const r = await this.rpc('eleve_envoyer', { p_id: q.idServeur, p_tentatives: lot });
        const envoyes = new Set(lot.map((t) => t.client_id));
        q.enAttente = q.enAttente.filter((t) => !envoyes.has(t.client_id));
        if (r && Array.isArray(r.devoirs)) q.devoirs = r.devoirs;
        Profils.sauver();
      }
      q.synchro = Date.now();
      Profils.sauver();
      await this.classement(q);
      if (recuperees > 0) toast(`☁️ Progression récupérée : ${recuperees} étape(s) · 进度已恢复`);
      rafraichirEcran();
    } catch (e) {
      console.warn('Synchronisation impossible (réessai plus tard) :', e.message);
    } finally {
      this.enCours = false;
    }
  }
};

/* =====================================================================
   🧭 NAVIGATION
   ===================================================================== */
let ecranActuel = '';

function aller(hash, remplacer = false) {
  const etat = history.state || {};
  if (remplacer) history.replaceState({ prev: etat.prev || null }, '', hash);
  else history.pushState({ prev: location.hash || '#/' }, '', hash);
  router();
  essayerMiseAJour();
}
function retourVers(hash) {
  const etat = history.state || {};
  if (etat.prev === hash) history.back();
  else aller(hash, true);
}

function router() {
  const [ecran, a, b] = location.hash.replace(/^#\/?/, '').split('/');
  const n = parseInt(a, 10);
  const e = parseInt(b, 10);
  const niveauValide = Number.isInteger(n) && n >= 0 && n < NIVEAUX.length;
  const etapeValide = niveauValide && Number.isInteger(e) && e >= 0 && e < NIVEAUX[n].etapes.length;

  fermerModale();
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  window.scrollTo(0, 0);

  if (ecran === 'credits') return afficherCredits();
  if (!P()) return afficherConnexion();

  if (ecran === 'classement') return afficherClassement();
  if (ecran === 'parcours') return afficherParcours();
  if (ecran === 'carnet') return afficherCarnet();
  if (ecran === 'niveau' && niveauValide && niveauDebloque(n)) return afficherNiveau(n);
  if (ecran === 'etape' && etapeValide && etapeDebloquee(n, e)) return demarrerEtape(n, e);
  if (ecran === 'resultat' && dernierResultat && dernierResultat.n === n && dernierResultat.e === e) return afficherResultat();
  if (location.hash && location.hash !== '#/') history.replaceState({ prev: null }, '', '#/');
  afficherAccueil();
}

/** Redessine l'écran après une synchro (sans perdre la position de défilement) */
function rafraichirEcran() {
  const y = window.scrollY;
  if (ecranActuel === 'accueil') afficherAccueil();
  else if (ecranActuel === 'classement') afficherClassement(false);
  else if (ecranActuel === 'parcours') afficherParcours();
  else if (ecranActuel === 'carnet') afficherCarnet();
  else if (ecranActuel.startsWith('niveau:')) afficherNiveau(Number(ecranActuel.split(':')[1]));
  else return;
  window.scrollTo(0, y);
}

/* =====================================================================
   🧭 BARRE DU HAUT + BARRE DE NAVIGATION (Accueil · Parcours · Carnet · Classement)
   ===================================================================== */
const ONGLETS = [
  { hash: '#/', icone: 'maison', fr: 'Accueil', zh: '首页' },
  { hash: '#/parcours', icone: 'carte', fr: 'Parcours', zh: '学习之路' },
  { hash: '#/carnet', icone: 'livre', fr: 'Carnet', zh: '单词本' },
  { hash: '#/classement', icone: 'trophee', fr: 'Classement', zh: '排行榜' }
];

function htmlBarreHaut(fil, { retour = false } = {}) {
  const p = P();
  return `
    <header class="barre-haut">
      ${retour
        ? `<button type="button" class="icone-btn" data-action="retour" aria-label="Retour">${ico('retour')}</button>`
        : `<button type="button" class="icone-btn" data-action="menu-profil" aria-label="Menu">${ico('menu')}</button>`}
      <div class="fil"><span>Mon espace</span>${ico('chevron')}<b>${esc(fil)}</b></div>
      <span class="compteur" title="Jours d'affilée · 连续天数">${ico('flamme', 'flamme')}${serieJours()}</span>
      <span class="compteur" title="Étoiles · 星星">${ico('etoile', 'etoile-or')}${totalEtoiles()}</span>
      <button type="button" class="avatar petit" data-action="menu-profil" aria-label="Mon profil">${esc(Array.from(p.nom)[0] || '?')}</button>
    </header>`;
}

function htmlNav(actif) {
  return `
    <nav class="nav-bas" aria-label="Navigation">
      ${ONGLETS.map((o) => `
        <button type="button" class="${o.hash === actif ? 'actif' : ''}" data-action="onglet" data-hash="${o.hash}"
                ${o.hash === actif ? 'aria-current="page"' : ''}>
          ${ico(o.icone)}<span>${o.fr}</span>
        </button>`).join('')}
    </nav>`;
}

/** Petit titre de section : « ● TON VOYAGE · 你的学习之旅 » */
const htmlSurtitre = (fr, zh, point = true) =>
  `<p class="surtitre">${point ? '<i></i>' : ''}${esc(fr)}${zh ? ` <span lang="zh">· ${esc(zh)}</span>` : ''}</p>`;

/** Étoile décorative (✳) */
const DECO = '<svg class="deco" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1"/></svg>';

/* ---------- Données utiles aux écrans ---------- */
/** Prochaine étape à jouer : [n, e] (ou null si tout est terminé) */
function prochaineEtape() {
  for (let n = 0; n < NIVEAUX.length; n++) {
    for (let e = 0; e < NIVEAUX[n].etapes.length; e++) {
      if (etapeDebloquee(n, e) && !etapeTerminee(n, e)) return [n, e];
    }
  }
  return null;
}
const couvertureNiveau = (n) => NIVEAUX[n].image || NIVEAUX[n].etapes[0][0].image;
const etapesFaitesNiveau = (n) => NIVEAUX[n].etapes.filter((_, e) => etapeTerminee(n, e)).length;

/* =====================================================================
   👋 CONNEXION — « Comment tu t'appelles ? »
   ===================================================================== */
function afficherConnexion() {
  ecranActuel = 'connexion';
  session = null;
  const profils = Profils.liste();
  $('#app').innerHTML = `
    <section class="ecran ecran-connexion">
      <div class="connexion-haut">
        <img class="logo" src="icons/icon-192.png" alt="">
        ${htmlSurtitre('Bienvenue', '欢迎')}
        <h1>Le Français<br>en Aventures ${DECO}</h1>
        <p>Apprends le français en t'amusant ! <span lang="zh">轻松学法语！</span></p>
      </div>

      <form id="form-connexion" class="carte carte-connexion" autocomplete="off" novalidate>
        <h2>Comment tu t'appelles ?<span class="zh" lang="zh">你叫什么名字？</span></h2>
        <p class="astuce">Écris ton prénom et l'initiale de ton nom, toujours de la même façon.<br>
          <span lang="zh">写下你的名字和姓的首字母，每次都要写得一样。</span></p>
        <label for="champ-nom" class="cache">Prénom</label>
        <input id="champ-nom" class="champ" type="text" maxlength="30" placeholder="ex. Li W." enterkeyhint="go"
               autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false">
        <p id="erreur-nom" class="erreur-champ" role="alert"></p>
        <button type="submit" class="btn btn-rouge btn-large">C'est parti · 开始 ${ico('fleche')}</button>
      </form>

      ${profils.length ? `
      <div class="profils-appareil">
        ${htmlSurtitre('Déjà venu sur ce téléphone ?', '曾在本机登录', false)}
        <div class="liste-profils">
          ${profils.map((p) => `
            <button type="button" class="profil-chip" data-action="profil-choisir" data-cle="${esc(p.cle)}">
              <span class="avatar petit">${esc(Array.from(p.nom)[0] || '?')}</span>${esc(p.nom)}
            </button>`).join('')}
        </div>
      </div>` : ''}
      <div style="height:calc(28px + var(--sur-bas))"></div>
    </section>`;
}

/* =====================================================================
   🏠 ACCUEIL — rendez-vous du jour, semaine, leçon du jour, voyage
   ===================================================================== */
function htmlSemaine() {
  const jours = new Set((P().historique || []).map((h) => jourLocal(h.fait_le)));
  const lundi = debutSemaine();
  const auj = jourLocal();
  const lettres = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  return `
    <div class="carte semaine">
      <div class="semaine-titre"><span>Cette semaine</span><span lang="zh">本周</span></div>
      <ol>
        ${lettres.map((l, i) => {
          const d = new Date(lundi); d.setDate(d.getDate() + i);
          const j = jourLocal(d);
          const fait = jours.has(j);
          const classe = j === auj ? 'aujourdhui' : fait ? 'fait' : j > auj ? 'futur' : 'passe';
          return `<li class="${classe}${fait ? ' fait' : ''}"><span>${l}</span>
            <b aria-label="${fait ? 'jour travaillé' : ''}">${fait && j !== auj ? ico('coche') : d.getDate()}</b></li>`;
        }).join('')}
      </ol>
    </div>`;
}

function htmlLeconDuJour() {
  const suite = prochaineEtape();
  if (!suite) {
    return `
      <div class="lecon fini">
        ${htmlSurtitre('Bravo', '太棒了', false)}
        <h2>Tu as terminé toute l'aventure !</h2>
        <p>Rejoue les étapes pour gagner 3 étoiles partout.<br><span lang="zh">再玩一次，争取每关三颗星！</span></p>
        <button type="button" class="btn btn-rouge" data-action="onglet" data-hash="#/parcours">Voir mon parcours ${ico('fleche')}</button>
      </div>`;
  }
  const [n, e] = suite;
  const niv = NIVEAUX[n];
  const nom = bilingue(niv.nom);
  const total = niv.etapes.length;
  const faites = etapesFaitesNiveau(n);
  const photos = niv.etapes[e].filter((x) => estImage(x.image)).slice(0, 3);
  return `
    <div class="lecon">
      <div class="lecon-texte">
        ${htmlSurtitre('Leçon du jour', '今日课程', false)}
        <h2>${esc(nom.fr)}</h2>
        <p>Étape ${e + 1} · ${niv.etapes[e].length} mots à découvrir<br><span lang="zh">${esc(nom.zh)} · ${niv.etapes[e].length}个新单词</span></p>
        <button type="button" class="btn btn-rouge" data-action="etape" data-n="${n}" data-e="${e}">
          ${faites || e ? 'Continuer ma leçon' : 'Commencer'} ${ico('fleche')}</button>
        <div class="lecon-progres">
          <div class="mini-jauge"><span style="width:${Math.round((faites / total) * 100)}%"></span></div>
          <small>${faites} / ${total} étapes</small>
        </div>
      </div>
      <div class="lecon-photos" aria-hidden="true">
        <span class="halo"></span>
        ${photos.map((x, i) => `<img class="bulle b${i + 1}" src="${esc(x.image)}" alt="" loading="lazy" decoding="async">`).join('')}
        ${DECO}
      </div>
      <span class="lecon-tampon" aria-hidden="true">Niveau ${n + 1}<br>第${n + 1}关</span>
    </div>`;
}

function htmlCarteNiveau(n) {
  const niv = NIVEAUX[n];
  const nom = bilingue(niv.nom);
  const ouvert = niveauDebloque(n);
  const termine = niveauTermine(n);
  const faites = etapesFaitesNiveau(n);
  const total = niv.etapes.length;
  const suite = prochaineEtape();
  const actuel = suite && suite[0] === n;
  const etat = termine ? 'termine' : actuel ? 'actuel' : ouvert ? 'ouvert' : 'verrouille';
  const puce = termine ? `<span class="puce ok">${ico('coche')} Terminé</span>`
    : actuel ? `<span class="puce encours">Étape ${suite[1] + 1}</span>`
    : !ouvert ? `<span class="cadenas">${ico('cadenas')}</span>` : '';
  const couv = couvertureNiveau(n);
  return `
    <button type="button" class="carte-niveau ${etat}" data-action="niveau" data-n="${n}" aria-label="Niveau ${n + 1} : ${esc(nom.fr)}">
      <div class="cn-haut">
        ${estImage(couv) ? `<img src="${esc(couv)}" alt="" loading="lazy" decoding="async">` : `<span class="emoji">${esc(couv)}</span>`}
        ${puce}
      </div>
      <b>${esc(nom.fr)}</b>
      <span class="zh" lang="zh">${esc(nom.zh)}</span>
      <div class="cn-bas">
        <span class="etoiles-mini">${ico('etoile', 'etoile-or')} ${etoilesNiveau(n)}/${total * 3}</span>
        ${actuel ? `<span class="mini-jauge"><span style="width:${Math.round((faites / total) * 100)}%"></span></span>` : ''}
        <span>${faites}/${total}</span>
      </div>
    </button>`;
}

function afficherAccueil() {
  ecranActuel = 'accueil';
  session = null;
  const p = P();
  const devoirs = devoirsAffiches();
  // Sur l'accueil : 4 niveaux autour du niveau en cours ; tous dans « Parcours »
  const suite = prochaineEtape();
  const centre = suite ? suite[0] : NIVEAUX.length - 1;
  const debut = Math.max(0, Math.min(centre - 1, NIVEAUX.length - 4));
  const apercu = NIVEAUX.map((_, n) => n).slice(debut, debut + 4);

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut('Accueil')}
      <div class="page">
        ${htmlSurtitre('Ton petit rendez-vous du jour', '今日学习')}
        <h1 class="salut">你好, ${esc(p.nom)} ${DECO}</h1>
        <p class="sous-salut">On apprend quelques mots de français ? <span lang="zh">准备好学习法语了吗？</span></p>

        ${htmlSemaine()}
        ${htmlLeconDuJour()}

        ${devoirs.length ? `
        <section class="carte devoirs">
          <div class="devoirs-titre">${htmlSurtitre('Devoirs de ton prof', '老师布置的作业')}</div>
          ${devoirs.map((d) => {
            const ech = texteEcheance(d);
            return `
            <div class="devoir">
              <div class="devoir-titre"><b>${esc(d.titre)}</b><span class="echeance ${ech.classe}">${ech.texte}</span></div>
              <div class="devoir-etapes">
                ${d.etapes.map((k) => {
                  const [n, e] = indexDeCle(k);
                  const fait = d.faites.includes(k);
                  return `<button type="button" class="chip-etape ${fait ? 'fait' : ''}" data-action="etape" data-n="${n}" data-e="${e}">
                    ${ico(fait ? 'coche' : 'jouer')} Niv. ${n + 1} · Étape ${e + 1}</button>`;
                }).join('')}
              </div>
            </div>`;
          }).join('')}
        </section>` : ''}

        <div class="entete-section">
          <div>${htmlSurtitre('Ton voyage', '你的学习之旅', false)}<h2>Un pas après l'autre</h2></div>
          <button type="button" class="lien" data-action="onglet" data-hash="#/parcours">Tout le parcours ${ico('fleche')}</button>
        </div>
        <div class="grille-niveaux">${apercu.map(htmlCarteNiveau).join('')}</div>
      </div>
      ${htmlNav('#/')}
    </section>`;
}

/* =====================================================================
   🗺️ PARCOURS — tous les niveaux sur le chemin
   ===================================================================== */
function afficherParcours() {
  ecranActuel = 'parcours';
  session = null;
  const faites = etapesFaites();
  const total = totalEtapes();
  const suite = prochaineEtape();
  const actuel = suite ? suite[0] : -1;
  const noeuds = NIVEAUX.map((niv, n) => {
    const nom = bilingue(niv.nom);
    const ouvert = niveauDebloque(n);
    const termine = niveauTermine(n);
    const etat = termine ? 'termine' : !ouvert ? 'verrouille' : n === actuel ? 'actuel' : 'ouvert';
    const couverture = couvertureNiveau(n);
    return {
      etat,
      label: `Niveau ${n + 1} : ${nom.fr}`,
      attributs: `data-action="niveau" data-n="${n}"`,
      drapeau: etat === 'actuel' ? 'À toi · 加油' : '',
      contenu: `${estImage(couverture) ? `<img src="${esc(couverture)}" alt="" loading="lazy" decoding="async">` : esc(couverture)}
                ${termine ? `<span class="badge">${ico('coche')}</span>` : !ouvert ? `<span class="badge">${ico('cadenas')}</span>` : ''}`,
      dessous: `<div class="etiquette"><b>${n + 1}. ${esc(nom.fr)}</b><span class="zh" lang="zh">${esc(nom.zh)}</span>
                <span class="etoiles-mini">${ico('etoile', 'etoile-or')} ${etoilesNiveau(n)}/${niv.etapes.length * 3}</span></div>`
    };
  });
  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut('Parcours')}
      <div class="page">
        ${htmlSurtitre('Ton voyage', '你的学习之旅')}
        <h1 class="titre-page">Tout le parcours</h1>
        <div class="carte progres-global">
          <div><b>${faites}</b><span>/ ${total} étapes</span></div>
          <div class="mini-jauge"><span style="width:${total ? Math.round((faites / total) * 100) : 0}%"></span></div>
          <small lang="zh">已完成 ${faites} / ${total} 关</small>
        </div>
      </div>
      ${htmlCarte(noeuds)}
      ${htmlNav('#/parcours')}
    </section>`;
}

/* =====================================================================
   📒 CARNET — tous les mots appris, à réécouter
   ===================================================================== */
function afficherCarnet() {
  ecranActuel = 'carnet';
  session = null;
  const groupes = [];
  let nbMots = 0;
  let aDecouvrir = 0;
  NIVEAUX.forEach((niv, n) => {
    const mots = [];
    niv.etapes.forEach((etape, e) => {
      if (etapeTerminee(n, e)) etape.forEach((x) => mots.push(x));
      else aDecouvrir += etape.length;
    });
    if (mots.length) { groupes.push({ n, niv, mots }); nbMots += mots.length; }
  });

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut('Carnet')}
      <div class="page">
        ${htmlSurtitre('Mon carnet', '我的单词本')}
        <h1 class="titre-page">${nbMots} mot${nbMots > 1 ? 's' : ''} appris</h1>
        <p class="sous-salut">Touche un mot pour l'écouter. <span lang="zh">点击单词即可收听。</span>
          ${aDecouvrir ? `<br>Encore ${aDecouvrir} mots à découvrir. <span lang="zh">还有${aDecouvrir}个单词等你发现。</span>` : ''}</p>

        ${groupes.length ? groupes.map((g) => {
          const nom = bilingue(g.niv.nom);
          return `
          <section class="groupe-carnet">
            <h2>${esc(nom.fr)} <span class="zh" lang="zh">${esc(nom.zh)}</span></h2>
            <ul class="grille-mots">
              ${g.mots.map((x) => `
                <li><button type="button" class="carte-mot" data-action="dire" data-texte="${esc(x.audio || x.mot)}">
                  ${estImage(x.image) ? `<img src="${esc(x.image)}" alt="" loading="lazy" decoding="async">` : `<span class="emoji">${esc(x.image)}</span>`}
                  <span class="mot">${esc(x.mot)}</span>${ico('son')}
                </button></li>`).join('')}
            </ul>
          </section>`;
        }).join('') : `
          <div class="carte vide-carnet">
            ${ico('livre')}
            <p>Ton carnet est encore vide. Termine ta première étape pour le remplir !<br>
              <span lang="zh">完成第一关，单词本就会出现新单词！</span></p>
            <button type="button" class="btn btn-rouge" data-action="onglet" data-hash="#/">Commencer ${ico('fleche')}</button>
          </div>`}
      </div>
      ${htmlNav('#/carnet')}
    </section>`;
}

/* =====================================================================
   🗺️ NIVEAU — choix de l'étape
   ===================================================================== */
function afficherNiveau(n) {
  ecranActuel = 'niveau:' + n;
  session = null;
  const niv = NIVEAUX[n];
  const nom = bilingue(niv.nom);
  const couverture = couvertureNiveau(n);
  const devoirs = devoirsAffiches();
  const actuel = niv.etapes.findIndex((_, e) => etapeDebloquee(n, e) && !etapeTerminee(n, e));

  const noeuds = niv.etapes.map((etape, e) => {
    const faite = etapeTerminee(n, e);
    const ouverte = etapeDebloquee(n, e);
    const etat = faite ? 'termine' : !ouverte ? 'verrouille' : e === actuel ? 'actuel' : 'ouvert';
    const etoiles = etoilesEtape(n, e);
    const k = cleEtape(n, e);
    const enDevoir = devoirs.some((d) => d.etapes.includes(k) && !d.faites.includes(k));
    return {
      etat,
      classe: 'noeud-etape',
      label: `Étape ${e + 1}`,
      attributs: `data-action="etape" data-n="${n}" data-e="${e}"`,
      drapeau: enDevoir ? 'Devoir · 作业' : etat === 'actuel' ? 'Joue · 开始' : '',
      contenu: ouverte ? (etat === 'actuel' ? ico('jouer') : String(e + 1)) : ico('cadenas'),
      dessous: `<div class="etoiles-etape">${[1, 2, 3].map((k) => ico('etoile', k <= etoiles ? '' : 'vide')).join('')}</div>
                <div class="nom-etape">Étape ${e + 1} · ${etape.length} mots</div>`
    };
  });

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut('Parcours', { retour: true })}
      <div class="page">
        <div class="entete-niveau">
          ${estImage(couverture) ? `<img src="${esc(couverture)}" alt="">` : ''}
          <div>
            ${htmlSurtitre(`Niveau ${n + 1}`, `第${n + 1}关`, false)}
            <h1 class="titre-page">${esc(nom.fr)}</h1>
            <p class="sous-salut" lang="zh">${esc(nom.zh)}</p>
          </div>
          <span class="puce-etoiles">${ico('etoile', 'etoile-or')} ${etoilesNiveau(n)}/${niv.etapes.length * 3}</span>
        </div>
      </div>

      ${htmlCarte(noeuds, { espace: 165, haut: 76, taille: 80 })}

      <div class="legende-types">
        ${Object.entries(TYPES).map(([k, t]) => `<div><span class="puce-type t${k}">${k}</span><span>${t.fr}<span class="zh" lang="zh">${t.zh}</span></span></div>`).join('')}
      </div>
      ${htmlNav('#/parcours')}
    </section>`;
}


function validerConnexion(nom) {
  const propre = String(nom || '').replace(/\s+/g, ' ').trim();
  const erreur = $('#erreur-nom');
  if (!/^[\p{L}\p{M}' .-]{2,30}$/u.test(propre)) {
    if (erreur) erreur.textContent = 'Écris ton prénom (au moins 2 lettres). · 请输入你的名字（至少两个字）。';
    vibrer(60);
    return;
  }
  const p = Profils.ouvrir(propre);
  toast(`Bienvenue ${esc(p.nom)} ! · 欢迎！`);
  aller('#/', true);
  Sync.lancer();
}


/** Dessine un chemin sinueux (façon carte de jeu) avec des nœuds alternés */
function htmlCarte(noeuds, { espace = 175, haut = 70, taille = 92 } = {}) {
  const xs = [50, 76, 50, 24];
  const pos = noeuds.map((_, i) => ({ x: xs[i % 4], y: haut + i * espace }));
  const hauteur = haut + (noeuds.length - 1) * espace + taille / 2 + 110;
  const trace = (pts) => pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}` :
    `C ${pts[i - 1].x} ${pts[i - 1].y + espace / 2}, ${p.x} ${p.y - espace / 2}, ${p.x} ${p.y}`)).join(' ');
  const dernierFait = noeuds.reduce((k, nd, i) => (nd.etat === 'termine' ? i : k), -1);
  const toutTrace = trace(pos);
  const traceFait = dernierFait >= 1 ? trace(pos.slice(0, dernierFait + 1)) : '';

  return `
    <div class="carte-parcours" style="height:${hauteur}px">
      <svg class="route" viewBox="0 0 100 ${hauteur}" preserveAspectRatio="none" aria-hidden="true">
        <path class="bord" d="${toutTrace}" vector-effect="non-scaling-stroke"/>
        <path class="chemin-fond" d="${toutTrace}" vector-effect="non-scaling-stroke"/>
        ${traceFait ? `<path class="fait" d="${traceFait}" vector-effect="non-scaling-stroke"/>` : ''}
        <path class="pointilles" d="${toutTrace}" vector-effect="non-scaling-stroke"/>
      </svg>
      ${noeuds.map((nd, i) => `
        <div class="noeud ${nd.classe || ''} ${nd.etat}" style="left:${pos[i].x}%;top:${pos[i].y - taille / 2 - 5}px">
          ${nd.drapeau ? `<span class="drapeau">${nd.drapeau}</span>` : ''}
          <button type="button" class="noeud-bouton" ${nd.attributs} aria-label="${esc(nd.label)}">${nd.contenu}</button>
          ${nd.dessous}
        </div>`).join('')}
    </div>`;
}

/* =====================================================================
   ✏️ EXERCICE
   ===================================================================== */
let session = null;
let dernierResultat = null;

function demarrerEtape(n, e) {
  ecranActuel = 'etape';
  session = {
    n, e,
    exercices: NIVEAUX[n].etapes[e],
    index: 0,
    penalites: 0, erreurs: 0, indices: 0, passes: 0,
    points: 0,
    bilan: [],
    debut: Date.now(),
    pause: 0,
    cacheDepuis: null
  };
  preparerExercice();
}

// Le temps passé appli fermée / en arrière-plan ne compte pas
document.addEventListener('visibilitychange', () => {
  if (!session) return;
  if (document.visibilityState === 'hidden') session.cacheDepuis = Date.now();
  else if (session.cacheDepuis) { session.pause += Date.now() - session.cacheDepuis; session.cacheDepuis = null; }
});

function preparerExercice() {
  const def = session.exercices[session.index];
  const type = TYPES[def.type] ? def.type : 1;
  const chars = Array.from(def.mot.toUpperCase());
  const ex = {
    def, type, aide: TYPES[type].aide, chars,
    verrou: chars.map((c) => !estLettre(c)),
    devoilee: chars.map(() => false),
    place: chars.map(() => null),
    tuiles: [],
    erreurs: 0, indices: 0,
    fini: false, reussi: false
  };

  if (type === 2) {
    const i = chars.findIndex(estLettre);
    if (i !== -1) ex.verrou[i] = true;
  }

  if (ex.aide) {
    let lettres = (type === 1 && Array.isArray(def.lettres) && def.lettres.length)
      ? def.lettres.map((l) => String(l).toUpperCase())
      : chars.filter((c, i) => !ex.verrou[i]);
    if (type === 2) {
      for (let k = 0; k < CONFIG.nbLeurres; k++) {
        lettres.push(CONFIG.lettresLeurres[Math.floor(Math.random() * CONFIG.lettresLeurres.length)]);
      }
    }
    let melange = melanger(lettres);
    for (let essai = 0; essai < 10 && lettres.length > 2 && melange.join('') === lettres.join(''); essai++) melange = melanger(lettres);
    ex.tuiles = melange.map((lettre) => ({ lettre, utilisee: false, retiree: false }));
  }

  session.ex = ex;
  afficherExercice();
}

function afficherExercice() {
  const { index, exercices, ex } = session;
  const def = ex.def;
  const t = TYPES[ex.type];
  const image = String(def.image || '❓');
  const visuel = estImage(image)
    ? `<img class="fond-flou" src="${esc(image)}" alt="" aria-hidden="true"><img class="photo-principale" src="${esc(image)}" alt="">`
    : `<div class="emoji-exo">${esc(image)}</div>`;

  $('#app').innerHTML = `
    <section class="ecran">
      <header class="exo-haut">
        <button type="button" class="btn-rond" data-action="quitter" aria-label="Quitter">${ico('fermer')}</button>
        <div class="segments" aria-label="Exercice ${index + 1} sur ${exercices.length}">
          ${exercices.map((_, i) => `<span class="${i < index ? 'fait' : i === index ? 'actuel' : ''}"></span>`).join('')}
        </div>
        <button type="button" class="btn-rond" data-action="effacer" aria-label="Réessayer : effacer ma réponse">${ico('effacer')}</button>
        <span class="points-exo" aria-label="Points">${ico('etoile')}<b id="points">${session.points}</b></span>
      </header>

      <div class="zone-exo">
        <span class="type-exo"><span class="puce-type t${ex.type}">${ex.type}</span> ${t.fr} · <span lang="zh">${t.zh}</span></span>

        <div class="polaroid">
          <span class="scotch" aria-hidden="true"></span>
          <div class="cadre" role="img" aria-label="Photo de l'exercice">${visuel}</div>
          <button type="button" class="btn-rond btn-son" data-action="ecouter" aria-label="Écouter le mot" hidden>${ico('son')}</button>
        </div>

        <p class="consigne">${htmlBi(def.consigne || 'Trouve le mot / 找出单词')}</p>
        ${ex.type === 4 && def.indice ? `<div class="bulle-indice">${ico('ampoule')}<span><b>Indice :</b> ${htmlBi(def.indice)}</span></div>` : ''}

        <div id="cases" class="cases" aria-label="Cases de réponse"></div>
        <div id="message" class="message-essai" role="status" aria-live="polite"></div>

        ${ex.aide
          ? '<div id="tuiles" class="tuiles" aria-label="Lettres à choisir"></div>'
          : `<input id="saisie" class="saisie" type="text" inputmode="text" enterkeyhint="done"
                    autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                    placeholder="Écris ici · 在这里输入" aria-label="Ta réponse">`}
      </div>

      <footer id="pied" class="pied-exo"></footer>
    </section>`;

  if (!ex.aide) {
    const champ = $('#saisie');
    champ.addEventListener('input', () => { dessinerCases(); dessinerPied(); });
    champ.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); if (!session.ex.fini) verifier(); else suivant(); }
    });
    setTimeout(() => { try { champ.focus({ preventScroll: true }); } catch (err) { champ.focus(); } }, 60);
  }
  dessinerCases();
  dessinerTuiles();
  dessinerPied();
}

function reponseActuelle() {
  const ex = session.ex;
  if (!ex.aide) return $('#saisie') ? $('#saisie').value : '';
  return ex.chars.map((c, i) => (ex.verrou[i] ? c : ex.place[i] !== null ? ex.tuiles[ex.place[i]].lettre : '')).join('');
}
function reponseComplete() {
  const ex = session.ex;
  if (!ex.aide) return normaliser(reponseActuelle()).length > 0;
  return ex.chars.every((c, i) => ex.verrou[i] || ex.place[i] !== null);
}

function dessinerCases() {
  const ex = session.ex;
  const conteneur = $('#cases');
  if (!conteneur) return;
  const tapees = ex.aide ? [] : Array.from(($('#saisie') || { value: '' }).value.toUpperCase()).filter(estLettre);
  let k = 0;
  let premiereVide = true;

  conteneur.innerHTML = ex.chars.map((c, i) => {
    if (!estLettre(c)) return '<span class="case separateur" aria-hidden="true"></span>';
    if (ex.fini) return `<span class="case ${ex.reussi ? 'juste' : 'reponse'}">${esc(c)}</span>`;
    if (ex.aide) {
      if (ex.verrou[i]) return `<span class="case ${ex.devoilee[i] ? 'devoilee' : 'fixe'}">${esc(c)}</span>`;
      if (ex.place[i] !== null) {
        return `<button type="button" class="case remplie" data-action="retirer" data-i="${i}" aria-label="Retirer la lettre">${esc(ex.tuiles[ex.place[i]].lettre)}</button>`;
      }
      const active = premiereVide ? ' active' : '';
      premiereVide = false;
      return `<span class="case${active}"></span>`;
    }
    const lettre = tapees[k++];
    if (lettre) return `<span class="case remplie">${esc(lettre)}</span>`;
    if (ex.devoilee[i]) return `<span class="case devoilee indice-saisie">${esc(c)}</span>`;
    const active = premiereVide ? ' active' : '';
    premiereVide = false;
    return `<span class="case${active}"></span>`;
  }).join('');
  if (!ex.aide && !ex.fini) conteneur.onclick = () => $('#saisie') && $('#saisie').focus();
}

function dessinerTuiles() {
  const ex = session.ex;
  const conteneur = $('#tuiles');
  if (!conteneur) return;
  if (ex.fini) { conteneur.innerHTML = ''; return; }
  conteneur.innerHTML = ex.tuiles.map((t, k) => {
    if (t.retiree) return '';
    const base = normaliser(t.lettre).toUpperCase()[0] || '';
    return `<button type="button" class="tuile ${t.utilisee ? 'utilisee' : ''}" data-action="tuile" data-k="${k}"
      data-pts="${VALEURS[base] || ''}" ${t.utilisee ? 'tabindex="-1" aria-hidden="true"' : ''}>${esc(t.lettre)}</button>`;
  }).join('');
}

/** Barre du bas : Passer | Indice | Vérifier — puis panneau Bravo / Réponse */
function dessinerPied() {
  const ex = session.ex;
  const pied = $('#pied');
  if (!pied) return;
  const dernier = session.index === session.exercices.length - 1;
  const continuer = `<button type="button" class="btn ${ex.reussi ? 'btn-vert' : 'btn-rouge'} btn-large" data-action="suivant">
      ${dernier ? 'Voir mon résultat · 看结果' : 'Continuer · 继续'} ${ico('jouer')}</button>`;

  if (ex.fini && ex.reussi) {
    pied.className = 'pied-exo reussi';
    pied.innerHTML = `<div class="verdict"><span class="rond-verdict">${ico('coche')}</span>
      <div><b>${esc(session.bravo)}</b><span>« ${esc(ex.def.mot)} » ${ex.erreurs === 0 && ex.indices === 0 ? `+${CONFIG.pointsSansErreur}` : `+${CONFIG.pointsAvecErreur}`} points</span></div></div>${continuer}`;
    return;
  }
  if (ex.fini) {
    pied.className = 'pied-exo rate';
    pied.innerHTML = `<div class="verdict"><span class="rond-verdict">${ico('livre')}</span>
      <div><b>La réponse : « ${esc(ex.def.mot)} »</b><span lang="zh">正确答案 — 记住它！</span></div></div>${continuer}`;
    return;
  }
  pied.className = 'pied-exo';
  pied.innerHTML = `
    <button type="button" class="btn btn-blanc petit-bouton" data-action="passer" aria-label="Passer">${ico('passer')}Passer</button>
    <button type="button" class="btn btn-blanc petit-bouton" data-action="indice" aria-label="Indice" ${peutDevoiler() ? '' : 'disabled'}>${ico('ampoule')}Indice</button>
    <button type="button" class="btn btn-rouge" data-action="verifier" ${reponseComplete() ? '' : 'disabled'}>Vérifier · 检查</button>`;
}

function message(texteBilingue) {
  const el = $('#message');
  if (el) el.innerHTML = texteBilingue ? htmlBi(texteBilingue) : '';
}

/* ---------- Actions ---------- */
function choisirTuile(k) {
  const ex = session.ex;
  const tuile = ex.tuiles[k];
  if (!tuile || tuile.utilisee || ex.fini) return;
  const i = ex.chars.findIndex((c, p) => !ex.verrou[p] && ex.place[p] === null);
  if (i === -1) return;
  ex.place[i] = k;
  tuile.utilisee = true;
  message('');
  dessinerCases(); dessinerTuiles(); dessinerPied();
}
function retirerLettre(i) {
  const ex = session.ex;
  if (ex.fini || ex.place[i] === null) return;
  ex.tuiles[ex.place[i]].utilisee = false;
  ex.place[i] = null;
  dessinerCases(); dessinerTuiles(); dessinerPied();
}
function viderReponse() {
  const ex = session.ex;
  if (ex.fini) return;
  if (ex.aide) {
    ex.place = ex.place.map(() => null);
    ex.tuiles.forEach((t) => { t.utilisee = false; });
  } else if ($('#saisie')) {
    $('#saisie').value = '';
  }
  dessinerCases(); dessinerTuiles(); dessinerPied();
}
function peutDevoiler() {
  const ex = session.ex;
  return ex.chars.filter((c, i) => estLettre(c) && !ex.verrou[i]).length > 1;
}
function devoilerLettre() {
  const ex = session.ex;
  if (!peutDevoiler()) return false;
  const libres = ex.chars.map((c, i) => i).filter((i) => estLettre(ex.chars[i]) && !ex.verrou[i]);
  const i = libres[Math.floor(Math.random() * libres.length)];
  if (ex.aide) {
    ex.place = ex.place.map(() => null);
    ex.tuiles.forEach((t) => { t.utilisee = false; });
    const k = ex.tuiles.findIndex((t) => !t.retiree && normaliser(t.lettre) === normaliser(ex.chars[i]));
    if (k !== -1) ex.tuiles[k].retiree = true;
  }
  ex.verrou[i] = true;
  ex.devoilee[i] = true;
  return true;
}
function utiliserIndice() {
  const ex = session.ex;
  if (ex.fini || !devoilerLettre()) return;
  ex.indices++;
  session.indices++;
  session.penalites += CONFIG.penaliteIndice;
  message('Voici une lettre ! / 给你一个字母！');
  dessinerCases(); dessinerTuiles(); dessinerPied();
}

function verifier() {
  const ex = session.ex;
  if (ex.fini || !reponseComplete()) return;

  if (normaliser(reponseActuelle()) === normaliser(ex.def.mot)) {
    ex.fini = true;
    ex.reussi = true;
    session.points += ex.erreurs === 0 && ex.indices === 0 ? CONFIG.pointsSansErreur : CONFIG.pointsAvecErreur;
    session.bilan.push({ mot: ex.def.mot, image: ex.def.image, audio: ex.def.audio, reussi: true });
    session.bravo = ['Bravo ! 太棒了！', 'Super ! 真棒！', 'Excellent ! 好极了！', 'Parfait ! 完美！'][Math.floor(Math.random() * 4)];
    vibrer(30);
    message('');
    terminerExercice();
    $('#cases').classList.add('bravo');
    return;
  }

  ex.erreurs++;
  session.erreurs++;
  session.penalites++;
  vibrer([60, 40, 60]);
  const cases = $('#cases');
  cases.classList.remove('secoue');
  void cases.offsetWidth;
  cases.classList.add('secoue');

  if (ex.erreurs >= CONFIG.essaisMax) {
    montrerReponse();
  } else if (ex.erreurs === 1) {
    message('Réessaie ! / 再试试！');
    setTimeout(() => { if (session && session.ex === ex && !ex.fini) viderReponse(); }, 650);
  } else {
    setTimeout(() => {
      if (!session || session.ex !== ex || ex.fini) return;
      viderReponse();
      message(devoilerLettre() ? 'Presque ! Voici une lettre en plus / 差一点！再给你一个字母' : 'Presque ! Réessaie / 差一点！再试试');
      dessinerCases(); dessinerTuiles(); dessinerPied();
    }, 650);
  }
}
function montrerReponse() {
  const ex = session.ex;
  ex.fini = true;
  ex.reussi = false;
  session.bilan.push({ mot: ex.def.mot, image: ex.def.image, audio: ex.def.audio, reussi: false });
  message('');
  terminerExercice();
}
function passer() {
  const ex = session.ex;
  if (ex.fini) return;
  session.passes++;
  session.penalites += CONFIG.penalitePasser;
  montrerReponse();
}
function terminerExercice() {
  const champ = $('#saisie');
  if (champ) { champ.readOnly = true; champ.blur(); }
  $('#points').textContent = session.points;
  $('.btn-son').hidden = false;
  parler(session.ex.def.audio || session.ex.def.mot);
  dessinerCases(); dessinerTuiles(); dessinerPied();
}
function suivant() {
  if (!session) return;
  session.index++;
  if (session.index < session.exercices.length) {
    preparerExercice();
    window.scrollTo(0, 0);
  } else {
    terminerEtape();
  }
}

function calculerEtoiles(penalites) {
  if (penalites === 0) return 3;
  if (penalites <= 2) return 2;
  return 1;
}
function terminerEtape() {
  const s = session;
  if (s.cacheDepuis) s.pause += Date.now() - s.cacheDepuis;
  const duree = Math.min(CONFIG.dureeMaxEtape, Math.max(0, Math.round((Date.now() - s.debut - s.pause) / 1000)));
  const etoiles = calculerEtoiles(s.penalites);
  const info = enregistrerEtape(s.n, s.e, {
    etoiles, points: s.points, erreurs: s.erreurs, indices: s.indices, passes: s.passes,
    nbExercices: s.exercices.length, duree
  });
  dernierResultat = { n: s.n, e: s.e, etoiles, points: s.points, penalites: s.penalites, duree, bilan: s.bilan, ...info };
  session = null;
  aller(`#/resultat/${s.n}/${s.e}`, true);
  Sync.lancer();
}

/* =====================================================================
   🏆 RÉSULTAT
   ===================================================================== */
function afficherResultat() {
  ecranActuel = 'resultat';
  const r = dernierResultat;
  const suite = etapeSuivante(r.n, r.e);
  const titre = { 3: 'Parfait ! / 太完美了！', 2: 'Très bien ! / 很好！', 1: 'Bien joué ! / 做得好！' }[r.etoiles];
  const minutes = Math.floor(r.duree / 60);
  const secondes = String(r.duree % 60).padStart(2, '0');

  $('#app').innerHTML = `
    <section class="ecran">
      <div class="resultat-haut">
        <div class="grandes-etoiles" aria-label="${r.etoiles} étoiles sur 3">
          ${[1, 2, 3].map((k) => ico('etoile', k <= r.etoiles ? '' : 'vide')).join('')}
        </div>
        <div class="ruban titre-jeu">${htmlBi(titre)}</div>
        ${r.record ? `<div><span class="pastille record">Nouveau record ! · 新纪录！</span></div>` : ''}
      </div>
      <div class="stats-resultat">
        <div class="stat"><b>${r.points}</b><span>points<br><span lang="zh">分数</span></span></div>
        <div class="stat"><b>${r.penalites}</b><span>erreurs<br><span lang="zh">错误</span></span></div>
        <div class="stat"><b>${minutes}:${secondes}</b><span>temps<br><span lang="zh">用时</span></span></div>
      </div>

      ${r.etoiles < 3 ? `<p style="text-align:center;margin:14px 16px 0;color:var(--encre-douce);font-weight:600;font-size:.9rem">
        Rejoue pour gagner 3 étoiles ! <span lang="zh">再玩一次，争取三颗星！</span></p>` : ''}

      <div class="mots-appris">
        <h2>Mots appris <span class="zh" lang="zh">学到的单词 · 点击收听</span></h2>
        <ul>${r.bilan.map((m) => `
          <li><button type="button" class="puce-mot ${m.reussi ? '' : 'rate'}" data-action="dire" data-texte="${esc(m.audio || m.mot)}">
            ${estImage(m.image) ? `<img src="${esc(m.image)}" alt="">` : `<span>${esc(m.image)}</span>`}${esc(m.mot)} ${ico('son')}
          </button></li>`).join('')}</ul>
      </div>

      <div class="boutons-resultat">
        ${suite ? `<button type="button" class="btn btn-rouge btn-large" data-action="etape" data-n="${suite[0]}" data-e="${suite[1]}" data-remplacer="1">
            ${suite[0] !== r.n ? 'Niveau suivant · 下一关' : 'Étape suivante · 下一步'} ${ico('jouer')}</button>`
          : '<p class="alerte ok">Tu as terminé toute l\'aventure ! · 你完成了全部课程！</p>'}
        <button type="button" class="btn btn-blanc btn-large" data-action="etape" data-n="${r.n}" data-e="${r.e}" data-remplacer="1">${ico('effacer')} Recommencer · 再来一次</button>
        <button type="button" class="btn btn-blanc btn-large" data-action="accueil">${ico('retour')} Mon aventure · 返回</button>
      </div>
      <div style="height:calc(28px + var(--sur-bas))"></div>
    </section>`;

  if (r.etoiles === 3) lancerConfettis();
}

function lancerConfettis() {
  const couleurs = ['#E4252B', '#FFFFFF', '#FFB800', '#B5141B', '#FFE3E2'];
  const zone = document.createElement('div');
  zone.className = 'confettis';
  for (let i = 0; i < 46; i++) {
    const c = document.createElement('i');
    c.style.left = Math.random() * 100 + '%';
    c.style.background = couleurs[i % couleurs.length];
    c.style.boxShadow = '0 0 0 1px rgba(228,37,43,.25)';
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.5 + 's';
    zone.appendChild(c);
  }
  document.body.appendChild(zone);
  setTimeout(() => zone.remove(), 4500);
}

/* =====================================================================
   🏆 CLASSEMENT — pour motiver les élèves entre eux
   Semaine : points gagnés depuis lundi (une étape compte 1 fois par jour,
   les étapes faites trop vite ne comptent pas). Général : total des étoiles.
   Les calculs sont faits par le serveur (fonction « classement »).
   ===================================================================== */
let ongletClassement = 'semaine';

function debutSemaine(d = new Date()) {
  const lundi = new Date(d);
  lundi.setHours(0, 0, 0, 0);
  lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  return lundi;
}
const rangFr = (r) => (r === 1 ? '1er' : r + 'e');

/** Classement en cache (la partie « semaine » est vidée si une nouvelle semaine a commencé) */
function classementCache() {
  const c = P() && P().classement;
  if (!c) return null;
  const memeSemaine = new Date(c.debut).getTime() >= debutSemaine().getTime() - 86400000;
  return { ...c, semaine: memeSemaine ? c.semaine : [], nb_semaine: memeSemaine ? c.nb_semaine : 0 };
}

function texteMaPlace() {
  const c = classementCache();
  const moi = c && c.semaine.find((x) => x.moi);
  return moi ? `${rangFr(moi.rang)} · 第${moi.rang}名` : 'Classement · 排行榜';
}

function afficherClassement(rafraichir = true) {
  ecranActuel = 'classement';
  session = null;
  const c = classementCache();
  const semaine = ongletClassement === 'semaine';
  const liste = c ? (semaine ? c.semaine : c.general) : [];
  const unite = semaine ? 'pts' : '★';
  const moi = liste.find((x) => x.moi);

  // Phrase de motivation : qui dépasser, et de combien
  let motivation = '';
  if (c && !moi) {
    motivation = semaine ? 'Termine une étape pour entrer dans le classement de la semaine ! · 完成一个关卡即可上榜！'
                         : 'Gagne ta première étoile pour entrer dans le classement ! · 获得第一颗星即可上榜！';
  } else if (moi && moi.rang === 1) {
    motivation = 'Tu es à la 1re place ! Garde-la ! · 你是第一名！继续保持！';
  } else if (moi) {
    const devant = liste.filter((x) => x.score > moi.score).pop();
    const ecart = devant ? devant.score - moi.score + 1 : 0;
    motivation = !devant ? 'Continue, tu peux monter ! · 加油，继续前进！'
      : semaine ? `Encore ${ecart} points pour dépasser ${devant.nom} ! · 再得${ecart}分就能超过${devant.nom}！`
      : `Encore ${ecart} étoile${ecart > 1 ? 's' : ''} pour dépasser ${devant.nom} ! · 再得${ecart}颗星就能超过${devant.nom}！`;
  }

  const podium = liste.filter((x) => x.ordre <= 3);
  const reste = liste.filter((x) => x.ordre > 3);
  const ligne = (x, i) => {
    const precedent = i > 0 ? reste[i - 1].ordre : 3;
    return `${x.ordre > precedent + 1 ? '<li class="saut" aria-hidden="true">···</li>' : ''}
      <li class="${x.moi ? 'moi' : ''}"><span class="rang">${x.rang}</span>
        <span class="avatar">${esc(Array.from(x.nom)[0] || '?')}</span>
        <span class="nom">${esc(x.nom)}${x.moi ? ' <small>(toi · 你)</small>' : ''}</span>
        <span class="score">${x.score} ${unite}</span></li>`;
  };
  const marche = (x, cls) => (x ? `
      <div class="marche ${cls} ${x.moi ? 'moi' : ''}">
        <span class="avatar">${esc(Array.from(x.nom)[0] || '?')}</span>
        <b class="nom">${esc(x.nom)}</b>
        <span class="score">${x.score} ${unite}</span>
        <div class="socle"><span>${x.rang}</span></div>
      </div>` : `<div class="marche ${cls} vide"><div class="socle"></div></div>`);

  let corps;
  if (!Sync.configure()) {
    corps = '<p class="classement-vide">Le classement s\'affiche quand ton prof a relié l\'appli au serveur.<br><span lang="zh">老师连接服务器后即可查看排行榜。</span></p>';
  } else if (!c) {
    corps = `<p class="classement-vide">${navigator.onLine === false
      ? 'Connecte-toi à Internet pour voir le classement.<br><span lang="zh">请连接网络查看排行榜。</span>'
      : 'Chargement… · 加载中…'}</p>`;
  } else if (!liste.length) {
    corps = `<p class="classement-vide">${semaine
      ? 'Personne n\'a encore joué cette semaine. Prends la 1re place !<br><span lang="zh">本周还没有人上榜，快来当第一名！</span>'
      : 'Personne n\'a encore d\'étoile. Prends la 1re place !<br><span lang="zh">还没有人获得星星，快来当第一名！</span>'}</p>`;
  } else {
    corps = `
      <div class="podium">
        ${marche(podium.find((x) => x.ordre === 2), 'deux')}
        ${marche(podium.find((x) => x.ordre === 1), 'un')}
        ${marche(podium.find((x) => x.ordre === 3), 'trois')}
      </div>
      ${reste.length ? `<ol class="liste-classement">${reste.map(ligne).join('')}</ol>` : ''}`;
  }

  const nb = c ? (semaine ? c.nb_semaine : c.nb_general) : 0;
  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut('Classement')}
      <div class="page">
        ${htmlSurtitre('Entre élèves', '同学之间')}
        <h1 class="titre-page">Classement</h1>
        <div class="onglets-classement" role="tablist">
          <button type="button" role="tab" aria-selected="${semaine}" data-action="onglet-classement" data-onglet="semaine">Cette semaine · 本周</button>
          <button type="button" role="tab" aria-selected="${!semaine}" data-action="onglet-classement" data-onglet="general">Général · 总榜</button>
        </div>
        ${motivation ? `<p class="motivation">${ico('trophee')}<span>${moi ? `<b class="ma-place">Ta place : ${rangFr(moi.rang)} · 第${moi.rang}名 — ${moi.score} ${unite}</b>` : ''}${esc(motivation)}</span></p>` : ''}
        ${corps}
        <p class="regle-classement">
          ${semaine ? `Points gagnés depuis lundi. Une étape rapporte ses points une fois par jour. Les étapes faites trop vite ne comptent pas.
                       <span lang="zh">从周一开始累计积分。每个关卡每天只计一次分数，答得太快不计分。</span>`
                    : 'Total des étoiles (meilleur score de chaque étape). <span lang="zh">所有关卡最高星数之和。</span>'}
          ${nb ? `<br>${nb} élève${nb > 1 ? 's' : ''} classé${nb > 1 ? 's' : ''}.` : ''}
          ${c && c.recu ? `<br>Mis à jour ${esc(new Date(c.recu).toLocaleString('fr-FR', { weekday: 'short', hour: '2-digit', minute: '2-digit' }))}.` : ''}
        </p>
      </div>
      ${htmlNav('#/classement')}
    </section>`;

  if (rafraichir && Sync.configure()) {
    Sync.classement().then((ok) => {
      if (ecranActuel !== 'classement') return;
      if (ok) afficherClassement(false);
      else if (!c) {
        const z = document.querySelector('.classement-vide');
        if (z) z.innerHTML = 'Classement indisponible pour le moment. Réessaie plus tard.<br><span lang="zh">排行榜暂时无法显示，请稍后再试。</span>';
      }
    });
  }
}

/* =====================================================================
   📸 CRÉDITS PHOTOS
   ===================================================================== */
function afficherCredits() {
  ecranActuel = 'credits';
  session = null;
  const credits = typeof CREDITS_PHOTOS !== 'undefined' ? CREDITS_PHOTOS : {};
  const sur = (url) => /^https:\/\//.test(url || '');
  const lignes = Object.entries(credits).map(([src, c]) => {
    const mot = src.replace(/^.*\//, '').replace(/\.\w+$/, '');
    const licence = sur(c.licenceUrl) ? `<a href="${esc(c.licenceUrl)}" target="_blank" rel="noopener">${esc(c.licence)}</a>` : esc(c.licence || '');
    const source = sur(c.source) ? ` · <a href="${esc(c.source)}" target="_blank" rel="noopener">source</a>` : '';
    return `<li><img src="${esc(src)}" alt="" loading="lazy" decoding="async">
      <div><b>${esc(mot)}</b><span>${esc(c.auteur || 'Auteur inconnu')}</span><span>${licence}${source}</span></div></li>`;
  }).join('');

  $('#app').innerHTML = `
    <section class="ecran">
      ${P() ? htmlBarreHaut('Crédits photos', { retour: true }) : `<header class="barre-haut"><button type="button" class="icone-btn" data-action="accueil" aria-label="Retour">${ico('retour')}</button><div class="fil"><b>Crédits photos</b></div></header>`}
      <div class="page">
        ${htmlSurtitre('Merci aux photographes', '图片来源')}
        <h1 class="titre-page">Crédits photos</h1>
        <p style="margin-bottom:14px;font-size:.9rem;color:var(--encre-douce)">Photos libres issues de Wikimedia Commons. Merci à leurs auteurs !
          <span lang="zh">图片来自 Wikimedia Commons，感谢作者！</span></p>
        <ul class="liste-credits">${lignes || '<li>Aucune photo.</li>'}</ul>
      </div>
    </section>`;
}

/* =====================================================================
   👤 MENU DU PROFIL + 📲 AIDE À L'INSTALLATION
   ===================================================================== */
const Appareil = {
  ios: /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
  android: /android/i.test(navigator.userAgent),
  get safari() { return this.ios && !/crios|fxios|edgios|opios/i.test(navigator.userAgent); },
  get installee() { return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; }
};
let invitationInstall = null;

function ouvrirModale(html) {
  $('#modale').innerHTML = `<div class="modale" role="dialog" aria-modal="true">${html}</div>`;
  $('#modale').hidden = false;
  document.body.style.overflow = 'hidden';
}
function fermerModale() {
  const m = $('#modale');
  if (!m || m.hidden) return;
  m.hidden = true;
  m.innerHTML = '';
  document.body.style.overflow = '';
  setTimeout(essayerMiseAJour, 0);
}

function ouvrirMenuProfil() {
  const p = P();
  let synchro;
  if (!Sync.configure()) synchro = '<span class="point off"></span> Sauvegardé sur ce téléphone · 已保存在本机';
  else if (p.enAttente.length) synchro = `<span class="point attente"></span> ${p.enAttente.length} étape(s) à envoyer dès qu'Internet revient · 等待上传`;
  else if (p.synchro) synchro = `<span class="point"></span> Sauvegardé en ligne · 已云端保存 (${new Date(p.synchro).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })})`;
  else synchro = '<span class="point attente"></span> Connexion au serveur… · 正在连接';

  ouvrirModale(`
    <div class="entete-profil">
      <span class="avatar grand">${esc(Array.from(p.nom)[0] || '?')}</span>
      <div><b>${esc(p.nom)}</b><small>${totalEtoiles()} étoiles · ${etapesFaites()}/${totalEtapes()} étapes · ${serieJours()} jour(s) d'affilée</small></div>
    </div>
    <p class="etat-synchro">${synchro}</p>
    <div class="menu-liste">
      <button type="button" class="btn btn-blanc btn-large" data-action="deconnexion">${ico('sortir')} Changer d'élève · 切换用户</button>
      <button type="button" class="btn btn-blanc btn-large" data-action="aide">${ico('telephone')} Installer l'appli · 安装应用</button>
      <button type="button" class="btn btn-blanc btn-large" data-action="credits">${ico('photo')} Crédits photos · 图片来源</button>
      <button type="button" class="btn btn-rouge btn-large" data-action="fermer-modale">Fermer · 关闭</button>
    </div>
    <p style="font-size:.78rem;color:var(--encre-douce);margin-top:12px;text-align:center">
      Ta progression n'est jamais effacée : retape ton prénom pour la retrouver.<br><span lang="zh">进度不会丢失：再次输入名字即可找回。</span></p>`);
}

function ouvrirAide() {
  const android = `
    <section class="bloc-os ${Appareil.android ? 'actif' : ''}">
      <h3>Sur Android ${Appareil.android ? '<span class="tag">Ton appareil</span>' : ''}</h3>
      <ol>
        <li>Ouvre le lien dans <b>Chrome</b></li>
        <li>Appuie sur les <b>3 points ⋮</b> en haut à droite</li>
        <li>« <b>Ajouter à l'écran d'accueil</b> »</li>
        <li>« <b>Installer</b> »</li>
      </ol>
      <span class="zh" lang="zh">用 Chrome 打开链接 → 点击右上角的 ⋮ → “添加到主屏幕” → “安装”</span>
    </section>`;
  const ios = `
    <section class="bloc-os ${Appareil.ios ? 'actif' : ''}">
      <h3>Sur iPhone / iPad ${Appareil.ios ? '<span class="tag">Ton appareil</span>' : ''}</h3>
      <ol>
        <li>Ouvre le lien dans <b>Safari</b></li>
        <li>Appuie sur l'icône <b>« Partager »</b> en bas</li>
        <li>« <b>Ajouter à l'écran d'accueil</b> »</li>
        <li>« <b>Ajouter</b> »</li>
      </ol>
      <span class="zh" lang="zh">用 Safari 打开链接 → 点击底部的“分享”图标 → “添加到主屏幕” → “添加”</span>
      <p class="alerte">Sur iOS, il faut utiliser <b>Safari</b> pour installer l'appli (ne fonctionne pas avec Chrome/Firefox).<br>
        <span lang="zh">在 iOS 上必须使用 Safari 安装（Chrome / Firefox 不行）。</span></p>
    </section>`;
  let etat = '';
  if (Appareil.installee) etat = '<p class="alerte ok">L\'appli est déjà installée ! · 应用已安装！</p>';
  else if (Appareil.ios && !Appareil.safari) etat = '<p class="alerte">Tu n\'es pas dans Safari : copie le lien et ouvre-le dans Safari. · 请在 Safari 中打开。</p>';

  ouvrirModale(`
    <h2>Installer l'appli<span class="zh" lang="zh">如何安装应用 · 安装后可离线使用</span></h2>
    ${etat}
    ${invitationInstall ? `<button type="button" class="btn btn-rouge btn-large" data-action="installer" style="margin-top:12px">Installer maintenant · 立即安装</button>` : ''}
    ${Appareil.ios ? ios + android : android + ios}
    <details>
      <summary>Mettre à jour l'appli · 更新应用</summary>
      <ul>
        <li>C'est automatique : ouvre l'appli avec Internet, la nouvelle version s'installe toute seule (jamais pendant un exercice). 联网打开应用即可自动更新。</li>
        <li><b>iPhone :</b> si rien ne change, ferme complètement l'appli puis rouvre-la.</li>
        <li><b>En dernier recours :</b> supprime l'icône et réinstalle depuis Safari. Ta progression revient quand tu retapes ton prénom (si le serveur est configuré).</li>
      </ul>
    </details>
    <div class="actions-modale">
      <button type="button" class="btn btn-rouge btn-large" data-action="fermer-modale">Fermer · 关闭</button>
    </div>`);
}

/* =====================================================================
   👆 CLICS (un seul écouteur pour toute l'appli)
   ===================================================================== */
document.addEventListener('click', (ev) => {
  if (ev.target.id === 'modale') { fermerModale(); return; }
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const n = parseInt(el.dataset.n, 10);
  const e = parseInt(el.dataset.e, 10);

  switch (action) {
    case 'profil-choisir': {
      const p = Profils.data.profils[el.dataset.cle];
      if (p) validerConnexion(p.nom);
      break;
    }
    case 'menu-profil': ouvrirMenuProfil(); break;
    case 'deconnexion':
      fermerModale();
      Profils.deconnecter();
      aller('#/', true);
      break;
    case 'accueil': retourVers('#/'); break;
    case 'onglet': if (el.dataset.hash !== location.hash || !location.hash) aller(el.dataset.hash, true); else window.scrollTo({ top: 0, behavior: 'smooth' }); break;
    case 'retour': {
      const prec = (history.state && history.state.prev) || '#/parcours';
      retourVers(prec);
      break;
    }
    case 'niveau':
      if (niveauDebloque(n)) aller(`#/niveau/${n}`);
      else { vibrer(40); toast('Termine d\'abord le niveau précédent · 请先完成上一关'); }
      break;
    case 'etape':
      if (etapeDebloquee(n, e)) aller(`#/etape/${n}/${e}`, el.dataset.remplacer === '1');
      else { vibrer(40); toast('Termine d\'abord l\'étape précédente · 请先完成上一步'); }
      break;
    case 'quitter':
      if (session) retourVers(`#/niveau/${session.n}`);
      else retourVers('#/');
      break;
    case 'tuile': choisirTuile(parseInt(el.dataset.k, 10)); break;
    case 'retirer': retirerLettre(parseInt(el.dataset.i, 10)); break;
    case 'effacer': viderReponse(); message(''); break;
    case 'verifier': verifier(); break;
    case 'indice': utiliserIndice(); break;
    case 'passer': passer(); break;
    case 'suivant': suivant(); break;
    case 'ecouter': if (session) parler(session.ex.def.audio || session.ex.def.mot); break;
    case 'dire': parler(el.dataset.texte); break;
    case 'aide': ouvrirAide(); break;
    case 'credits': aller('#/credits'); break;
    case 'classement': aller('#/classement'); break;
    case 'onglet-classement': ongletClassement = el.dataset.onglet === 'general' ? 'general' : 'semaine'; afficherClassement(false); break;
    case 'fermer-modale': fermerModale(); break;
    case 'installer':
      if (invitationInstall) {
        invitationInstall.prompt();
        invitationInstall.userChoice.finally(() => { invitationInstall = null; fermerModale(); });
      }
      break;
  }
});

document.addEventListener('submit', (ev) => {
  if (ev.target.id === 'form-connexion') {
    ev.preventDefault();
    validerConnexion($('#champ-nom').value);
  }
});
document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fermerModale(); });

window.addEventListener('beforeinstallprompt', (ev) => { ev.preventDefault(); invitationInstall = ev; });
window.addEventListener('appinstalled', () => { invitationInstall = null; toast('Appli installée ! · 安装成功！'); });
window.addEventListener('online', () => Sync.lancer());
window.addEventListener('offline', () => toast('Hors-ligne : tout continue de fonctionner · 离线模式'));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - Sync.dernierEssai > 60000) Sync.lancer();
});

/* =====================================================================
   ⚙️ SERVICE WORKER (hors-ligne + mises à jour)
   ===================================================================== */
// Mise à jour AUTOMATIQUE : la nouvelle version est téléchargée en arrière-plan,
// puis installée dès que l'élève est à un moment « calme » (jamais pendant un
// exercice, sur l'écran de résultat, ou pendant qu'il écrit son prénom).
let travailleurEnAttente = null;
let majDemandee = false;
function momentCalme() {
  const champActif = document.activeElement && document.activeElement.matches('input, textarea');
  return !session && !['etape', 'resultat'].includes(ecranActuel) && !champActif && $('#modale').hidden;
}
function proposerMiseAJour(t) { travailleurEnAttente = t; essayerMiseAJour(); }
function essayerMiseAJour() {
  if (!travailleurEnAttente || majDemandee || !momentCalme()) return;
  majDemandee = true;
  try { sessionStorage.setItem('maj-faite', '1'); } catch (e) { /* rien */ }
  travailleurEnAttente.postMessage({ type: 'SKIP_WAITING' });
}
if ('serviceWorker' in navigator && (location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname))) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) proposerMiseAJour(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const nouveau = reg.installing;
        if (!nouveau) return;
        nouveau.addEventListener('statechange', () => {
          if (nouveau.state === 'installed' && navigator.serviceWorker.controller) proposerMiseAJour(nouveau);
        });
      });
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update().catch(() => {});
        essayerMiseAJour(); // l'appli passe en arrière-plan ou revient : bon moment pour se mettre à jour
      });
    }).catch((err) => console.warn('Service Worker non enregistré :', err));
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (majDemandee) { majDemandee = false; location.reload(); }
    });
  });
}

/* =====================================================================
   🚀 DÉMARRAGE
   ===================================================================== */
Profils.charger();
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
if ('speechSynthesis' in window) window.speechSynthesis.getVoices();
window.addEventListener('popstate', () => { router(); essayerMiseAJour(); });
try {
  if (sessionStorage.getItem('maj-faite')) { sessionStorage.removeItem('maj-faite'); setTimeout(() => toast('✨ Appli mise à jour · 已更新'), 600); }
} catch (e) { /* rien */ }
router();
Sync.lancer();
