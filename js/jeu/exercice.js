// Une étape = une suite d'exercices. Ce module garde l'état de l'étape en cours
// (etat.session), dessine l'exercice et gère les réponses.
import { NIVEAUX } from '../donnees.js';
import { $, bilingue, esc, estImage, estLettre, melanger, normaliser, parler, vibrer } from '../outils.js';
import { ico } from '../icones.js';
import { coco, faireParler } from '../mascotte.js';
import { CONFIG, TYPES, VALEURS } from '../reglages.js';
import { etat } from '../etat.js';
import { enregistrerEtape } from '../progression.js';
import { synchroniser } from '../sync.js';
import { aller, retourVers } from '../navigation.js';
import { nombre, surActions } from '../actions.js';

const BRAVOS = [['Bravo !', '太棒了！'], ['Super !', '真棒！'], ['Excellent !', '好极了！'], ['Parfait !', '完美！']];

export function demarrerEtape(n, e) {
  etat.ecran = 'etape';
  etat.session = {
    n, e,
    exercices: NIVEAUX[n].etapes[e],
    index: 0,
    penalites: 0, erreurs: 0, indices: 0, passes: 0, points: 0,
    bilan: [],
    debut: Date.now(), pause: 0, cacheDepuis: null
  };
  preparerExercice();
}

// Le temps passé appli fermée ou en arrière-plan ne compte pas
export function installerChrono() {
  document.addEventListener('visibilitychange', () => {
    const s = etat.session;
    if (!s) return;
    if (document.visibilityState === 'hidden') s.cacheDepuis = Date.now();
    else if (s.cacheDepuis) { s.pause += Date.now() - s.cacheDepuis; s.cacheDepuis = null; }
  });
}

function preparerExercice() {
  const s = etat.session;
  const def = s.exercices[s.index];
  const type = TYPES[def.type] ? def.type : 1;
  const chars = Array.from(def.mot.toUpperCase());
  const ex = {
    def, type, aide: TYPES[type].aide, chars,
    verrou: chars.map((c) => !estLettre(c)),   // lettres affichées d'office
    devoilee: chars.map(() => false),          // lettres données en indice
    place: chars.map(() => null),              // index de la tuile posée dans chaque case
    tuiles: [],
    erreurs: 0, indices: 0, fini: false, reussi: false
  };
  if (type === 2) {
    const i = chars.findIndex(estLettre);
    if (i !== -1) ex.verrou[i] = true; // première lettre donnée
  }
  if (ex.aide) {
    const lettres = (type === 1 && Array.isArray(def.lettres) && def.lettres.length)
      ? def.lettres.map((l) => String(l).toUpperCase())
      : chars.filter((_, i) => !ex.verrou[i]);
    if (type === 2) {
      for (let k = 0; k < CONFIG.nbLeurres; k++) {
        lettres.push(CONFIG.lettresLeurres[Math.floor(Math.random() * CONFIG.lettresLeurres.length)]);
      }
    }
    let melange = melanger(lettres);
    for (let essai = 0; essai < 10 && lettres.length > 2 && melange.join('') === lettres.join(''); essai++) melange = melanger(lettres);
    ex.tuiles = melange.map((lettre) => ({ lettre, utilisee: false, retiree: false }));
  }
  s.ex = ex;
  afficherExercice();
}

function consigne(ex) {
  const c = bilingue(ex.def.consigne || 'Trouve le mot / 找出单词');
  if (ex.type === 4 && ex.def.indice) {
    const i = bilingue(ex.def.indice);
    return [`${c.fr} ! Indice : ${i.fr}`, `${c.zh} 提示：${i.zh}`];
  }
  return [c.fr, c.zh];
}

function afficherExercice() {
  const { index, exercices, ex } = etat.session;
  const t = TYPES[ex.type];
  const image = String(ex.def.image || '?');
  const visuel = estImage(image)
    ? `<img class="fond-flou" src="${esc(image)}" alt="" aria-hidden="true"><img class="photo-principale" src="${esc(image)}" alt="">`
    : `<div class="emoji-exo">${esc(image)}</div>`;
  const [fr, zh] = consigne(ex);

  document.body.classList.add('jeu');
  $('#app').innerHTML = `
    <section class="ecran ecran-exo">
      <header class="exo-haut">
        <button type="button" class="btn-rond" data-action="quitter" aria-label="Quitter">${ico('fermer')}</button>
        <div class="segments" aria-label="Exercice ${index + 1} sur ${exercices.length}">
          ${exercices.map((_, i) => `<span class="${i < index ? 'fait' : i === index ? 'actuel' : ''}"></span>`).join('')}
        </div>
        <button type="button" class="btn-rond" data-action="effacer" aria-label="Effacer ma réponse">${ico('effacer')}</button>
        <span class="points-exo" aria-label="Points">${ico('etoile')}<b id="points">${etat.session.points}</b></span>
      </header>

      <div class="zone-exo">
        <div class="photo-exo">
          <span class="type-exo t${ex.type}">${t.fr} <span lang="zh">${t.zh}</span></span>
          <div class="cadre" role="img" aria-label="Photo de l'exercice">${visuel}</div>
          <button type="button" class="btn-rond btn-son" data-action="ecouter" aria-label="Écouter le mot" hidden>${ico('son')}</button>
        </div>

        <div class="parole parole-gauche parole-exo" id="coco-exo">
          ${coco('parle', { taille: 60 })}
          <div class="bulle" role="status" aria-live="polite">
            <p class="bulle-fr">${esc(fr)}</p>${zh ? `<p class="bulle-zh" lang="zh">${esc(zh)}</p>` : ''}
          </div>
        </div>

        <div id="cases" class="cases" aria-label="Cases de réponse"></div>
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
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      if (!etat.session.ex.fini) verifier(); else suivant();
    });
    setTimeout(() => { try { champ.focus({ preventScroll: true }); } catch (err) { champ.focus(); } }, 60);
  }
  redessiner();
}

const cocoDit = (fr, zh, humeur = 'parle') => faireParler($('#coco-exo'), fr, zh, humeur);

function redessiner() {
  dessinerCases();
  dessinerTuiles();
  dessinerPied();
}

function reponseActuelle() {
  const ex = etat.session.ex;
  if (!ex.aide) return $('#saisie') ? $('#saisie').value : '';
  return ex.chars.map((c, i) => (ex.verrou[i] ? c : ex.place[i] !== null ? ex.tuiles[ex.place[i]].lettre : '')).join('');
}

function reponseComplete() {
  const ex = etat.session.ex;
  if (!ex.aide) return normaliser(reponseActuelle()).length > 0;
  return ex.chars.every((_, i) => ex.verrou[i] || ex.place[i] !== null);
}

function dessinerCases() {
  const ex = etat.session.ex;
  const conteneur = $('#cases');
  if (!conteneur) return;
  const tapees = ex.aide ? [] : Array.from(($('#saisie') || { value: '' }).value.toUpperCase()).filter(estLettre);
  let k = 0;
  let premiereVide = true;
  const vide = () => {
    const active = premiereVide ? ' active' : '';
    premiereVide = false;
    return `<span class="case${active}"></span>`;
  };

  conteneur.innerHTML = ex.chars.map((c, i) => {
    if (!estLettre(c)) return '<span class="case separateur" aria-hidden="true"></span>';
    if (ex.fini) return `<span class="case ${ex.reussi ? 'juste' : 'reponse'}">${esc(c)}</span>`;
    if (ex.aide) {
      if (ex.verrou[i]) return `<span class="case ${ex.devoilee[i] ? 'devoilee' : 'fixe'}">${esc(c)}</span>`;
      if (ex.place[i] !== null) return `<button type="button" class="case remplie" data-action="retirer" data-i="${i}" aria-label="Retirer la lettre">${esc(ex.tuiles[ex.place[i]].lettre)}</button>`;
      return vide();
    }
    const lettre = tapees[k++];
    if (lettre) return `<span class="case remplie">${esc(lettre)}</span>`;
    if (ex.devoilee[i]) return `<span class="case devoilee indice-saisie">${esc(c)}</span>`;
    return vide();
  }).join('');
  if (!ex.aide && !ex.fini) conteneur.onclick = () => $('#saisie') && $('#saisie').focus();
}

function dessinerTuiles() {
  const ex = etat.session.ex;
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

function dessinerPied() {
  const s = etat.session;
  const ex = s.ex;
  const pied = $('#pied');
  if (!pied) return;
  pied.closest('.ecran-exo').classList.toggle('fini', ex.fini);
  const dernier = s.index === s.exercices.length - 1;
  const continuer = `<button type="button" class="btn ${ex.reussi ? 'btn-vert' : 'btn-rouge'} btn-large" data-action="suivant">
    ${dernier ? 'Voir mon résultat' : 'Continuer'} ${ico('fleche')}</button>`;

  if (ex.fini) {
    const gain = ex.erreurs === 0 && ex.indices === 0 ? CONFIG.pointsSansErreur : CONFIG.pointsAvecErreur;
    pied.className = `pied-exo ${ex.reussi ? 'reussi' : 'rate'}`;
    pied.innerHTML = `
      <div class="verdict">
        <b>${ex.reussi ? `${esc(s.bravo[0])} +${gain} points` : 'Pas grave, retiens bien ce mot !'}</b>
        <span>« ${esc(ex.def.mot)} »${ex.reussi ? '' : ' <span lang="zh">记住它！</span>'}</span>
      </div>${continuer}`;
    return;
  }
  pied.className = 'pied-exo';
  pied.innerHTML = `
    <button type="button" class="btn btn-blanc petit-bouton" data-action="passer">${ico('passer')}Passer</button>
    <button type="button" class="btn btn-blanc petit-bouton" data-action="indice" ${peutDevoiler() ? '' : 'disabled'}>${ico('ampoule')}Indice</button>
    <button type="button" class="btn btn-rouge" data-action="verifier" ${reponseComplete() ? '' : 'disabled'}>Vérifier <span lang="zh">检查</span></button>`;
}

function choisirTuile(k) {
  const ex = etat.session.ex;
  const tuile = ex.tuiles[k];
  if (!tuile || tuile.utilisee || ex.fini) return;
  const i = ex.chars.findIndex((_, p) => !ex.verrou[p] && ex.place[p] === null);
  if (i === -1) return;
  ex.place[i] = k;
  tuile.utilisee = true;
  redessiner();
}

function retirerLettre(i) {
  const ex = etat.session.ex;
  if (ex.fini || ex.place[i] === null) return;
  ex.tuiles[ex.place[i]].utilisee = false;
  ex.place[i] = null;
  redessiner();
}

function viderReponse() {
  const ex = etat.session.ex;
  if (ex.fini) return;
  if (ex.aide) {
    ex.place = ex.place.map(() => null);
    ex.tuiles.forEach((t) => { t.utilisee = false; });
  } else if ($('#saisie')) {
    $('#saisie').value = '';
  }
  redessiner();
}

function peutDevoiler() {
  const ex = etat.session.ex;
  return ex.chars.filter((c, i) => estLettre(c) && !ex.verrou[i]).length > 1;
}

// Donne une lettre au hasard (indice demandé, ou après la 2e erreur)
function devoilerLettre() {
  const ex = etat.session.ex;
  if (!peutDevoiler()) return false;
  const libres = ex.chars.map((_, i) => i).filter((i) => estLettre(ex.chars[i]) && !ex.verrou[i]);
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
  const s = etat.session;
  if (s.ex.fini || !devoilerLettre()) return;
  s.ex.indices++;
  s.indices++;
  s.penalites += CONFIG.penaliteIndice;
  cocoDit('Tiens, je te donne une lettre !', '给你一个字母！');
  redessiner();
}

function verifier() {
  const s = etat.session;
  const ex = s.ex;
  if (ex.fini || !reponseComplete()) return;

  if (normaliser(reponseActuelle()) === normaliser(ex.def.mot)) {
    ex.fini = true;
    ex.reussi = true;
    s.points += ex.erreurs === 0 && ex.indices === 0 ? CONFIG.pointsSansErreur : CONFIG.pointsAvecErreur;
    s.bilan.push({ mot: ex.def.mot, image: ex.def.image, audio: ex.def.audio, reussi: true });
    s.bravo = BRAVOS[Math.floor(Math.random() * BRAVOS.length)];
    vibrer(30);
    cocoDit(`${s.bravo[0]} C'est bien « ${ex.def.mot} ».`, s.bravo[1], 'bravo');
    terminerExercice();
    $('#cases').classList.add('bravo');
    return;
  }

  ex.erreurs++;
  s.erreurs++;
  s.penalites++;
  vibrer([60, 40, 60]);
  const cases = $('#cases');
  cases.classList.remove('secoue');
  void cases.offsetWidth;
  cases.classList.add('secoue');

  if (ex.erreurs >= CONFIG.essaisMax) {
    montrerReponse();
  } else if (ex.erreurs === 1) {
    cocoDit('Oups, ce n\'est pas ça. Réessaie !', '再试试！', 'oups');
    setTimeout(() => { if (etat.session && etat.session.ex === ex && !ex.fini) viderReponse(); }, 650);
  } else {
    setTimeout(() => {
      if (!etat.session || etat.session.ex !== ex || ex.fini) return;
      viderReponse();
      if (devoilerLettre()) cocoDit('Presque ! Je t\'aide avec une lettre.', '差一点！再给你一个字母。', 'oups');
      else cocoDit('Presque ! Encore un essai.', '差一点！再试一次。', 'oups');
      redessiner();
    }, 650);
  }
}

function montrerReponse() {
  const s = etat.session;
  s.ex.fini = true;
  s.ex.reussi = false;
  s.bilan.push({ mot: s.ex.def.mot, image: s.ex.def.image, audio: s.ex.def.audio, reussi: false });
  cocoDit(`Le mot était « ${s.ex.def.mot} ». Écoute-le bien !`, '听一听正确答案。', 'oups');
  terminerExercice();
}

function passer() {
  const s = etat.session;
  if (s.ex.fini) return;
  s.passes++;
  s.penalites += CONFIG.penalitePasser;
  montrerReponse();
}

function terminerExercice() {
  const s = etat.session;
  const champ = $('#saisie');
  if (champ) { champ.readOnly = true; champ.blur(); }
  $('#points').textContent = s.points;
  $('.btn-son').hidden = false;
  parler(s.ex.def.audio || s.ex.def.mot);
  redessiner();
}

function suivant() {
  const s = etat.session;
  if (!s) return;
  s.index++;
  if (s.index < s.exercices.length) preparerExercice();
  else terminerEtape();
}

const calculerEtoiles = (penalites) => (penalites === 0 ? 3 : penalites <= 2 ? 2 : 1);

function terminerEtape() {
  const s = etat.session;
  if (s.cacheDepuis) s.pause += Date.now() - s.cacheDepuis;
  const duree = Math.min(CONFIG.dureeMaxEtape, Math.max(0, Math.round((Date.now() - s.debut - s.pause) / 1000)));
  const etoiles = calculerEtoiles(s.penalites);
  const info = enregistrerEtape(s.n, s.e, {
    etoiles, points: s.points, erreurs: s.erreurs, indices: s.indices, passes: s.passes,
    nbExercices: s.exercices.length, duree
  });
  etat.dernierResultat = { n: s.n, e: s.e, etoiles, points: s.points, penalites: s.penalites, duree, bilan: s.bilan, ...info };
  etat.session = null;
  aller(`#/resultat/${s.n}/${s.e}`, true);
  synchroniser();
}

surActions({
  tuile: (el) => choisirTuile(nombre(el, 'k')),
  retirer: (el) => retirerLettre(nombre(el, 'i')),
  effacer: () => viderReponse(),
  verifier: () => verifier(),
  indice: () => utiliserIndice(),
  passer: () => passer(),
  suivant: () => suivant(),
  ecouter: () => { if (etat.session) parler(etat.session.ex.def.audio || etat.session.ex.def.mot); },
  quitter: () => retourVers(etat.session ? `#/niveau/${etat.session.n}` : '#/')
});
