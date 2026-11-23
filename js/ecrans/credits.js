// Crédits des photos (obligatoires pour les licences CC BY et CC BY-SA)
import { CREDITS } from '../donnees.js';
import { $, esc } from '../outils.js';
import { ico } from '../icones.js';
import { etat } from '../etat.js';
import { htmlTitre } from '../ui/composants.js';

const lienSur = (url) => /^https:\/\//.test(url || '');

export function afficherCredits() {
  etat.ecran = 'credits';
  etat.session = null;
  const lignes = Object.entries(CREDITS).map(([src, c]) => {
    const mot = src.replace(/^.*\//, '').replace(/\.\w+$/, '');
    const licence = lienSur(c.licenceUrl) ? `<a href="${esc(c.licenceUrl)}" target="_blank" rel="noopener">${esc(c.licence)}</a>` : esc(c.licence || '');
    const source = lienSur(c.source) ? ` · <a href="${esc(c.source)}" target="_blank" rel="noopener">source</a>` : '';
    return `<li><img src="${esc(src)}" alt="" loading="lazy" decoding="async">
      <div><b>${esc(mot)}</b><span>${esc(c.auteur || 'Auteur inconnu')}</span><span>${licence}${source}</span></div></li>`;
  }).join('');

  $('#app').innerHTML = `
    <section class="ecran">
      <header class="barre-haut">
        <button type="button" class="btn-rond" data-action="retour" aria-label="Retour">${ico('retour')}</button>
        <b class="barre-titre">Crédits photos</b>
      </header>
      <div class="page">
        ${htmlTitre('Merci aux photographes', '图片来源')}
        <p class="note-bas">Photos libres de Wikimedia Commons.</p>
        <ul class="liste-credits">${lignes || '<li>Aucune photo.</li>'}</ul>
      </div>
    </section>`;
}
