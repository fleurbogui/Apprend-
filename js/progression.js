// Progression de l'élève connecté : étapes faites, étoiles, déblocage, devoirs.
// Une étape est repérée par la clé "idNiveau-numéroÉtape" (par exemple "3-2").
import { NIVEAUX } from './donnees.js';
import { P, Profils } from './profils.js';
import { jourLocal, joursEntre, nouvelId } from './outils.js';

export const cleEtape = (n, e) => NIVEAUX[n].id + '-' + (e + 1);

export function indexDeCle(cle) {
  const [id, num] = String(cle).split('-').map(Number);
  const n = NIVEAUX.findIndex((niv) => niv.id === id);
  if (n === -1 || !NIVEAUX[n].etapes[num - 1]) return null;
  return [n, num - 1];
}

const infoEtape = (n, e) => (P() && P().etapes[cleEtape(n, e)]) || null;
export const etapeTerminee = (n, e) => !!infoEtape(n, e);
export const etoilesEtape = (n, e) => (infoEtape(n, e) || { etoiles: 0 }).etoiles;
export const niveauTermine = (n) => NIVEAUX[n].etapes.every((_, e) => etapeTerminee(n, e));
export const etoilesNiveau = (n) => NIVEAUX[n].etapes.reduce((s, _, e) => s + etoilesEtape(n, e), 0);
export const etapesFaitesNiveau = (n) => NIVEAUX[n].etapes.filter((_, e) => etapeTerminee(n, e)).length;
export const totalEtoiles = () => NIVEAUX.reduce((s, _, n) => s + etoilesNiveau(n), 0);
export const totalEtapes = () => NIVEAUX.reduce((s, niv) => s + niv.etapes.length, 0);
export const etapesFaites = () => NIVEAUX.reduce((s, _, n) => s + etapesFaitesNiveau(n), 0);
export const couvertureNiveau = (n) => NIVEAUX[n].image || NIVEAUX[n].etapes[0][0].image;

export function motsAppris() {
  return NIVEAUX.reduce((s, niv, n) => s + niv.etapes.reduce((t, etape, e) => t + (etapeTerminee(n, e) ? etape.length : 0), 0), 0);
}

// Les étapes données en devoir sont toujours ouvertes
function etapesEnDevoir() {
  const s = new Set();
  ((P() && P().devoirs) || []).forEach((d) => (d.etapes || []).forEach((k) => s.add(k)));
  return s;
}

export function niveauDebloque(n) {
  if (n === 0 || niveauTermine(n - 1)) return true;
  if (NIVEAUX[n].etapes.some((_, e) => etapeTerminee(n, e))) return true; // déjà commencé
  const dev = etapesEnDevoir();
  return NIVEAUX[n].etapes.some((_, e) => dev.has(cleEtape(n, e)));
}

export function etapeDebloquee(n, e) {
  if (etapesEnDevoir().has(cleEtape(n, e))) return true;
  const normal = (n === 0 || niveauTermine(n - 1)) && (e === 0 || etapeTerminee(n, e - 1));
  return normal || etapeTerminee(n, e);
}

export function etapeSuivante(n, e) {
  if (e + 1 < NIVEAUX[n].etapes.length) return [n, e + 1];
  if (n + 1 < NIVEAUX.length) return [n + 1, 0];
  return null;
}

// Prochaine étape à jouer, ou null si tout est terminé
export function prochaineEtape() {
  for (let n = 0; n < NIVEAUX.length; n++) {
    for (let e = 0; e < NIVEAUX[n].etapes.length; e++) {
      if (etapeDebloquee(n, e) && !etapeTerminee(n, e)) return [n, e];
    }
  }
  return null;
}

// Enregistre une étape terminée : meilleur score, historique et file d'envoi au serveur
export function enregistrerEtape(n, e, r) {
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

export const aJoueAujourdhui = () => (P().historique || []).some((h) => jourLocal(h.fait_le) === jourLocal());

// Jours d'affilée avec au moins une étape terminée (hier compte encore)
export function serieJours() {
  const jours = new Set((P().historique || []).map((h) => jourLocal(h.fait_le)));
  let jour = jourLocal();
  if (!jours.has(jour)) {
    const hier = new Date();
    hier.setDate(hier.getDate() - 1);
    jour = jourLocal(hier);
    if (!jours.has(jour)) return 0;
  }
  let n = 0;
  const d = new Date(jour + 'T12:00:00');
  while (jours.has(jourLocal(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

// Devoirs : une étape compte si elle a été terminée après la création du devoir
function etapeFaitePourDevoir(devoir, cle) {
  const depuis = new Date(devoir.cree_le).getTime() || 0;
  return (P().historique || []).some((h) => h.etape === cle && new Date(h.fait_le).getTime() >= depuis);
}

export function devoirsAffiches() {
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

export function texteEcheance(d) {
  if (d.fini) return { classe: 'fini', fr: 'Fait', zh: '完成' };
  if (d.jours < 0) return { classe: 'urgent', fr: 'En retard', zh: '逾期' };
  if (d.jours === 0) return { classe: 'urgent', fr: "Aujourd'hui", zh: '今天' };
  if (d.jours === 1) return { classe: 'urgent', fr: 'Demain', zh: '明天' };
  return { classe: '', fr: `Dans ${d.jours} jours`, zh: `${d.jours}天后` };
}
