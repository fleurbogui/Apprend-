// Tableau de bord des profs : connexion Supabase, suivi des élèves,
// devoirs et classement de la semaine.
'use strict';

// Réglages des alertes
const REGLES = {
  secondesMinParMot: 6,   // moins de 6 s par mot sur une étape = "trop rapide"
  passesMax: 2,           // plus de 2 exercices passés sur une étape = alerte
  joursInactif: 7         // pas d'activité depuis 7 jours = "inactif"
};

const $ = (s) => document.querySelector(s);
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bilingue = (t) => { const i = String(t).indexOf(' / '); return i === -1 ? { fr: t, zh: '' } : { fr: t.slice(0, i), zh: t.slice(i + 3) }; };
const jourLocal = (d = new Date()) => { d = new Date(d); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const finDeJour = (jour) => new Date(jour + 'T23:59:59');
const fmtDate = (d, opt = { day: 'numeric', month: 'short' }) => new Date(d).toLocaleDateString('fr-FR', opt);
const fmtDateHeure = (d) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
function fmtDuree(s) {
  s = Math.round(s || 0);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ${String(s % 60).padStart(2, '0')}`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}
function depuis(date) {
  if (!date) return 'jamais';
  const j = Math.floor((Date.now() - new Date(date)) / 86400000);
  if (j <= 0) return "aujourd'hui";
  if (j === 1) return 'hier';
  return `il y a ${j} jours`;
}
let minuteurToast;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('visible'); clearTimeout(minuteurToast); minuteurToast = setTimeout(() => t.classList.remove('visible'), 2800); }

const ICONES = {
  ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  horloge: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  croix: '<path d="M18 6L6 18M6 6l12 12"/>',
  demi: '<circle cx="12" cy="12" r="9"/><path fill="currentColor" stroke="none" d="M12 3a9 9 0 0 1 0 18z"/>',
  cercle: '<circle cx="12" cy="12" r="9"/>',
  eclair: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  passer: '<path d="M5 5.5l8 6.5-8 6.5z"/><path d="M18 5v14"/>',
  sommeil: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  poubelle: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  sortir: '<path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  actualiser: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  telecharger: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  etoile: '<path fill="currentColor" stroke="none" d="M12 2.2l3 6.2 6.8.9-5 4.7 1.3 6.7L12 17.5l-6.1 3.2 1.3-6.7-5-4.7 6.8-.9z"/>',
  livre: '<path d="M4 19.5V5a2 2 0 0 1 2-2h14v14H6.5A2.5 2.5 0 0 0 4 19.5zm0 0A2.5 2.5 0 0 0 6.5 22H20v-5"/>',
  eleves: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  graph: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  cle: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M15 8l2 2"/>',
  trophee: '<path d="M8 4h8v6a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 14v4M8.5 21h7M10 18h4"/>'
};
const ico = (n) => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[n] || ''}</svg>`;

// Catalogue des étapes (depuis data.js)
const ETAPES = [];
NIVEAUX.forEach((niv, n) => niv.etapes.forEach((et, e) => ETAPES.push({
  cle: niv.id + '-' + (e + 1), n, e, niveau: bilingue(niv.nom).fr, mots: et.map((x) => x.mot), nb: et.length
})));
const etapeParCle = Object.fromEntries(ETAPES.map((x) => [x.cle, x]));
const nomEtape = (cle) => { const x = etapeParCle[cle]; return x ? `Niv. ${x.n + 1} · Étape ${x.e + 1}` : cle; };
const nomEtapeLong = (cle) => { const x = etapeParCle[cle]; return x ? `${nomEtape(cle)} — ${x.niveau}` : cle; };

// Accès à Supabase (Auth + REST)
const CLE_SESSION = 'francais-aventures-prof-session';
const Api = {
  configure() { return typeof CONFIG_SERVEUR !== 'undefined' && /^https:\/\/.+/.test(CONFIG_SERVEUR.url || '') && !!CONFIG_SERVEUR.cleAnon; },
  base() { return CONFIG_SERVEUR.url.replace(/\/+$/, ''); },
  session() { try { return JSON.parse(localStorage.getItem(CLE_SESSION) || 'null'); } catch (e) { return null; } },
  garder(s) { localStorage.setItem(CLE_SESSION, JSON.stringify({ ...s, expire: Date.now() + (s.expires_in || 3600) * 1000 })); },
  oublier() { localStorage.removeItem(CLE_SESSION); },

  async auth(type, corps) {
    const r = await fetch(`${this.base()}/auth/v1/token?grant_type=${type}`, {
      method: 'POST', headers: { apikey: CONFIG_SERVEUR.cleAnon, 'Content-Type': 'application/json' }, body: JSON.stringify(corps)
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error_description || d.msg || d.message || 'Connexion refusée');
    this.garder(d);
    return d;
  },
  connexion(email, motDePasse) { return this.auth('password', { email, password: motDePasse }); },

  async jeton() {
    const s = this.session();
    if (!s) throw new Error('Non connecté');
    if (Date.now() > s.expire - 60000) return (await this.auth('refresh_token', { refresh_token: s.refresh_token })).access_token;
    return s.access_token;
  },

  async requete(chemin, options = {}, essai = 0) {
    const r = await fetch(`${this.base()}/rest/v1/${chemin}`, {
      ...options,
      headers: { apikey: CONFIG_SERVEUR.cleAnon, Authorization: 'Bearer ' + (await this.jeton()), 'Content-Type': 'application/json', ...(options.headers || {}) }
    });
    if (r.status === 401 && essai === 0) {
      const s = this.session();
      if (s) { await this.auth('refresh_token', { refresh_token: s.refresh_token }); return this.requete(chemin, options, 1); }
    }
    if (!r.ok) throw new Error(`Erreur ${r.status} : ${(await r.text()).slice(0, 200)}`);
    const texte = await r.text();
    return texte ? JSON.parse(texte) : null;
  },

  // Lit toutes les lignes (Supabase renvoie 1000 lignes max par requête)
  async toutLire(chemin) {
    const tout = [];
    for (let debut = 0; ; debut += 1000) {
      const lot = await this.requete(chemin, { headers: { Range: `${debut}-${debut + 999}`, 'Range-Unit': 'items' } });
      tout.push(...lot);
      if (lot.length < 1000) return tout;
    }
  }
};

// État + chargement des données
const ETAT = {
  email: '',
  eleves: [], progression: [], tentatives: [], devoirs: [],
  onglet: ['devoirs', 'eleves'].includes(new URLSearchParams(location.search).get('onglet')) ? new URLSearchParams(location.search).get('onglet') : 'ensemble',
  recherche: '', devoirOuvert: null,
  analyse: null
};

async function charger() {
  $('#racine').innerHTML = '<p class="chargement">Chargement des résultats…</p>';
  try {
    {
      const il90j = new Date(Date.now() - 90 * 86400000).toISOString();
      const [profs, eleves, progression, tentatives, devoirs] = await Promise.all([
        Api.requete('profs?select=email'),
        Api.toutLire('eleves?select=id,nom,cree_le,vu_le,code_defini,bloque_jusqu&order=nom.asc'),
        Api.toutLire('progression?select=eleve_id,etape,etoiles,points,fois,maj'),
        Api.toutLire(`tentatives?select=*&fait_le=gte.${encodeURIComponent(il90j)}&order=fait_le.desc`),
        Api.toutLire('devoirs?select=*&order=date_limite.desc')
      ]);
      if (!profs.length) {
        afficherConnexion(`Ce compte n'est pas autorisé. Ajoute « ${esc(ETAT.email || 'ton e-mail')} » dans la table « profs » de Supabase (voir GUIDE).`);
        return;
      }
      Object.assign(ETAT, { eleves, progression, tentatives, devoirs });
    }
    analyser();
    afficherTableau();
  } catch (e) {
    console.error(e);
    if (/Non connecté|refresh|JWT|401/i.test(e.message)) { Api.oublier(); afficherConnexion('Ta session a expiré, reconnecte-toi.'); return; }
    $('#racine').innerHTML = `<p class="chargement">Impossible de charger les données : ${esc(e.message)}<br><br>
      <button class="btn btn-rouge" data-action="recharger">Réessayer</button></p>`;
  }
}

// Analyse : statistiques, devoirs, alertes
function signalements(t) {
  const s = [];
  if (t.duree_s > 0 && t.duree_s < (t.nb_exercices || 5) * REGLES.secondesMinParMot) s.push('rapide');
  if (t.passes > REGLES.passesMax) s.push('passes');
  return s;
}

function statutDevoir(eleve, devoir) {
  const cree = new Date(devoir.cree_le).getTime();
  const limite = finDeJour(devoir.date_limite).getTime();
  const lignes = devoir.etapes.map((k) => {
    const essais = eleve.tentatives.filter((t) => t.etape === k && new Date(t.fait_le).getTime() >= cree)
      .sort((a, b) => new Date(a.fait_le) - new Date(b.fait_le));
    const premier = essais[0];
    const meilleur = essais.reduce((m, t) => (!m || t.etoiles > m.etoiles ? t : m), null);
    return {
      cle: k, fait: !!premier, enRetard: premier ? new Date(premier.fait_le).getTime() > limite : false,
      date: premier && premier.fait_le, etoiles: meilleur ? meilleur.etoiles : 0,
      duree: essais.reduce((s, t) => s + (t.duree_s || 0), 0),
      suspects: essais.filter((t) => signalements(t).length).length,
      passes: essais.reduce((s, t) => s + (t.passes || 0), 0)
    };
  });
  const faites = lignes.filter((l) => l.fait).length;
  const echu = Date.now() > limite;
  let code;
  if (faites === lignes.length) code = lignes.some((l) => l.enRetard) ? 'retard' : 'fait';
  else if (faites > 0) code = echu ? 'incomplet' : 'encours';
  else code = echu ? 'nonrendu' : 'afaire';
  return { code, faites, total: lignes.length, lignes, suspects: lignes.reduce((s, l) => s + l.suspects, 0) };
}

const STATUTS = {
  fait:      { classe: 'ok',        icone: 'ok',      texte: 'Fait' },
  retard:    { classe: 'attention', icone: 'horloge', texte: 'Rendu en retard' },
  encours:   { classe: 'neutre',    icone: 'demi',    texte: 'En cours' },
  incomplet: { classe: 'critique',  icone: 'demi',    texte: 'Incomplet' },
  nonrendu:  { classe: 'critique',  icone: 'croix',   texte: 'Non rendu' },
  afaire:    { classe: 'neutre',    icone: 'cercle',  texte: 'Pas commencé' }
};
function htmlStatut(st) {
  const s = STATUTS[st.code];
  const detail = ['encours', 'incomplet'].includes(st.code) ? ` ${st.faites}/${st.total}` : '';
  return `<span class="statut ${s.classe}">${ico(s.icone)} ${s.texte}${detail}</span>`;
}
function htmlSignalements(liste) {
  return liste.map((x) => x === 'rapide'
    ? `<span class="statut attention" data-tip="Moins de ${REGLES.secondesMinParMot} s par mot : l'élève a peut-être répondu au hasard">${ico('eclair')} Trop rapide</span>`
    : `<span class="statut attention" data-tip="Plus de ${REGLES.passesMax} exercices passés sur l'étape">${ico('passer')} Exercices passés</span>`).join(' ');
}

function analyser() {
  const auj = new Date();
  const jours14 = Array.from({ length: 14 }, (_, i) => { const d = new Date(auj); d.setDate(d.getDate() - 13 + i); return jourLocal(d); });
  const eleves = ETAT.eleves.map((e) => ({ ...e, tentatives: [], progression: [] }));
  const parId = new Map(eleves.map((e) => [e.id, e]));
  ETAT.tentatives.forEach((t) => { const e = parId.get(t.eleve_id); if (e) e.tentatives.push(t); });
  ETAT.progression.forEach((p) => { const e = parId.get(p.eleve_id); if (e) e.progression.push(p); });

  // Même calcul que la fonction SQL « classement »
  const lundi = new Date(); lundi.setHours(0, 0, 0, 0); lundi.setDate(lundi.getDate() - ((lundi.getDay() + 6) % 7));
  eleves.forEach((e) => {
    const meilleurs = {};
    e.tentatives.forEach((t) => {
      if (new Date(t.fait_le) < lundi || signalements(t).includes('rapide')) return;
      const k = t.etape + '|' + new Date(t.fait_le).toISOString().slice(0, 10);
      meilleurs[k] = Math.max(meilleurs[k] || 0, t.points || 0);
    });
    e.pointsSemaine = Object.values(meilleurs).reduce((s, v) => s + v, 0);
  });

  eleves.forEach((e) => {
    e.etoiles = e.progression.reduce((s, p) => s + p.etoiles, 0);
    e.etapes = e.progression.length;
    e.temps = e.tentatives.reduce((s, t) => s + (t.duree_s || 0), 0);
    const parJour = {};
    e.tentatives.forEach((t) => { const j = jourLocal(t.fait_le); parJour[j] = (parJour[j] || 0) + 1; });
    e.jours = jours14.map((j) => ({ jour: j, n: parJour[j] || 0 }));
    e.joursActifs7 = e.jours.slice(-7).filter((j) => j.n).length;
    const derniere = e.tentatives[0] ? e.tentatives[0].fait_le : null;
    e.derniereActivite = derniere;
    e.suspects = e.tentatives.filter((t) => signalements(t).length);
    e.devoirs = ETAT.devoirs.map((d) => ({ devoir: d, statut: statutDevoir(e, d) }));
    const echus = e.devoirs.filter((x) => new Date() > finDeJour(x.devoir.date_limite));
    e.devoirsRendus = echus.filter((x) => ['fait', 'retard'].includes(x.statut.code)).length;
    e.devoirsEchus = echus.length;
    e.devoirsManques = echus.filter((x) => ['nonrendu', 'incomplet'].includes(x.statut.code)).length;
  });

  const classe = jours14.map((j) => ({ jour: j, n: eleves.reduce((s, e) => s + (e.jours.find((x) => x.jour === j)?.n || 0), 0) }));
  ETAT.analyse = { eleves, jours14, classe, lundi };
}

// Connexion du prof
function afficherConnexion(message = '') {
  const configure = Api.configure();
  $('#racine').innerHTML = `
    <div class="page-connexion">
      <div class="haut vichy">
        <h1 class="titre-jeu">Espace prof</h1>
        <p>Apprend+ · 教师空间</p>
      </div>
      <div class="auvent"></div>
      <form class="carte-login" id="form-login" novalidate>
        <h2 class="titre-jeu">Connexion</h2>
        ${configure ? `
          <label>E-mail<input class="champ" id="email" type="email" autocomplete="username" required></label>
          <label>Mot de passe<input class="champ" id="mdp" type="password" autocomplete="current-password" required></label>
          <p class="erreur" id="erreur-login" role="alert">${message}</p>
          <button class="btn btn-rouge" type="submit">Se connecter</button>
          <p class="note">Le compte prof se crée dans Supabase → Authentication → Users (voir GUIDE-PROF.md).</p>`
        : `<p class="note">Le serveur n'est pas encore configuré : remplis <b>config.js</b> avec l'adresse et la clé de ton projet Supabase (voir <b>GUIDE-PROF.md</b>).</p>`}
      </form>
    </div>`;
}

// Tableau de bord
function afficherTableau() {
  const A = ETAT.analyse;
  const onglets = [
    ['ensemble', 'graph', "Vue d'ensemble", ''],
    ['devoirs', 'livre', 'Devoirs', ETAT.devoirs.length],
    ['eleves', 'eleves', 'Élèves', A.eleves.length]
  ];
  $('#racine').innerHTML = `
    <header class="entete vichy">
      <div class="ligne">
        <img class="logo" src="icons/icon-192.png" alt="">
        <h1 class="titre-jeu">Espace prof<small>Apprend+ · ${esc(ETAT.email)}</small></h1>
        <button class="btn btn-transparent btn-petit" data-action="recharger">${ico('actualiser')} Actualiser</button>
        <button class="btn btn-transparent btn-petit" data-action="deconnexion">${ico('sortir')} Déconnexion</button>
      </div>
    </header>
    <div class="auvent"></div>
    <main>
      <nav class="onglets" role="tablist">
        ${onglets.map(([id, i, t, c]) => `<button class="onglet" role="tab" aria-selected="${ETAT.onglet === id}" data-action="onglet" data-onglet="${id}">
          ${ico(i)} ${t} ${c !== '' ? `<span class="compte">${c}</span>` : ''}</button>`).join('')}
      </nav>
      <div id="contenu"></div>
    </main>`;
  afficherOnglet();
}

function afficherOnglet() {
  const c = $('#contenu');
  if (ETAT.onglet === 'devoirs') c.innerHTML = htmlDevoirs();
  else if (ETAT.onglet === 'eleves') c.innerHTML = htmlEleves();
  else c.innerHTML = htmlEnsemble();
}

// Vue d'ensemble
function htmlEnsemble() {
  const A = ETAT.analyse;
  const nb = A.eleves.length;
  const actifs = A.eleves.filter((e) => e.joursActifs7 > 0).length;
  const enCours = ETAT.devoirs.filter((d) => new Date() <= finDeJour(d.date_limite));
  const echus = A.eleves.reduce((s, e) => s + e.devoirsEchus, 0);
  const rendus = A.eleves.reduce((s, e) => s + e.devoirsRendus, 0);
  const taux = echus ? Math.round((rendus / echus) * 100) : null;
  const total14 = A.classe.reduce((s, j) => s + j.n, 0);

  const alertes = [];
  A.eleves.forEach((e) => {
    const inactif = !e.derniereActivite || (Date.now() - new Date(e.derniereActivite)) / 86400000 >= REGLES.joursInactif;
    const raisons = [];
    let poids = 0;
    if (e.devoirsManques) { poids += 3; raisons.push({ icone: 'croix', texte: `${e.devoirsManques} devoir(s) non rendu(s)` }); }
    if (e.suspects.length) { poids += 2; raisons.push({ icone: 'eclair', texte: `${e.suspects.length} étape(s) faite(s) trop vite ou en passant les exercices` }); }
    if (inactif) { poids += 1; raisons.push({ icone: 'sommeil', texte: e.derniereActivite ? `Inactif depuis ${depuis(e.derniereActivite).replace('il y a ', '')}` : 'Aucune étape terminée' }); }
    if (raisons.length) alertes.push({ e, poids, raisons });
  });
  alertes.sort((a, b) => b.poids - a.poids);

  return `
    <div class="tuiles-stats">
      <div class="tuile-stat"><div class="etiquette">Élèves inscrits</div><div class="valeur">${nb}</div><div class="detail">dans l'appli</div></div>
      <div class="tuile-stat"><div class="etiquette">Actifs cette semaine</div><div class="valeur">${actifs}</div><div class="detail">${nb ? Math.round((actifs / nb) * 100) : 0} % des élèves (7 derniers jours)</div></div>
      <div class="tuile-stat"><div class="etiquette">Devoirs en cours</div><div class="valeur">${enCours.length}</div><div class="detail">${enCours.length ? 'prochain : ' + fmtDate(enCours.map((d) => d.date_limite).sort()[0] + 'T12:00') : 'aucun'}</div></div>
      <div class="tuile-stat"><div class="etiquette">Devoirs rendus</div><div class="valeur">${taux === null ? '—' : taux + ' %'}</div><div class="detail">${echus ? `${rendus} sur ${echus} attendus (date passée)` : 'aucune date limite passée'}</div></div>
    </div>

    <div class="grille grille-2">
      <section class="carte">
        <h2>Étapes terminées par la classe</h2>
        <p class="sous-titre">14 derniers jours · ${total14} étapes au total</p>
        ${htmlHistogramme(A.classe)}
      </section>
      <section class="carte">
        <h2>À surveiller</h2>
        <p class="sous-titre">Devoirs manqués, réponses trop rapides, inactivité</p>
        ${alertes.length ? `<ul class="alertes">${alertes.slice(0, 8).map((a) => `
          <li><span class="avatar">${esc(Array.from(a.e.nom)[0])}</span>
            <div><div class="qui">${esc(a.e.nom)}</div>${a.raisons.map((r) => `<div class="quoi">${ico(r.icone)} ${esc(r.texte)}</div>`).join('')}</div>
            <button class="btn btn-blanc btn-petit" data-action="eleve" data-id="${a.e.id}">Voir</button></li>`).join('')}</ul>
          ${alertes.length > 8 ? `<p class="note" style="margin-top:8px">+ ${alertes.length - 8} autre(s) — voir l'onglet Élèves.</p>` : ''}`
        : '<p class="vide-message">Rien à signaler. Bravo à la classe !</p>'}
      </section>
    </div>
    ${htmlClassement()}`;
}

function htmlClassement() {
  const A = ETAT.analyse;
  const classes = A.eleves.filter((e) => e.pointsSemaine > 0)
    .sort((a, b) => b.pointsSemaine - a.pointsSemaine || a.nom.localeCompare(b.nom));
  let rang = 0;
  classes.forEach((e, i) => { if (i === 0 || e.pointsSemaine !== classes[i - 1].pointsSemaine) rang = i + 1; e.rang = rang; });
  const sansPoints = A.eleves.length - classes.length;
  return `
    <section class="carte">
      <h2>${ico('trophee')} Classement de la semaine</h2>
      <p class="sous-titre">Depuis le lundi ${esc(fmtDate(A.lundi, { day: 'numeric', month: 'long' }))}. Les élèves voient le top 20 et leur place dans l'appli.
        Une étape rapporte ses points une fois par jour ; les étapes faites trop vite ne comptent pas.</p>
      ${classes.length ? `<div class="tableau-wrap"><table>
        <thead><tr><th class="nombre">Rang</th><th>Élève</th><th class="nombre">Points cette semaine</th><th class="nombre">Étoiles (total)</th><th class="nombre">Jours actifs (7 j)</th></tr></thead>
        <tbody>${classes.map((e) => `
          <tr class="cliquable" data-action="eleve" data-id="${e.id}">
            <td class="nombre"><span class="rang-classement ${e.rang <= 3 ? 'r' + e.rang : ''}">${e.rang}</span></td>
            <td><span class="nom-eleve"><span class="avatar">${esc(Array.from(e.nom)[0])}</span>${esc(e.nom)}</span></td>
            <td class="nombre"><b>${e.pointsSemaine}</b></td>
            <td class="nombre">${e.etoiles}</td>
            <td class="nombre">${e.joursActifs7}</td>
          </tr>`).join('')}</tbody>
      </table></div>
      ${sansPoints ? `<p class="note" style="margin-top:10px">${sansPoints} élève(s) sans point cette semaine.</p>` : ''}`
      : '<p class="vide-message">Aucun point gagné depuis lundi.</p>'}
    </section>`;
}

function htmlHistogramme(points) {
  const max = Math.max(1, ...points.map((p) => p.n));
  const pas = max <= 4 ? 1 : Math.ceil(max / 4);
  const haut = Math.ceil(max / pas) * pas;
  const reperes = [];
  for (let v = pas; v <= haut; v += pas) reperes.push(v);
  return `
    <div class="graph" role="img" aria-label="Histogramme des étapes terminées par jour">
      <div class="graph-zone">
        ${reperes.map((v) => `<div class="repere" style="bottom:${(v / haut) * 100}%"><span>${v}</span></div>`).join('')}
        <div class="barres">
          ${points.map((p) => `<div class="col ${p.n ? '' : 'vide'}" tabindex="0"
              data-tip="${esc(fmtDate(p.jour + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))} : ${p.n} étape${p.n > 1 ? 's' : ''}">
              <span class="barre" style="height:${(p.n / haut) * 100}%"></span></div>`).join('')}
        </div>
      </div>
      <div class="axe-x">${points.map((p, i) => `<span>${i % 2 === 1 || i === points.length - 1 ? esc(fmtDate(p.jour + 'T12:00', { day: 'numeric', month: 'numeric' })) : ''}</span>`).join('')}</div>
    </div>
    <details class="table-donnees"><summary>Voir les chiffres</summary>
      <table><thead><tr><th>Jour</th><th class="nombre">Étapes</th></tr></thead><tbody>
      ${points.map((p) => `<tr><td>${esc(fmtDate(p.jour + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' }))}</td><td class="nombre">${p.n}</td></tr>`).join('')}
      </tbody></table></details>`;
}

// Devoirs
function htmlDevoirs() {
  const A = ETAT.analyse;
  const demain = new Date(); demain.setDate(demain.getDate() + 7);
  const groupes = NIVEAUX.map((niv, n) => `
    <div class="groupe-niveau"><b>${n + 1}. ${esc(bilingue(niv.nom).fr)}</b>
      ${niv.etapes.map((et, e) => `<label class="case-etape" data-tip="${esc(et.map((x) => x.mot).join(', '))}">
        <input type="checkbox" name="etape" value="${niv.id}-${e + 1}"> Étape ${e + 1}</label>`).join('')}
    </div>`).join('');

  const liste = ETAT.devoirs.length ? ETAT.devoirs.map((d) => {
    const res = A.eleves.map((e) => ({ e, st: statutDevoir(e, d) }));
    const compte = (codes) => res.filter((r) => codes.includes(r.st.code)).length;
    const echu = new Date() > finDeJour(d.date_limite);
    const ouvert = ETAT.devoirOuvert === d.id;
    const ordre = { nonrendu: 0, incomplet: 1, afaire: 2, encours: 3, retard: 4, fait: 5 };
    res.sort((a, b) => ordre[a.st.code] - ordre[b.st.code] || a.e.nom.localeCompare(b.e.nom));
    return `
      <article class="devoir-carte">
        <div class="devoir-entete" data-action="devoir-ouvrir" data-id="${d.id}" role="button" tabindex="0" aria-expanded="${ouvert}">
          <div class="titre"><b>${esc(d.titre)}</b>
            <small>${d.etapes.map((k) => esc(nomEtape(k))).join(' · ')} — à rendre le ${esc(fmtDate(d.date_limite + 'T12:00', { weekday: 'long', day: 'numeric', month: 'long' }))}${echu ? ' (date passée)' : ''}</small></div>
          <div class="devoir-compteurs">
            <span class="statut ok">${ico('ok')} ${compte(['fait'])} faits</span>
            <span class="statut attention">${ico('horloge')} ${compte(['retard'])} en retard</span>
            <span class="statut ${echu ? 'critique' : 'neutre'}">${ico(echu ? 'croix' : 'cercle')} ${compte(['nonrendu', 'incomplet', 'afaire', 'encours'])} ${echu ? 'manquants' : 'pas encore'}</span>
          </div>
        </div>
        ${ouvert ? `
        <div class="devoir-detail">
          <div class="tableau-wrap"><table>
            <thead><tr><th>Élève</th><th>Statut</th>${d.etapes.map((k) => `<th>${esc(nomEtape(k))}</th>`).join('')}<th class="nombre">Temps</th><th>Alertes</th></tr></thead>
            <tbody>${res.map(({ e, st }) => `
              <tr class="cliquable" data-action="eleve" data-id="${e.id}">
                <td><span class="nom-eleve"><span class="avatar">${esc(Array.from(e.nom)[0])}</span>${esc(e.nom)}</span></td>
                <td>${htmlStatut(st)}</td>
                ${st.lignes.map((l) => `<td>${l.fait ? `<span data-tip="Fait le ${esc(fmtDateHeure(l.date))}${l.enRetard ? ' (après la date limite)' : ''}">${'★'.repeat(l.etoiles)}${'☆'.repeat(3 - l.etoiles)}${l.enRetard ? ' ' + ico('horloge') : ''}</span>` : '<span class="note">—</span>'}</td>`).join('')}
                <td class="nombre">${fmtDuree(st.lignes.reduce((s, l) => s + l.duree, 0))}</td>
                <td>${st.suspects ? `<span class="statut attention" data-tip="Étape faite trop vite ou en passant des exercices">${ico('eclair')} ${st.suspects} à vérifier</span>` : ''}</td>
              </tr>`).join('')}</tbody>
          </table></div>
          <div style="display:flex;justify-content:flex-end;margin-top:12px">
            <button class="btn btn-blanc btn-petit" data-action="devoir-supprimer" data-id="${d.id}">${ico('poubelle')} Supprimer ce devoir</button>
          </div>
        </div>` : ''}
      </article>`;
  }).join('') : '<p class="vide-message">Aucun devoir pour l\'instant. Crée le premier ci-dessus !</p>';

  return `
    <section class="carte">
      <h2>${ico('plus')} Nouveau devoir</h2>
      <p class="sous-titre">Choisis les étapes à faire. Les élèves les voient en haut de leur appli, même si elles ne sont pas encore débloquées.</p>
      <form class="form-devoir" id="form-devoir" novalidate>
        <label>Titre<input class="champ" name="titre" maxlength="80" placeholder="ex. Révisions : la famille" required></label>
        <label>À rendre le<input class="champ" name="date" type="date" value="${jourLocal(demain)}" min="${jourLocal()}" required></label>
        <div class="choix-etapes">${groupes}</div>
        <div class="actions">
          <button class="btn btn-rouge" type="submit">${ico('plus')} Donner ce devoir</button>
          <span class="erreur" id="erreur-devoir" role="alert"></span>
        </div>
      </form>
    </section>
    <section class="carte">
      <h2>Devoirs donnés</h2>
      <p class="sous-titre">Clique sur un devoir pour voir le détail élève par élève. Seules les étapes jouées <b>après</b> la création du devoir comptent.</p>
      ${liste}
    </section>`;
}

// Élèves
function htmlBande(jours) {
  return `<span class="bande">${jours.map((j) => `<i class="${j.n >= 3 ? 'a3' : j.n === 2 ? 'a2' : j.n === 1 ? 'a1' : ''}"
    data-tip="${esc(fmtDate(j.jour + 'T12:00', { weekday: 'short', day: 'numeric', month: 'short' }))} : ${j.n} étape${j.n > 1 ? 's' : ''}"></i>`).join('')}</span>`;
}
function elevesFiltres() {
  const q = ETAT.recherche.trim().toLowerCase();
  return ETAT.analyse.eleves.filter((e) => !q || e.nom.toLowerCase().includes(q));
}
function htmlEleves() {
  const liste = elevesFiltres();
  return `
    <section class="carte">
      <h2>Mes élèves</h2>
      <p class="sous-titre">Clique sur un élève pour voir tout son historique. Les élèves apparaissent ici dès leur première connexion (avec Internet).</p>
      <div class="outils-tableau">
        <input class="champ" id="recherche" type="search" placeholder="Rechercher un élève…" value="${esc(ETAT.recherche)}" aria-label="Rechercher un élève">
        <span class="legende-act">Activité : moins <i style="background:var(--act-0)"></i><i style="background:var(--act-1)"></i><i style="background:var(--act-2)"></i><i style="background:var(--act-3)"></i> plus</span>
        <button class="btn btn-blanc btn-petit" data-action="csv">${ico('telecharger')} Exporter (CSV)</button>
      </div>
      <div class="tableau-wrap"><table>
        <thead><tr><th>Élève</th><th>Dernière étape</th><th>14 derniers jours</th><th class="nombre">Étapes</th><th class="nombre">Étoiles</th>
          <th class="nombre">Temps</th><th>Devoirs</th><th>Alertes</th></tr></thead>
        <tbody>${liste.map((e) => `
          <tr class="cliquable" data-action="eleve" data-id="${e.id}">
            <td><span class="nom-eleve"><span class="avatar">${esc(Array.from(e.nom)[0])}</span>${esc(e.nom)}</span></td>
            <td>${esc(depuis(e.derniereActivite))}</td>
            <td>${htmlBande(e.jours)}</td>
            <td class="nombre">${e.etapes}/${ETAPES.length}</td>
            <td class="nombre">${e.etoiles}</td>
            <td class="nombre">${fmtDuree(e.temps)}</td>
            <td>${e.devoirsEchus ? `<span class="statut ${e.devoirsManques ? 'critique' : 'ok'}">${ico(e.devoirsManques ? 'croix' : 'ok')} ${e.devoirsRendus}/${e.devoirsEchus} rendus</span>` : '<span class="note">—</span>'}</td>
            <td>${e.suspects.length ? `<span class="statut attention">${ico('eclair')} ${e.suspects.length} à vérifier</span>` : ''}
              ${e.code_defini === false ? `<span class="statut neutre" data-tip="Le code sera choisi à la prochaine connexion">${ico('cle')} Pas de code</span>` : ''}</td>
          </tr>`).join('') || '<tr><td colspan="8" class="vide-message">Aucun élève trouvé.</td></tr>'}</tbody>
      </table></div>
    </section>`;
}

function ouvrirEleve(id) {
  const e = ETAT.analyse.eleves.find((x) => x.id === id);
  if (!e) return;
  $('#fenetre').innerHTML = `
    <div class="fenetre" role="dialog" aria-modal="true" aria-labelledby="titre-eleve">
      <div class="fenetre-entete">
        <span class="avatar">${esc(Array.from(e.nom)[0])}</span>
        <h2 id="titre-eleve">${esc(e.nom)}<small>Inscrit le ${esc(fmtDate(e.cree_le, { day: 'numeric', month: 'long', year: 'numeric' }))} · dernière connexion ${esc(depuis(e.vu_le))}</small></h2>
        <button class="btn btn-blanc btn-petit" data-action="fermer">Fermer</button>
      </div>
      <div class="mini-stats">
        <div><b>${e.etapes}/${ETAPES.length}</b><span>étapes terminées</span></div>
        <div><b>${e.etoiles}</b><span>étoiles</span></div>
        <div><b>${fmtDuree(e.temps)}</b><span>temps (90 jours)</span></div>
        <div><b>${e.joursActifs7}/7</b><span>jours actifs cette semaine</span></div>
      </div>
      <p style="margin-bottom:6px;font-weight:700;font-size:.85rem">Activité des 14 derniers jours</p>
      ${htmlBande(e.jours)}

      <h3>Devoirs</h3>
      ${e.devoirs.length ? `<div class="tableau-wrap"><table><thead><tr><th>Devoir</th><th>À rendre le</th><th>Statut</th><th>Détail</th></tr></thead><tbody>
        ${e.devoirs.map(({ devoir, statut }) => `<tr><td><b>${esc(devoir.titre)}</b></td><td>${esc(fmtDate(devoir.date_limite + 'T12:00'))}</td>
          <td>${htmlStatut(statut)}</td>
          <td>${statut.lignes.map((l) => `${esc(nomEtape(l.cle))} : ${l.fait ? `${'★'.repeat(l.etoiles)} le ${esc(fmtDateHeure(l.date))}` : 'pas faite'}`).join('<br>')}</td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vide-message">Aucun devoir donné.</p>'}

      <h3>Historique des étapes (90 derniers jours)</h3>
      ${e.tentatives.length ? `<div class="tableau-wrap"><table><thead><tr><th>Date</th><th>Étape</th><th>Étoiles</th><th class="nombre">Erreurs</th>
        <th class="nombre">Indices</th><th class="nombre">Passés</th><th class="nombre">Durée</th><th>Alertes</th></tr></thead><tbody>
        ${e.tentatives.slice(0, 200).map((t) => `<tr><td>${esc(fmtDateHeure(t.fait_le))}</td><td>${esc(nomEtapeLong(t.etape))}</td>
          <td>${'★'.repeat(t.etoiles)}${'☆'.repeat(3 - t.etoiles)}</td><td class="nombre">${t.erreurs}</td><td class="nombre">${t.indices}</td>
          <td class="nombre">${t.passes}/${t.nb_exercices}</td><td class="nombre">${fmtDuree(t.duree_s)}</td><td><span class="drapeaux">${htmlSignalements(signalements(t))}</span></td></tr>`).join('')}
        </tbody></table></div>` : '<p class="vide-message">Aucune étape terminée pour l\'instant.</p>'}

      <h3>Code secret</h3>
      <p class="note">${e.bloque_jusqu && new Date(e.bloque_jusqu) > new Date()
          ? `Compte bloqué jusqu'à ${esc(fmtDateHeure(e.bloque_jusqu))} après 5 codes faux.`
          : e.code_defini ? 'L\'élève a choisi son code.' : 'Pas encore de code : il sera choisi à la prochaine connexion.'}
        Si l'élève a oublié son code, remets-le à zéro : il en choisira un nouveau et ses autres téléphones seront déconnectés.</p>

      <div style="margin-top:20px;display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap">
        <button class="btn btn-blanc btn-petit" data-action="code-zero" data-id="${e.id}">${ico('actualiser')} Remettre le code à zéro</button>
        <button class="btn btn-blanc btn-petit" data-action="eleve-supprimer" data-id="${e.id}">${ico('poubelle')} Supprimer cet élève</button></div>
    </div>`;
  $('#fenetre').hidden = false;
}
function fermerFenetre() { $('#fenetre').hidden = true; $('#fenetre').innerHTML = ''; }

function exporterCsv() {
  const lignes = [['Élève', 'Dernière étape', 'Étapes terminées', 'Étoiles', 'Temps (min)', 'Jours actifs (7 j)', 'Devoirs rendus', 'Devoirs attendus', 'Étapes à vérifier']];
  elevesFiltres().forEach((e) => lignes.push([e.nom, e.derniereActivite ? jourLocal(e.derniereActivite) : '', e.etapes, e.etoiles,
    Math.round(e.temps / 60), e.joursActifs7, e.devoirsRendus, e.devoirsEchus, e.suspects.length]));
  // Une cellule qui commence par = + - @ serait lue comme une formule par Excel
  const cellule = (v) => {
    const t = String(v);
    return `"${(/^[=+\-@\t\r]/.test(t) ? "'" + t : t).replace(/"/g, '""')}"`;
  };
  const csv = '﻿' + lignes.map((l) => l.map(cellule).join(';')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `eleves-${jourLocal()}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// Actions
async function creerDevoir(form) {
  const titre = form.titre.value.trim();
  const date = form.date.value;
  const etapes = [...form.querySelectorAll('input[name=etape]:checked')].map((c) => c.value);
  const err = $('#erreur-devoir');
  if (!titre) { err.textContent = 'Donne un titre au devoir.'; return; }
  if (!date) { err.textContent = 'Choisis une date limite.'; return; }
  if (!etapes.length) { err.textContent = 'Coche au moins une étape.'; return; }
  const devoir = { titre, etapes, date_limite: date };
  try {
    const [cree] = await Api.requete('devoirs', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(devoir) });
    ETAT.devoirs.unshift(cree);
    ETAT.devoirs.sort((a, b) => b.date_limite.localeCompare(a.date_limite));
    analyser();
    toast('Devoir envoyé aux élèves !');
    afficherTableau();
  } catch (e) { err.textContent = 'Erreur : ' + e.message; }
}

const confirmations = {};
function confirmer(cle, bouton, texte) {
  if (confirmations[cle] && Date.now() - confirmations[cle] < 4000) { delete confirmations[cle]; return true; }
  confirmations[cle] = Date.now();
  bouton.className = 'btn btn-danger btn-petit';
  bouton.textContent = texte;
  return false;
}

async function supprimerDevoir(id, bouton) {
  if (!confirmer('devoir' + id, bouton, 'Clique encore pour confirmer')) return;
  try {
    await Api.requete(`devoirs?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    ETAT.devoirs = ETAT.devoirs.filter((d) => String(d.id) !== String(id));
    analyser(); afficherTableau(); toast('Devoir supprimé');
  } catch (e) { toast('Erreur : ' + e.message); }
}
async function remettreCodeAZero(id, bouton) {
  if (!confirmer('code' + id, bouton, 'Confirmer la remise à zéro ? Clique encore')) return;
  try {
    await Api.requete('rpc/prof_reinitialiser_code', { method: 'POST', body: JSON.stringify({ p_eleve: id }) });
    const e = ETAT.eleves.find((x) => x.id === id);
    if (e) { e.code_defini = false; e.bloque_jusqu = null; }
    fermerFenetre(); analyser(); afficherTableau(); toast('Code remis à zéro');
  } catch (e) { toast('Erreur : ' + e.message); }
}
async function supprimerEleve(id, bouton) {
  if (!confirmer('eleve' + id, bouton, 'Supprimer définitivement ? Clique encore')) return;
  try {
    await Api.requete(`eleves?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
    ETAT.eleves = ETAT.eleves.filter((e) => e.id !== id);
    ETAT.tentatives = ETAT.tentatives.filter((t) => t.eleve_id !== id);
    ETAT.progression = ETAT.progression.filter((p) => p.eleve_id !== id);
    fermerFenetre(); analyser(); afficherTableau(); toast('Élève supprimé');
  } catch (e) { toast('Erreur : ' + e.message); }
}

document.addEventListener('click', (ev) => {
  if (ev.target.id === 'fenetre') { fermerFenetre(); return; }
  const el = ev.target.closest('[data-action]');
  if (!el) return;
  const id = el.dataset.id;
  switch (el.dataset.action) {
    case 'onglet': ETAT.onglet = el.dataset.onglet; afficherTableau(); break;
    case 'recharger': charger(); break;
    case 'deconnexion': Api.oublier(); afficherConnexion(); break;
    case 'eleve': ouvrirEleve(id); break;
    case 'fermer': fermerFenetre(); break;
    case 'devoir-ouvrir': ETAT.devoirOuvert = String(ETAT.devoirOuvert) === id ? null : (ETAT.devoirs.find((d) => String(d.id) === id) || {}).id; afficherOnglet(); break;
    case 'devoir-supprimer': ev.stopPropagation(); supprimerDevoir(id, el); break;
    case 'eleve-supprimer': supprimerEleve(id, el); break;
    case 'code-zero': remettreCodeAZero(id, el); break;
    case 'csv': exporterCsv(); break;
  }
});
document.addEventListener('keydown', (ev) => {
  if (ev.key === 'Escape') fermerFenetre();
  if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('[role=button][data-action]')) { ev.preventDefault(); ev.target.click(); }
});
document.addEventListener('input', (ev) => {
  if (ev.target.id === 'recherche') {
    ETAT.recherche = ev.target.value;
    const pos = ev.target.selectionStart;
    afficherOnglet();
    const champ = $('#recherche'); champ.focus(); champ.setSelectionRange(pos, pos);
  }
});
document.addEventListener('submit', async (ev) => {
  ev.preventDefault();
  if (ev.target.id === 'form-devoir') return creerDevoir(ev.target);
  if (ev.target.id === 'form-login') {
    const email = $('#email').value.trim();
    const mdp = $('#mdp').value;
    const err = $('#erreur-login');
    if (!email || !mdp) { err.textContent = 'Entre ton e-mail et ton mot de passe.'; return; }
    err.textContent = '';
    try {
      await Api.connexion(email, mdp);
      ETAT.email = email;
      localStorage.setItem(CLE_SESSION + '-email', email);
      charger();
    } catch (e) { err.textContent = /invalid/i.test(e.message) ? 'E-mail ou mot de passe incorrect.' : e.message; }
  }
});

// Infobulles
function montrerInfobulle(el) {
  const tip = $('#infobulle');
  tip.textContent = el.dataset.tip;
  tip.hidden = false;
  const r = el.getBoundingClientRect();
  const l = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2));
  const t = r.top - tip.offsetHeight - 8;
  tip.style.left = l + 'px';
  tip.style.top = (t < 8 ? r.bottom + 8 : t) + 'px';
}
document.addEventListener('mouseover', (ev) => { const el = ev.target.closest('[data-tip]'); if (el) montrerInfobulle(el); else $('#infobulle').hidden = true; });
document.addEventListener('focusin', (ev) => { const el = ev.target.closest('[data-tip]'); if (el) montrerInfobulle(el); });
document.addEventListener('focusout', () => { $('#infobulle').hidden = true; });
window.addEventListener('scroll', () => { $('#infobulle').hidden = true; }, true);

// Démarrage
ETAT.email = localStorage.getItem(CLE_SESSION + '-email') || '';
if (Api.configure() && Api.session()) charger();
else afficherConnexion();
