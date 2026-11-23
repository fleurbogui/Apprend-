// Carnet : tous les mots appris, à réécouter
import { NIVEAUX } from '../donnees.js';
import { $, bilingue, esc, estImage } from '../outils.js';
import { ico } from '../icones.js';
import { htmlParole } from '../mascotte.js';
import { etat } from '../etat.js';
import { etapeTerminee } from '../progression.js';
import { htmlBarreHaut, htmlNav, htmlTitre } from '../ui/composants.js';

export function afficherCarnet() {
  etat.ecran = 'carnet';
  etat.session = null;
  let nbMots = 0;
  let aDecouvrir = 0;
  const groupes = NIVEAUX.map((niv, n) => {
    const mots = [];
    niv.etapes.forEach((etape, e) => {
      if (etapeTerminee(n, e)) mots.push(...etape);
      else aDecouvrir += etape.length;
    });
    nbMots += mots.length;
    return { nom: bilingue(niv.nom), mots };
  }).filter((g) => g.mots.length);

  const parole = nbMots
    ? htmlParole(`Tu connais déjà ${nbMots} mots ! Touche une photo, je te dis le mot.`, `你已经认识${nbMots}个单词了！点击图片听发音。`, { taille: 84 })
    : htmlParole('Ton carnet est vide pour l\'instant. Termine une étape et tes mots arrivent ici !', '完成一关，单词就会出现在这里！', { humeur: 'content', taille: 84 });

  $('#app').innerHTML = `
    <section class="ecran avec-nav">
      ${htmlBarreHaut()}
      <div class="page">
        ${htmlTitre('Mon carnet', '我的单词本')}
        ${parole}
        ${groupes.map((g) => `
          <section class="groupe-carnet">
            <h2>${esc(g.nom.fr)} <span lang="zh">${esc(g.nom.zh)}</span></h2>
            <ul class="grille-mots">
              ${g.mots.map((x) => `
                <li><button type="button" class="carte-mot" data-action="dire" data-texte="${esc(x.audio || x.mot)}">
                  ${estImage(x.image) ? `<img src="${esc(x.image)}" alt="" loading="lazy" decoding="async">` : `<span class="emoji">${esc(x.image)}</span>`}
                  <span class="mot">${esc(x.mot)}</span>${ico('son')}
                </button></li>`).join('')}
            </ul>
          </section>`).join('')}
        ${!nbMots ? `<button type="button" class="btn btn-rouge btn-large" data-action="onglet" data-hash="#/">Commencer une leçon ${ico('fleche')}</button>` : ''}
        ${nbMots && aDecouvrir ? `<p class="note-bas">Encore ${aDecouvrir} mots à découvrir. <span lang="zh">还有${aDecouvrir}个单词等你发现。</span></p>` : ''}
      </div>
      ${htmlNav('#/carnet')}
    </section>`;
}
