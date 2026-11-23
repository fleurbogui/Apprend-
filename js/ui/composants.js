// Morceaux d'interface partagés par plusieurs écrans
import { esc, initiale } from '../outils.js';
import { ico } from '../icones.js';
import { P } from '../profils.js';
import { serieJours, totalEtoiles } from '../progression.js';

const ONGLETS = [
  { hash: '#/', icone: 'maison', fr: 'Accueil' },
  { hash: '#/parcours', icone: 'carte', fr: 'Parcours' },
  { hash: '#/carnet', icone: 'livre', fr: 'Carnet' },
  { hash: '#/classement', icone: 'trophee', fr: 'Classement' }
];

// Barre du haut : l'élève à gauche (ouvre son menu), ses compteurs à droite
export function htmlBarreHaut({ titre = '', retour = false } = {}) {
  const p = P();
  const gauche = retour
    ? `<button type="button" class="btn-rond" data-action="retour" aria-label="Retour">${ico('retour')}</button>
       <b class="barre-titre">${esc(titre)}</b>`
    : `<button type="button" class="moi" data-action="menu-profil" aria-label="Mon profil">
         <span class="avatar">${esc(initiale(p.nom))}</span><b>${esc(p.nom)}</b>
       </button>`;
  return `
    <header class="barre-haut">
      ${gauche}
      <span class="pastille" title="Jours d'affilée">${ico('flamme', 'flamme')}${serieJours()}</span>
      <span class="pastille" title="Étoiles">${ico('etoile', 'etoile-or')}${totalEtoiles()}</span>
    </header>`;
}

export function htmlNav(actif) {
  return `
    <nav class="nav-bas" aria-label="Navigation">
      ${ONGLETS.map((o) => `
        <button type="button" class="${o.hash === actif ? 'actif' : ''}" data-action="onglet" data-hash="${o.hash}"
                ${o.hash === actif ? 'aria-current="page"' : ''}>${ico(o.icone)}<span>${o.fr}</span></button>`).join('')}
    </nav>`;
}

// Gros titre de page avec sa traduction chinoise
export const htmlTitre = (fr, zh = '') =>
  `<h1 class="titre-page">${esc(fr)}${zh ? `<span lang="zh">${esc(zh)}</span>` : ''}</h1>`;

// Chemin sinueux avec des étapes alternées gauche / droite (parcours et niveaux).
// Chaque nœud : { etat, classe, label, attributs, contenu, dessus, dessous }.
export function htmlChemin(noeuds, { espace = 175, haut = 80, taille = 92 } = {}) {
  const xs = [50, 76, 50, 24];
  const pos = noeuds.map((_, i) => ({ x: xs[i % 4], y: haut + i * espace }));
  const hauteur = haut + (noeuds.length - 1) * espace + taille / 2 + 110;
  const trace = (pts) => pts.map((p, i) => (i === 0 ? `M ${p.x} ${p.y}`
    : `C ${pts[i - 1].x} ${pts[i - 1].y + espace / 2}, ${p.x} ${p.y - espace / 2}, ${p.x} ${p.y}`)).join(' ');
  const dernierFait = noeuds.reduce((k, nd, i) => (nd.etat === 'termine' ? i : k), -1);
  const toutTrace = trace(pos);
  const traceFait = dernierFait >= 1 ? trace(pos.slice(0, dernierFait + 1)) : '';

  return `
    <div class="chemin" style="height:${hauteur}px">
      <svg class="route" viewBox="0 0 100 ${hauteur}" preserveAspectRatio="none" aria-hidden="true">
        <path class="route-bord" d="${toutTrace}" vector-effect="non-scaling-stroke"/>
        <path class="route-fond" d="${toutTrace}" vector-effect="non-scaling-stroke"/>
        ${traceFait ? `<path class="route-faite" d="${traceFait}" vector-effect="non-scaling-stroke"/>` : ''}
        <path class="route-tirets" d="${toutTrace}" vector-effect="non-scaling-stroke"/>
      </svg>
      ${noeuds.map((nd, i) => `
        <div class="noeud ${nd.classe || ''} ${nd.etat}" style="left:${pos[i].x}%;top:${pos[i].y - taille / 2 - 5}px">
          ${nd.dessus || ''}
          <button type="button" class="noeud-bouton" ${nd.attributs} aria-label="${esc(nd.label)}">${nd.contenu}</button>
          ${nd.dessous || ''}
        </div>`).join('')}
    </div>`;
}
