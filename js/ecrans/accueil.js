// Accueil : Coco dit à l'élève ce qu'il peut faire aujourd'hui, puis la leçon du jour
import { NIVEAUX } from '../donnees.js';
import { $, bilingue, esc, estImage } from '../outils.js';
import { ico } from '../icones.js';
import { htmlParole } from '../mascotte.js';
import { etat } from '../etat.js';
import { P } from '../profils.js';
import {
  aJoueAujourdhui, devoirsAffiches, etapesFaites, etapesFaitesNiveau, indexDeCle, motsAppris,
  prochaineEtape, serieJours, texteEcheance, totalEtapes, totalEtoiles
} from '../progression.js';
import { htmlBarreHaut, htmlNav } from '../ui/composants.js';

// Ce que Coco dit, selon la situation de l'élève
function messageDuJour(devoir, suite) {
  const prenom = P().nom.split(' ')[0];
  if (devoir) {
    const quand = devoir.jours < 0 ? 'Il est en retard' : devoir.jours === 0 ? 'Il est pour aujourd\'hui'
      : devoir.jours === 1 ? 'Il est pour demain' : `Il est pour dans ${devoir.jours} jours`;
    return [`${prenom}, ton prof t'a donné un devoir : « ${devoir.titre} ». ${quand}, on s'y met ?`, `老师布置了作业：“${devoir.titre}”。我们开始吧！`];
  }
  if (!suite) return [`Bravo ${prenom}, tu as fini toutes les leçons ! Rejoue-les pour avoir 3 étoiles partout.`, '你学完了所有课程！再玩一次，争取每关三颗星。'];

  const [n, e] = suite;
  const nb = NIVEAUX[n].etapes[e].length;
  const theme = bilingue(NIVEAUX[n].nom);
  const serie = serieJours();
  if (etapesFaites() === 0) {
    return [`Salut ${prenom} ! Je vais t'apprendre des mots français avec des photos. On commence par ${nb} mots, ça prend 3 minutes.`, `你好！我会用图片教你法语单词。先学${nb}个，大约3分钟。`];
  }
  if (aJoueAujourdhui()) return [`Tu as déjà travaillé aujourd'hui, ${prenom}. Bravo ! On apprend ${nb} mots de plus ?`, `今天已经学习过了，真棒！再学${nb}个单词吗？`];
  if (serie >= 2) return [`${serie} jours de suite, ${prenom} ! Fais une leçon aujourd'hui pour garder ta flamme.`, `连续${serie}天了！今天也来一课，保持下去！`];
  return [`Salut ${prenom} ! Aujourd'hui, on part à la découverte de « ${theme.fr} » : ${nb} nouveaux mots.`, `你好！今天我们学习“${theme.zh}”：${nb}个新单词。`];
}

function htmlLecon(suite) {
  if (!suite) return '';
  const [n, e] = suite;
  const niv = NIVEAUX[n];
  const nom = bilingue(niv.nom);
  const photos = niv.etapes[e].filter((x) => estImage(x.image)).slice(0, 3);
  const debut = etapesFaitesNiveau(n) === 0 && e === 0;
  return `
    <article class="carte lecon">
      <div class="lecon-photos" aria-hidden="true">
        ${photos.map((x) => `<img src="${esc(x.image)}" alt="" loading="lazy" decoding="async">`).join('')}
      </div>
      <p class="etiquette-rouge">Niveau ${n + 1} · étape ${e + 1}</p>
      <h2>${esc(nom.fr)} <span lang="zh">${esc(nom.zh)}</span></h2>
      <button type="button" class="btn btn-rouge btn-large" data-action="etape" data-n="${n}" data-e="${e}">
        ${debut ? 'Je commence !' : 'Je continue !'} <span lang="zh">${debut ? '开始' : '继续'}</span> ${ico('fleche')}</button>
    </article>`;
}

function htmlDevoir(d) {
  const reste = d.etapes.filter((k) => !d.faites.includes(k));
  const [n, e] = indexDeCle(reste[0] || d.etapes[0]);
  const ech = texteEcheance(d);
  return `
    <article class="carte devoir">
      <span class="tampon">Devoir</span>
      <div>
        <b>${esc(d.titre)}</b>
        <small>${d.faites.length} / ${d.etapes.length} étapes · <span class="echeance ${ech.classe}">${ech.fr}</span></small>
      </div>
      <button type="button" class="btn btn-rouge" data-action="etape" data-n="${n}" data-e="${e}">Faire <span lang="zh">去做</span></button>
    </article>`;
}

export function afficherAccueil() {
  etat.ecran = 'accueil';
  etat.session = null;
  const devoir = devoirsAffiches().find((d) => !d.fini) || null;
  const suite = prochaineEtape();
  const [fr, zh] = messageDuJour(devoir, suite);
  const serie = serieJours();

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut()}
      <div class="page accueil">
        ${htmlParole(fr, zh, { humeur: devoir ? 'parle' : suite ? 'parle' : 'bravo', taille: 104, classe: 'parole-grande' })}
        ${devoir ? htmlDevoir(devoir) : ''}
        ${htmlLecon(suite)}
        <ul class="compteurs">
          <li>${ico('flamme', 'flamme')}<b>${serie}</b><span>jour${serie > 1 ? 's' : ''} de suite</span></li>
          <li>${ico('etoile', 'etoile-or')}<b>${totalEtoiles()}</b><span>étoiles</span></li>
          <li>${ico('livre')}<b>${motsAppris()}</b><span>mots appris</span></li>
        </ul>
        <button type="button" class="lien" data-action="onglet" data-hash="#/parcours">
          Tout mon parcours · ${etapesFaites()} / ${totalEtapes()} étapes ${ico('fleche')}</button>
      </div>
      ${htmlNav('#/')}
    </section>`;
}
