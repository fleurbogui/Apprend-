// Coco, le coq qui guide l'élève. Dessiné en SVG, avec quatre humeurs :
// content, parle (bec qui bouge), bravo (yeux rieurs, ailes levées), oups (inquiet).
import { esc } from './outils.js';

const YEUX = {
  ouverts: `
    <ellipse cx="47" cy="61" rx="4.6" ry="6" fill="var(--encre)"/>
    <ellipse cx="73" cy="61" rx="4.6" ry="6" fill="var(--encre)"/>
    <circle cx="48.6" cy="58.6" r="1.7" fill="#fff"/>
    <circle cx="74.6" cy="58.6" r="1.7" fill="#fff"/>`,
  rieurs: `
    <path d="M41.5 63c2.5-6 8.5-6 11 0M67.5 63c2.5-6 8.5-6 11 0" fill="none" stroke="var(--encre)" stroke-width="3.6" stroke-linecap="round"/>`,
  inquiets: `
    <ellipse cx="47" cy="63" rx="4" ry="5.2" fill="var(--encre)"/>
    <ellipse cx="73" cy="63" rx="4" ry="5.2" fill="var(--encre)"/>
    <circle cx="48.3" cy="61" r="1.4" fill="#fff"/>
    <circle cx="74.3" cy="61" r="1.4" fill="#fff"/>
    <path d="M40 55.5l11-4M80 55.5l-11-4" stroke="var(--encre)" stroke-width="3" stroke-linecap="round"/>`
};

const BEC = {
  ferme: '<path d="M51 71.5h18L60 82z" fill="var(--jaune)" stroke="var(--encre)" stroke-width="3" stroke-linejoin="round"/>',
  ouvert: `
    <g class="coco-bec-ouvert">
      <path d="M50.5 70h19L60 76.5z" fill="var(--jaune)" stroke="var(--encre)" stroke-width="3" stroke-linejoin="round"/>
      <path d="M53 79.5h14L60 87z" fill="var(--jaune)" stroke="var(--encre)" stroke-width="3" stroke-linejoin="round"/>
    </g>
    <g class="coco-bec-ferme">${'<path d="M51 71.5h18L60 82z" fill="var(--jaune)" stroke="var(--encre)" stroke-width="3" stroke-linejoin="round"/>'}</g>`
};

const AILES = {
  repos: `
    <path d="M23 71c-9 5-6 17 2 18 6 0 10-6 9-12" fill="#fff" stroke="var(--encre)" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M97 71c9 5 6 17-2 18-6 0-10-6-9-12" fill="#fff" stroke="var(--encre)" stroke-width="3.4" stroke-linejoin="round"/>`,
  levees: `
    <path d="M25 66c-12-5-15-18-8-23 6 3 10 10 15 16" fill="#fff" stroke="var(--encre)" stroke-width="3.4" stroke-linejoin="round"/>
    <path d="M95 66c12-5 15-18 8-23-6 3-10 10-15 16" fill="#fff" stroke="var(--encre)" stroke-width="3.4" stroke-linejoin="round"/>`
};

const HUMEURS = {
  content: { yeux: 'ouverts', bec: 'ferme', ailes: 'repos' },
  parle: { yeux: 'ouverts', bec: 'ouvert', ailes: 'repos' },
  bravo: { yeux: 'rieurs', bec: 'ouvert', ailes: 'levees' },
  oups: { yeux: 'inquiets', bec: 'ferme', ailes: 'repos' }
};

export function coco(humeur = 'content', { taille = 96, classe = '' } = {}) {
  const h = HUMEURS[humeur] || HUMEURS.content;
  return `
    <svg class="coco coco-${humeur} ${classe}" width="${taille}" height="${taille}" viewBox="0 0 120 120" aria-hidden="true">
      <g class="coco-corps">
        <path d="M92 58c10-10 22-6 22 4-6-2-10 1-12 6 6 0 9 5 6 10-5-3-10-2-14 1z" fill="var(--rouge)" stroke="var(--encre)" stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M43 31c-4-11 5-17 11-12 1-9 12-11 15-3 6-6 16-1 12 9 6 1 7 9 2 12H45z" fill="var(--rouge)" stroke="var(--encre)" stroke-width="3.4" stroke-linejoin="round"/>
        <path d="M50 108v6M70 108v6M46 114h8M66 114h8" stroke="var(--jaune-fonce)" stroke-width="3.4" stroke-linecap="round"/>
        <circle cx="60" cy="69" r="40" fill="#fff" stroke="var(--encre)" stroke-width="3.6"/>
        ${AILES[h.ailes]}
        <ellipse cx="38" cy="76" rx="6" ry="4" fill="var(--rose-joue)"/>
        <ellipse cx="82" cy="76" rx="6" ry="4" fill="var(--rose-joue)"/>
        ${YEUX[h.yeux]}
        <path d="M56.5 84c-2 9 2 12 3.5 12s5.5-3 3.5-12z" fill="var(--rouge)" stroke="var(--encre)" stroke-width="3" stroke-linejoin="round"/>
        ${BEC[h.bec]}
        ${humeur === 'oups' ? '<path d="M97 37c-3 5-4 8-1 10s6-2 4-5z" fill="#BFE3FF" stroke="var(--encre)" stroke-width="2.4"/>' : ''}
        ${humeur === 'bravo' ? '<path d="M12 30l2 5 5 2-5 2-2 5-2-5-5-2 5-2zM106 22l1.6 4 4 1.6-4 1.6-1.6 4-1.6-4-4-1.6 4-1.6z" fill="var(--jaune)" stroke="var(--encre)" stroke-width="2" stroke-linejoin="round"/>' : ''}
      </g>
    </svg>`;
}

// Coco qui parle dans une bulle de BD. Le texte français est en gros, le chinois en dessous.
export function htmlParole(fr, zh = '', { humeur = 'parle', taille = 96, id = '', sens = 'gauche', classe = '' } = {}) {
  return `
    <div class="parole parole-${sens} ${classe}">
      ${coco(humeur, { taille })}
      <div class="bulle" ${id ? `id="${id}"` : ''} role="status" aria-live="polite">
        <p class="bulle-fr">${esc(fr)}</p>
        ${zh ? `<p class="bulle-zh" lang="zh">${esc(zh)}</p>` : ''}
      </div>
    </div>`;
}

// Change le texte et l'humeur d'une bulle déjà affichée
export function faireParler(conteneur, fr, zh = '', humeur = 'parle') {
  if (!conteneur) return;
  const bulle = conteneur.querySelector('.bulle');
  const svg = conteneur.querySelector('svg.coco');
  if (bulle) {
    bulle.innerHTML = `<p class="bulle-fr">${esc(fr)}</p>${zh ? `<p class="bulle-zh" lang="zh">${esc(zh)}</p>` : ''}`;
    bulle.classList.remove('rebond');
    void bulle.offsetWidth;
    bulle.classList.add('rebond');
  }
  if (svg) svg.outerHTML = coco(humeur, { taille: Number(svg.getAttribute('width')) || 96 });
}
