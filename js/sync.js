// Synchronisation avec Supabase.
// L'appli marche hors ligne : les étapes terminées attendent dans profil.enAttente
// et partent dès que le réseau revient. Le serveur reconnaît l'élève à son jeton.
import { SERVEUR } from './donnees.js';
import { P, Profils } from './profils.js';
import { debutSemaine, emettre, toast } from './outils.js';

export const serveurConfigure = () => /^https:\/\/.+/.test(SERVEUR.url || '') && !!SERVEUR.cleAnon;

export async function rpc(fonction, args) {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), 15000);
  try {
    const rep = await fetch(`${SERVEUR.url.replace(/\/+$/, '')}/rest/v1/rpc/${fonction}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SERVEUR.cleAnon, Authorization: 'Bearer ' + SERVEUR.cleAnon },
      body: JSON.stringify(args),
      signal: ctrl.signal
    });
    if (!rep.ok) throw new Error(`HTTP ${rep.status} ${(await rep.text()).slice(0, 200)}`);
    return await rep.json();
  } finally {
    clearTimeout(minuteur);
  }
}

// Fusionne la progression du serveur avec celle du téléphone (meilleur score gardé)
export function fusionner(profil, donnees) {
  let recuperees = 0;
  if (Array.isArray(donnees.devoirs)) profil.devoirs = donnees.devoirs;
  Object.entries(donnees.progression || {}).forEach(([cle, srv]) => {
    const loc = profil.etapes[cle];
    if (!loc) recuperees++;
    profil.etapes[cle] = {
      etoiles: Math.max(Number(srv.etoiles) || 0, loc ? loc.etoiles : 0),
      points: Math.max(Number(srv.points) || 0, loc ? loc.points : 0),
      fois: Math.max(Number(srv.fois) || 0, loc ? loc.fois : 0),
      date: loc ? loc.date : Date.now()
    };
  });
  return recuperees;
}

// Le serveur ne reconnaît plus le jeton : le prof a remis le code à zéro
function sessionExpiree(profil) {
  profil.jeton = null;
  profil.codeLocal = null;
  Profils.sauver();
  if (P() === profil) emettre('session-expiree');
}

// Ne garde du classement que des valeurs simples, quoi que renvoie le serveur
function nettoyerClassement(c) {
  const liste = (l) => (Array.isArray(l) ? l : []).slice(0, 25).map((x) => ({
    rang: Number(x.rang) || 0, ordre: Number(x.ordre) || 0, score: Number(x.score) || 0,
    nom: String(x.nom || '').slice(0, 30), moi: x.moi === true
  }));
  return {
    debut: c.debut, nb_semaine: Number(c.nb_semaine) || 0, nb_general: Number(c.nb_general) || 0,
    semaine: liste(c.semaine), general: liste(c.general), recu: Date.now()
  };
}

export async function chargerClassement(profil = P()) {
  if (!profil || !profil.jeton || !serveurConfigure() || navigator.onLine === false) return false;
  try {
    const c = await rpc('classement', { p_jeton: profil.jeton, p_debut: debutSemaine().toISOString() });
    if (c && c.erreur === 'session') { sessionExpiree(profil); return false; }
    if (!c || !Array.isArray(c.semaine)) return false;
    profil.classement = nettoyerClassement(c);
    Profils.sauver();
    return true;
  } catch (e) {
    console.warn('Classement indisponible :', e.message);
    return false;
  }
}

let enCours = false;
export let dernierEssai = 0;

// Récupère la progression du serveur et envoie les étapes en attente
export async function synchroniser() {
  const profil = P();
  if (!profil || !profil.jeton || !serveurConfigure() || enCours || navigator.onLine === false) return;
  enCours = true;
  dernierEssai = Date.now();
  try {
    const d = await rpc('eleve_session', { p_jeton: profil.jeton });
    if (d && d.erreur === 'session') { sessionExpiree(profil); return; }
    const recuperees = fusionner(profil, d || {});
    Profils.sauver();

    while (profil.enAttente.length) {
      const lot = profil.enAttente.slice(0, 50);
      const r = await rpc('eleve_envoyer', { p_jeton: profil.jeton, p_tentatives: lot });
      if (r && r.erreur === 'session') { sessionExpiree(profil); return; }
      const envoyes = new Set(lot.map((t) => t.client_id));
      profil.enAttente = profil.enAttente.filter((t) => !envoyes.has(t.client_id));
      if (r && Array.isArray(r.devoirs)) profil.devoirs = r.devoirs;
      Profils.sauver();
    }
    profil.synchro = Date.now();
    Profils.sauver();
    await chargerClassement(profil);
    if (recuperees > 0) toast(`Progression récupérée : ${recuperees} étape(s) · 进度已恢复`);
    emettre('synchro-terminee');
  } catch (e) {
    console.warn('Synchronisation impossible, nouvel essai plus tard :', e.message);
  } finally {
    enCours = false;
  }
}
