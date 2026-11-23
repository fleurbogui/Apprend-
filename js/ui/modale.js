// Feuille qui monte du bas de l'écran (menu du profil, aide à l'installation)
import { $, emettre } from '../outils.js';

export function ouvrirModale(html) {
  $('#modale').innerHTML = `<div class="modale" role="dialog" aria-modal="true">${html}</div>`;
  $('#modale').hidden = false;
  document.body.style.overflow = 'hidden';
}

export function fermerModale() {
  const m = $('#modale');
  if (!m || m.hidden) return;
  m.hidden = true;
  m.innerHTML = '';
  document.body.style.overflow = '';
  emettre('modale-fermee');
}

export const modaleOuverte = () => !$('#modale').hidden;

export function installerModale() {
  $('#modale').addEventListener('click', (ev) => { if (ev.target.id === 'modale') fermerModale(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') fermerModale(); });
}
